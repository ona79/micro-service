package com.uasz.ms_utilisateur.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.exceptions.ForbiddenException;
import com.uasz.ms_utilisateur.exceptions.UnauthorizedException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class SessionTokenService {

    public static final String COOKIE_NAME = "PATRIMOINE_SESSION";
    public static final String REFRESH_COOKIE_NAME = "PATRIMOINE_REFRESH";
    public static final String CSRF_COOKIE_NAME = "XSRF-TOKEN";
    public static final String CSRF_HEADER_NAME = "X-XSRF-TOKEN";
    public static final String ISSUER = "casamance-auth-service";

    private static final String HMAC_ALGO = "HmacSHA256";
    public static final long ACCESS_TOKEN_TTL_SECONDS = 15 * 60L; // 15 minutes
    public static final long REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 3600L; // 7 jours
    private static final int MIN_SECRET_BYTES = 32;
    private static final int MIN_DISTINCT_CHARS = 10;

    private static final List<String> FORBIDDEN_SECRET_PATTERNS = List.of(
            "CHANGE_ME", "REPLACE_ME", "DEV-SECRET", "DEV-INTERSERVICE",
            "DEFAULT", "EXAMPLE", "PASSWORD", "12345678"
    );

    private static final String JWT_HEADER_B64 = Base64.getUrlEncoder().withoutPadding()
            .encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));

    private final byte[] secretKey;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SecureRandom secureRandom = new SecureRandom();

    public SessionTokenService(
            @Value("${security.session.secret}") String secret
    ) {
        validateCryptographicSecret(secret, "security.session.secret");
        this.secretKey = secret.getBytes(StandardCharsets.UTF_8);
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
                throw new IllegalStateException("Le secret cryptographique '" + propertyName + "' contient un motif interdit ou prévisible (" + forbidden + "). Utilisez une clé générée via CSPRNG.");
            }
        }
        long distinctChars = secret.chars().distinct().count();
        if (distinctChars < MIN_DISTINCT_CHARS) {
            throw new IllegalStateException("Le secret cryptographique '" + propertyName + "' présente une entropie insuffisante (trop peu de caractères distincts).");
        }
    }

    public record SessionClaims(
            Long userId,
            String email,
            RoleUtilisateur role,
            List<String> permissions,
            String sessionId,
            long expiresAtEpochSeconds,
            String tokenId
    ) {}

    public String createToken(UtilisateurDto user) {
        return createToken(user, UUID.randomUUID().toString(), Collections.emptyList(), ACCESS_TOKEN_TTL_SECONDS);
    }

    public String createToken(UtilisateurDto user, String sessionId, List<String> permissions) {
        return createToken(user, sessionId, permissions, ACCESS_TOKEN_TTL_SECONDS);
    }

    public String createToken(UtilisateurDto user, String sessionId, List<String> permissions, long ttlSeconds) {
        long now = Instant.now().getEpochSecond();
        long exp = now + ttlSeconds;
        String jti = UUID.randomUUID().toString();
        String roleName = user.getRole() != null ? user.getRole().name() : RoleUtilisateur.TOURISTE.name();
        String effectiveSessionId = (sessionId != null && !sessionId.isBlank()) ? sessionId : UUID.randomUUID().toString();
        List<String> effectivePermissions = (permissions != null) ? permissions : Collections.emptyList();

        Map<String, Object> payloadMap = Map.of(
                "iss", ISSUER,
                "sub", String.valueOf(user.getId()),
                "email", user.getEmail() != null ? user.getEmail() : "",
                "role", roleName,
                "permissions", effectivePermissions,
                "sessionId", effectiveSessionId,
                "jti", jti,
                "iat", now,
                "exp", exp
        );

        try {
            String payloadJson = objectMapper.writeValueAsString(payloadMap);
            String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
            String signature = sign(JWT_HEADER_B64 + "." + encodedPayload);
            return JWT_HEADER_B64 + "." + encodedPayload + "." + signature;
        } catch (Exception ex) {
            throw new IllegalStateException("Erreur lors de la génération du jeton JWT", ex);
        }
    }

    public SessionClaims verifyToken(String token) {
        if (token == null || token.isBlank()) {
            throw new UnauthorizedException("Session d'authentification absente. Veuillez vous connecter.");
        }
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            if (parts.length == 2) {
                return verifyLegacyToken(parts[0], parts[1]);
            }
            throw new UnauthorizedException("Jeton de session invalide (format JWT non respecté).");
        }

        String headerB64 = parts[0];
        String payloadB64 = parts[1];
        String providedSig = parts[2];

        String expectedSig = sign(headerB64 + "." + payloadB64);
        if (!MessageDigest.isEqual(
                providedSig.getBytes(StandardCharsets.UTF_8),
                expectedSig.getBytes(StandardCharsets.UTF_8))) {
            throw new UnauthorizedException("Signature de session invalide.");
        }

        try {
            String payloadJson = new String(Base64.getUrlDecoder().decode(payloadB64), StandardCharsets.UTF_8);
            Map<String, Object> claims = objectMapper.readValue(payloadJson, new TypeReference<>() {});

            String issuer = (String) claims.get("iss");
            if (issuer != null && !ISSUER.equals(issuer)) {
                throw new UnauthorizedException("Émetteur de jeton non reconnu : " + issuer);
            }

            Long userId = Long.valueOf(claims.get("sub").toString());
            String email = (String) claims.get("email");
            RoleUtilisateur role = RoleUtilisateur.valueOf((String) claims.get("role"));
            long exp = ((Number) claims.get("exp")).longValue();
            String jti = (String) claims.get("jti");
            String sessionId = (String) claims.get("sessionId");

            @SuppressWarnings("unchecked")
            List<String> permissions = claims.get("permissions") instanceof List<?> list
                    ? (List<String>) list
                    : Collections.emptyList();

            if (Instant.now().getEpochSecond() > exp) {
                throw new UnauthorizedException("Votre session a expiré. Veuillez renouveler votre session.");
            }

            return new SessionClaims(userId, email, role, permissions, sessionId, exp, jti);
        } catch (UnauthorizedException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new UnauthorizedException("Jeton de session illisible ou altéré.");
        }
    }

    private SessionClaims verifyLegacyToken(String encodedPayload, String providedSignature) {
        String expectedSig = sign(encodedPayload);
        if (!MessageDigest.isEqual(
                providedSignature.getBytes(StandardCharsets.UTF_8),
                expectedSig.getBytes(StandardCharsets.UTF_8))) {
            throw new UnauthorizedException("Signature de session invalide.");
        }
        try {
            String rawPayload = new String(Base64.getUrlDecoder().decode(encodedPayload), StandardCharsets.UTF_8);
            String[] fields = rawPayload.split("\\|", 5);
            if (fields.length != 5) {
                throw new UnauthorizedException("Structure de session invalide.");
            }
            Long userId = Long.parseLong(fields[0]);
            String email = fields[1];
            RoleUtilisateur role = RoleUtilisateur.valueOf(fields[2]);
            long exp = Long.parseLong(fields[3]);
            String jti = fields[4];
            if (Instant.now().getEpochSecond() > exp) {
                throw new UnauthorizedException("Votre session a expiré. Veuillez vous reconnecter.");
            }
            return new SessionClaims(userId, email, role, Collections.emptyList(), jti, exp, jti);
        } catch (UnauthorizedException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new UnauthorizedException("Jeton de session illisible.");
        }
    }

    /**
     * Génère un jeton CSRF signé cryptographiquement et lié à la session et à l'utilisateur.
     */
    public String generateCsrfToken(String sessionId, Long userId) {
        String effectiveSession = (sessionId != null && !sessionId.isBlank()) ? sessionId : "ANON";
        String effectiveUser = (userId != null) ? String.valueOf(userId) : "0";
        String nonce = UUID.randomUUID().toString();
        String rawPayload = effectiveSession + "|" + effectiveUser + "|" + nonce;
        String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(rawPayload.getBytes(StandardCharsets.UTF_8));
        String sig = sign("CSRF|" + encodedPayload);
        return encodedPayload + "." + sig;
    }

    /**
     * Valide le jeton CSRF pour les opérations mutatives authentifiées par cookie.
     */
    public void verifyCsrfToken(HttpServletRequest request, String expectedSessionId, Long expectedUserId) {
        if (request == null) {
            throw new ForbiddenException("Requête invalide : vérification CSRF impossible.");
        }
        String headerToken = request.getHeader(CSRF_HEADER_NAME);
        if (headerToken == null || headerToken.isBlank()) {
            headerToken = request.getHeader("X-CSRF-TOKEN");
        }
        if (headerToken == null || headerToken.isBlank()) {
            throw new ForbiddenException("Jeton CSRF (X-XSRF-TOKEN) manquant pour cette opération sensible.");
        }
        headerToken = headerToken.trim();

        String cookieToken = extractCookieValue(request, CSRF_COOKIE_NAME);
        if (cookieToken != null && !cookieToken.isBlank()) {
            if (!MessageDigest.isEqual(
                    headerToken.getBytes(StandardCharsets.UTF_8),
                    cookieToken.trim().getBytes(StandardCharsets.UTF_8))) {
                throw new ForbiddenException("Jeton CSRF incohérent avec le cookie XSRF-TOKEN.");
            }
        }

        String[] parts = headerToken.split("\\.");
        if (parts.length != 2) {
            throw new ForbiddenException("Format de jeton CSRF invalide.");
        }
        String expectedSig = sign("CSRF|" + parts[0]);
        if (!MessageDigest.isEqual(
                parts[1].getBytes(StandardCharsets.UTF_8),
                expectedSig.getBytes(StandardCharsets.UTF_8))) {
            throw new ForbiddenException("Signature du jeton CSRF invalide ou falsifiée.");
        }

        try {
            String decoded = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            String[] fields = decoded.split("\\|", 3);
            if (fields.length != 3) {
                throw new ForbiddenException("Structure du jeton CSRF invalide.");
            }
            if (expectedSessionId != null && !expectedSessionId.isBlank() && !expectedSessionId.equals(fields[0])) {
                throw new ForbiddenException("Le jeton CSRF n'appartient pas à la session courante.");
            }
            if (expectedUserId != null && !String.valueOf(expectedUserId).equals(fields[1])) {
                throw new ForbiddenException("Le jeton CSRF n'appartient pas à l'utilisateur courant.");
            }
        } catch (ForbiddenException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ForbiddenException("Jeton CSRF illisible ou corrompu.");
        }
    }

    public boolean isAuthenticatedViaCookie(HttpServletRequest request) {
        if (request == null) return false;
        return extractCookieValue(request, COOKIE_NAME) != null
                || extractCookieValue(request, REFRESH_COOKIE_NAME) != null;
    }

    public String generateOpaqueRefreshToken() {
        byte[] randomBytes = new byte[32]; // 256 bits d'entropie
        secureRandom.nextBytes(randomBytes);
        return HexFormat.of().formatHex(randomBytes);
    }

    public String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("Erreur lors du hachage SHA-256 du jeton", ex);
        }
    }

    public String extractToken(HttpServletRequest request) {
        if (request == null) return null;
        String cookieVal = extractCookieValue(request, COOKIE_NAME);
        if (cookieVal != null) {
            return cookieVal;
        }
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        return null;
    }

    /**
     * Extrait le Refresh Token EXCLUSIVEMENT depuis le cookie HttpOnly PATRIMOINE_REFRESH.
     * Aucun en-tête X-Refresh-Token n'est accepté ni exposé.
     */
    public String extractRefreshToken(HttpServletRequest request) {
        if (request == null) return null;
        return extractCookieValue(request, REFRESH_COOKIE_NAME);
    }

    private String extractCookieValue(HttpServletRequest request, String cookieName) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (cookieName.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                    return cookie.getValue().trim();
                }
            }
        }
        return null;
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(secretKey, HMAC_ALGO));
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception ex) {
            throw new IllegalStateException("Impossible de signer cryptographiquement le jeton", ex);
        }
    }
}
