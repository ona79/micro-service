package com.uasz.ms_utilisateur.security;

import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.exceptions.UnauthorizedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SessionTokenServiceTest {

    private static final String SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    private SessionTokenService tokenService;

    @BeforeEach
    void setUp() {
        tokenService = new SessionTokenService(SECRET);
    }

    @Test
    void createAndVerifyToken_produitUnJwtValideAvecClaimsComplets() {
        UtilisateurDto user = UtilisateurDto.builder()
                .id(42L)
                .email("test.securite@uasz.sn")
                .role(RoleUtilisateur.CONSERVATEUR)
                .actif(true)
                .build();

        List<String> permissions = List.of("PATRIMOINE:LIRE", "PATRIMOINE:CREER", "PATRIMOINE:MODIFIER");
        String sessionId = "sess-12345-uuid";

        String token = tokenService.createToken(user, sessionId, permissions);

        assertThat(token).isNotNull();
        String[] parts = token.split("\\.");
        assertThat(parts).hasSize(3);

        SessionTokenService.SessionClaims claims = tokenService.verifyToken(token);
        assertThat(claims.userId()).isEqualTo(42L);
        assertThat(claims.email()).isEqualTo("test.securite@uasz.sn");
        assertThat(claims.role()).isEqualTo(RoleUtilisateur.CONSERVATEUR);
        assertThat(claims.sessionId()).isEqualTo("sess-12345-uuid");
        assertThat(claims.permissions()).containsExactlyInAnyOrderElementsOf(permissions);
    }

    @Test
    void verifyToken_signatureAltree_leveUnauthorized() {
        UtilisateurDto user = UtilisateurDto.builder()
                .id(1L)
                .email("admin@uasz.sn")
                .role(RoleUtilisateur.ADMINISTRATEUR)
                .build();

        String token = tokenService.createToken(user);
        String[] parts = token.split("\\.");
        // Altère le dernier caractère de la signature
        char lastChar = parts[2].charAt(parts[2].length() - 1);
        char altered = (lastChar == 'A') ? 'B' : 'A';
        String tamperedToken = parts[0] + "." + parts[1] + "." + parts[2].substring(0, parts[2].length() - 1) + altered;

        assertThatThrownBy(() -> tokenService.verifyToken(tamperedToken))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Signature");
    }

    @Test
    void verifyToken_tokenExpire_leveUnauthorized() {
        UtilisateurDto user = UtilisateurDto.builder()
                .id(2L)
                .email("touriste@uasz.sn")
                .role(RoleUtilisateur.TOURISTE)
                .build();

        // Expire il y a 10 secondes
        String expiredToken = tokenService.createToken(user, "sess-1", List.of(), -10);

        assertThatThrownBy(() -> tokenService.verifyToken(expiredToken))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("expiré");
    }

    @Test
    void generateOpaqueRefreshToken_produitChaine64HexEtUnicite() {
        String token1 = tokenService.generateOpaqueRefreshToken();
        String token2 = tokenService.generateOpaqueRefreshToken();

        assertThat(token1).hasSize(64).matches("^[0-9a-f]{64}$");
        assertThat(token2).hasSize(64).matches("^[0-9a-f]{64}$");
        assertThat(token1).isNotEqualTo(token2);
    }

    @Test
    void hashToken_produitCondensatSha256Deterministe() {
        String raw = "sample-token-data-123";
        String hash1 = tokenService.hashToken(raw);
        String hash2 = tokenService.hashToken(raw);

        assertThat(hash1).hasSize(64);
        assertThat(hash1).isEqualTo(hash2);
    }

    @Test
    void secretTropCourt_declencheIllegalStateException() {
        assertThatThrownBy(() -> new SessionTokenService("court"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("au moins 32 octets");
    }
}
