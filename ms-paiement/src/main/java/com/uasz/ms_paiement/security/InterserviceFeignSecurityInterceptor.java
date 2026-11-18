package com.uasz.ms_paiement.security;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Component
public class InterserviceFeignSecurityInterceptor implements RequestInterceptor {

    private static final String SERVICE_NAME = "ms-paiement";
    private static final String HMAC_ALGO = "HmacSHA256";

    private final byte[] secretKey;

    public InterserviceFeignSecurityInterceptor(
            @Value("${security.interservice.secret}") String secret
    ) {
        MicroserviceSecurityFilter.validateCryptographicSecret(secret, "security.interservice.secret");
        this.secretKey = secret.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public void apply(RequestTemplate template) {
        long timestamp = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String method = template.method() != null ? template.method().toUpperCase(Locale.ROOT) : "GET";
        String path = normalizePath(template.path());
        String audience = template.feignTarget() != null && template.feignTarget().name() != null
                ? template.feignTarget().name()
                : "unknown-target";

        byte[] bodyBytes = template.body() != null ? template.body() : new byte[0];
        String bodySha256 = sha256Hex(bodyBytes);

        SecurityUserContext current = SecurityUserContextHolder.getContext();
        String userId = (current != null && current.userId() != null) ? String.valueOf(current.userId()) : "SYSTEM";
        String role = (current != null && current.role() != null && !current.role().isBlank()) ? current.role() : "SYSTEM";
        String perms = (current != null && current.permissions() != null) ? String.join(",", current.permissions()) : "";
        String email = (current != null && current.email() != null) ? current.email() : "";

        String canonicalString = method + "|" + path + "|" + audience + "|" + SERVICE_NAME + "|"
                + timestamp + "|" + nonce + "|" + userId + "|" + role + "|" + perms + "|" + email + "|" + bodySha256;
        String signature = sign(canonicalString);

        template.header("X-Service-Name", SERVICE_NAME);
        template.header("X-Service-Audience", audience);
        template.header("X-Service-Timestamp", String.valueOf(timestamp));
        template.header("X-Service-Nonce", nonce);
        template.header("X-Content-SHA256", bodySha256);
        template.header("X-User-Id", userId);
        template.header("X-User-Roles", role);
        template.header("X-User-Permissions", perms);
        template.header("X-User-Email", email);
        template.header("X-Service-Signature", signature);
    }

    public static String normalizePath(String uri) {
        if (uri == null) return "";
        String trimmed = uri.trim();
        int qIdx = trimmed.indexOf('?');
        if (qIdx >= 0) {
            trimmed = trimmed.substring(0, qIdx);
        }
        while (trimmed.length() > 1 && trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    public static String sha256Hex(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(data != null ? data : new byte[0]));
        } catch (Exception ex) {
            throw new IllegalStateException("Erreur de hachage SHA-256", ex);
        }
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(secretKey, HMAC_ALGO));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Impossible de signer cryptographiquement la requête interservice", ex);
        }
    }
}
