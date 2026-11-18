package com.uasz.api_gateway.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
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
import java.util.Collections;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class GatewayAuthorizationFilter extends OncePerRequestFilter {

    public static final String COOKIE_NAME = "PATRIMOINE_SESSION";
    public static final String REFRESH_COOKIE_NAME = "PATRIMOINE_REFRESH";
    public static final String CSRF_COOKIE_NAME = "XSRF-TOKEN";
    public static final String CSRF_HEADER_NAME = "X-XSRF-TOKEN";

    private static final String HMAC_ALGO = "HmacSHA256";
    private static final int MIN_SECRET_BYTES = 32;
    private static final int MIN_DISTINCT_CHARS = 10;
    private static final int LOGIN_RATE_LIMIT_PER_MINUTE = 10;

    private static final List<String> FORBIDDEN_SECRET_PATTERNS = List.of(
            "CHANGE_ME", "REPLACE_ME", "DEV-SECRET", "DEV-INTERSERVICE",
            "DEFAULT", "EXAMPLE", "PASSWORD", "12345678"
    );

    private final Map<String, LoginAttemptTracker> ipLoginAttempts = new ConcurrentHashMap<>();
    private final Set<String> revokedSessionIds = ConcurrentHashMap.newKeySet();
    private final Map<Long, String> updatedUserRoles = new ConcurrentHashMap<>();
    private final Set<Long> deactivatedUsers = ConcurrentHashMap.newKeySet();

    private record LoginAttemptTracker(int count, long windowStartEpoch) {}

    private final byte[] secretKey;
    private final boolean csrfProtectionEnabled;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public GatewayAuthorizationFilter(
            @Value("${security.session.secret}") String secret,
            @Value("${security.csrf.enabled:true}") boolean csrfProtectionEnabled
    ) {
        validateCryptographicSecret(secret, "security.session.secret");
        this.secretKey = secret.getBytes(StandardCharsets.UTF_8);
        this.csrfProtectionEnabled = csrfProtectionEnabled;
    }

    public GatewayAuthorizationFilter(String secret) {
        this(secret, true);
    }

    public static void validateCryptographicSecret(String secret, String propertyName) {
        if (secret == null || secret.trim().isEmpty()) {
            throw new IllegalStateException("Le secret HMAC '" + propertyName + "' doit être configuré et comporter au moins 32 octets (256 bits d'entropie).");
        }
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException("Le secret HMAC '" + propertyName + "' doit être configuré et comporter au moins 32 octets (256 bits d'entropie).");
        }
        String upper = secret.toUpperCase(Locale.ROOT);
        for (String forbidden : FORBIDDEN_SECRET_PATTERNS) {
            if (upper.contains(forbidden)) {
                throw new IllegalStateException("Le secret HMAC '" + propertyName + "' ne peut pas contenir un motif interdit ou d'exemple (" + forbidden + "). Définissez une clé cryptographique aléatoire.");
            }
        }
        if (secret.chars().distinct().count() < MIN_DISTINCT_CHARS) {
            throw new IllegalStateException("Le secret HMAC '" + propertyName + "' présente une entropie insuffisante (au moins 10 caractères distincts requis).");
        }
    }

    public record VerifiedToken(
            Long userId,
            String email,
            String role,
            List<String> permissions,
            String sessionId
    ) {
        public VerifiedToken(Long userId, String email, String role) {
            this(userId, email, role, defaultPermissionsForRole(role), "legacy-session");
        }

        public boolean hasPermission(String perm) {
            return (permissions != null && permissions.contains(perm))
                    || "ADMINISTRATEUR".equals(role);
        }
    }

    public void markSessionRevoked(String sessionId) {
        if (sessionId != null && !sessionId.isBlank()) {
            revokedSessionIds.add(sessionId);
        }
    }

    public void markUserRoleChanged(Long userId, String newRole) {
        if (userId != null && newRole != null) {
            updatedUserRoles.put(userId, newRole);
        }
    }

    public void markUserDeactivated(Long userId) {
        if (userId != null) {
            deactivatedUsers.add(userId);
        }
    }

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
                // Vérification de non-révocation et de cohérence du rôle actif (Section 8)
                if (token.sessionId() != null && revokedSessionIds.contains(token.sessionId())) {
                    token = null;
                    tokenError = "Cette session a été révoquée. Veuillez vous reconnecter.";
                } else if (token.userId() != null && deactivatedUsers.contains(token.userId())) {
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, "Ce compte utilisateur a été désactivé.");
                    return;
                } else if (token.userId() != null && updatedUserRoles.containsKey(token.userId())) {
                    String activeRole = updatedUserRoles.get(token.userId());
                    if (!activeRole.equals(token.role())) {
                        token = null;
                        tokenError = "Vos privilèges ont été modifiés. Veuillez vous reconnecter.";
                    }
                }
            } catch (IllegalArgumentException ex) {
                tokenError = ex.getMessage();
            }
        }

        boolean isMutationMethod = "POST".equalsIgnoreCase(method)
                || "PUT".equalsIgnoreCase(method)
                || "PATCH".equalsIgnoreCase(method)
                || "DELETE".equalsIgnoreCase(method);

        boolean isPublicPreAuthEndpoint = (path.equals("/api/utilisateurs/connexion") && "POST".equalsIgnoreCase(method))
                || (path.equals("/api/utilisateurs") && "POST".equalsIgnoreCase(method));

        // Protection CSRF côté serveur pour toute opération mutative authentifiée par Cookie (Section 7)
        if (csrfProtectionEnabled && isMutationMethod && !isPublicPreAuthEndpoint && isAuthenticatedViaCookieOnly(request)) {
            String expectedSessionId = token != null ? token.sessionId() : null;
            Long expectedUserId = token != null ? token.userId() : null;
            String csrfError = validateCsrfToken(request, expectedSessionId, expectedUserId);
            if (csrfError != null) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN, csrfError);
                return;
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
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        tokenError != null ? tokenError : "Authentification requise.");
                return;
            }
            if (!token.hasPermission("UTILISATEUR:LIRE_TOUT")) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : permission UTILISATEUR:LIRE_TOUT requise.");
                return;
            }
        } else if (path.equals("/api/utilisateurs/admin") && "POST".equalsIgnoreCase(method)) {
            if (token == null) {
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        tokenError != null ? tokenError : "Authentification requise.");
                return;
            }
            if (!token.hasPermission("UTILISATEUR:CREER_STAFF")) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : permission UTILISATEUR:CREER_STAFF requise.");
                return;
            }
        } else if (path.startsWith("/api/utilisateurs/")
                && !path.equals("/api/utilisateurs/connexion")
                && !path.equals("/api/utilisateurs/deconnexion")
                && !path.equals("/api/utilisateurs/refresh")
                && "DELETE".equalsIgnoreCase(method)) {
            if (token == null) {
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        tokenError != null ? tokenError : "Authentification requise.");
                return;
            }
            if (!token.hasPermission("UTILISATEUR:SUPPRIMER")) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : permission UTILISATEUR:SUPPRIMER requise.");
                return;
            }
        }

        // 2. Contrôle RBAC granulaire sur le catalogue (Patrimoines, Circuits, Événements)
        boolean isPatrimoinePath = path.equals("/api/patrimoines") || path.startsWith("/api/patrimoines/");
        boolean isCircuitPath = path.equals("/api/circuits") || path.startsWith("/api/circuits/");
        boolean isEvenementPath = path.equals("/api/evenements") || path.startsWith("/api/evenements/");

        if ((isPatrimoinePath || isCircuitPath || isEvenementPath) && isMutationMethod) {
            if (token == null) {
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        tokenError != null ? tokenError : "Authentification requise pour effectuer une modification sur le catalogue.");
                return;
            }
            String requiredPerm = resolveRequiredCatalogPermission(isPatrimoinePath, isCircuitPath, method, path);
            if (!token.hasPermission(requiredPerm)) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : permission " + requiredPerm + " requise pour le rôle " + token.role() + ".");
                return;
            }
        }
        if (isCircuitPath && path.equals("/api/circuits/guide/mes-circuits") && token == null) {
            writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                    tokenError != null ? tokenError : "Authentification requise.");
            return;
        }

        // 2b. Protection RBAC des routes P05 (Guides, Avis, Modération)
        boolean isGuidePath = path.equals("/api/guides") || path.startsWith("/api/guides/");
        boolean isAvisPath = path.equals("/api/avis") || path.startsWith("/api/avis/");
        boolean isModerationPath = path.equals("/api/moderation") || path.startsWith("/api/moderation/");

        if (isGuidePath) {
            if (path.startsWith("/api/guides/internal/") || path.equals("/api/guides/internal")) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : les endpoints internes guides ne sont pas accessibles via la Gateway.");
                return;
            }
            boolean isGuideWorkspace = path.equals("/api/guides/mon-profil") || path.startsWith("/api/guides/mon-profil/");
            boolean isGuideAdminList = path.equals("/api/guides/admin") || path.startsWith("/api/guides/admin/");
            boolean isGuideValidationDecision = path.endsWith("/valider") || path.endsWith("/rejeter") || path.endsWith("/reactiver");
            boolean isGuideSuspensionDecision = path.endsWith("/suspendre") || path.endsWith("/desactiver");
            boolean isGuideHistory = path.endsWith("/historique");

            if (isGuideWorkspace) {
                if (token == null) {
                    writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                            tokenError != null ? tokenError : "Authentification requise.");
                    return;
                }
                if (!token.hasPermission("GUIDE:GERER_PROPRE_PROFIL")) {
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                            "Accès interdit : espace réservé aux guides touristiques (GUIDE:GERER_PROPRE_PROFIL).");
                    return;
                }
            } else if (isGuideAdminList || isGuideValidationDecision) {
                if (token == null) {
                    writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                            tokenError != null ? tokenError : "Authentification requise.");
                    return;
                }
                if (!token.hasPermission("GUIDE:VALIDER")) {
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                            "Accès interdit : permission GUIDE:VALIDER requise.");
                    return;
                }
            } else if (isGuideSuspensionDecision) {
                if (token == null) {
                    writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                            tokenError != null ? tokenError : "Authentification requise.");
                    return;
                }
                if (!token.hasPermission("GUIDE:SUSPENDRE")) {
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                            "Accès interdit : permission GUIDE:SUSPENDRE requise.");
                    return;
                }
            } else if (isGuideHistory || isMutationMethod) {
                if (token == null) {
                    writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                            tokenError != null ? tokenError : "Authentification requise.");
                    return;
                }
            }
        }

        if (isAvisPath) {
            boolean isMyAvis = path.equals("/api/avis/mes-avis");
            if (isMyAvis) {
                if (token == null) {
                    writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                            tokenError != null ? tokenError : "Authentification requise.");
                    return;
                }
            } else if (isMutationMethod) {
                if (token == null) {
                    writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                            tokenError != null ? tokenError : "Authentification requise.");
                    return;
                }
                if (path.endsWith("/signaler") && "POST".equalsIgnoreCase(method)) {
                    if (!token.hasPermission("AVIS:SIGNALER")) {
                        writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                                "Accès interdit : permission AVIS:SIGNALER requise.");
                        return;
                    }
                } else if ("POST".equalsIgnoreCase(method)) {
                    if (!token.hasPermission("AVIS:CREER")) {
                        writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                                "Accès interdit : permission AVIS:CREER requise.");
                        return;
                    }
                } else if ("PUT".equalsIgnoreCase(method) || "PATCH".equalsIgnoreCase(method)) {
                    if (!token.hasPermission("AVIS:MODIFIER_PROPRE")) {
                        writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                                "Accès interdit : permission AVIS:MODIFIER_PROPRE requise.");
                        return;
                    }
                } else if ("DELETE".equalsIgnoreCase(method)) {
                    if (!token.hasPermission("AVIS:SUPPRIMER_PROPRE")) {
                        writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                                "Accès interdit : permission AVIS:SUPPRIMER_PROPRE requise.");
                        return;
                    }
                }
            }
        }

        if (isModerationPath) {
            if (token == null) {
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        tokenError != null ? tokenError : "Authentification requise.");
                return;
            }
            boolean isAvisHistoriqueGet = "GET".equalsIgnoreCase(method) && path.matches("^/api/moderation/avis/\\d+/historique$");
            if (!isAvisHistoriqueGet && !token.hasPermission("AVIS:MODERER")) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : permission AVIS:MODERER requise pour accéder aux opérations de modération.");
                return;
            }
        }

        // 3. Protection RBAC des routes de Réservation, Paiement et Notification
        boolean isReservationPath = path.equals("/api/reservations") || path.startsWith("/api/reservations/");
        boolean isPaiementPath = path.equals("/api/paiements") || path.startsWith("/api/paiements/");
        boolean isNotificationPath = path.equals("/api/notifications") || path.startsWith("/api/notifications/");

        if (isReservationPath) {
            if (path.startsWith("/api/reservations/internal/") || path.equals("/api/reservations/internal")) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : les endpoints internes ne sont pas accessibles via la Gateway.");
                return;
            }
            boolean isPublicDisponibilite = ("GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method))
                    && (path.equals("/api/reservations/disponibilite") || path.startsWith("/api/reservations/disponibilite/"));
            if (!isPublicDisponibilite) {
                if (token == null) {
                    writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                            tokenError != null ? tokenError : "Authentification requise pour effectuer cette opération.");
                    return;
                }
                if (path.equals("/api/reservations/statistiques")) {
                    if (!token.hasPermission("RESERVATION:LIRE_TOUT") && !token.hasPermission("RESERVATION:GERER")) {
                        writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                                "Accès interdit : permission d'administration des réservations requise.");
                        return;
                    }
                } else if (path.endsWith("/synchroniser") && "POST".equalsIgnoreCase(method)) {
                    if (!token.hasPermission("RESERVATION:LIRE_PROPRE")
                            && !token.hasPermission("RESERVATION:LIRE_TOUT")
                            && !token.hasPermission("RESERVATION:GERER")) {
                        writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                                "Accès interdit : permission de synchronisation de réservation requise.");
                        return;
                    }
                } else if ("POST".equalsIgnoreCase(method)
                        && !token.hasPermission("RESERVATION:CREER")
                        && !token.hasPermission("RESERVATION:GERER")) {
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                            "Accès interdit : permission RESERVATION:CREER requise.");
                    return;
                } else if ("GET".equalsIgnoreCase(method)
                        && !token.hasPermission("RESERVATION:LIRE_PROPRE")
                        && !token.hasPermission("RESERVATION:LIRE_TOUT")) {
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                            "Accès interdit : permission de lecture de réservation requise.");
                    return;
                } else if (("PUT".equalsIgnoreCase(method) || "PATCH".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method))
                        && !token.hasPermission("RESERVATION:ANNULER_PROPRE")
                        && !token.hasPermission("RESERVATION:GERER")) {
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                            "Accès interdit : permission d'annulation ou de gestion de réservation requise.");
                    return;
                }
            }
        }

        if (isPaiementPath) {
            if (path.startsWith("/api/paiements/internal/") || path.equals("/api/paiements/internal")) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : les endpoints internes de paiement ne sont pas accessibles via la Gateway.");
                return;
            }
            if (token == null) {
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        tokenError != null ? tokenError : "Authentification requise pour effectuer cette opération.");
                return;
            }
            if (path.endsWith("/rembourser")) {
                if (!"POST".equalsIgnoreCase(method)) {
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                            "Accès interdit : méthode non autorisée sur l'endpoint de remboursement.");
                    return;
                }
                if (!token.hasPermission("PAIEMENT:REMBOURSER")) {
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                            "Accès interdit : permission PAIEMENT:REMBOURSER requise pour simuler un remboursement.");
                    return;
                }
            } else if (path.equals("/api/paiements/statistiques") || path.startsWith("/api/paiements/outbox")) {
                if (!token.hasPermission("PAIEMENT:LIRE_TOUT")) {
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                            "Accès interdit : permission PAIEMENT:LIRE_TOUT requise.");
                    return;
                }
            } else if ("POST".equalsIgnoreCase(method) && !token.hasPermission("PAIEMENT:INITIER")) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : permission PAIEMENT:INITIER requise.");
                return;
            } else if ("GET".equalsIgnoreCase(method)
                    && !token.hasPermission("PAIEMENT:LIRE_PROPRE")
                    && !token.hasPermission("PAIEMENT:LIRE_TOUT")) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : permission de consultation des paiements requise.");
                return;
            } else if ("PUT".equalsIgnoreCase(method) || "PATCH".equalsIgnoreCase(method) || "DELETE".equalsIgnoreCase(method)) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : modification ou suppression directe d'un paiement interdite.");
                return;
            }
        }

        if (isNotificationPath) {
            if (token == null) {
                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                        tokenError != null ? tokenError : "Authentification requise.");
                return;
            }
            boolean isSelfNotificationRoute = path.equals("/api/notifications/mes-notifications")
                    || path.startsWith("/api/notifications/mes-notifications/")
                    || path.equals("/api/notifications/tout-lire")
                    || ("PATCH".equalsIgnoreCase(method) && path.matches("^/api/notifications/\\d+/lire$"));
            boolean isSingleNotificationGet = "GET".equalsIgnoreCase(method) && path.matches("^/api/notifications/\\d+$");
            boolean isRetryRoute = "POST".equalsIgnoreCase(method)
                    && (path.equals("/api/notifications/relancer-echecs")
                    || path.matches("^/api/notifications/\\d+/relancer$"));

            if (isSelfNotificationRoute) {
                if (!token.hasPermission("NOTIFICATION:LIRE_PROPRE")
                        && !token.hasPermission("NOTIFICATION:GERER_PROPRE")) {
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                            "Accès interdit : permission NOTIFICATION:LIRE_PROPRE requise.");
                    return;
                }
            } else if (isSingleNotificationGet) {
                if (!token.hasPermission("NOTIFICATION:LIRE_PROPRE")
                        && !token.hasPermission("NOTIFICATION:LIRE_TOUT")
                        && !"ADMINISTRATEUR".equals(token.role())) {
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                            "Accès interdit à cette notification.");
                    return;
                }
            } else if (isRetryRoute) {
                if (!"ADMINISTRATEUR".equals(token.role()) && !token.hasPermission("NOTIFICATION:RELANCER")) {
                    writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                            "Accès interdit : permission NOTIFICATION:RELANCER requise.");
                    return;
                }
            } else if (!"ADMINISTRATEUR".equals(token.role()) && !token.hasPermission("NOTIFICATION:LIRE_TOUT")) {
                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                        "Accès interdit : seul un administrateur peut accéder à la console globale des notifications.");
                return;
            }
        }

        // 4. Assainissement des en-têtes, calcul du hash SHA-256 du corps et injection de l'enveloppe signée liée à la requête
        SanitizedGatewayRequestWrapper wrappedRequest = new SanitizedGatewayRequestWrapper(request);
        long ts = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String bodySha256 = sha256Hex(wrappedRequest.getCachedBody());
        String upperMethod = method.toUpperCase(Locale.ROOT);

        String userIdStr = token != null ? String.valueOf(token.userId()) : "ANONYMOUS";
        String roleStr = (token != null && token.role() != null) ? token.role() : "PUBLIC";
        String permsCsv = (token != null && token.permissions() != null) ? String.join(",", token.permissions()) : "";
        String emailStr = (token != null && token.email() != null) ? token.email() : "";
        String sessionIdStr = (token != null && token.sessionId() != null) ? token.sessionId() : "";

        String canonicalEnvelope = upperMethod + "|" + path + "|" + userIdStr + "|" + roleStr + "|"
                + permsCsv + "|" + emailStr + "|" + sessionIdStr + "|" + ts + "|" + nonce + "|" + bodySha256;
        String signature = sign(canonicalEnvelope);

        wrappedRequest.setHeader("X-User-Id", userIdStr);
        wrappedRequest.setHeader("X-User-Roles", roleStr);
        wrappedRequest.setHeader("X-User-Permissions", permsCsv);
        wrappedRequest.setHeader("X-User-Email", emailStr);
        wrappedRequest.setHeader("X-User-Session-Id", sessionIdStr);
        wrappedRequest.setHeader("X-Content-SHA256", bodySha256);
        wrappedRequest.setHeader("X-Internal-Gateway-Token", ts + "." + nonce + "." + signature);

        filterChain.doFilter(wrappedRequest, response);
    }

    private String resolveRequiredCatalogPermission(boolean isPatrimoine, boolean isCircuit, String method, String path) {
        String domain = isPatrimoine ? "PATRIMOINE" : (isCircuit ? "CIRCUIT" : "EVENEMENT");
        if (path != null) {
            if (path.endsWith("/publier")) {
                return domain + ":PUBLIER";
            }
            if (path.endsWith("/archiver")) {
                return domain + ":ARCHIVER";
            }
            if (path.endsWith("/annuler") && "EVENEMENT".equals(domain)) {
                return "EVENEMENT:ANNULER";
            }
        }
        if ("POST".equalsIgnoreCase(method)) {
            return domain + ":CREER";
        }
        if ("DELETE".equalsIgnoreCase(method)) {
            return domain + ":SUPPRIMER";
        }
        return domain + ":MODIFIER";
    }

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

    private String validateCsrfToken(HttpServletRequest request, String expectedSessionId, Long expectedUserId) {
        String headerToken = request.getHeader(CSRF_HEADER_NAME);
        if (headerToken == null || headerToken.isBlank()) {
            headerToken = request.getHeader("X-CSRF-TOKEN");
        }
        if (headerToken == null || headerToken.isBlank()) {
            return "Jeton CSRF (X-XSRF-TOKEN) manquant pour cette opération authentifiée par cookie.";
        }
        headerToken = headerToken.trim();

        String cookieToken = extractCookieValue(request, CSRF_COOKIE_NAME);
        if (cookieToken != null && !cookieToken.isBlank()) {
            if (!MessageDigest.isEqual(
                    headerToken.getBytes(StandardCharsets.UTF_8),
                    cookieToken.trim().getBytes(StandardCharsets.UTF_8))) {
                return "Jeton CSRF incohérent avec le cookie XSRF-TOKEN.";
            }
        }

        String[] parts = headerToken.split("\\.");
        if (parts.length != 2) {
            return "Format de jeton CSRF invalide.";
        }
        String expectedSig = sign("CSRF|" + parts[0]);
        if (!MessageDigest.isEqual(
                parts[1].getBytes(StandardCharsets.UTF_8),
                expectedSig.getBytes(StandardCharsets.UTF_8))) {
            return "Signature du jeton CSRF invalide ou falsifiée.";
        }

        try {
            String decoded = new String(Base64.getUrlDecoder().decode(parts[0]), StandardCharsets.UTF_8);
            String[] fields = decoded.split("\\|", 3);
            if (fields.length != 3) {
                return "Structure du jeton CSRF invalide.";
            }
            if (expectedSessionId != null && !expectedSessionId.isBlank()
                    && !"legacy-session".equals(expectedSessionId)
                    && !expectedSessionId.equals(fields[0])) {
                return "Le jeton CSRF n'appartient pas à la session courante.";
            }
            if (expectedUserId != null && !String.valueOf(expectedUserId).equals(fields[1])) {
                return "Le jeton CSRF n'appartient pas à l'utilisateur courant.";
            }
            return null;
        } catch (Exception ex) {
            return "Jeton CSRF illisible ou corrompu.";
        }
    }

    private boolean isAuthenticatedViaCookieOnly(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return false;
        }
        return extractCookieValue(request, COOKIE_NAME) != null
                || extractCookieValue(request, REFRESH_COOKIE_NAME) != null;
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

    public VerifiedToken verifyToken(String token) {
        String[] parts = token.split("\\.");
        if (parts.length == 3) {
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
                String sessionId = (String) claims.get("sessionId");
                @SuppressWarnings("unchecked")
                List<String> permissions = claims.get("permissions") instanceof List<?> list
                        ? (List<String>) list
                        : defaultPermissionsForRole(role);
                if (permissions.isEmpty()) {
                    permissions = defaultPermissionsForRole(role);
                }
                return new VerifiedToken(userId, email, role, permissions, sessionId);
            } catch (IllegalArgumentException ex) {
                throw ex;
            } catch (Exception ex) {
                throw new IllegalArgumentException("Jeton de session illisible.");
            }
        } else if (parts.length == 2) {
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
                String role = fields[2];
                return new VerifiedToken(Long.parseLong(fields[0]), fields[1], role, defaultPermissionsForRole(role), fields[4]);
            } catch (IllegalArgumentException ex) {
                throw ex;
            } catch (Exception ex) {
                throw new IllegalArgumentException("Jeton de session illisible.");
            }
        } else {
            throw new IllegalArgumentException("Jeton de session invalide.");
        }
    }

    public static List<String> defaultPermissionsForRole(String role) {
        if (role == null) return Collections.emptyList();
        return switch (role) {
            case "TOURISTE" -> List.of(
                    "PATRIMOINE:LIRE", "CIRCUIT:LIRE", "EVENEMENT:LIRE",
                    "RESERVATION:CREER", "RESERVATION:LIRE_PROPRE", "RESERVATION:ANNULER_PROPRE",
                    "PAIEMENT:INITIER", "PAIEMENT:LIRE_PROPRE", "UTILISATEUR:LIRE_PROFIL",
                    "GUIDE:LIRE", "AVIS:LIRE", "AVIS:CREER", "AVIS:MODIFIER_PROPRE", "AVIS:SUPPRIMER_PROPRE", "AVIS:SIGNALER",
                    "NOTIFICATION:LIRE_PROPRE", "NOTIFICATION:GERER_PROPRE"
            );
            case "GUIDE" -> List.of(
                    "PATRIMOINE:LIRE", "CIRCUIT:LIRE", "CIRCUIT:MODIFIER",
                    "EVENEMENT:LIRE", "RESERVATION:LIRE_PROPRE", "UTILISATEUR:LIRE_PROFIL",
                    "GUIDE:LIRE", "GUIDE:GERER_PROPRE_PROFIL",
                    "AVIS:LIRE", "AVIS:SIGNALER",
                    "NOTIFICATION:LIRE_PROPRE", "NOTIFICATION:GERER_PROPRE"
            );
            case "CONSERVATEUR" -> List.of(
                    "PATRIMOINE:LIRE", "PATRIMOINE:CREER", "PATRIMOINE:MODIFIER", "PATRIMOINE:SUPPRIMER",
                    "PATRIMOINE:PUBLIER", "PATRIMOINE:ARCHIVER",
                    "CIRCUIT:LIRE", "EVENEMENT:LIRE", "UTILISATEUR:LIRE_PROFIL",
                    "GUIDE:LIRE", "AVIS:LIRE", "AVIS:SIGNALER",
                    "NOTIFICATION:LIRE_PROPRE", "NOTIFICATION:GERER_PROPRE"
            );
            case "GESTIONNAIRE_SITE" -> List.of(
                    "PATRIMOINE:LIRE",
                    "CIRCUIT:LIRE", "CIRCUIT:CREER", "CIRCUIT:MODIFIER", "CIRCUIT:SUPPRIMER",
                    "CIRCUIT:PUBLIER", "CIRCUIT:ARCHIVER",
                    "EVENEMENT:LIRE", "EVENEMENT:CREER", "EVENEMENT:MODIFIER", "EVENEMENT:SUPPRIMER",
                    "EVENEMENT:PUBLIER", "EVENEMENT:ANNULER", "EVENEMENT:ARCHIVER",
                    "RESERVATION:LIRE_TOUT", "RESERVATION:GERER", "UTILISATEUR:LIRE_PROFIL",
                    "GUIDE:LIRE", "GUIDE:VALIDER", "GUIDE:SUSPENDRE",
                    "AVIS:LIRE", "AVIS:SIGNALER", "AVIS:MODERER",
                    "NOTIFICATION:LIRE_PROPRE", "NOTIFICATION:GERER_PROPRE"
            );
            case "ADMINISTRATEUR" -> List.of(
                    "PATRIMOINE:LIRE", "PATRIMOINE:CREER", "PATRIMOINE:MODIFIER", "PATRIMOINE:SUPPRIMER",
                    "PATRIMOINE:PUBLIER", "PATRIMOINE:ARCHIVER",
                    "CIRCUIT:LIRE", "CIRCUIT:CREER", "CIRCUIT:MODIFIER", "CIRCUIT:SUPPRIMER",
                    "CIRCUIT:PUBLIER", "CIRCUIT:ARCHIVER",
                    "EVENEMENT:LIRE", "EVENEMENT:CREER", "EVENEMENT:MODIFIER", "EVENEMENT:SUPPRIMER",
                    "EVENEMENT:PUBLIER", "EVENEMENT:ANNULER", "EVENEMENT:ARCHIVER",
                    "RESERVATION:CREER", "RESERVATION:LIRE_PROPRE", "RESERVATION:LIRE_TOUT",
                    "RESERVATION:ANNULER_PROPRE", "RESERVATION:GERER",
                    "PAIEMENT:INITIER", "PAIEMENT:LIRE_PROPRE", "PAIEMENT:LIRE_TOUT", "PAIEMENT:REMBOURSER",
                    "UTILISATEUR:LIRE_PROFIL", "UTILISATEUR:LIRE_TOUT", "UTILISATEUR:CREER_STAFF",
                    "UTILISATEUR:GERER_ROLES", "UTILISATEUR:SUPPRIMER", "AUDIT:LIRE",
                    "GUIDE:LIRE", "GUIDE:VALIDER", "GUIDE:SUSPENDRE",
                    "AVIS:LIRE", "AVIS:CREER", "AVIS:MODIFIER_PROPRE", "AVIS:SUPPRIMER_PROPRE", "AVIS:SIGNALER", "AVIS:MODERER",
                    "NOTIFICATION:LIRE_PROPRE", "NOTIFICATION:GERER_PROPRE", "NOTIFICATION:LIRE_TOUT", "NOTIFICATION:RELANCER"
            );
            default -> Collections.emptyList();
        };
    }

    public static String sha256Hex(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data != null ? data : new byte[0]);
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new IllegalStateException("Erreur de calcul SHA-256", ex);
        }
    }

    public String sign(String data) {
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
