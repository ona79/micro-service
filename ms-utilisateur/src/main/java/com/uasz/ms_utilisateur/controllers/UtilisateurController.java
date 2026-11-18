package com.uasz.ms_utilisateur.controllers;

import com.uasz.ms_utilisateur.dto.ConnexionRequest;
import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.exceptions.BadRequestException;
import com.uasz.ms_utilisateur.exceptions.ForbiddenException;
import com.uasz.ms_utilisateur.exceptions.UnauthorizedException;
import com.uasz.ms_utilisateur.repositories.RefreshTokenRepository;
import com.uasz.ms_utilisateur.repositories.SessionUtilisateurRepository;
import com.uasz.ms_utilisateur.security.AuthSessionManager;
import com.uasz.ms_utilisateur.security.LoginRateLimiterService;
import com.uasz.ms_utilisateur.security.SessionTokenService;
import com.uasz.ms_utilisateur.services.AuditSecuriteService;
import com.uasz.ms_utilisateur.services.IUtilisateurService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/utilisateurs")
@Slf4j
public class UtilisateurController {

    private final IUtilisateurService utilisateurService;
    private final SessionTokenService sessionTokenService;
    private final AuthSessionManager authSessionManager;
    private final LoginRateLimiterService rateLimiterService;
    private final AuditSecuriteService auditSecuriteService;
    private final SessionUtilisateurRepository sessionRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    private final boolean forceSecureCookies;
    private final String cookieSameSite;

    @Autowired
    public UtilisateurController(
            IUtilisateurService utilisateurService,
            SessionTokenService sessionTokenService,
            AuthSessionManager authSessionManager,
            LoginRateLimiterService rateLimiterService,
            AuditSecuriteService auditSecuriteService,
            SessionUtilisateurRepository sessionRepository,
            RefreshTokenRepository refreshTokenRepository,
            @Value("${security.cookie.secure:false}") boolean forceSecureCookies,
            @Value("${security.cookie.same-site:Strict}") String cookieSameSite
    ) {
        this.utilisateurService = utilisateurService;
        this.sessionTokenService = sessionTokenService;
        this.authSessionManager = authSessionManager;
        this.rateLimiterService = rateLimiterService;
        this.auditSecuriteService = auditSecuriteService;
        this.sessionRepository = sessionRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.forceSecureCookies = forceSecureCookies;
        this.cookieSameSite = cookieSameSite;
    }

    public UtilisateurController(
            IUtilisateurService utilisateurService,
            SessionTokenService sessionTokenService,
            AuthSessionManager authSessionManager,
            LoginRateLimiterService rateLimiterService,
            AuditSecuriteService auditSecuriteService,
            SessionUtilisateurRepository sessionRepository,
            RefreshTokenRepository refreshTokenRepository
    ) {
        this(utilisateurService, sessionTokenService, authSessionManager,
                rateLimiterService, auditSecuriteService, sessionRepository,
                refreshTokenRepository, false, "Strict");
    }

