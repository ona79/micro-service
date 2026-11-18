package com.uasz.api_gateway.security;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GatewayAuthorizationFilterTest {

    private static final String TEST_SECRET = "patrimoine-uasz-secret-cle-de-test-32-octets-minimum-123456";
    private GatewayAuthorizationFilter filter;

    @BeforeEach
    void setUp() {
        filter = new GatewayAuthorizationFilter(TEST_SECRET);
    }

    private String generateToken(Long userId, String email, String role, long ttlSeconds) {
        long exp = Instant.now().getEpochSecond() + ttlSeconds;
        String raw = userId + "|" + email + "|" + role + "|" + exp + "|jti-test-123";
        String encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(TEST_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String sig = Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(encoded.getBytes(StandardCharsets.UTF_8)));
            return encoded + "." + sig;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @DisplayName("SEC-02: Le secret doit comporter au moins 32 octets sous peine d'échec immédiat au démarrage")
    void shouldRejectSecretUnder32Bytes() {
        assertThatThrownBy(() -> new GatewayAuthorizationFilter(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 octets");

        assertThatThrownBy(() -> new GatewayAuthorizationFilter("court"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 octets");

        assertThatThrownBy(() -> new GatewayAuthorizationFilter("   "))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 octets");

        assertThatThrownBy(() -> new GatewayAuthorizationFilter("CHANGE_ME_GENERATE_HMAC_SECRET_VIA_OPENSSL_MIN_32_BYTES"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("CHANGE_ME");
    }

    @Test
    @DisplayName("Consultation GET publique : autorisée sans authentification sur le catalogue")
    void shouldAllowPublicGetOnCatalog() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/patrimoines");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull(); // chain proceeded
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/patrimoines", "/api/patrimoines/", "/api/patrimoines/1", "/api/circuits", "/api/evenements"})
    @DisplayName("SEC-01 FAIL-CLOSED : Tout POST/PUT/PATCH/DELETE anonyme sur le catalogue doit renvoyer 401")
    void shouldReturn401OnAnonymousCatalogMutation(String path) throws Exception {
        for (String method : new String[]{"POST", "PUT", "PATCH", "DELETE"}) {
            MockHttpServletRequest request = new MockHttpServletRequest(method, path);
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();

            filter.doFilter(request, response, chain);

            assertThat(response.getStatus())
                    .as("Method %s on path %s should return 401", method, path)
                    .isEqualTo(401);
            assertThat(response.getContentAsString()).contains("Authentification requise");
            assertThat(chain.getRequest()).isNull(); // chain was blocked
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"TOURISTE", "GUIDE"})
    @DisplayName("SEC-01 : Tout POST sur le catalogue avec un rôle non-staff doit renvoyer 403")
    void shouldReturn403OnNonStaffCatalogMutation(String role) throws Exception {
        String token = generateToken(10L, "visiteur@uasz.sn", role, 3600);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/patrimoines");
        request.setCookies(new Cookie("PATRIMOINE_SESSION", token));
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("Accès interdit : rôle du personnel requis");
        assertThat(chain.getRequest()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMINISTRATEUR", "GESTIONNAIRE_SITE", "CONSERVATEUR"})
    @DisplayName("SEC-01 : Les rôles staff (ADMINISTRATEUR, GESTIONNAIRE_SITE, CONSERVATEUR) sont autorisés en POST sur le catalogue")
    void shouldAllowStaffCatalogMutation(String role) throws Exception {
        String token = generateToken(5L, "staff@uasz.sn", role, 3600);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/patrimoines");
        request.setCookies(new Cookie("PATRIMOINE_SESSION", token));
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    @DisplayName("Extraction du token via en-tête Authorization Bearer")
    void shouldExtractBearerTokenHeader() throws Exception {
        String token = generateToken(1L, "admin@uasz.sn", "ADMINISTRATEUR", 3600);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/circuits");
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    @DisplayName("Jeton expiré sur POST catalogue renvoie 401")
    void shouldReturn401OnExpiredToken() throws Exception {
        String expiredToken = generateToken(1L, "admin@uasz.sn", "ADMINISTRATEUR", -10); // expiré
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/patrimoines");
        request.setCookies(new Cookie("PATRIMOINE_SESSION", expiredToken));
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("session a expiré");
    }

    @Test
    @DisplayName("Jeton corrompu sur POST catalogue renvoie 401")
    void shouldReturn401OnTamperedToken() throws Exception {
        String token = generateToken(1L, "admin@uasz.sn", "ADMINISTRATEUR", 3600);
        String corruptedToken = token.substring(0, token.length() - 5) + "XXXXX";
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/patrimoines");
        request.setCookies(new Cookie("PATRIMOINE_SESSION", corruptedToken));
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("Signature de session invalide");
    }

    @Test
    @DisplayName("SEC-VULN-03 : Les en-têtes non fiables (X-User-*) fournis par le client sont assainis et l'enveloppe interne est signée")
    void shouldStripUntrustedHeadersAndInjectSignedGatewayEnvelope() throws Exception {
        String token = generateToken(42L, "touriste@uasz.sn", "TOURISTE", 3600);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/patrimoines");
        request.setCookies(new Cookie("PATRIMOINE_SESSION", token));
        // Client tente d'injecter des privilèges falsifiés
        request.addHeader("X-User-Roles", "ADMINISTRATEUR");
        request.addHeader("X-User-Id", "1");
        request.addHeader("X-Internal-Gateway-Token", "fake-token");

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();

        // Le microservice reçoit les valeurs vérifiées et non les valeurs forgées par le client
        jakarta.servlet.http.HttpServletRequest forwarded = (jakarta.servlet.http.HttpServletRequest) chain.getRequest();
        assertThat(forwarded.getHeader("X-User-Roles")).isEqualTo("TOURISTE");
        assertThat(forwarded.getHeader("X-User-Id")).isEqualTo("42");
        assertThat(forwarded.getHeader("X-Internal-Gateway-Token")).isNotNull().contains(".");
    }

    @Test
    @DisplayName("Routes protégées : /api/reservations requiert une authentification")
    void shouldRejectAnonymousReservationAccess() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/reservations");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("Authentification requise");
    }

    @Test
    @DisplayName("Routes protégées : /api/paiements requiert une authentification")
    void shouldRejectAnonymousPaiementAccess() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/paiements");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("Authentification requise");
    }

    @Test
    @DisplayName("Rate Limiting : Plus de 10 tentatives de connexion par minute renvoie 429")
    void shouldRateLimitLoginAttempts() throws Exception {
        String clientIp = "192.168.10.99";
        for (int i = 1; i <= 10; i++) {
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/utilisateurs/connexion");
            req.setRemoteAddr(clientIp);
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req, res, new MockFilterChain());
            assertThat(res.getStatus()).isEqualTo(200);
        }

        // 11ème tentative : doit être bloquée
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/utilisateurs/connexion");
        req.setRemoteAddr(clientIp);
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());

        assertThat(res.getStatus()).isEqualTo(429);
        assertThat(res.getContentAsString()).contains("Trop de tentatives de connexion");
    }
}
