package com.uasz.ms_circuit.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
@ConditionalOnProperty(name = "security.filter.enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class MicroserviceSecurityFilter extends OncePerRequestFilter {

    private static final String HMAC_ALGO = "HmacSHA256";
    private static final long GATEWAY_TOLERANCE_SECONDS = 60L;
    private static final long FEIGN_TOLERANCE_SECONDS = 30L;

    private final byte[] gatewaySecret;
    private final byte[] interserviceSecret;
    private final Map<String, Long> seenNonces = new ConcurrentHashMap<>();

    public MicroserviceSecurityFilter(
            @Value("${security.session.secret:dev-secret-key-patrimoine-casamance-uasz-32bytes!}") String gatewaySecretStr,
            @Value("${security.interservice.secret:dev-interservice-secret-casamance-uasz-32bytes!}") String interserviceSecretStr
    ) {
        this.gatewaySecret = gatewaySecretStr.getBytes(StandardCharsets.UTF_8);
        this.interserviceSecret = interserviceSecretStr.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("OPTIONS".equalsIgnoreCase(method) || path == null || !path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        purgeExpiredNonces();

        String gatewayToken = request.getHeader("X-Internal-Gateway-Token");
        String serviceSignature = request.getHeader("X-Service-Signature");

        if (serviceSignature != null && !serviceSignature.isBlank()) {
            if (validateInterserviceCall(request, response, serviceSignature)) {
                filterChain.doFilter(request, response);
            }
            return;
        }

        if (gatewayToken != null && !gatewayToken.isBlank()) {
            if (validateGatewayCall(request, response, gatewayToken)) {
                filterChain.doFilter(request, response);
            }
            return;
        }

        writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                "Accès direct non autorisé. La requête doit transiter par l'API Gateway ou un appel interservice signé.");
    }

    private boolean validateGatewayCall(HttpServletRequest request, HttpServletResponse response, String gatewayToken) throws IOException {
        String[] parts = gatewayToken.split("\\.");
        if (parts.length != 2) {
            writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Format de jeton d'enveloppe Gateway invalide.");
            return false;
        }

        long tokenTs;
        try {
            tokenTs = Long.parseLong(parts[0]);
        } catch (NumberFormatException e) {
            writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Horodatage de jeton Gateway invalide.");
            return false;
        }

        long now = Instant.now().getEpochSecond();
        if (Math.abs(now - tokenTs) > GATEWAY_TOLERANCE_SECONDS) {
            writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Jeton d'enveloppe Gateway expiré.");
            return false;
        }

        String userIdHeader = request.getHeader("X-User-Id");
        String roleHeader = request.getHeader("X-User-Roles");

        String userIdForSig = (userIdHeader != null && !userIdHeader.isBlank()) ? userIdHeader.trim() : "ANONYMOUS";
        String roleForSig = (roleHeader != null && !roleHeader.isBlank()) ? roleHeader.trim() : "PUBLIC";

        String expectedSignature = signHmac(userIdForSig + ":" + roleForSig + ":" + tokenTs, gatewaySecret);
        if (!MessageDigest.isEqual(parts[1].getBytes(StandardCharsets.UTF_8), expectedSignature.getBytes(StandardCharsets.UTF_8))) {
            writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Signature de l'enveloppe Gateway falsifiée.");
            return false;
        }
        return true;
    }

    private boolean validateInterserviceCall(HttpServletRequest request, HttpServletResponse response, String serviceSignature) throws IOException {
        String serviceName = request.getHeader("X-Service-Name");
        String timestampStr = request.getHeader("X-Service-Timestamp");
        String nonce = request.getHeader("X-Service-Nonce");

        if (serviceName == null || timestampStr == null || nonce == null) {
            writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "En-têtes d'authentification interservice incomplets.");
            return false;
        }

        long serviceTs;
        try {
            serviceTs = Long.parseLong(timestampStr);
        } catch (NumberFormatException ex) {
            writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Horodatage interservice invalide.");
            return false;
        }

        long now = Instant.now().getEpochSecond();
        if (Math.abs(now - serviceTs) > FEIGN_TOLERANCE_SECONDS) {
            writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Appel interservice expiré (décalage > 30s).");
            return false;
        }

        if (seenNonces.putIfAbsent(nonce, now) != null) {
            log.warn("Tentative de rejeu détectée pour le nonce interservice : {}", nonce);
            writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Attaque par rejeu détectée (nonce déjà consommé).");
            return false;
        }

        String canonicalString = request.getMethod() + "|" + request.getRequestURI() + "|" + serviceName + "|" + serviceTs + "|" + nonce;
        String expectedSignature = signHmac(canonicalString, interserviceSecret);

        if (!MessageDigest.isEqual(serviceSignature.getBytes(StandardCharsets.UTF_8), expectedSignature.getBytes(StandardCharsets.UTF_8))) {
            writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Signature interservice invalide.");
            return false;
        }
        return true;
    }

    private void purgeExpiredNonces() {
        long now = Instant.now().getEpochSecond();
        seenNonces.entrySet().removeIf(entry -> now - entry.getValue() > FEIGN_TOLERANCE_SECONDS * 2);
    }

    private String signHmac(String data, byte[] key) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(key, HMAC_ALGO));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Erreur HMAC", ex);
        }
    }

    private void writeJsonError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        String escaped = message.replace("\"", "\\\"");
        response.getWriter().write("{\"statut\":" + status + ",\"erreur\":\"" + escaped + "\"}");
    }
}
