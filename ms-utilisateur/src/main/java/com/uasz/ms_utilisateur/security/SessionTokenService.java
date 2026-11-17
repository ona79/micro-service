package com.uasz.ms_utilisateur.security;

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
import java.time.Instant;
import java.util.Base64;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SessionTokenService {

    public static final String COOKIE_NAME = "PATRIMOINE_SESSION";
    private static final String HMAC_ALGO = "HmacSHA256";
    private static final long DEFAULT_TTL_SECONDS = 8 * 3600L; // 8 heures
    private static final int MIN_SECRET_BYTES = 32;

    private final byte[] secretKey;
    private final Set<String> revokedTokenIds = ConcurrentHashMap.newKeySet();

    public SessionTokenService(
            @Value("${security.session.secret}") String secret
    ) {
        if (secret == null || secret.trim().isEmpty() || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("Le secret HMAC de session doit être configuré et comporter au moins 32 octets (256 bits d'entropie).");
        }
        this.secretKey = secret.getBytes(StandardCharsets.UTF_8);
    }

    public record SessionClaims(
            Long userId,
            String email,
            RoleUtilisateur role,
            long expiresAtEpochSeconds,
            String tokenId
    ) {}

    public String createToken(UtilisateurDto user) {
        return createTokenWithTtl(user, DEFAULT_TTL_SECONDS);
    }

    public String createTokenWithTtl(UtilisateurDto user, long ttlSeconds) {
        long exp = Instant.now().getEpochSecond() + ttlSeconds;
        String jti = UUID.randomUUID().toString();
        String roleName = user.getRole() != null ? user.getRole().name() : RoleUtilisateur.TOURISTE.name();
        String rawPayload = user.getId() + "|" + user.getEmail() + "|" + roleName + "|" + exp + "|" + jti;
        String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(rawPayload.getBytes(StandardCharsets.UTF_8));
        String signature = sign(encodedPayload);
        return encodedPayload + "." + signature;
    }

    public SessionClaims verifyToken(String token) {
        if (token == null || token.isBlank()) {
            throw new UnauthorizedException("Session d'authentification absente. Veuillez vous connecter.");
        }
        String[] parts = token.split("\\.");
        if (parts.length != 2) {
            throw new UnauthorizedException("Jeton de session invalide.");
        }
        String encodedPayload = parts[0];
        String providedSignature = parts[1];
        String expectedSignature = sign(encodedPayload);

        if (!MessageDigest.isEqual(
                providedSignature.getBytes(StandardCharsets.UTF_8),
                expectedSignature.getBytes(StandardCharsets.UTF_8))) {
            throw new UnauthorizedException("Signature de session invalide.");
        }

        String rawPayload;
        try {
            rawPayload = new String(Base64.getUrlDecoder().decode(encodedPayload), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ex) {
            throw new UnauthorizedException("Contenu de session corrompu.");
        }

        String[] fields = rawPayload.split("\\|", 5);
        if (fields.length != 5) {
            throw new UnauthorizedException("Structure de session invalide.");
        }

        try {
            Long userId = Long.parseLong(fields[0]);
            String email = fields[1];
            RoleUtilisateur role = RoleUtilisateur.valueOf(fields[2]);
            long exp = Long.parseLong(fields[3]);
            String jti = fields[4];

            if (revokedTokenIds.contains(jti)) {
                throw new UnauthorizedException("Cette session a été fermée. Veuillez vous reconnecter.");
            }
            if (Instant.now().getEpochSecond() > exp) {
                throw new UnauthorizedException("Votre session a expiré. Veuillez vous reconnecter.");
            }
            return new SessionClaims(userId, email, role, exp, jti);
        } catch (UnauthorizedException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new UnauthorizedException("Jeton de session illisible.");
        }
    }

    public void revokeToken(String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        try {
            String[] parts = token.split("\\.");
            if (parts.length == 2) {
                String rawPayload = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
                String[] fields = rawPayload.split("\\|", 5);
                if (fields.length == 5) {
                    revokedTokenIds.add(fields[4]);
                }
            }
        } catch (Exception ignored) {
            // Jeton malformé ignoré à la révocation
        }
    }

    public String extractToken(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
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

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            mac.init(new SecretKeySpec(secretKey, HMAC_ALGO));
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception ex) {
            throw new IllegalStateException("Impossible de signer le jeton de session", ex);
        }
    }
}
