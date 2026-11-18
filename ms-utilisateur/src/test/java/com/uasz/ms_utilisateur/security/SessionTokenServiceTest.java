package com.uasz.ms_utilisateur.security;

import com.uasz.ms_utilisateur.TestEphemeralSecretsPostProcessor;
import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.exceptions.ForbiddenException;
import com.uasz.ms_utilisateur.exceptions.UnauthorizedException;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SessionTokenServiceTest {

    private String secret;
    private SessionTokenService tokenService;

    @BeforeEach
    void setUp() {
        secret = TestEphemeralSecretsPostProcessor.generateRandomSecret();
        tokenService = new SessionTokenService(secret);
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

        String expiredToken = tokenService.createToken(user, "sess-1", List.of(), -10);

        assertThatThrownBy(() -> tokenService.verifyToken(expiredToken))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("expiré");
    }

    @Test
    void extractRefreshToken_litExclusivementDepuisCookieEtIgnoreHeaderXRefreshToken() {
        MockHttpServletRequest reqHeaderOnly = new MockHttpServletRequest("POST", "/api/utilisateurs/refresh");
        reqHeaderOnly.addHeader("X-Refresh-Token", "tentative-injection-header");
        assertThat(tokenService.extractRefreshToken(reqHeaderOnly)).isNull();

        MockHttpServletRequest reqWithCookie = new MockHttpServletRequest("POST", "/api/utilisateurs/refresh");
        reqWithCookie.setCookies(new Cookie(SessionTokenService.REFRESH_COOKIE_NAME, "cookie-refresh-valide"));
        reqWithCookie.addHeader("X-Refresh-Token", "tentative-injection-header");
        assertThat(tokenService.extractRefreshToken(reqWithCookie)).isEqualTo("cookie-refresh-valide");
    }

    @Test
    void generateAndVerifyCsrfToken_valideOuRejetteCorrectement() {
        String csrf = tokenService.generateCsrfToken("sess-77", 12L);

        // 1. Valide avec header + cookie correspondants
        MockHttpServletRequest validReq = new MockHttpServletRequest("PUT", "/api/utilisateurs/12");
        validReq.setCookies(new Cookie(SessionTokenService.CSRF_COOKIE_NAME, csrf));
        validReq.addHeader(SessionTokenService.CSRF_HEADER_NAME, csrf);
        tokenService.verifyCsrfToken(validReq, "sess-77", 12L);

        // 2. Sans header -> ForbiddenException
        MockHttpServletRequest noHeaderReq = new MockHttpServletRequest("PUT", "/api/utilisateurs/12");
        noHeaderReq.setCookies(new Cookie(SessionTokenService.CSRF_COOKIE_NAME, csrf));
        assertThatThrownBy(() -> tokenService.verifyCsrfToken(noHeaderReq, "sess-77", 12L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("manquant");

        // 3. Signature falsifiée -> ForbiddenException
        MockHttpServletRequest tamperedReq = new MockHttpServletRequest("PUT", "/api/utilisateurs/12");
        tamperedReq.addHeader(SessionTokenService.CSRF_HEADER_NAME, csrf + "X");
        assertThatThrownBy(() -> tokenService.verifyCsrfToken(tamperedReq, "sess-77", 12L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Signature");

        // 4. Autre session -> ForbiddenException
        assertThatThrownBy(() -> tokenService.verifyCsrfToken(validReq, "sess-autre", 12L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("session courante");
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
    void validationSecret_rejetteCleCourteOuPrevisibleOuFaibleEntropie() {
        assertThatThrownBy(() -> new SessionTokenService("court"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("au moins 32 octets");

        assertThatThrownBy(() -> new SessionTokenService("dev-secret-key-patrimoine-casamance-uasz-32bytes!"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DEV-SECRET");

        assertThatThrownBy(() -> new SessionTokenService("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("entropie insuffisante");
    }
}
