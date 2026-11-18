package com.uasz.ms_utilisateur.security;

import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.RefreshToken;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.entities.SessionUtilisateur;
import com.uasz.ms_utilisateur.entities.Utilisateur;
import com.uasz.ms_utilisateur.exceptions.ForbiddenException;
import com.uasz.ms_utilisateur.exceptions.UnauthorizedException;
import com.uasz.ms_utilisateur.mappers.UtilisateurMapper;
import com.uasz.ms_utilisateur.repositories.RefreshTokenRepository;
import com.uasz.ms_utilisateur.repositories.RolePermissionRepository;
import com.uasz.ms_utilisateur.repositories.SessionUtilisateurRepository;
import com.uasz.ms_utilisateur.repositories.UtilisateurRepository;
import com.uasz.ms_utilisateur.services.AuditSecuriteService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class AuthSessionManager {

    private final SessionTokenService sessionTokenService;
    private final SessionUtilisateurRepository sessionRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UtilisateurMapper utilisateurMapper;
    private final AuditSecuriteService auditSecuriteService;
    private final SessionRevocationService sessionRevocationService;

    @Autowired
    public AuthSessionManager(
            SessionTokenService sessionTokenService,
            SessionUtilisateurRepository sessionRepository,
            RefreshTokenRepository refreshTokenRepository,
            UtilisateurRepository utilisateurRepository,
            RolePermissionRepository rolePermissionRepository,
            UtilisateurMapper utilisateurMapper,
            AuditSecuriteService auditSecuriteService,
            @Autowired(required = false) SessionRevocationService sessionRevocationService
    ) {
        this.sessionTokenService = sessionTokenService;
        this.sessionRepository = sessionRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.rolePermissionRepository = rolePermissionRepository;
        this.utilisateurMapper = utilisateurMapper;
        this.auditSecuriteService = auditSecuriteService;
        this.sessionRevocationService = sessionRevocationService;
    }

    public AuthSessionManager(
            SessionTokenService sessionTokenService,
            SessionUtilisateurRepository sessionRepository,
            RefreshTokenRepository refreshTokenRepository,
            UtilisateurRepository utilisateurRepository,
            RolePermissionRepository rolePermissionRepository,
            UtilisateurMapper utilisateurMapper,
            AuditSecuriteService auditSecuriteService
    ) {
        this(sessionTokenService, sessionRepository, refreshTokenRepository,
                utilisateurRepository, rolePermissionRepository, utilisateurMapper,
                auditSecuriteService, null);
    }

    public record SessionAuthResult(
            UtilisateurDto userDto,
            String accessToken,
            String refreshToken,
            String sessionId,
            String csrfToken
    ) {
        public SessionAuthResult(UtilisateurDto userDto, String accessToken, String refreshToken, String sessionId) {
            this(userDto, accessToken, refreshToken, sessionId, null);
        }
    }

    @Transactional
    public SessionAuthResult createSession(UtilisateurDto userDto, String ip, String userAgent) {
        String sessionId = UUID.randomUUID().toString();
        String familyId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime sessionExpiresAt = now.plusSeconds(SessionTokenService.REFRESH_TOKEN_TTL_SECONDS);

        // 1. Persister la session utilisateur
        SessionUtilisateur session = SessionUtilisateur.builder()
                .sessionId(sessionId)
                .utilisateurId(userDto.getId())
                .ipAddress(ip)
                .userAgent(userAgent != null && userAgent.length() > 255 ? userAgent.substring(0, 255) : userAgent)
                .active(true)
                .createdAt(now)
                .expiresAt(sessionExpiresAt)
                .lastActivityAt(now)
                .build();
        sessionRepository.save(session);

        // 2. Générer et persister le Refresh Token sous forme de hash SHA-256
        String rawRefreshToken = sessionTokenService.generateOpaqueRefreshToken();
        String tokenHash = sessionTokenService.hashToken(rawRefreshToken);

        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .tokenHash(tokenHash)
                .parentTokenHash(null)
                .familyId(familyId)
                .sessionId(sessionId)
                .utilisateurId(userDto.getId())
                .revoked(false)
                .createdAt(now)
                .expiresAt(sessionExpiresAt)
                .build();
        refreshTokenRepository.save(refreshTokenEntity);

        // 3. Charger les permissions effectives du rôle
        List<String> permissions = resolvePermissions(userDto.getRole());

        // 4. Générer l'Access Token JWT (15 minutes) et le jeton CSRF lié à la session
        String accessToken = sessionTokenService.createToken(userDto, sessionId, permissions);
        String csrfToken = sessionTokenService.generateCsrfToken(sessionId, userDto.getId());

        return new SessionAuthResult(userDto, accessToken, rawRefreshToken, sessionId, csrfToken);
    }

    /**
     * Rotation atomique du Refresh Token avec verrouillage pessimiste (SELECT ... FOR UPDATE),
     * consommation atomique conditionnelle, contrainte d'unicité sur parent_token_hash et
     * persistance garantie des révocations (noRollbackFor + REQUIRES_NEW) même en cas de 401/403.
     */
    @Transactional(noRollbackFor = {UnauthorizedException.class, ForbiddenException.class})
    public SessionAuthResult refreshSession(String rawRefreshToken, String ip, String userAgent) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new UnauthorizedException("Jeton de renouvellement absent. Veuillez vous reconnecter.");
        }

        String tokenHash = sessionTokenService.hashToken(rawRefreshToken.trim());
        RefreshToken token;
        try {
            Optional<RefreshToken> locked = refreshTokenRepository.findByTokenHashForUpdate(tokenHash);
            if (locked.isEmpty()) {
                locked = refreshTokenRepository.findByTokenHash(tokenHash);
            }
            token = locked.orElseThrow(() -> new UnauthorizedException("Jeton de renouvellement invalide ou introuvable."));
        } catch (PessimisticLockingFailureException lockEx) {
            log.warn("Conflit de verrouillage concurrent lors du rafraîchissement du token hash={}", tokenHash);
            throw new UnauthorizedException("Renouvellement concurrent rejeté. Veuillez réessayer ou vous reconnecter.");
        }

        LocalDateTime now = LocalDateTime.now();

        // 1. Détection de réutilisation (REPLAY ATTACK)
        if (token.isRevoked()) {
            log.warn("ALERTE CRITIQUE : Détection de réutilisation de Refresh Token déjà révoqué ! Famille: {}", token.getFamilyId());
            persistFamilyRevocationOnReplay(token.getFamilyId(), token.getSessionId(), now);
            auditSecuriteService.logTokenReplayAlert(token.getFamilyId(), token.getUtilisateurId(), ip);
            throw new UnauthorizedException("Alerte de sécurité : réutilisation de jeton révoqué détectée. Toutes les sessions associées ont été invalidées.");
        }

        // 2. Détection d'expiration
        if (token.getExpiresAt().isBefore(now)) {
            token.setRevoked(true);
            token.setRevokedAt(now);
            refreshTokenRepository.save(token);
            persistSessionRevocation(token.getSessionId(), "REFRESH_TOKEN_EXPIRED", now);
            throw new UnauthorizedException("Session de renouvellement expirée. Veuillez vous reconnecter.");
        }

        // 3. Vérification de l'utilisateur
        Utilisateur user = utilisateurRepository.findById(token.getUtilisateurId())
                .orElseThrow(() -> new UnauthorizedException("Utilisateur associé à la session introuvable."));

        if (!user.isActif()) {
            persistFamilyAndSessionRevocation(token.getFamilyId(), token.getSessionId(), "USER_DEACTIVATED", now);
            throw new ForbiddenException("Ce compte utilisateur est désactivé.");
        }

        // 4. Vérification de la session
        SessionUtilisateur session = sessionRepository.findBySessionId(token.getSessionId())
                .orElseThrow(() -> new UnauthorizedException("Session active introuvable."));

        if (!session.isActive() || session.getExpiresAt().isBefore(now)) {
            persistFamilyAndSessionRevocation(token.getFamilyId(), token.getSessionId(), "SESSION_INACTIVE_OR_EXPIRED", now);
            throw new UnauthorizedException("Cette session a été révoquée ou a expiré. Veuillez vous reconnecter.");
        }

        // 5. Rotation atomique du Refresh Token
        String newRawRefreshToken = sessionTokenService.generateOpaqueRefreshToken();
        String newTokenHash = sessionTokenService.hashToken(newRawRefreshToken);

        if (token.getId() != null) {
            int consumed = refreshTokenRepository.consumeTokenAtomically(token.getId(), now, newTokenHash);
            if (consumed == 0) {
                // Un thread concurrent vient de consommer ce même token entre-temps !
                log.warn("ALERTE CONCURRENCE / REJEU : Le token id={} (famille={}) a déjà été consommé par une requête concurrente !",
                        token.getId(), token.getFamilyId());
                persistFamilyRevocationOnReplay(token.getFamilyId(), token.getSessionId(), now);
                auditSecuriteService.logTokenReplayAlert(token.getFamilyId(), token.getUtilisateurId(), ip);
                throw new UnauthorizedException("Renouvellement concurrent ou rejeu détecté : famille de jetons révoquée.");
            }
        }

        token.setRevoked(true);
        token.setRevokedAt(now);
        token.setReplacedByHash(newTokenHash);
        refreshTokenRepository.save(token);

        RefreshToken newTokenEntity = RefreshToken.builder()
                .tokenHash(newTokenHash)
                .parentTokenHash(tokenHash)
                .familyId(token.getFamilyId())
                .sessionId(token.getSessionId())
                .utilisateurId(user.getId())
                .revoked(false)
                .createdAt(now)
                .expiresAt(session.getExpiresAt())
                .build();

        try {
            refreshTokenRepository.save(newTokenEntity);
            refreshTokenRepository.flush();
        } catch (DataIntegrityViolationException dupEx) {
            log.warn("Violation d'unicité sur parent_token_hash lors d'une course concurrente (famille={})", token.getFamilyId());
            persistFamilyRevocationOnReplay(token.getFamilyId(), token.getSessionId(), now);
            auditSecuriteService.logTokenReplayAlert(token.getFamilyId(), token.getUtilisateurId(), ip);
            throw new UnauthorizedException("Course concurrente détectée sur le jeton de renouvellement. Session révoquée.");
        }

        // Mettre à jour l'activité de la session
        session.setLastActivityAt(now);
        sessionRepository.save(session);

        // 6. Générer le nouvel Access Token JWT (15 minutes) avec les permissions actuelles en base
        UtilisateurDto userDto = utilisateurMapper.toDto(user);
        List<String> permissions = resolvePermissions(user.getRole());
        String accessToken = sessionTokenService.createToken(userDto, session.getSessionId(), permissions);
        String csrfToken = sessionTokenService.generateCsrfToken(session.getSessionId(), user.getId());

        auditSecuriteService.logTokenRefresh(user.getId(), user.getEmail(), ip, token.getFamilyId());

        return new SessionAuthResult(userDto, accessToken, newRawRefreshToken, session.getSessionId(), csrfToken);
    }

    @Transactional
    public void logoutSession(String sessionId, String rawRefreshToken, Long userId, String ip) {
        LocalDateTime now = LocalDateTime.now();
        String effectiveSessionId = sessionId;
        Long effectiveUserId = userId;

        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            String tokenHash = sessionTokenService.hashToken(rawRefreshToken.trim());
            Optional<RefreshToken> rtOpt = refreshTokenRepository.findByTokenHash(tokenHash);
            if (rtOpt.isPresent()) {
                RefreshToken rt = rtOpt.get();
                refreshTokenRepository.revokeEntireFamily(rt.getFamilyId(), now);
                if (effectiveSessionId == null) {
                    effectiveSessionId = rt.getSessionId();
                }
                if (effectiveUserId == null) {
                    effectiveUserId = rt.getUtilisateurId();
                }
            }
        }

        if (effectiveSessionId != null && !effectiveSessionId.isBlank()) {
            sessionRepository.deactivateSessionWithReason(effectiveSessionId, "USER_LOGOUT");
            refreshTokenRepository.revokeBySessionId(effectiveSessionId, now);
        }
        if (effectiveUserId != null) {
            auditSecuriteService.logLogout(effectiveUserId, null, ip, effectiveSessionId);
        }
    }

    @Transactional
    public void logoutSession(String sessionId, Long userId, String ip) {
        logoutSession(sessionId, null, userId, ip);
    }

    /**
     * Révoque immédiatement toutes les sessions et tous les refresh tokens d'un utilisateur
     * (changement de rôle, désactivation de compte, suppression ou révocation administrative).
     */
    @Transactional(noRollbackFor = {UnauthorizedException.class, ForbiddenException.class})
    public void revokeAllUserSessions(Long userId, String reason) {
        LocalDateTime now = LocalDateTime.now();
        sessionRepository.deactivateAllUserSessionsWithReason(userId, reason);
        refreshTokenRepository.revokeAllByUtilisateurId(userId, now);
    }

    /**
     * Vérifie que la session associée à un Access Token est toujours active en base,
     * que le compte utilisateur est actif et que son rôle n'a pas été modifié depuis l'émission du JWT.
     */
    @Transactional(readOnly = true)
    public UtilisateurDto validateActiveSessionAndRole(SessionTokenService.SessionClaims claims) {
        if (claims == null || claims.userId() == null) {
            throw new UnauthorizedException("Contexte d'authentification invalide.");
        }
        if (claims.sessionId() == null || claims.sessionId().isBlank() || !isSessionActive(claims.sessionId())) {
            throw new UnauthorizedException("Cette session a été fermée ou révoquée. Veuillez vous reconnecter.");
        }
        Utilisateur user = utilisateurRepository.findById(claims.userId())
                .orElseThrow(() -> new UnauthorizedException("Utilisateur introuvable."));
        if (!user.isActif()) {
            throw new ForbiddenException("Ce compte utilisateur a été désactivé.");
        }
        if (claims.role() != null && user.getRole() != claims.role()) {
            throw new UnauthorizedException("Vos privilèges ont été modifiés. Veuillez vous reconnecter pour actualiser votre session.");
        }
        return utilisateurMapper.toDto(user);
    }

    @Transactional(readOnly = true)
    public boolean isSessionActive(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) return false;
        return sessionRepository.findBySessionId(sessionId)
                .map(s -> s.isActive() && s.getExpiresAt().isAfter(LocalDateTime.now()))
                .orElse(false);
    }

    public List<String> resolvePermissions(RoleUtilisateur role) {
        if (role == null) {
            return List.of();
        }
        List<String> dbPerms = rolePermissionRepository.findPermissionCodesByRole(role);
        if (dbPerms != null && !dbPerms.isEmpty()) {
            return dbPerms;
        }
        return defaultPermissionsForRole(role);
    }

    public static List<String> defaultPermissionsForRole(RoleUtilisateur role) {
        if (role == null) return List.of();
        return switch (role) {
            case TOURISTE -> List.of(
                    "PATRIMOINE:LIRE", "CIRCUIT:LIRE", "EVENEMENT:LIRE",
                    "RESERVATION:CREER", "RESERVATION:LIRE_PROPRE", "RESERVATION:ANNULER_PROPRE",
                    "PAIEMENT:INITIER", "PAIEMENT:LIRE_PROPRE", "UTILISATEUR:LIRE_PROFIL"
            );
            case GUIDE -> List.of(
                    "PATRIMOINE:LIRE", "CIRCUIT:LIRE", "CIRCUIT:MODIFIER",
                    "EVENEMENT:LIRE", "RESERVATION:LIRE_PROPRE", "UTILISATEUR:LIRE_PROFIL"
            );
            case CONSERVATEUR -> List.of(
                    "PATRIMOINE:LIRE", "PATRIMOINE:CREER", "PATRIMOINE:MODIFIER", "PATRIMOINE:SUPPRIMER",
                    "PATRIMOINE:PUBLIER", "PATRIMOINE:ARCHIVER",
                    "CIRCUIT:LIRE", "EVENEMENT:LIRE", "UTILISATEUR:LIRE_PROFIL"
            );
            case GESTIONNAIRE_SITE -> List.of(
                    "PATRIMOINE:LIRE",
                    "CIRCUIT:LIRE", "CIRCUIT:CREER", "CIRCUIT:MODIFIER", "CIRCUIT:SUPPRIMER",
                    "CIRCUIT:PUBLIER", "CIRCUIT:ARCHIVER",
                    "EVENEMENT:LIRE", "EVENEMENT:CREER", "EVENEMENT:MODIFIER", "EVENEMENT:SUPPRIMER",
                    "EVENEMENT:PUBLIER", "EVENEMENT:ANNULER", "EVENEMENT:ARCHIVER",
                    "RESERVATION:LIRE_TOUT", "RESERVATION:GERER", "UTILISATEUR:LIRE_PROFIL"
            );
            case ADMINISTRATEUR -> List.of(
                    "PATRIMOINE:LIRE", "PATRIMOINE:CREER", "PATRIMOINE:MODIFIER", "PATRIMOINE:SUPPRIMER",
                    "PATRIMOINE:PUBLIER", "PATRIMOINE:ARCHIVER",
                    "CIRCUIT:LIRE", "CIRCUIT:CREER", "CIRCUIT:MODIFIER", "CIRCUIT:SUPPRIMER",
                    "CIRCUIT:PUBLIER", "CIRCUIT:ARCHIVER",
                    "EVENEMENT:LIRE", "EVENEMENT:CREER", "EVENEMENT:MODIFIER", "EVENEMENT:SUPPRIMER",
                    "EVENEMENT:PUBLIER", "EVENEMENT:ANNULER", "EVENEMENT:ARCHIVER",
                    "RESERVATION:CREER", "RESERVATION:LIRE_PROPRE", "RESERVATION:LIRE_TOUT",
                    "RESERVATION:ANNULER_PROPRE", "RESERVATION:GERER",
                    "PAIEMENT:INITIER", "PAIEMENT:LIRE_PROPRE", "PAIEMENT:LIRE_TOUT", "PAIEMENT:REMBOURSER",
                    "UTILISATEUR:LIRE_PROFIL", "UTILISATEUR:LIRE_TOUT", "UTILISATEUR:CREER_STAFF",
                    "UTILISATEUR:GERER_ROLES", "UTILISATEUR:SUPPRIMER", "AUDIT:LIRE"
            );
        };
    }

    private void persistFamilyRevocationOnReplay(String familyId, String sessionId, LocalDateTime now) {
        refreshTokenRepository.revokeEntireFamily(familyId, now);
        sessionRepository.deactivateSession(sessionId);
    }

    private void persistFamilyAndSessionRevocation(String familyId, String sessionId, String reason, LocalDateTime now) {
        refreshTokenRepository.revokeEntireFamily(familyId, now);
        sessionRepository.deactivateSession(sessionId);
    }

    private void persistSessionRevocation(String sessionId, String reason, LocalDateTime now) {
        sessionRepository.deactivateSession(sessionId);
    }
}
