package com.uasz.api_gateway.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
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
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GatewayAuthorizationFilterTest {

    private String testSecret;
    private GatewayAuthorizationFilter filter;

    @BeforeEach
    void setUp() {
        byte[] randomBytes = new byte[36];
        new SecureRandom().nextBytes(randomBytes);
        testSecret = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        filter = new GatewayAuthorizationFilter(testSecret, true);
    }

    private String generateToken(Long userId, String email, String role, long ttlSeconds) {
        return generateTokenWithSession(userId, email, role, ttlSeconds, "sess-test-" + userId);
    }

    private String generateTokenWithSession(Long userId, String email, String role, long ttlSeconds, String sessionId) {
        long exp = Instant.now().getEpochSecond() + ttlSeconds;
        String raw = userId + "|" + email + "|" + role + "|" + exp + "|" + sessionId;
        String encoded = Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(testSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String sig = Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(encoded.getBytes(StandardCharsets.UTF_8)));
            return encoded + "." + sig;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private void attachCookieAuthWithCsrf(MockHttpServletRequest request, Long userId, String email, String role, long ttlSeconds) {
        String sessionId = "sess-test-" + userId;
        String token = generateTokenWithSession(userId, email, role, ttlSeconds, sessionId);
        String csrf = filter.generateCsrfToken(sessionId, userId);
        request.setCookies(
                new Cookie("PATRIMOINE_SESSION", token),
                new Cookie("XSRF-TOKEN", csrf)
        );
        request.addHeader("X-XSRF-TOKEN", csrf);
    }

    @Test
    @DisplayName("SEC-02: Validation stricte de la longueur et de la qualité cryptographique du secret au démarrage")
    void shouldRejectWeakOrMissingSecrets() {
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

        assertThatThrownBy(() -> new GatewayAuthorizationFilter("dev-secret-key-patrimoine-casamance-uasz-32bytes!"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DEV-SECRET");

        assertThatThrownBy(() -> new GatewayAuthorizationFilter("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("entropie insuffisante");
    }

    @Test
    @DisplayName("Consultation GET publique : autorisée sans authentification sur le catalogue")
    void shouldAllowPublicGetOnCatalog() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/patrimoines");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
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
            assertThat(chain.getRequest()).isNull();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"TOURISTE", "GUIDE", "GESTIONNAIRE_SITE"})
    @DisplayName("RBAC Granulaire : POST /api/patrimoines interdit aux rôles sans PATRIMOINE:CREER (TOURISTE, GUIDE, GESTIONNAIRE_SITE)")
    void shouldReturn403OnUnauthorizedRoleForPatrimoineCreation(String role) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/patrimoines");
        attachCookieAuthWithCsrf(request, 10L, "user@uasz.sn", role, 3600);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("PATRIMOINE:CREER");
        assertThat(chain.getRequest()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"ADMINISTRATEUR", "CONSERVATEUR"})
    @DisplayName("RBAC Granulaire : Seuls ADMINISTRATEUR et CONSERVATEUR peuvent créer un patrimoine")
    void shouldAllowPatrimoineCreationForConservateurAndAdmin(String role) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/patrimoines");
        attachCookieAuthWithCsrf(request, 5L, "conservateur@uasz.sn", role, 3600);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    @DisplayName("RBAC Granulaire : GUIDE peut modifier un circuit (PUT) mais ne peut ni le créer (POST) ni le supprimer (DELETE)")
    void shouldEnforceGranularPermissionsForGuideOnCircuits() throws Exception {
        // 1. PUT /api/circuits/1 -> 200 OK (GUIDE possède CIRCUIT:MODIFIER)
        MockHttpServletRequest putReq = new MockHttpServletRequest("PUT", "/api/circuits/1");
        attachCookieAuthWithCsrf(putReq, 6L, "guide@uasz.sn", "GUIDE", 3600);
        MockHttpServletResponse putRes = new MockHttpServletResponse();
        MockFilterChain putChain = new MockFilterChain();
        filter.doFilter(putReq, putRes, putChain);
        assertThat(putRes.getStatus()).isEqualTo(200);
        assertThat(putChain.getRequest()).isNotNull();

        // 2. POST /api/circuits -> 403 Forbidden (GUIDE ne possède pas CIRCUIT:CREER)
        MockHttpServletRequest postReq = new MockHttpServletRequest("POST", "/api/circuits");
        attachCookieAuthWithCsrf(postReq, 6L, "guide@uasz.sn", "GUIDE", 3600);
        MockHttpServletResponse postRes = new MockHttpServletResponse();
        filter.doFilter(postReq, postRes, new MockFilterChain());
        assertThat(postRes.getStatus()).isEqualTo(403);
        assertThat(postRes.getContentAsString()).contains("CIRCUIT:CREER");

        // 3. DELETE /api/circuits/1 -> 403 Forbidden (GUIDE ne possède pas CIRCUIT:SUPPRIMER)
        MockHttpServletRequest delReq = new MockHttpServletRequest("DELETE", "/api/circuits/1");
        attachCookieAuthWithCsrf(delReq, 6L, "guide@uasz.sn", "GUIDE", 3600);
        MockHttpServletResponse delRes = new MockHttpServletResponse();
        filter.doFilter(delReq, delRes, new MockFilterChain());
        assertThat(delRes.getStatus()).isEqualTo(403);
        assertThat(delRes.getContentAsString()).contains("CIRCUIT:SUPPRIMER");
    }

    @Test
    @DisplayName("Protection CSRF : Requête mutative par cookie sans jeton CSRF ou avec jeton invalide renvoie 403")
    void shouldRejectCookieMutatingRequestsWithoutValidCsrfToken() throws Exception {
        String token = generateTokenWithSession(5L, "conservateur@uasz.sn", "CONSERVATEUR", 3600, "sess-csrf-1");

        // 1. Sans en-tête X-XSRF-TOKEN -> 403 Forbidden
        MockHttpServletRequest reqNoCsrf = new MockHttpServletRequest("POST", "/api/patrimoines");
        reqNoCsrf.setCookies(new Cookie("PATRIMOINE_SESSION", token));
        MockHttpServletResponse resNoCsrf = new MockHttpServletResponse();
        filter.doFilter(reqNoCsrf, resNoCsrf, new MockFilterChain());
        assertThat(resNoCsrf.getStatus()).isEqualTo(403);
        assertThat(resNoCsrf.getContentAsString()).contains("CSRF");

        // 2. Avec en-tête X-XSRF-TOKEN falsifié -> 403 Forbidden
        MockHttpServletRequest reqBadCsrf = new MockHttpServletRequest("POST", "/api/patrimoines");
        reqBadCsrf.setCookies(new Cookie("PATRIMOINE_SESSION", token), new Cookie("XSRF-TOKEN", "faux.token"));
        reqBadCsrf.addHeader("X-XSRF-TOKEN", "faux.token");
        MockHttpServletResponse resBadCsrf = new MockHttpServletResponse();
        filter.doFilter(reqBadCsrf, resBadCsrf, new MockFilterChain());
        assertThat(resBadCsrf.getStatus()).isEqualTo(403);
        assertThat(resBadCsrf.getContentAsString()).contains("Signature du jeton CSRF invalide");

        // 3. Avec jeton CSRF valide mais appartenant à un autre utilisateur -> 403 Forbidden
        String otherUserCsrf = filter.generateCsrfToken("sess-csrf-1", 999L);
        MockHttpServletRequest reqWrongUserCsrf = new MockHttpServletRequest("POST", "/api/patrimoines");
        reqWrongUserCsrf.setCookies(new Cookie("PATRIMOINE_SESSION", token), new Cookie("XSRF-TOKEN", otherUserCsrf));
        reqWrongUserCsrf.addHeader("X-XSRF-TOKEN", otherUserCsrf);
        MockHttpServletResponse resWrongUserCsrf = new MockHttpServletResponse();
        filter.doFilter(reqWrongUserCsrf, resWrongUserCsrf, new MockFilterChain());
        assertThat(resWrongUserCsrf.getStatus()).isEqualTo(403);
        assertThat(resWrongUserCsrf.getContentAsString()).contains("utilisateur courant");
    }

    @Test
    @DisplayName("Invalidation de session après changement de rôle : un access token déjà émis est immédiatement rejeté")
    void shouldRejectAlreadyIssuedAccessTokenAfterRoleChangeOrSessionRevocation() throws Exception {
        MockHttpServletRequest reqBefore = new MockHttpServletRequest("POST", "/api/patrimoines");
        attachCookieAuthWithCsrf(reqBefore, 5L, "conservateur@uasz.sn", "CONSERVATEUR", 3600);
        MockHttpServletResponse resBefore = new MockHttpServletResponse();
        filter.doFilter(reqBefore, resBefore, new MockFilterChain());
        assertThat(resBefore.getStatus()).isEqualTo(200);

        // L'administrateur rétrograde l'utilisateur 5 en TOURISTE pendant que son JWT est encore valide
        filter.markUserRoleChanged(5L, "TOURISTE");

        MockHttpServletRequest reqAfter = new MockHttpServletRequest("POST", "/api/patrimoines");
        attachCookieAuthWithCsrf(reqAfter, 5L, "conservateur@uasz.sn", "CONSERVATEUR", 3600);
        MockHttpServletResponse resAfter = new MockHttpServletResponse();
        filter.doFilter(reqAfter, resAfter, new MockFilterChain());
        assertThat(resAfter.getStatus()).isEqualTo(401);
        assertThat(resAfter.getContentAsString()).contains("privilèges ont été modifiés");
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
        String expiredToken = generateToken(1L, "admin@uasz.sn", "ADMINISTRATEUR", -10);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/patrimoines");
        request.addHeader("Authorization", "Bearer " + expiredToken);
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
        request.addHeader("Authorization", "Bearer " + corruptedToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("Signature de session invalide");
    }

    @Test
    @DisplayName("SEC-VULN-03 : Assainissement des en-têtes X-User-* et signature d'enveloppe liée à la requête avec hash SHA-256")
    void shouldStripUntrustedHeadersAndInjectSignedGatewayEnvelope() throws Exception {
        String token = generateToken(42L, "touriste@uasz.sn", "TOURISTE", 3600);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/patrimoines");
        request.setCookies(new Cookie("PATRIMOINE_SESSION", token));
        request.addHeader("X-User-Roles", "ADMINISTRATEUR");
        request.addHeader("X-User-Id", "1");
        request.addHeader("X-Internal-Gateway-Token", "fake-token");

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();

        HttpServletRequest forwarded = (HttpServletRequest) chain.getRequest();
        assertThat(forwarded.getHeader("X-User-Roles")).isEqualTo("TOURISTE");
        assertThat(forwarded.getHeader("X-User-Id")).isEqualTo("42");
        assertThat(forwarded.getHeader("X-User-Permissions")).contains("PATRIMOINE:LIRE", "RESERVATION:CREER");
        assertThat(forwarded.getHeader("X-Content-SHA256")).hasSize(64);
        assertThat(forwarded.getHeader("X-Internal-Gateway-Token").split("\\.")).hasSize(3);
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

        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/utilisateurs/connexion");
        req.setRemoteAddr(clientIp);
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());

        assertThat(res.getStatus()).isEqualTo(429);
        assertThat(res.getContentAsString()).contains("Trop de tentatives de connexion");
    }

    @Test
    @DisplayName("P04 : Disponibilité publique en GET, endpoints internes bloqués 403, remboursement réservé à ADMINISTRATEUR")
    void shouldEnforceP04ReservationAndPaiementRbac() throws Exception {
        // 1. GET /api/reservations/disponibilite est autorisé anonymement
        MockHttpServletRequest reqDispo = new MockHttpServletRequest("GET", "/api/reservations/disponibilite");
        MockHttpServletResponse resDispo = new MockHttpServletResponse();
        MockFilterChain chainDispo = new MockFilterChain();
        filter.doFilter(reqDispo, resDispo, chainDispo);
        assertThat(resDispo.getStatus()).isEqualTo(200);
        assertThat(chainDispo.getRequest()).isNotNull();

        // 2. Les routes internes /internal/** sont bloquées 403 même pour un ADMINISTRATEUR
        MockHttpServletRequest reqInternalResa = new MockHttpServletRequest("POST", "/api/reservations/internal/1/evenement-paiement");
        attachCookieAuthWithCsrf(reqInternalResa, 1L, "admin@uasz.sn", "ADMINISTRATEUR", 300);
        MockHttpServletResponse resInternalResa = new MockHttpServletResponse();
        filter.doFilter(reqInternalResa, resInternalResa, new MockFilterChain());
        assertThat(resInternalResa.getStatus()).isEqualTo(403);

        MockHttpServletRequest reqInternalPay = new MockHttpServletRequest("GET", "/api/paiements/internal/reservation/1");
        attachCookieAuthWithCsrf(reqInternalPay, 1L, "admin@uasz.sn", "ADMINISTRATEUR", 300);
        MockHttpServletResponse resInternalPay = new MockHttpServletResponse();
        filter.doFilter(reqInternalPay, resInternalPay, new MockFilterChain());
        assertThat(resInternalPay.getStatus()).isEqualTo(403);

        // 3. Remboursement simulé : TOURISTE -> 403, ADMINISTRATEUR -> 200
        MockHttpServletRequest reqRefundTouriste = new MockHttpServletRequest("POST", "/api/paiements/10/rembourser");
        attachCookieAuthWithCsrf(reqRefundTouriste, 2L, "touriste@uasz.sn", "TOURISTE", 300);
        MockHttpServletResponse resRefundTouriste = new MockHttpServletResponse();
        filter.doFilter(reqRefundTouriste, resRefundTouriste, new MockFilterChain());
        assertThat(resRefundTouriste.getStatus()).isEqualTo(403);

        MockHttpServletRequest reqRefundAdmin = new MockHttpServletRequest("POST", "/api/paiements/10/rembourser");
        attachCookieAuthWithCsrf(reqRefundAdmin, 1L, "admin@uasz.sn", "ADMINISTRATEUR", 300);
        MockHttpServletResponse resRefundAdmin = new MockHttpServletResponse();
        MockFilterChain chainRefundAdmin = new MockFilterChain();
        filter.doFilter(reqRefundAdmin, resRefundAdmin, chainRefundAdmin);
        assertThat(resRefundAdmin.getStatus()).isEqualTo(200);
        assertThat(chainRefundAdmin.getRequest()).isNotNull();

        // 4. PUT / DELETE sur /api/paiements interdit -> 403
        MockHttpServletRequest reqPutPay = new MockHttpServletRequest("PUT", "/api/paiements/10");
        attachCookieAuthWithCsrf(reqPutPay, 1L, "admin@uasz.sn", "ADMINISTRATEUR", 300);
        MockHttpServletResponse resPutPay = new MockHttpServletResponse();
        filter.doFilter(reqPutPay, resPutPay, new MockFilterChain());
        assertThat(resPutPay.getStatus()).isEqualTo(403);
    }

    @Test
    @DisplayName("P05 : RBAC Guides, Avis, Modération et Ouverture Notifications Propriétaires")
    void shouldEnforceP05RbacForGuidesReviewsModerationAndNotifications() throws Exception {
        // 1. Guides publics ouverts anonymement, /mon-profil réservé à GUIDE, /valider réservé à GESTIONNAIRE/ADMIN
        MockHttpServletRequest pubGuides = new MockHttpServletRequest("GET", "/api/guides");
        MockHttpServletResponse resPubGuides = new MockHttpServletResponse();
        filter.doFilter(pubGuides, resPubGuides, new MockFilterChain());
        assertThat(resPubGuides.getStatus()).isEqualTo(200);

        MockHttpServletRequest touristeMonProfil = new MockHttpServletRequest("GET", "/api/guides/mon-profil");
        touristeMonProfil.addHeader("Authorization", "Bearer " + generateToken(2L, "moussa@uasz.sn", "TOURISTE", 300));
        MockHttpServletResponse resTouristeMonProfil = new MockHttpServletResponse();
        filter.doFilter(touristeMonProfil, resTouristeMonProfil, new MockFilterChain());
        assertThat(resTouristeMonProfil.getStatus()).isEqualTo(403);

        MockHttpServletRequest guideSelfValidate = new MockHttpServletRequest("POST", "/api/guides/1/valider");
        attachCookieAuthWithCsrf(guideSelfValidate, 5L, "guide@uasz.sn", "GUIDE", 300);
        MockHttpServletResponse resGuideSelfValidate = new MockHttpServletResponse();
        filter.doFilter(guideSelfValidate, resGuideSelfValidate, new MockFilterChain());
        assertThat(resGuideSelfValidate.getStatus()).isEqualTo(403);

        MockHttpServletRequest managerValidate = new MockHttpServletRequest("POST", "/api/guides/1/valider");
        attachCookieAuthWithCsrf(managerValidate, 3L, "awa@uasz.sn", "GESTIONNAIRE_SITE", 300);
        MockHttpServletResponse resManagerValidate = new MockHttpServletResponse();
        MockFilterChain chainManager = new MockFilterChain();
        filter.doFilter(managerValidate, resManagerValidate, chainManager);
        assertThat(resManagerValidate.getStatus()).isEqualTo(200);
        assertThat(chainManager.getRequest()).isNotNull();

        MockHttpServletRequest conservateurValidate = new MockHttpServletRequest("POST", "/api/guides/1/valider");
        attachCookieAuthWithCsrf(conservateurValidate, 4L, "fatou@uasz.sn", "CONSERVATEUR", 300);
        MockHttpServletResponse resConsValidate = new MockHttpServletResponse();
        MockFilterChain chainCons = new MockFilterChain();
        filter.doFilter(conservateurValidate, resConsValidate, chainCons);
        assertThat(resConsValidate.getStatus()).isEqualTo(200);
        assertThat(chainCons.getRequest()).isNotNull();

        // 2. Modération strictement protégée contre TOURISTE, GUIDE, CONSERVATEUR ; ouverte à GESTIONNAIRE_SITE
        MockHttpServletRequest conservateurModeration = new MockHttpServletRequest("POST", "/api/moderation/avis/1/decision");
        attachCookieAuthWithCsrf(conservateurModeration, 4L, "fatou@uasz.sn", "CONSERVATEUR", 300);
        MockHttpServletResponse resConsMod = new MockHttpServletResponse();
        filter.doFilter(conservateurModeration, resConsMod, new MockFilterChain());
        assertThat(resConsMod.getStatus()).isEqualTo(403);

        MockHttpServletRequest adminModeration = new MockHttpServletRequest("GET", "/api/moderation/signalements");
        adminModeration.addHeader("Authorization", "Bearer " + generateToken(1L, "admin@uasz.sn", "ADMINISTRATEUR", 300));
        MockHttpServletResponse resAdminMod = new MockHttpServletResponse();
        filter.doFilter(adminModeration, resAdminMod, new MockFilterChain());
        assertThat(resAdminMod.getStatus()).isEqualTo(200);

        // 3. Notifications : /mes-notifications et /{id}/lire ouverts aux utilisateurs authentifiés, console globale bloquée aux non-admins
        MockHttpServletRequest touristeMesNotifs = new MockHttpServletRequest("GET", "/api/notifications/mes-notifications");
        touristeMesNotifs.addHeader("Authorization", "Bearer " + generateToken(2L, "moussa@uasz.sn", "TOURISTE", 300));
        MockHttpServletResponse resTouristeMesNotifs = new MockHttpServletResponse();
        filter.doFilter(touristeMesNotifs, resTouristeMesNotifs, new MockFilterChain());
        assertThat(resTouristeMesNotifs.getStatus()).isEqualTo(200);

        MockHttpServletRequest touristeAllNotifs = new MockHttpServletRequest("GET", "/api/notifications");
        touristeAllNotifs.addHeader("Authorization", "Bearer " + generateToken(2L, "moussa@uasz.sn", "TOURISTE", 300));
        MockHttpServletResponse resTouristeAllNotifs = new MockHttpServletResponse();
        filter.doFilter(touristeAllNotifs, resTouristeAllNotifs, new MockFilterChain());
        assertThat(resTouristeAllNotifs.getStatus()).isEqualTo(403);
    }

    @Test
    @DisplayName("P07 : Hardening Analytics, Utilisateurs /recherche /statistiques /audit, /internal et /soumettre guide")
    void shouldEnforceP07AnalyticsAuditInternalAndGuideCircuitSubmitRbac() throws Exception {
        // 1. /api/utilisateurs/internal/** toujours bloqué 403 même pour ADMINISTRATEUR
        MockHttpServletRequest internalUsersReq = new MockHttpServletRequest("GET", "/api/utilisateurs/internal/sessions/sess-1");
        internalUsersReq.addHeader("Authorization", "Bearer " + generateToken(1L, "admin@uasz.sn", "ADMINISTRATEUR", 300));
        MockHttpServletResponse resInternalUsers = new MockHttpServletResponse();
        filter.doFilter(internalUsersReq, resInternalUsers, new MockFilterChain());
        assertThat(resInternalUsers.getStatus()).isEqualTo(403);

        // 2. /api/utilisateurs/audit et /statistiques et /recherche réservés à ADMINISTRATEUR (403 pour GESTIONNAIRE_SITE)
        MockHttpServletRequest managerAudit = new MockHttpServletRequest("GET", "/api/utilisateurs/audit");
        managerAudit.addHeader("Authorization", "Bearer " + generateToken(3L, "awa@uasz.sn", "GESTIONNAIRE_SITE", 300));
        MockHttpServletResponse resManagerAudit = new MockHttpServletResponse();
        filter.doFilter(managerAudit, resManagerAudit, new MockFilterChain());
        assertThat(resManagerAudit.getStatus()).isEqualTo(403);

        MockHttpServletRequest adminAudit = new MockHttpServletRequest("GET", "/api/utilisateurs/audit");
        adminAudit.addHeader("Authorization", "Bearer " + generateToken(1L, "admin@uasz.sn", "ADMINISTRATEUR", 300));
        MockHttpServletResponse resAdminAudit = new MockHttpServletResponse();
        MockFilterChain chainAudit = new MockFilterChain();
        filter.doFilter(adminAudit, resAdminAudit, chainAudit);
        assertThat(resAdminAudit.getStatus()).isEqualTo(200);
        assertThat(chainAudit.getRequest()).isNotNull();

        MockHttpServletRequest managerUserStats = new MockHttpServletRequest("GET", "/api/utilisateurs/statistiques");
        managerUserStats.addHeader("Authorization", "Bearer " + generateToken(3L, "awa@uasz.sn", "GESTIONNAIRE_SITE", 300));
        MockHttpServletResponse resManagerStats = new MockHttpServletResponse();
        filter.doFilter(managerUserStats, resManagerStats, new MockFilterChain());
        assertThat(resManagerStats.getStatus()).isEqualTo(403);

        // 3. /api/guides/statistiques autorisé pour GESTIONNAIRE_SITE, refusé pour GUIDE et TOURISTE
        MockHttpServletRequest guideStatsForbidden = new MockHttpServletRequest("GET", "/api/guides/statistiques");
        guideStatsForbidden.addHeader("Authorization", "Bearer " + generateToken(5L, "guide@uasz.sn", "GUIDE", 300));
        MockHttpServletResponse resGuideStats = new MockHttpServletResponse();
        filter.doFilter(guideStatsForbidden, resGuideStats, new MockFilterChain());
        assertThat(resGuideStats.getStatus()).isEqualTo(403);

        MockHttpServletRequest managerGuideStats = new MockHttpServletRequest("GET", "/api/guides/statistiques");
        managerGuideStats.addHeader("Authorization", "Bearer " + generateToken(3L, "awa@uasz.sn", "GESTIONNAIRE_SITE", 300));
        MockHttpServletResponse resManagerGuideStats = new MockHttpServletResponse();
        filter.doFilter(managerGuideStats, resManagerGuideStats, new MockFilterChain());
        assertThat(resManagerGuideStats.getStatus()).isEqualTo(200);

        // 4. POST /api/circuits/{id}/soumettre autorisé pour GUIDE (CIRCUIT:MODIFIER), interdit pour CONSERVATEUR et TOURISTE
        MockHttpServletRequest guideSubmitCircuit = new MockHttpServletRequest("POST", "/api/circuits/42/soumettre");
        attachCookieAuthWithCsrf(guideSubmitCircuit, 5L, "guide@uasz.sn", "GUIDE", 300);
        MockHttpServletResponse resGuideSubmit = new MockHttpServletResponse();
        filter.doFilter(guideSubmitCircuit, resGuideSubmit, new MockFilterChain());
        assertThat(resGuideSubmit.getStatus()).isEqualTo(200);

        MockHttpServletRequest conservateurSubmitCircuit = new MockHttpServletRequest("POST", "/api/circuits/42/soumettre");
        attachCookieAuthWithCsrf(conservateurSubmitCircuit, 4L, "fatou@uasz.sn", "CONSERVATEUR", 300);
        MockHttpServletResponse resConsSubmit = new MockHttpServletResponse();
        filter.doFilter(conservateurSubmitCircuit, resConsSubmit, new MockFilterChain());
        assertThat(resConsSubmit.getStatus()).isEqualTo(403);

        // 5. /api/evenements/statistiques refusé à CONSERVATEUR et TOURISTE, autorisé à GESTIONNAIRE_SITE
        MockHttpServletRequest consEvtStats = new MockHttpServletRequest("GET", "/api/evenements/statistiques");
        consEvtStats.addHeader("Authorization", "Bearer " + generateToken(4L, "fatou@uasz.sn", "CONSERVATEUR", 300));
        MockHttpServletResponse resConsEvtStats = new MockHttpServletResponse();
        filter.doFilter(consEvtStats, resConsEvtStats, new MockFilterChain());
        assertThat(resConsEvtStats.getStatus()).isEqualTo(403);

        MockHttpServletRequest mgrEvtStats = new MockHttpServletRequest("GET", "/api/evenements/statistiques");
        mgrEvtStats.addHeader("Authorization", "Bearer " + generateToken(3L, "awa@uasz.sn", "GESTIONNAIRE_SITE", 300));
        MockHttpServletResponse resMgrEvtStats = new MockHttpServletResponse();
        filter.doFilter(mgrEvtStats, resMgrEvtStats, new MockFilterChain());
        assertThat(resMgrEvtStats.getStatus()).isEqualTo(200);
    }
}
