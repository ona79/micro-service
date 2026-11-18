package com.uasz.ms_utilisateur.security;

import com.uasz.ms_utilisateur.TestEphemeralSecretsPostProcessor;
import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.RefreshToken;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.entities.SessionUtilisateur;
import com.uasz.ms_utilisateur.entities.Utilisateur;
import com.uasz.ms_utilisateur.exceptions.UnauthorizedException;
import com.uasz.ms_utilisateur.mappers.UtilisateurMapper;
import com.uasz.ms_utilisateur.repositories.RefreshTokenRepository;
import com.uasz.ms_utilisateur.repositories.RolePermissionRepository;
import com.uasz.ms_utilisateur.repositories.SessionUtilisateurRepository;
import com.uasz.ms_utilisateur.repositories.UtilisateurRepository;
import com.uasz.ms_utilisateur.services.AuditSecuriteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthSessionManagerTest {

    @Mock
    private SessionUtilisateurRepository sessionRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private UtilisateurRepository utilisateurRepository;

    @Mock
    private RolePermissionRepository rolePermissionRepository;

    @Mock
    private AuditSecuriteService auditSecuriteService;

    @Mock
    private SessionRevocationService sessionRevocationService;

    private final UtilisateurMapper utilisateurMapper = Mappers.getMapper(UtilisateurMapper.class);
    private SessionTokenService sessionTokenService;
    private AuthSessionManager authSessionManager;

    @BeforeEach
    void setUp() {
        sessionTokenService = new SessionTokenService(TestEphemeralSecretsPostProcessor.generateRandomSecret());
        authSessionManager = new AuthSessionManager(
                sessionTokenService,
                sessionRepository,
                refreshTokenRepository,
                utilisateurRepository,
                rolePermissionRepository,
                utilisateurMapper,
                auditSecuriteService,
                sessionRevocationService
        );
    }

    @Test
    void createSession_genereSessionEtTokensValides() {
        UtilisateurDto userDto = UtilisateurDto.builder()
                .id(2L)
                .email("touriste@uasz.sn")
                .role(RoleUtilisateur.TOURISTE)
                .actif(true)
                .build();

        when(rolePermissionRepository.findPermissionCodesByRole(RoleUtilisateur.TOURISTE))
                .thenReturn(List.of("PATRIMOINE:LIRE", "CIRCUIT:LIRE"));

        AuthSessionManager.SessionAuthResult result = authSessionManager.createSession(userDto, "127.0.0.1", "JUnit-Agent");

        assertThat(result).isNotNull();
        assertThat(result.accessToken()).isNotBlank();
        assertThat(result.refreshToken()).hasSize(64);
        assertThat(result.sessionId()).isNotBlank();
        assertThat(result.csrfToken()).isNotBlank();

        verify(sessionRepository).save(any(SessionUtilisateur.class));
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void refreshSession_avecTokenValide_effectueRotationAtomiqueEtLieParentTokenHash() {
        String rawToken = sessionTokenService.generateOpaqueRefreshToken();
        String tokenHash = sessionTokenService.hashToken(rawToken);

        RefreshToken existing = RefreshToken.builder()
                .id(10L)
                .tokenHash(tokenHash)
                .familyId("fam-100")
                .sessionId("sess-100")
                .utilisateurId(2L)
                .revoked(false)
                .createdAt(LocalDateTime.now().minusDays(1))
                .expiresAt(LocalDateTime.now().plusDays(6))
                .build();

        Utilisateur user = Utilisateur.builder()
                .id(2L)
                .email("touriste@uasz.sn")
                .role(RoleUtilisateur.TOURISTE)
                .actif(true)
                .build();

        SessionUtilisateur session = SessionUtilisateur.builder()
                .sessionId("sess-100")
                .utilisateurId(2L)
                .active(true)
                .expiresAt(LocalDateTime.now().plusDays(6))
                .lastActivityAt(LocalDateTime.now().minusMinutes(5))
                .build();

        when(refreshTokenRepository.findByTokenHashForUpdate(tokenHash)).thenReturn(Optional.of(existing));
        when(refreshTokenRepository.consumeTokenAtomically(eq(10L), any(LocalDateTime.class), any())).thenReturn(1);
        when(utilisateurRepository.findById(2L)).thenReturn(Optional.of(user));
        when(sessionRepository.findBySessionId("sess-100")).thenReturn(Optional.of(session));
        when(rolePermissionRepository.findPermissionCodesByRole(RoleUtilisateur.TOURISTE))
                .thenReturn(List.of("PATRIMOINE:LIRE"));

        AuthSessionManager.SessionAuthResult refreshed = authSessionManager.refreshSession(rawToken, "127.0.0.1", "JUnit-Agent");

        assertThat(refreshed).isNotNull();
        assertThat(refreshed.refreshToken()).isNotEqualTo(rawToken);
        assertThat(existing.isRevoked()).isTrue();
        assertThat(existing.getReplacedByHash()).isNotNull();

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository, org.mockito.Mockito.times(2)).save(captor.capture());

        List<RefreshToken> savedTokens = captor.getAllValues();
        assertThat(savedTokens).hasSize(2);
        RefreshToken oldRevoked = savedTokens.get(0);
        RefreshToken newActive = savedTokens.get(1);

        assertThat(oldRevoked.isRevoked()).isTrue();
        assertThat(newActive.getFamilyId()).isEqualTo("fam-100");
        assertThat(newActive.getParentTokenHash()).isEqualTo(tokenHash);
        assertThat(newActive.isRevoked()).isFalse();
    }

    @Test
    void refreshSession_rejeuDetecte_revoqueFamilleEntiereAvecPersistanceIndependanteEtAlerte() {
        String rawToken = sessionTokenService.generateOpaqueRefreshToken();
        String tokenHash = sessionTokenService.hashToken(rawToken);

        RefreshToken alreadyRevoked = RefreshToken.builder()
                .id(20L)
                .tokenHash(tokenHash)
                .familyId("fam-compromised")
                .sessionId("sess-200")
                .utilisateurId(3L)
                .revoked(true)
                .createdAt(LocalDateTime.now().minusDays(2))
                .expiresAt(LocalDateTime.now().plusDays(5))
                .build();

        when(refreshTokenRepository.findByTokenHashForUpdate(tokenHash)).thenReturn(Optional.of(alreadyRevoked));

        assertThatThrownBy(() -> authSessionManager.refreshSession(rawToken, "192.168.1.50", "AttackerBot"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Alerte de sécurité");

        verify(refreshTokenRepository).revokeEntireFamily(eq("fam-compromised"), any(LocalDateTime.class));
        verify(sessionRepository).deactivateSession("sess-200");
        verify(auditSecuriteService).logTokenReplayAlert(eq("fam-compromised"), eq(3L), eq("192.168.1.50"));
    }

    @Test
    void refreshSession_courseConcurrenteDetectee_revoqueFamilleEtRejetteSecondSuccesseur() {
        String rawToken = sessionTokenService.generateOpaqueRefreshToken();
        String tokenHash = sessionTokenService.hashToken(rawToken);

        RefreshToken existing = RefreshToken.builder()
                .id(30L)
                .tokenHash(tokenHash)
                .familyId("fam-race")
                .sessionId("sess-race")
                .utilisateurId(2L)
                .revoked(false)
                .createdAt(LocalDateTime.now().minusMinutes(5))
                .expiresAt(LocalDateTime.now().plusDays(6))
                .build();

        Utilisateur user = Utilisateur.builder()
                .id(2L)
                .email("touriste@uasz.sn")
                .role(RoleUtilisateur.TOURISTE)
                .actif(true)
                .build();

        SessionUtilisateur session = SessionUtilisateur.builder()
                .sessionId("sess-race")
                .utilisateurId(2L)
                .active(true)
                .expiresAt(LocalDateTime.now().plusDays(6))
                .lastActivityAt(LocalDateTime.now())
                .build();

        when(refreshTokenRepository.findByTokenHashForUpdate(tokenHash)).thenReturn(Optional.of(existing));
        when(utilisateurRepository.findById(2L)).thenReturn(Optional.of(user));
        when(sessionRepository.findBySessionId("sess-race")).thenReturn(Optional.of(session));
        // Simule qu'un thread concurrent vient tout juste de consommer le token (consumed == 0)
        when(refreshTokenRepository.consumeTokenAtomically(eq(30L), any(LocalDateTime.class), any())).thenReturn(0);

        assertThatThrownBy(() -> authSessionManager.refreshSession(rawToken, "127.0.0.1", "ConcurrentClient"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Renouvellement concurrent ou rejeu détecté");

        verify(refreshTokenRepository).revokeEntireFamily(eq("fam-race"), any(LocalDateTime.class));
        verify(sessionRepository).deactivateSession("sess-race");
    }

    @Test
    void validateActiveSessionAndRole_rejetteJetonDontLeRoleAEteModifieEnBase() {
        SessionUtilisateur activeSession = SessionUtilisateur.builder()
                .sessionId("sess-role-change")
                .utilisateurId(5L)
                .active(true)
                .expiresAt(LocalDateTime.now().plusHours(2))
                .build();

        Utilisateur updatedUserInDb = Utilisateur.builder()
                .id(5L)
                .email("fatou@uasz.sn")
                .role(RoleUtilisateur.TOURISTE) // Rétrogradé en TOURISTE en base !
                .actif(true)
                .build();

        when(sessionRepository.findBySessionId("sess-role-change")).thenReturn(Optional.of(activeSession));
        when(utilisateurRepository.findById(5L)).thenReturn(Optional.of(updatedUserInDb));

        // L'ancien JWT prétend toujours être CONSERVATEUR
        SessionTokenService.SessionClaims staleClaims = new SessionTokenService.SessionClaims(
                5L, "fatou@uasz.sn", RoleUtilisateur.CONSERVATEUR,
                List.of("PATRIMOINE:CREER"), "sess-role-change", 9999999999L, "jti-1"
        );

        assertThatThrownBy(() -> authSessionManager.validateActiveSessionAndRole(staleClaims))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("privilèges ont été modifiés");
    }
}