    @PostMapping
    public ResponseEntity<UtilisateurDto> inscrire(@Valid @RequestBody UtilisateurDto utilisateurDto,
                                                   HttpServletRequest request) {
        String ip = extractClientIp(request);
        String userAgent = request.getHeader("User-Agent");

        // Enregistrement public : attribue obligatoirement le rôle TOURISTE
        UtilisateurDto created = utilisateurService.inscrireUtilisateur(utilisateurDto);
        AuthSessionManager.SessionAuthResult session = authSessionManager.createSession(created, ip, userAgent);

        boolean secure = isSecureRequest(request);
        String csrfToken = session.csrfToken() != null
                ? session.csrfToken()
                : sessionTokenService.generateCsrfToken(session.sessionId(), created.getId());

        ResponseCookie sessionCookie = buildSessionCookie(session.accessToken(), Duration.ofSeconds(SessionTokenService.ACCESS_TOKEN_TTL_SECONDS), secure);
        ResponseCookie refreshCookie = buildRefreshCookie(session.refreshToken(), Duration.ofSeconds(SessionTokenService.REFRESH_TOKEN_TTL_SECONDS), secure);
        ResponseCookie csrfCookie = buildCsrfCookie(csrfToken, Duration.ofSeconds(SessionTokenService.ACCESS_TOKEN_TTL_SECONDS), secure);

        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, sessionCookie.toString())
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .header(HttpHeaders.SET_COOKIE, csrfCookie.toString())
                .header("Authorization", "Bearer " + session.accessToken())
                .header(SessionTokenService.CSRF_HEADER_NAME, csrfToken)
                .body(created);
    }

    @PostMapping("/admin")
    public ResponseEntity<UtilisateurDto> creerParAdmin(@Valid @RequestBody UtilisateurDto utilisateurDto,
                                                        HttpServletRequest request) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request, true);
        if (claims.role() != RoleUtilisateur.ADMINISTRATEUR
                && (claims.permissions() == null || !claims.permissions().contains("UTILISATEUR:CREER_STAFF"))) {
            auditSecuriteService.logAccessDenied(claims.userId(), claims.email(), extractClientIp(request), "CREER_STAFF");
            throw new ForbiddenException("Accès interdit : seul un administrateur peut créer des comptes avec rôle spécifique.");
        }
        UtilisateurDto created = utilisateurService.creerUtilisateurParAdmin(utilisateurDto);
        auditSecuriteService.logAdminAction("CREER_STAFF", claims.userId(), extractClientIp(request),
                "Création du compte staff ID " + created.getId() + " (" + created.getEmail() + ") avec rôle " + created.getRole());
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/connexion")
    public ResponseEntity<UtilisateurDto> connecter(@Valid @RequestBody ConnexionRequest req,
                                                    HttpServletRequest request) {
        String ip = extractClientIp(request);
        String userAgent = request.getHeader("User-Agent");
        String email = req.getEmail() != null ? req.getEmail().trim().toLowerCase() : "";

        // Protection contre la force brute (Rate Limiting)
        if (rateLimiterService.isBlocked(ip, email)) {
            long remaining = rateLimiterService.getRemainingLockoutSeconds(ip, email);
            auditSecuriteService.logLoginFailure(email, ip, "Tentatives excessives - Compte bloqué temporairement (" + remaining + "s)");
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header("Retry-After", String.valueOf(remaining))
                    .body(null);
        }

        try {
            UtilisateurDto connected = utilisateurService.connecterUtilisateur(req);
            rateLimiterService.resetAttempts(ip, email);

            AuthSessionManager.SessionAuthResult session = authSessionManager.createSession(connected, ip, userAgent);
            auditSecuriteService.logLoginSuccess(connected.getId(), connected.getEmail(), ip, session.sessionId());

            boolean secure = isSecureRequest(request);
            String csrfToken = session.csrfToken() != null
                    ? session.csrfToken()
                    : sessionTokenService.generateCsrfToken(session.sessionId(), connected.getId());

            ResponseCookie sessionCookie = buildSessionCookie(session.accessToken(), Duration.ofSeconds(SessionTokenService.ACCESS_TOKEN_TTL_SECONDS), secure);
            ResponseCookie refreshCookie = buildRefreshCookie(session.refreshToken(), Duration.ofSeconds(SessionTokenService.REFRESH_TOKEN_TTL_SECONDS), secure);
            ResponseCookie csrfCookie = buildCsrfCookie(csrfToken, Duration.ofSeconds(SessionTokenService.ACCESS_TOKEN_TTL_SECONDS), secure);

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, sessionCookie.toString())
                    .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                    .header(HttpHeaders.SET_COOKIE, csrfCookie.toString())
                    .header("Authorization", "Bearer " + session.accessToken())
                    .header(SessionTokenService.CSRF_HEADER_NAME, csrfToken)
                    .body(connected);
        } catch (UnauthorizedException | ForbiddenException ex) {
            rateLimiterService.recordFailedAttempt(ip, email);
            auditSecuriteService.logLoginFailure(email, ip, "Échec d'authentification");
            throw new UnauthorizedException("Identifiants invalides. Vérifiez votre adresse email et votre mot de passe.");
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<UtilisateurDto> refresh(HttpServletRequest request) {
        String ip = extractClientIp(request);
        String userAgent = request.getHeader("User-Agent");
        String rawRefreshToken = sessionTokenService.extractRefreshToken(request);

        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new UnauthorizedException("Jeton de renouvellement absent (cookie HttpOnly PATRIMOINE_REFRESH requis). Veuillez vous reconnecter.");
        }

        // Si le client fournit un en-tête ou cookie CSRF, on vérifie sa validité cryptographique
        String csrfHeader = request.getHeader(SessionTokenService.CSRF_HEADER_NAME);
        if (csrfHeader == null || csrfHeader.isBlank()) {
            csrfHeader = request.getHeader("X-CSRF-TOKEN");
        }
        if (csrfHeader != null && !csrfHeader.isBlank()) {
            sessionTokenService.verifyCsrfToken(request, null, null);
        }

        AuthSessionManager.SessionAuthResult result = authSessionManager.refreshSession(rawRefreshToken, ip, userAgent);

        boolean secure = isSecureRequest(request);
        String csrfToken = result.csrfToken() != null
                ? result.csrfToken()
                : sessionTokenService.generateCsrfToken(result.sessionId(), result.userDto().getId());

        ResponseCookie sessionCookie = buildSessionCookie(result.accessToken(), Duration.ofSeconds(SessionTokenService.ACCESS_TOKEN_TTL_SECONDS), secure);
        ResponseCookie refreshCookie = buildRefreshCookie(result.refreshToken(), Duration.ofSeconds(SessionTokenService.REFRESH_TOKEN_TTL_SECONDS), secure);
        ResponseCookie csrfCookie = buildCsrfCookie(csrfToken, Duration.ofSeconds(SessionTokenService.ACCESS_TOKEN_TTL_SECONDS), secure);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, sessionCookie.toString())
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .header(HttpHeaders.SET_COOKIE, csrfCookie.toString())
                .header("Authorization", "Bearer " + result.accessToken())
                .header(SessionTokenService.CSRF_HEADER_NAME, csrfToken)
                .body(result.userDto());
    }

    @GetMapping("/me")
    public ResponseEntity<UtilisateurDto> getCurrentSession(HttpServletRequest request) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request, false);
        UtilisateurDto user = utilisateurService.getByIdUtilisateur(claims.userId());
        if (!user.isActif()) {
            throw new ForbiddenException("Ce compte utilisateur a été désactivé.");
        }
        if (claims.role() != null && user.getRole() != claims.role()) {
            authSessionManager.revokeAllUserSessions(claims.userId(), "ROLE_CHANGED_INVALIDATION");
            throw new UnauthorizedException("Vos privilèges ont été modifiés. Veuillez vous reconnecter.");
        }

        boolean secure = isSecureRequest(request);
        String csrfToken = sessionTokenService.generateCsrfToken(claims.sessionId(), claims.userId());
        ResponseCookie csrfCookie = buildCsrfCookie(csrfToken, Duration.ofSeconds(SessionTokenService.ACCESS_TOKEN_TTL_SECONDS), secure);

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, csrfCookie.toString())
                .header(SessionTokenService.CSRF_HEADER_NAME, csrfToken)
                .body(user);
    }

    @PostMapping("/deconnexion")
    public ResponseEntity<Void> deconnecter(HttpServletRequest request) {
        String ip = extractClientIp(request);
        String token = sessionTokenService.extractToken(request);
        String rawRefreshToken = sessionTokenService.extractRefreshToken(request);
        String sessionId = null;
        Long userId = null;

        if (token != null) {
            try {
                SessionTokenService.SessionClaims claims = sessionTokenService.verifyToken(token);
                sessionId = claims.sessionId();
                userId = claims.userId();
            } catch (Exception ignored) {
            }
        }

        authSessionManager.logoutSession(sessionId, rawRefreshToken, userId, ip);

        boolean secure = isSecureRequest(request);
        ResponseCookie clearSession = buildSessionCookie("", Duration.ZERO, secure);
        ResponseCookie clearRefresh = buildRefreshCookie("", Duration.ZERO, secure);
        ResponseCookie clearCsrf = buildCsrfCookie("", Duration.ZERO, secure);

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clearSession.toString())
                .header(HttpHeaders.SET_COOKIE, clearRefresh.toString())
                .header(HttpHeaders.SET_COOKIE, clearCsrf.toString())
                .build();
    }

    @PostMapping("/{id}/revoquer-sessions")
    public ResponseEntity<Void> revoquerSessions(@PathVariable Long id, HttpServletRequest request) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request, true);
        if (claims.role() != RoleUtilisateur.ADMINISTRATEUR) {
            throw new ForbiddenException("Accès interdit : seul un administrateur peut forcer la révocation des sessions.");
        }
        authSessionManager.revokeAllUserSessions(id, "ADMIN_FORCED_REVOCATION");
        auditSecuriteService.logAdminAction("REVOKE_USER_SESSIONS", claims.userId(), extractClientIp(request),
                "Révocation forcée de toutes les sessions actives de l'utilisateur ID " + id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Endpoint interne de vérification d'état de session et de cohérence de rôle.
     */
    @GetMapping("/internal/sessions/{sessionId}")
    public ResponseEntity<Map<String, Object>> verifySessionState(
            @PathVariable String sessionId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String role) {
        boolean active = authSessionManager.isSessionActive(sessionId);
        if (!active) {
            return ResponseEntity.ok(Map.of("active", false, "reason", "SESSION_REVOKED_OR_EXPIRED"));
        }
        if (userId != null) {
            UtilisateurDto user = utilisateurService.getByIdUtilisateur(userId);
            if (!user.isActif()) {
                return ResponseEntity.ok(Map.of("active", false, "reason", "USER_DEACTIVATED"));
            }
            if (role != null && !role.equals(user.getRole().name())) {
                return ResponseEntity.ok(Map.of("active", false, "reason", "ROLE_CHANGED", "currentRole", user.getRole().name()));
            }
        }
        return ResponseEntity.ok(Map.of("active", true));
    }

    @GetMapping
    public ResponseEntity<List<UtilisateurDto>> getAll(HttpServletRequest request) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request, false);
        if (claims.role() != RoleUtilisateur.ADMINISTRATEUR) {
            throw new ForbiddenException("Accès interdit : seul un administrateur peut consulter la liste des utilisateurs.");
        }
        return ResponseEntity.ok(utilisateurService.getAllUtilisateurs());
    }

    @GetMapping("/recherche")
    public ResponseEntity<com.uasz.ms_utilisateur.dto.PageResponseDto<UtilisateurDto>> rechercher(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) RoleUtilisateur role,
            @RequestParam(required = false) Boolean actif,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest request
    ) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request, false);
        if (claims.role() != RoleUtilisateur.ADMINISTRATEUR) {
            throw new ForbiddenException("Accès interdit : seul un administrateur peut rechercher des utilisateurs.");
        }
        return ResponseEntity.ok(utilisateurService.rechercherUtilisateurs(q, role, actif, page, size));
    }

    @GetMapping("/statistiques")
    public ResponseEntity<com.uasz.ms_utilisateur.dto.UtilisateurStatsDto> statistiques(HttpServletRequest request) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request, false);
        if (claims.role() != RoleUtilisateur.ADMINISTRATEUR) {
            throw new ForbiddenException("Accès interdit : seul un administrateur peut consulter les statistiques utilisateurs.");
        }
        com.uasz.ms_utilisateur.dto.UtilisateurStatsDto stats = utilisateurService.getUtilisateursStats();
        AuditSecuriteService.AuditSummary audit = auditSecuriteService.getAuditSummary();
        stats.setAuditLogsTotal(audit.totalLogs());
        stats.setAlertesSecurite24h(audit.alertes24h());
        stats.setEchecsConnexion24h(audit.echecsConnexion24h());
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/audit")
    public ResponseEntity<com.uasz.ms_utilisateur.dto.PageResponseDto<com.uasz.ms_utilisateur.dto.AuditSecuriteDto>> auditLogs(
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) Long utilisateurId,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            HttpServletRequest request
    ) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request, false);
        if (claims.role() != RoleUtilisateur.ADMINISTRATEUR) {
            throw new ForbiddenException("Accès interdit : seul un administrateur peut consulter le journal d'audit sécurité.");
        }
        return ResponseEntity.ok(auditSecuriteService.rechercherAuditLogs(eventType, utilisateurId, q, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UtilisateurDto> getById(@PathVariable Long id, HttpServletRequest request) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request, false);
        if (claims.role() != RoleUtilisateur.ADMINISTRATEUR && !claims.userId().equals(id)) {
            throw new ForbiddenException("Accès interdit : vous ne pouvez consulter que votre propre profil.");
        }
        return ResponseEntity.ok(utilisateurService.getByIdUtilisateur(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UtilisateurDto> update(@PathVariable Long id,
                                                 @Valid @RequestBody UtilisateurDto utilisateurDto,
                                                 HttpServletRequest request) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request, true);
        boolean isAdmin = claims.role() == RoleUtilisateur.ADMINISTRATEUR;
        if (!isAdmin && !claims.userId().equals(id)) {
            throw new ForbiddenException("Accès interdit : vous ne pouvez modifier que votre propre profil.");
        }

        UtilisateurDto beforeUpdate = utilisateurService.getByIdUtilisateur(id);
        RoleUtilisateur previousRole = beforeUpdate != null ? beforeUpdate.getRole() : null;
        boolean previousActif = beforeUpdate == null || beforeUpdate.isActif();

        UtilisateurDto updated = utilisateurService.updateUtilisateur(id, utilisateurDto, isAdmin);

        if (isAdmin && updated != null) {
            boolean roleChanged = previousRole != null && updated.getRole() != null && previousRole != updated.getRole();
            boolean deactivated = previousActif && !updated.isActif();

            if (roleChanged) {
                authSessionManager.revokeAllUserSessions(id, "ROLE_CHANGED:" + previousRole + "->" + updated.getRole());
                auditSecuriteService.logRoleChange(id, previousRole.name(), updated.getRole().name(), claims.userId(), extractClientIp(request));
            } else if (deactivated) {
                authSessionManager.revokeAllUserSessions(id, "ACCOUNT_DEACTIVATED");
                auditSecuriteService.logAdminAction("DEACTIVATE_USER", claims.userId(), extractClientIp(request),
                        "Désactivation du compte et révocation des sessions de l'utilisateur ID " + id);
            }
        }
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request, true);
        if (claims.role() != RoleUtilisateur.ADMINISTRATEUR) {
            throw new ForbiddenException("Accès interdit : seul un administrateur peut supprimer un compte utilisateur.");
        }
        if (claims.userId().equals(id)) {
            throw new BadRequestException("Action refusée : vous ne pouvez pas supprimer votre propre compte administrateur actif.");
        }
        authSessionManager.revokeAllUserSessions(id, "USER_DELETED");
        utilisateurService.deleteUtilisateur(id);
        auditSecuriteService.logAdminAction("DELETE_USER", claims.userId(), extractClientIp(request), "Suppression de l'utilisateur ID " + id);
        return ResponseEntity.noContent().build();
    }

    private SessionTokenService.SessionClaims requireAuthenticated(HttpServletRequest request, boolean isMutating) {
        String token = sessionTokenService.extractToken(request);
        SessionTokenService.SessionClaims claims = sessionTokenService.verifyToken(token);

        // Vérification CSRF si la requête mutative est authentifiée par Cookie (et non par Authorization Bearer)
        String authHeader = request != null ? request.getHeader("Authorization") : null;
        boolean cookieAuthOnly = (authHeader == null || !authHeader.startsWith("Bearer "))
                && sessionTokenService.isAuthenticatedViaCookie(request);
        if (isMutating && cookieAuthOnly) {
            sessionTokenService.verifyCsrfToken(request, claims.sessionId(), claims.userId());
        }

        // Vérification de la session persistante en base et de la cohérence du rôle actif
        if (claims.sessionId() != null && !claims.sessionId().isBlank()) {
            if (!authSessionManager.isSessionActive(claims.sessionId())) {
                throw new UnauthorizedException("Cette session a été fermée ou révoquée. Veuillez vous reconnecter.");
            }
        }
        UtilisateurDto currentUser = utilisateurService.getByIdUtilisateur(claims.userId());
        if (currentUser != null) {
            if (!currentUser.isActif()) {
                authSessionManager.revokeAllUserSessions(claims.userId(), "USER_INACTIVE");
                throw new ForbiddenException("Ce compte utilisateur a été désactivé.");
            }
            if (claims.role() != null && currentUser.getRole() != null && currentUser.getRole() != claims.role()) {
                authSessionManager.revokeAllUserSessions(claims.userId(), "STALE_ROLE_DETECTED");
                throw new UnauthorizedException("Vos privilèges ont été modifiés. Veuillez vous reconnecter.");
            }
        }
        return claims;
    }

    private boolean isSecureRequest(HttpServletRequest request) {
        if (forceSecureCookies) {
            return true;
        }
        if (request == null) {
            return false;
        }
        if (request.isSecure()) {
            return true;
        }
        String proto = request.getHeader("X-Forwarded-Proto");
        return "https".equalsIgnoreCase(proto);
    }

    private ResponseCookie buildSessionCookie(String token, Duration maxAge, boolean secure) {
        return ResponseCookie.from(SessionTokenService.COOKIE_NAME, token)
                .httpOnly(true)
                .secure(secure)
                .path("/")
                .maxAge(maxAge)
                .sameSite(cookieSameSite)
                .build();
    }

    private ResponseCookie buildRefreshCookie(String token, Duration maxAge, boolean secure) {
        return ResponseCookie.from(SessionTokenService.REFRESH_COOKIE_NAME, token)
                .httpOnly(true)
                .secure(secure)
                .path("/api/utilisateurs")
                .maxAge(maxAge)
                .sameSite(cookieSameSite)
                .build();
    }

    private ResponseCookie buildCsrfCookie(String csrfToken, Duration maxAge, boolean secure) {
        return ResponseCookie.from(SessionTokenService.CSRF_COOKIE_NAME, csrfToken)
                .httpOnly(false)
                .secure(secure)
                .path("/")
                .maxAge(maxAge)
                .sameSite(cookieSameSite)
                .build();
    }

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return "0.0.0.0";
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "0.0.0.0";
    }
}
