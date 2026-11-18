package com.uasz.api_gateway.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
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
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class GatewayAuthorizationFilter extends OncePerRequestFilter {

    public static final String COOKIE_NAME = "PATRIMOINE_SESSION";
    private static final String HMAC_ALGO = "HmacSHA256";
    private static final Set<String> STAFF_ROLES = Set.of("ADMINISTRATEUR", "GESTIONNAIRE_SITE", "CONSERVATEUR");
    private static final int MIN_SECRET_BYTES = 32;

    private static final int LOGIN_RATE_LIMIT_PER_MINUTE = 10;
    private final Map<String, LoginAttemptTracker> ipLoginAttempts = new ConcurrentHashMap<>();

    private record LoginAttemptTracker(int count, long windowStartEpoch) {}

    private final byte[] secretKey;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GatewayAuthorizationFilter(
            @Value("${security.session.secret}") String secret
    ) {
        if (secret == null || secret.trim().isEmpty() || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("Le secret HMAC de session doit être configuré et comporter au moins 32 octets (256 bits d'entropie).");
        }
        if (secret.toUpperCase().contains("CHANGE_ME") || secret.toUpperCase().contains("REPLACE_ME")) {
            throw new IllegalStateException("Le secret HMAC de session ne peut pas être un marqueur d'exemple (CHANGE_ME). Définissez une clé cryptographique aléatoire.");
        }
        this.secretKey = secret.getBytes(StandardCharsets.UTF_8);
    }

    public record VerifiedToken(Long userId, String email, String role) {}

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String rawPath = request.getRequestURI();
        String method = request.getMethod();

        if ("OPTIONS".equalsIgnoreCase(method) || rawPath == null || !rawPath.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String path = normalizePath(rawPath);

        // Rate limiting pour les tentatives de connexion au niveau Gateway
        if (path.equals("/api/utilisateurs/connexion") && "POST".equalsIgnoreCase(method)) {
            String clientIp = extractClientIp(request);
            if (isLoginRateLimited(clientIp)) {
                writeJsonError(response, 429, "Trop de tentatives de connexion depuis cette adresse IP. Veuillez patienter une minute.");
                return;
            }
        }

        String rawToken = extractToken(request);
        VerifiedToken token = null;
        String tokenError = null;

        if (rawToken != null) {
            try {
                token = verifyToken(rawToken);
            } catch (IllegalArgumentException ex) {
                tokenError = ex.getMessage();
            }
        }

        // 1. Routes de gestion des utilisateurs (/api/utilisateurs)
        if (path.equals("/api/utilisateurs/me")) {
            if (token == null) {
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        tokenError != null ? tokenError : "Authentification requise pour accéder à votre profil.");
                return;
            }
        } else if (path.equals("/api/utilisateurs") && "GET".equalsIgnoreCase(method)) {
            if (token == null) {
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Authentification requise.");
                return;
            }
            if (!"ADMINISTRATEUR".equals(token.role())) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : seul un administrateur peut consulter la liste des utilisateurs.");
                return;
            }
        } else if (path.equals("/api/utilisateurs/admin") && "POST".equalsIgnoreCase(method)) {
            if (token == null) {
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Authentification requise.");
                return;
            }
            if (!"ADMINISTRATEUR".equals(token.role())) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : seul un administrateur peut créer des comptes staff.");
                return;
            }
        } else if (path.startsWith("/api/utilisateurs/")
                && !path.equals("/api/utilisateurs/connexion")
                && !path.equals("/api/utilisateurs/deconnexion")
                && !path.equals("/api/utilisateurs/refresh")
                && "DELETE".equalsIgnoreCase(method)) {
            if (token == null) {
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED, "Authentification requise.");
                return;
            }
            if (!"ADMINISTRATEUR".equals(token.role())) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : seul un administrateur peut supprimer un compte.");
                return;
            }
        }

        // 2. Protection des mutations sur le catalogue (Patrimoines, Circuits, Événements)
        // FAIL-CLOSED : toute méthode de mutation (POST, PUT, PATCH, DELETE) requiert l'authentification et un rôle staff.
        // Les méthodes de consultation (GET, HEAD) restent publiques.
        boolean isCatalogPath = path.equals("/api/patrimoines") || path.startsWith("/api/patrimoines/")
                || path.equals("/api/circuits") || path.startsWith("/api/circuits/")
                || path.equals("/api/evenements") || path.startsWith("/api/evenements/");
        boolean isMutationMethod = "POST".equalsIgnoreCase(method)
                || "PUT".equalsIgnoreCase(method)
                || "PATCH".equalsIgnoreCase(method)
                || "DELETE".equalsIgnoreCase(method);

        if (isCatalogPath && isMutationMethod) {
            if (token == null) {
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        tokenError != null ? tokenError : "Authentification requise pour effectuer une modification sur le catalogue.");
                return;
            }
            if (!STAFF_ROLES.contains(token.role())) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : rôle du personnel requis (ADMINISTRATEUR, GESTIONNAIRE_SITE, CONSERVATEUR).");
                return;
            }
        }

        // 3. Protection des routes de Réservation et Paiement (Toutes requièrent une authentification)
        boolean isReservationPath = path.equals("/api/reservations") || path.startsWith("/api/reservations/");
        boolean isPaiementPath = path.equals("/api/paiements") || path.startsWith("/api/paiements/");

        if ((isReservationPath || isPaiementPath) && token == null) {
            writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                    tokenError != null ? tokenError : "Authentification requise pour effectuer cette opération.");
            return;
        }

        // 4. Assainissement des en-têtes et injection de l'enveloppe signée Gateway
        SanitizedGatewayRequestWrapper wrappedRequest = new SanitizedGatewayRequestWrapper(request);
        long ts = Instant.now().getEpochSecond();

        if (token != null) {
            wrappedRequest.setHeader("X-User-Id", String.valueOf(token.userId()));
            wrappedRequest.setHeader("X-User-Roles", token.role());
            wrappedRequest.setHeader("X-User-Email", token.email() != null ? token.email() : "");
            String signature = sign(token.userId() + ":" + token.role() + ":" + ts);
            wrappedRequest.setHeader("X-Internal-Gateway-Token", ts + "." + signature);
        } else {
            wrappedRequest.setHeader("X-User-Id", "ANONYMOUS");
            wrappedRequest.setHeader("X-User-Roles", "PUBLIC");
            wrappedRequest.setHeader("X-User-Email", "");
            String signature = sign("ANONYMOUS:PUBLIC:" + ts);
            wrappedRequest.setHeader("X-Internal-Gateway-Token", ts + "." + signature);
        }

        filterChain.doFilter(wrappedRequest, response);
    }

    private String normalizePath(String uri) {
        if (uri == null) return "";
        String trimmed = uri.trim();
        while (trimmed.length() > 1 && trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private String extractToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (COOKIE_NAME.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                    return cookie.getValue().trim();
                }
            }
        }
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        return null;
    }

    public VerifiedToken verifyToken(String token) {
        String[] parts = token.split("\\.");
        if (parts.length == 3) {
            // Standard JWT (RFC 7519)
            String headerB64 = parts[0];
            String payloadB64 = parts[1];
            String expectedSig = sign(headerB64 + "." + payloadB64);
            if (!MessageDigest.isEqual(
                    parts[2].getBytes(StandardCharsets.UTF_8),
                    expectedSig.getBytes(StandardCharsets.UTF_8))) {
                throw new IllegalArgumentException("Signature de session invalide.");
            }
            try {
                String payloadJson = new String(Base64.getUrlDecoder().decode(payloadB64), StandardCharsets.UTF_8);
                Map<String, Object> claims = objectMapper.readValue(payloadJson, new TypeReference<>() {});
                long exp = ((Number) claims.get("exp")).longValue();
                if (Instant.now().getEpochSecond() > exp) {
                    throw new IllegalArgumentException("Votre session a expiré. Veuillez vous reconnecter.");
                }
                Long userId = Long.valueOf(claims.get("sub").toString());
                String email = (String) claims.get("email");
                String role = (String) claims.get("role");
                return new VerifiedToken(userId, email, role);
            } catch (IllegalArgumentException ex) {
                throw ex;
            } catch (Exception ex) {
                throw new IllegalArgumentException("Jeton de session illisible.");
            }
        } else if (parts.length == 2) {
            // Format legacy 2 parties (compatibilité ascendante)
            String expectedSig = sign(parts[0]);
            if (!MessageDigest.isEqual(
                    parts[1].getBytes(StandardCharsets.UTF_8),
                    expectedSig.getBytes(StandardCharsets.UTF_8))) {
                throw new IllegalArgumentException("Signature de session invalide.");
            }
            try {
                String rawPayload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
                String[] fields = rawPayload.split("\\|", 5);
                if (fields.length != 5) {
                    throw new IllegalArgumentException("Structure de session invalide.");
                }
                long exp = Long.parseLong(fields[3]);
                if (Instant.now().getEpochSecond() > exp) {
                    throw new IllegalArgumentException("Votre session a expiré. Veuillez vous reconnecter.");
                }
                return new VerifiedToken(Long.parseLong(fields[0]), fields[1], fields[2]);
            } catch (IllegalArgumentException ex) {
                throw ex;
            } catch (Exception ex) {
                throw new IllegalArgumentException("Jeton de session illisible.");
            }
        } else {
            throw new IllegalArgumentException("Jeton de session invalide.");
        }
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(secretKey, HMAC_ALGO));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Erreur de vérification HMAC", ex);
        }
    }

    private boolean isLoginRateLimited(String ip) {
        long now = Instant.now().getEpochSecond();
        LoginAttemptTracker tracker = ipLoginAttempts.compute(ip, (k, existing) -> {
            if (existing == null || (now - existing.windowStartEpoch() > 60)) {
                return new LoginAttemptTracker(1, now);
            }
            return new LoginAttemptTracker(existing.count() + 1, existing.windowStartEpoch());
        });
        return tracker.count() > LOGIN_RATE_LIMIT_PER_MINUTE;
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return "0.0.0.0";
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "0.0.0.0";
    }

    private void writeJsonError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        String escaped = message.replace("\"", "\\\"");
        response.getWriter().write("{\"statut\":" + status + ",\"erreur\":\"" + escaped + "\"}");
    }
}
