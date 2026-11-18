package com.uasz.ms_notification.security;

import com.uasz.ms_notification.TestEphemeralSecretsPostProcessor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationSecurityTest {

    private String gatewaySecret;
    private String interserviceSecret;

    private MicroserviceSecurityFilter securityFilter;

    @BeforeEach
    void setUp() {
        gatewaySecret = TestEphemeralSecretsPostProcessor.generateRandomSecret();
        interserviceSecret = TestEphemeralSecretsPostProcessor.generateRandomSecret();
        securityFilter = new MicroserviceSecurityFilter(gatewaySecret, interserviceSecret);
    }

    @Test
    void filter_accesDirectSansSignatureEstRefuse401() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/notifications");
        MockHttpServletResponse response = new MockHttpServletResponse();

        securityFilter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("Accès direct non autorisé");
    }

    @Test
    void filter_avecJetonGatewayValide_estAccepte() throws Exception {
        long ts = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String emptyBodySha = MicroserviceSecurityFilter.sha256Hex(new byte[0]);
        String canonical = "GET|/api/notifications|1|ADMINISTRATEUR|AUDIT:LIRE|admin@uasz.sn|sess-1|" + ts + "|" + nonce + "|" + emptyBodySha;
        String sig = signHmac(canonical, gatewaySecret);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/notifications");
        request.addHeader("X-User-Id", "1");
        request.addHeader("X-User-Roles", "ADMINISTRATEUR");
        request.addHeader("X-User-Permissions", "AUDIT:LIRE");
        request.addHeader("X-User-Email", "admin@uasz.sn");
        request.addHeader("X-User-Session-Id", "sess-1");
        request.addHeader("X-Content-SHA256", emptyBodySha);
        request.addHeader("X-Internal-Gateway-Token", ts + "." + nonce + "." + sig);

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        securityFilter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void filter_jetonGatewayFalsifie_estRefuse403() throws Exception {
        long ts = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/notifications");
        request.addHeader("X-Internal-Gateway-Token", ts + "." + nonce + ".fausseSignature");
        request.addHeader("X-User-Id", "1");
        request.addHeader("X-User-Roles", "ADMINISTRATEUR");

        MockHttpServletResponse response = new MockHttpServletResponse();

        securityFilter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("Signature de l'enveloppe Gateway falsifiée");
    }

    @Test
    void filter_avecAppelFeignValideEtIntegriteCorps_estAccepte() throws Exception {
        long ts = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String method = "POST";
        String uri = "/api/notifications";
        String serviceName = "ms-paiement";
        byte[] body = "{\"destinataire\":\"a@uasz.sn\",\"sujet\":\"Reçu\"}".getBytes(StandardCharsets.UTF_8);
        String bodySha = MicroserviceSecurityFilter.sha256Hex(body);

        String canonical = method + "|" + uri + "|ms-notification|" + serviceName + "|" + ts + "|" + nonce + "|2|TOURISTE|PAIEMENT:INITIER|a@uasz.sn|" + bodySha;
        String signature = signHmac(canonical, interserviceSecret);

        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.setContent(body);
        request.addHeader("X-Service-Name", serviceName);
        request.addHeader("X-Service-Audience", "ms-notification");
        request.addHeader("X-Service-Timestamp", String.valueOf(ts));
        request.addHeader("X-Service-Nonce", nonce);
        request.addHeader("X-Content-SHA256", bodySha);
        request.addHeader("X-User-Id", "2");
        request.addHeader("X-User-Roles", "TOURISTE");
        request.addHeader("X-User-Permissions", "PAIEMENT:INITIER");
        request.addHeader("X-User-Email", "a@uasz.sn");
        request.addHeader("X-Service-Signature", signature);

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        securityFilter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void filter_modificationDuCorpsApresSignatureOuRejeu_estRefusee403() throws Exception {
        long ts = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String method = "POST";
        String uri = "/api/notifications";
        String serviceName = "ms-reservation";
        byte[] body = "{\"destinataire\":\"a@uasz.sn\"}".getBytes(StandardCharsets.UTF_8);
        String bodySha = MicroserviceSecurityFilter.sha256Hex(body);

        String canonical = method + "|" + uri + "|ms-notification|" + serviceName + "|" + ts + "|" + nonce + "|SYSTEM|SYSTEM|||" + bodySha;
        String signature = signHmac(canonical, interserviceSecret);

        // 1. Premier appel valide : accepté
        MockHttpServletRequest req1 = new MockHttpServletRequest(method, uri);
        req1.setContent(body);
        req1.addHeader("X-Service-Name", serviceName);
        req1.addHeader("X-Service-Audience", "ms-notification");
        req1.addHeader("X-Service-Timestamp", String.valueOf(ts));
        req1.addHeader("X-Service-Nonce", nonce);
        req1.addHeader("X-Content-SHA256", bodySha);
        req1.addHeader("X-Service-Signature", signature);
        MockHttpServletResponse resp1 = new MockHttpServletResponse();
        securityFilter.doFilter(req1, resp1, new MockFilterChain());
        assertThat(resp1.getStatus()).isEqualTo(200);

        // 2. Deuxième appel avec même nonce (rejeu) : refusé 403
        MockHttpServletRequest req2 = new MockHttpServletRequest(method, uri);
        req2.setContent(body);
        req2.addHeader("X-Service-Name", serviceName);
        req2.addHeader("X-Service-Audience", "ms-notification");
        req2.addHeader("X-Service-Timestamp", String.valueOf(ts));
        req2.addHeader("X-Service-Nonce", nonce);
        req2.addHeader("X-Content-SHA256", bodySha);
        req2.addHeader("X-Service-Signature", signature);
        MockHttpServletResponse resp2 = new MockHttpServletResponse();
        securityFilter.doFilter(req2, resp2, new MockFilterChain());
        assertThat(resp2.getStatus()).isEqualTo(403);
        assertThat(resp2.getContentAsString()).contains("Attaque par rejeu détectée");

        // 3. Modification du corps après signature : refusé 403
        String nonce3 = UUID.randomUUID().toString();
        String sig3 = signHmac(method + "|" + uri + "|ms-notification|" + serviceName + "|" + ts + "|" + nonce3 + "|SYSTEM|SYSTEM|||" + bodySha, interserviceSecret);
        MockHttpServletRequest reqTampered = new MockHttpServletRequest(method, uri);
        reqTampered.setContent("{\"destinataire\":\"pirate@uasz.sn\"}".getBytes(StandardCharsets.UTF_8));
        reqTampered.addHeader("X-Service-Name", serviceName);
        reqTampered.addHeader("X-Service-Audience", "ms-notification");
        reqTampered.addHeader("X-Service-Timestamp", String.valueOf(ts));
        reqTampered.addHeader("X-Service-Nonce", nonce3);
        reqTampered.addHeader("X-Content-SHA256", bodySha);
        reqTampered.addHeader("X-Service-Signature", sig3);
        MockHttpServletResponse respTampered = new MockHttpServletResponse();
        securityFilter.doFilter(reqTampered, respTampered, new MockFilterChain());
        assertThat(respTampered.getStatus()).isEqualTo(403);
        assertThat(respTampered.getContentAsString()).contains("Intégrité du corps");
    }

    @Test
    void filter_touristeSurMesNotificationsAccepteMaisListeGlobaleRefusee403() throws Exception {
        long ts = Instant.now().getEpochSecond();
        String bodySha = MicroserviceSecurityFilter.sha256Hex(new byte[0]);

        String nonceOk = UUID.randomUUID().toString();
        String canonicalOk = "GET|/api/notifications/mes-notifications|2|TOURISTE|NOTIFICATION:LIRE_PROPRE|moussa@uasz.sn|sess-2|" + ts + "|" + nonceOk + "|" + bodySha;
        MockHttpServletRequest reqOk = new MockHttpServletRequest("GET", "/api/notifications/mes-notifications");
        reqOk.addHeader("X-User-Id", "2");
        reqOk.addHeader("X-User-Roles", "TOURISTE");
        reqOk.addHeader("X-User-Permissions", "NOTIFICATION:LIRE_PROPRE");
        reqOk.addHeader("X-User-Email", "moussa@uasz.sn");
        reqOk.addHeader("X-User-Session-Id", "sess-2");
        reqOk.addHeader("X-Content-SHA256", bodySha);
        reqOk.addHeader("X-Internal-Gateway-Token", ts + "." + nonceOk + "." + signHmac(canonicalOk, gatewaySecret));
        MockHttpServletResponse respOk = new MockHttpServletResponse();
        securityFilter.doFilter(reqOk, respOk, new MockFilterChain());
        assertThat(respOk.getStatus()).isEqualTo(200);

        String nonceDenied = UUID.randomUUID().toString();
        String canonicalDenied = "GET|/api/notifications|2|TOURISTE|NOTIFICATION:LIRE_PROPRE|moussa@uasz.sn|sess-2|" + ts + "|" + nonceDenied + "|" + bodySha;
        MockHttpServletRequest reqDenied = new MockHttpServletRequest("GET", "/api/notifications");
        reqDenied.addHeader("X-User-Id", "2");
        reqDenied.addHeader("X-User-Roles", "TOURISTE");
        reqDenied.addHeader("X-User-Permissions", "NOTIFICATION:LIRE_PROPRE");
        reqDenied.addHeader("X-User-Email", "moussa@uasz.sn");
        reqDenied.addHeader("X-User-Session-Id", "sess-2");
        reqDenied.addHeader("X-Content-SHA256", bodySha);
        reqDenied.addHeader("X-Internal-Gateway-Token", ts + "." + nonceDenied + "." + signHmac(canonicalDenied, gatewaySecret));
        MockHttpServletResponse respDenied = new MockHttpServletResponse();
        securityFilter.doFilter(reqDenied, respDenied, new MockFilterChain());
        assertThat(respDenied.getStatus()).isEqualTo(403);
    }

    @Test
    void filter_appelsInterservicesUtilisateurEtCircuitAcceptesMaisInconnuRefuse403() throws Exception {
        long ts = Instant.now().getEpochSecond();
        byte[] body = "{\"destinataire\":\"guide@uasz.sn\",\"sujet\":\"Ok\"}".getBytes(StandardCharsets.UTF_8);
        String bodySha = MicroserviceSecurityFilter.sha256Hex(body);

        for (String svc : new String[]{"ms-utilisateur", "ms-circuit"}) {
            String nonce = UUID.randomUUID().toString();
            String sig = signHmac("POST|/api/notifications|ms-notification|" + svc + "|" + ts + "|" + nonce + "|1|ADMINISTRATEUR|||" + bodySha, interserviceSecret);
            MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/notifications");
            req.setContent(body);
            req.addHeader("X-Service-Name", svc);
            req.addHeader("X-Service-Audience", "ms-notification");
            req.addHeader("X-Service-Timestamp", String.valueOf(ts));
            req.addHeader("X-Service-Nonce", nonce);
            req.addHeader("X-Content-SHA256", bodySha);
            req.addHeader("X-User-Id", "1");
            req.addHeader("X-User-Roles", "ADMINISTRATEUR");
            req.addHeader("X-Service-Signature", sig);
            MockHttpServletResponse resp = new MockHttpServletResponse();
            securityFilter.doFilter(req, resp, new MockFilterChain());
            assertThat(resp.getStatus()).isEqualTo(200);
        }

        String badNonce = UUID.randomUUID().toString();
        String badSig = signHmac("POST|/api/notifications|ms-notification|ms-inconnu|" + ts + "|" + badNonce + "|1|ADMINISTRATEUR|||" + bodySha, interserviceSecret);
        MockHttpServletRequest badReq = new MockHttpServletRequest("POST", "/api/notifications");
        badReq.setContent(body);
        badReq.addHeader("X-Service-Name", "ms-inconnu");
        badReq.addHeader("X-Service-Audience", "ms-notification");
        badReq.addHeader("X-Service-Timestamp", String.valueOf(ts));
        badReq.addHeader("X-Service-Nonce", badNonce);
        badReq.addHeader("X-Content-SHA256", bodySha);
        badReq.addHeader("X-User-Id", "1");
        badReq.addHeader("X-User-Roles", "ADMINISTRATEUR");
        badReq.addHeader("X-Service-Signature", badSig);
        MockHttpServletResponse badResp = new MockHttpServletResponse();
        securityFilter.doFilter(badReq, badResp, new MockFilterChain());
        assertThat(badResp.getStatus()).isEqualTo(403);
    }

    private String signHmac(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }
}
