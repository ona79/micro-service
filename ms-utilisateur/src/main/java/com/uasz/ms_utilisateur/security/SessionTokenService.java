package com.uasz.ms_utilisateur.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
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
import java.util.Map;
import java.util.UUID;

@Service
public class SessionTokenService {

    public static final String COOKIE_NAME = "PATRIMOINE_SESSION";
    public static final String REFRESH_COOKIE_NAME = "PATRIMOINE_REFRESH";
    public static final String ISSUER = "casamance-auth-service";

    private static final String HMAC_ALGO = "HmacSHA256";
    public static final long ACCESS_TOKEN_TTL_SECONDS = 15 * 60L; // 15 minutes
    public static final long REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 3600L; // 7 jours
    private static final int MIN_SECRET_BYTES = 32;

    private static final String JWT_HEADER_B64 = Base64.getUrlEncoder().withoutPadding()
            .encodeToString("{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));

    private final byte[] secretKey;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SecureRandom secureRandom = new SecureRandom();

    public SessionTokenService(
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
            // Compatibilité avec l'ancien format 2 parties si nécessaire
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

    public String extractRefreshToken(HttpServletRequest request) {
        if (request == null) return null;
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (REFRESH_COOKIE_NAME.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                    return cookie.getValue().trim();
                }
            }
        }
        String header = request.getHeader("X-Refresh-Token");
        if (header != null && !header.isBlank()) {
            return header.trim();
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
