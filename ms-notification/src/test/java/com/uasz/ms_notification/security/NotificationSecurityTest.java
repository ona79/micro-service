package com.uasz.ms_notification.security;

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

    private static final String GATEWAY_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    private static final String INTERSERVICE_SECRET = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

    private MicroserviceSecurityFilter securityFilter;

    @BeforeEach
    void setUp() {
        securityFilter = new MicroserviceSecurityFilter(GATEWAY_SECRET, INTERSERVICE_SECRET);
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
        String sig = signHmac("1:ADMINISTRATEUR:" + ts, GATEWAY_SECRET);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/notifications");
        request.addHeader("X-Internal-Gateway-Token", ts + "." + sig);
        request.addHeader("X-User-Id", "1");
        request.addHeader("X-User-Roles", "ADMINISTRATEUR");

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        securityFilter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void filter_jetonGatewayFalsifie_estRefuse403() throws Exception {
        long ts = Instant.now().getEpochSecond();

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/notifications");
        request.addHeader("X-Internal-Gateway-Token", ts + ".fausseSignature");
        request.addHeader("X-User-Id", "1");
        request.addHeader("X-User-Roles", "ADMINISTRATEUR");

        MockHttpServletResponse response = new MockHttpServletResponse();

        securityFilter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("Signature de l'enveloppe Gateway falsifiée");
    }

    @Test
    void filter_avecAppelFeignValide_estAccepte() throws Exception {
        long ts = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String method = "POST";
        String uri = "/api/notifications";
        String serviceName = "ms-paiement";

        String canonical = method + "|" + uri + "|" + serviceName + "|" + ts + "|" + nonce;
        String signature = signHmac(canonical, INTERSERVICE_SECRET);

        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.addHeader("X-Service-Name", serviceName);
        request.addHeader("X-Service-Timestamp", String.valueOf(ts));
        request.addHeader("X-Service-Nonce", nonce);
        request.addHeader("X-Service-Signature", signature);

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        securityFilter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void filter_attaqueParRejeuSurAppelFeign_estRefusee403() throws Exception {
        long ts = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String method = "POST";
        String uri = "/api/notifications";
        String serviceName = "ms-reservation";

        String canonical = method + "|" + uri + "|" + serviceName + "|" + ts + "|" + nonce;
        String signature = signHmac(canonical, INTERSERVICE_SECRET);

        // Premier appel : accepté
        MockHttpServletRequest req1 = new MockHttpServletRequest(method, uri);
        req1.addHeader("X-Service-Name", serviceName);
        req1.addHeader("X-Service-Timestamp", String.valueOf(ts));
        req1.addHeader("X-Service-Nonce", nonce);
        req1.addHeader("X-Service-Signature", signature);
        MockHttpServletResponse resp1 = new MockHttpServletResponse();
        securityFilter.doFilter(req1, resp1, new MockFilterChain());
        assertThat(resp1.getStatus()).isEqualTo(200);

        // Deuxième appel avec même nonce (rejeu) : refusé 403
        MockHttpServletRequest req2 = new MockHttpServletRequest(method, uri);
        req2.addHeader("X-Service-Name", serviceName);
        req2.addHeader("X-Service-Timestamp", String.valueOf(ts));
        req2.addHeader("X-Service-Nonce", nonce);
        req2.addHeader("X-Service-Signature", signature);
        MockHttpServletResponse resp2 = new MockHttpServletResponse();
        securityFilter.doFilter(req2, resp2, new MockFilterChain());
        assertThat(resp2.getStatus()).isEqualTo(403);
        assertThat(resp2.getContentAsString()).contains("Attaque par rejeu détectée");
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
