package com.uasz.ms_patrimoine.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
@ConditionalOnProperty(name = "security.filter.enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class MicroserviceSecurityFilter extends OncePerRequestFilter {

    public static final String SERVICE_NAME = "ms-patrimoine";
    private static final String HMAC_ALGO = "HmacSHA256";
    private static final long GATEWAY_TOLERANCE_SECONDS = 60L;
    private static final long FEIGN_TOLERANCE_SECONDS = 30L;
    private static final int MIN_SECRET_BYTES = 32;
    private static final int MIN_DISTINCT_CHARS = 10;

    private static final List<String> FORBIDDEN_SECRET_PATTERNS = List.of(
            "CHANGE_ME", "REPLACE_ME", "DEV-SECRET", "DEV-INTERSERVICE",
            "DEFAULT", "EXAMPLE", "PASSWORD", "12345678"
    );

    private final byte[] gatewaySecret;
    private final byte[] interserviceSecret;
    private final Map<String, Long> seenNonces = new ConcurrentHashMap<>();

    public MicroserviceSecurityFilter(
            @Value("${security.session.secret}") String gatewaySecretStr,
            @Value("${security.interservice.secret}") String interserviceSecretStr
    ) {
        validateCryptographicSecret(gatewaySecretStr, "security.session.secret");
        validateCryptographicSecret(interserviceSecretStr, "security.interservice.secret");
        this.gatewaySecret = gatewaySecretStr.getBytes(StandardCharsets.UTF_8);
        this.interserviceSecret = interserviceSecretStr.getBytes(StandardCharsets.UTF_8);
        if (MessageDigest.isEqual(this.gatewaySecret, this.interserviceSecret)) {
            throw new IllegalStateException("Les clés security.session.secret et security.interservice.secret doivent être distinctes.");
        }
    }

    public static void validateCryptographicSecret(String secret, String propertyName) {
        if (secret == null || secret.trim().isEmpty()) {
            throw new IllegalStateException("Le secret cryptographique '" + propertyName + "' est obligatoire et ne peut pas être vide.");
        }
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("Le secret cryptographique '" + propertyName + "' doit comporter au moins 32 octets (256 bits).");
        }
        String upper = secret.toUpperCase(Locale.ROOT);
        for (String forbidden : FORBIDDEN_SECRET_PATTERNS) {
            if (upper.contains(forbidden)) {
                throw new IllegalStateException("Le secret cryptographique '" + propertyName + "' contient un motif interdit ou prévisible (" + forbidden + ").");
            }
        }
        if (secret.chars().distinct().count() < MIN_DISTINCT_CHARS) {
            throw new IllegalStateException("Le secret cryptographique '" + propertyName + "' présente une entropie insuffisante.");
        }
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
        CachedBodyHttpServletRequest cachedRequest = new CachedBodyHttpServletRequest(request);

        String gatewayToken = cachedRequest.getHeader("X-Internal-Gateway-Token");
        String serviceSignature = cachedRequest.getHeader("X-Service-Signature");

        try {
            if (serviceSignature != null && !serviceSignature.isBlank()) {
                if (validateInterserviceCall(cachedRequest, response, serviceSignature)) {
                    filterChain.doFilter(cachedRequest, response);
                }
                return;
            }

            if (gatewayToken != null && !gatewayToken.isBlank()) {
                if (validateGatewayCall(cachedRequest, response, gatewayToken)) {
                    filterChain.doFilter(cachedRequest, response);
                }
                return;
            }

            writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Accès direct non autorisé. La requête doit transiter par l'API Gateway ou un appel interservice signé.");
        } finally {
            SecurityUserContextHolder.clear();
        }
    }

    private boolean validateGatewayCall(CachedBodyHttpServletRequest request,
                                        HttpServletResponse response,
                                        String gatewayToken) throws IOException {
        String[] parts = gatewayToken.split("\\.");
        if (parts.length != 3) {
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

        String nonce = parts[1];
        String providedSignature = parts[2];
        if (nonce.isBlank()) {
            writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Nonce d'enveloppe Gateway manquant.");
            return false;
        }

        long now = Instant.now().getEpochSecond();
        if (Math.abs(now - tokenTs) > GATEWAY_TOLERANCE_SECONDS) {
            writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Jeton d'enveloppe Gateway expiré.");
            return false;
        }

        String actualBodySha256 = sha256Hex(request.getCachedBody());
        String headerBodySha256 = request.getHeader("X-Content-SHA256");
        if (headerBodySha256 != null && !headerBodySha256.isBlank()
                && !MessageDigest.isEqual(headerBodySha256.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8),
                actualBodySha256.getBytes(StandardCharsets.UTF_8))) {
            writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Intégrité du corps de la requête compromise (hash SHA-256 invalide).");
            return false;
        }

        String upperMethod = request.getMethod() != null ? request.getMethod().toUpperCase(Locale.ROOT) : "GET";
        String normalizedPath = normalizePath(request.getRequestURI());
        String userIdForSig = defaultIfBlank(request.getHeader("X-User-Id"), "ANONYMOUS");
        String roleForSig = defaultIfBlank(request.getHeader("X-User-Roles"), "PUBLIC");
        String permsForSig = defaultIfNull(request.getHeader("X-User-Permissions"));
        String emailForSig = defaultIfNull(request.getHeader("X-User-Email"));
        String sessionIdForSig = defaultIfNull(request.getHeader("X-User-Session-Id"));

        String canonicalEnvelope = upperMethod + "|" + normalizedPath + "|" + userIdForSig + "|" + roleForSig + "|"
                + permsForSig + "|" + emailForSig + "|" + sessionIdForSig + "|" + tokenTs + "|" + nonce + "|" + actualBodySha256;
        String expectedSignature = signHmac(canonicalEnvelope, gatewaySecret);

        if (!MessageDigest.isEqual(providedSignature.getBytes(StandardCharsets.UTF_8), expectedSignature.getBytes(StandardCharsets.UTF_8))) {
            writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Signature de l'enveloppe Gateway falsifiée.");
            return false;
        }

        if (seenNonces.putIfAbsent("GW:" + nonce, now) != null) {
            log.warn("Tentative de rejeu détectée sur l'enveloppe Gateway : {}", nonce);
            writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Attaque par rejeu détectée sur l'enveloppe Gateway.");
            return false;
        }

        Long parsedUserId = parseUserId(userIdForSig);
        List<String> permissions = parsePermissions(permsForSig, roleForSig);

        SecurityUserContextHolder.setContext(new SecurityUserContext(parsedUserId, roleForSig, permissions, emailForSig, false, null));
        return true;
    }

    private boolean validateInterserviceCall(CachedBodyHttpServletRequest request,
                                             HttpServletResponse response,
                                             String serviceSignature) throws IOException {
        String callerService = request.getHeader("X-Service-Name");
        String audience = request.getHeader("X-Service-Audience");
        String timestampStr = request.getHeader("X-Service-Timestamp");
        String nonce = request.getHeader("X-Service-Nonce");
        String headerBodySha256 = request.getHeader("X-Content-SHA256");

        if (callerService == null || audience == null || timestampStr == null || nonce == null || headerBodySha256 == null) {
            writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "En-têtes d'authentification interservice incomplets.");
            return false;
        }

        if (!SERVICE_NAME.equals(audience.trim())) {
            writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                    "Audience interservice invalide : attendu '" + SERVICE_NAME + "', reçu '" + audience + "'.");
            return false;
        }

        String upperMethod = request.getMethod() != null ? request.getMethod().toUpperCase(Locale.ROOT) : "GET";
        String normalizedPath = normalizePath(request.getRequestURI());

        if (!isCallerServiceAuthorized(callerService.trim(), upperMethod, normalizedPath)) {
            writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                    "Appel interservice non autorisé par la matrice ACL : " + callerService + " -> " + SERVICE_NAME + " (" + upperMethod + " " + normalizedPath + ").");
            return false;
        }

        long serviceTs;
        try {
            serviceTs = Long.parseLong(timestampStr.trim());
        } catch (NumberFormatException ex) {
            writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Horodatage interservice invalide.");
            return false;
        }

        long now = Instant.now().getEpochSecond();
        if (Math.abs(now - serviceTs) > FEIGN_TOLERANCE_SECONDS) {
            writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Appel interservice expiré (décalage > 30s).");
            return false;
        }

        String actualBodySha256 = sha256Hex(request.getCachedBody());
        if (!MessageDigest.isEqual(
                headerBodySha256.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8),
                actualBodySha256.getBytes(StandardCharsets.UTF_8))) {
            writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                    "Intégrité du corps de la requête compromise (hash SHA-256 invalide).");
            return false;
        }

        String userIdForSig = defaultIfBlank(request.getHeader("X-User-Id"), "SYSTEM");
        String roleForSig = defaultIfBlank(request.getHeader("X-User-Roles"), "SYSTEM");
        String permsForSig = defaultIfNull(request.getHeader("X-User-Permissions"));
        String emailForSig = defaultIfNull(request.getHeader("X-User-Email"));

        String canonicalString = upperMethod + "|" + normalizedPath + "|" + SERVICE_NAME + "|" + callerService.trim() + "|"
                + serviceTs + "|" + nonce.trim() + "|" + userIdForSig + "|" + roleForSig + "|"
                + permsForSig + "|" + emailForSig + "|" + actualBodySha256;
        String expectedSignature = signHmac(canonicalString, interserviceSecret);

        if (!MessageDigest.isEqual(serviceSignature.trim().getBytes(StandardCharsets.UTF_8), expectedSignature.getBytes(StandardCharsets.UTF_8))) {
            writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Signature interservice invalide ou falsification d'identité détectée.");
            return false;
        }

        if (seenNonces.putIfAbsent("SVC:" + callerService.trim() + ":" + nonce.trim(), now) != null) {
            log.warn("Tentative de rejeu détectée pour le nonce interservice : {}", nonce);
            writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Attaque par rejeu détectée (nonce déjà consommé).");
            return false;
        }

        Long propagatedUserId = parseUserId(userIdForSig);
        List<String> permissions = parsePermissions(permsForSig, roleForSig);

        SecurityUserContextHolder.setContext(new SecurityUserContext(
                propagatedUserId, roleForSig, permissions, emailForSig, true, callerService.trim()));
        return true;
    }

    private boolean isCallerServiceAuthorized(String callerService, String method, String normalizedPath) {
        return ("ms-circuit".equals(callerService) || "ms-evenement".equals(callerService) || "ms-reservation".equals(callerService))
                && "GET".equalsIgnoreCase(method)
                && normalizedPath.startsWith("/api/patrimoines");
    }

    private Long parseUserId(String userIdStr) {
        if (userIdStr == null || userIdStr.isBlank() || "ANONYMOUS".equals(userIdStr) || "SYSTEM".equals(userIdStr)) {
            return null;
        }
        try {
            return Long.parseLong(userIdStr.trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private List<String> parsePermissions(String permsCsv, String role) {
        if (permsCsv != null && !permsCsv.isBlank()) {
            return Arrays.stream(permsCsv.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList();
        }
        return SecurityUserContext.defaultPermissionsForRole(role);
    }

    private String defaultIfBlank(String val, String fallback) {
        return (val != null && !val.isBlank()) ? val.trim() : fallback;
    }

    private String defaultIfNull(String val) {
        return val != null ? val.trim() : "";
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
            throw new IllegalStateException("Erreur SHA-256", ex);
        }
    }

    private void purgeExpiredNonces() {
        long now = Instant.now().getEpochSecond();
        seenNonces.entrySet().removeIf(entry -> now - entry.getValue() > GATEWAY_TOLERANCE_SECONDS * 2);
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

    public static class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {
        private final byte[] cachedBody;

        public CachedBodyHttpServletRequest(HttpServletRequest request) throws IOException {
            super(request);
            byte[] body = new byte[0];
            if (request.getInputStream() != null) {
                body = StreamUtils.copyToByteArray(request.getInputStream());
            }
            this.cachedBody = body;
        }

        public byte[] getCachedBody() {
            return cachedBody;
        }

        @Override
        public ServletInputStream getInputStream() {
            final ByteArrayInputStream bais = new ByteArrayInputStream(this.cachedBody);
            return new ServletInputStream() {
                @Override
                public boolean isFinished() {
                    return bais.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener readListener) {
                }

                @Override
                public int read() {
                    return bais.read();
                }

                @Override
                public int read(byte[] b, int off, int len) {
                    return bais.read(b, off, len);
                }
            };
        }

        @Override
        public BufferedReader getReader() {
            return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
        }
    }
}
