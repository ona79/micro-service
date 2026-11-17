package com.uasz.api_gateway.security;

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
import java.util.Set;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class GatewayAuthorizationFilter extends OncePerRequestFilter {

    private static final String COOKIE_NAME = "PATRIMOINE_SESSION";
    private static final String HMAC_ALGO = "HmacSHA256";
    private static final Set<String> STAFF_ROLES = Set.of("ADMINISTRATEUR", "GESTIONNAIRE_SITE");

    private final byte[] secretKey;

    public GatewayAuthorizationFilter(
            @Value("${security.session.secret:PatrimoineSenegalUaszSecretKey2026HmacSha256!}") String secret
    ) {
        this.secretKey = secret.getBytes(StandardCharsets.UTF_8);
    }

    private record VerifiedToken(Long userId, String email, String role) {}

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("OPTIONS".equalsIgnoreCase(method) || !path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
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

        // 2. Protection des écritures sur le catalogue (Patrimoines, Circuits, Événements)
        boolean isCatalogPath = path.startsWith("/api/patrimoines")
                || path.startsWith("/api/circuits")
                || path.startsWith("/api/evenements");
        boolean isWriteMethod = "POST".equalsIgnoreCase(method)
                || "PUT".equalsIgnoreCase(method)
                || "DELETE".equalsIgnoreCase(method);

        if (isCatalogPath && isWriteMethod) {
            // PUT et DELETE exigent systématiquement un compte GESTIONNAIRE_SITE ou ADMINISTRATEUR
            if ("PUT".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method)) {
                if (token == null) {
                    writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                            "Authentification requise pour modifier ou supprimer un élément du catalogue.");
                    return;
                }
                if (!STAFF_ROLES.contains(token.role())) {
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                            "Accès interdit : rôle GESTIONNAIRE_SITE ou ADMINISTRATEUR requis.");
                    return;
                }
            } else if ("POST".equalsIgnoreCase(method) && token != null && !STAFF_ROLES.contains(token.role())) {
                // Si un utilisateur connecté en tant que TOURISTE tente un POST catalogue
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : un compte Touriste ne peut pas créer d'élément dans le catalogue officiel.");
                return;
            }
        }

        filterChain.doFilter(request, response);
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

    private VerifiedToken verifyToken(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 2) {
            throw new IllegalArgumentException("Jeton de session invalide.");
        }
        String expectedSig = sign(parts[0]);
        if (!MessageDigest.isEqual(
                parts[1].getBytes(StandardCharsets.UTF_8),
                expectedSig.getBytes(StandardCharsets.UTF_8))) {
            throw new IllegalArgumentException("Signature de session invalide.");
        }
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

    private void writeJsonError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        String escaped = message.replace("\"", "\\\"");
        response.getWriter().write("{\"erreur\":\"" + escaped + "\"}");
    }
}
