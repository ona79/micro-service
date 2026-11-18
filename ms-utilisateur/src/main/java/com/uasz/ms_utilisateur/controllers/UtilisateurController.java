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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/utilisateurs")
@RequiredArgsConstructor
@Slf4j
public class UtilisateurController {

    private final IUtilisateurService utilisateurService;
    private final SessionTokenService sessionTokenService;
    private final AuthSessionManager authSessionManager;
    private final LoginRateLimiterService rateLimiterService;
    private final AuditSecuriteService auditSecuriteService;
    private final SessionUtilisateurRepository sessionRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    @PostMapping
    public ResponseEntity<UtilisateurDto> inscrire(@Valid @RequestBody UtilisateurDto utilisateurDto,
                                                   HttpServletRequest request) {
        String ip = extractClientIp(request);
        String userAgent = request.getHeader("User-Agent");

        // Enregistrement public : attribue obligatoirement le rôle TOURISTE
        UtilisateurDto created = utilisateurService.inscrireUtilisateur(utilisateurDto);
        AuthSessionManager.SessionAuthResult session = authSessionManager.createSession(created, ip, userAgent);

        ResponseCookie sessionCookie = buildSessionCookie(session.accessToken(), Duration.ofSeconds(SessionTokenService.ACCESS_TOKEN_TTL_SECONDS));
        ResponseCookie refreshCookie = buildRefreshCookie(session.refreshToken(), Duration.ofSeconds(SessionTokenService.REFRESH_TOKEN_TTL_SECONDS));

        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, sessionCookie.toString())
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .header("Authorization", "Bearer " + session.accessToken())
                .header("X-Refresh-Token", session.refreshToken())
                .body(created);
    }

    @PostMapping("/admin")
    public ResponseEntity<UtilisateurDto> creerParAdmin(@Valid @RequestBody UtilisateurDto utilisateurDto,
                                                        HttpServletRequest request) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request);
        if (claims.role() != RoleUtilisateur.ADMINISTRATEUR) {
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

            ResponseCookie sessionCookie = buildSessionCookie(session.accessToken(), Duration.ofSeconds(SessionTokenService.ACCESS_TOKEN_TTL_SECONDS));
            ResponseCookie refreshCookie = buildRefreshCookie(session.refreshToken(), Duration.ofSeconds(SessionTokenService.REFRESH_TOKEN_TTL_SECONDS));

            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, sessionCookie.toString())
                    .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                    .header("Authorization", "Bearer " + session.accessToken())
                    .header("X-Refresh-Token", session.refreshToken())
                    .body(connected);
        } catch (UnauthorizedException | ForbiddenException ex) {
            rateLimiterService.recordFailedAttempt(ip, email);
            auditSecuriteService.logLoginFailure(email, ip, "Échec d'authentification");
            // Message générique anti-énumération (SEC-VULN-11)
            throw new UnauthorizedException("Identifiants invalides. Vérifiez votre adresse email et votre mot de passe.");
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<UtilisateurDto> refresh(HttpServletRequest request) {
        String ip = extractClientIp(request);
        String userAgent = request.getHeader("User-Agent");
        String rawRefreshToken = sessionTokenService.extractRefreshToken(request);

        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new UnauthorizedException("Jeton de renouvellement absent. Veuillez vous reconnecter.");
        }

        AuthSessionManager.SessionAuthResult result = authSessionManager.refreshSession(rawRefreshToken, ip, userAgent);

        ResponseCookie sessionCookie = buildSessionCookie(result.accessToken(), Duration.ofSeconds(SessionTokenService.ACCESS_TOKEN_TTL_SECONDS));
        ResponseCookie refreshCookie = buildRefreshCookie(result.refreshToken(), Duration.ofSeconds(SessionTokenService.REFRESH_TOKEN_TTL_SECONDS));

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, sessionCookie.toString())
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString())
                .header("Authorization", "Bearer " + result.accessToken())
                .header("X-Refresh-Token", result.refreshToken())
                .body(result.userDto());
    }

    @GetMapping("/me")
    public ResponseEntity<UtilisateurDto> getCurrentSession(HttpServletRequest request) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request);
        // Vérification de la session persistante en base
        if (claims.sessionId() != null && !authSessionManager.isSessionActive(claims.sessionId())) {
            throw new UnauthorizedException("Cette session a été fermée ou révoquée. Veuillez vous reconnecter.");
        }
        UtilisateurDto user = utilisateurService.getByIdUtilisateur(claims.userId());
        if (!user.isActif()) {
            throw new ForbiddenException("Ce compte utilisateur a été désactivé.");
        }
        return ResponseEntity.ok(user);
    }

    @PostMapping("/deconnexion")
    public ResponseEntity<Void> deconnecter(HttpServletRequest request) {
        String ip = extractClientIp(request);
        String token = sessionTokenService.extractToken(request);
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

        authSessionManager.logoutSession(sessionId, userId, ip);

        ResponseCookie clearSession = buildSessionCookie("", Duration.ZERO);
        ResponseCookie clearRefresh = buildRefreshCookie("", Duration.ZERO);

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clearSession.toString())
                .header(HttpHeaders.SET_COOKIE, clearRefresh.toString())
                .build();
    }

    @PostMapping("/{id}/revoquer-sessions")
    public ResponseEntity<Void> revoquerSessions(@PathVariable Long id, HttpServletRequest request) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request);
        if (claims.role() != RoleUtilisateur.ADMINISTRATEUR) {
            throw new ForbiddenException("Accès interdit : seul un administrateur peut forcer la révocation des sessions.");
        }
        LocalDateTime now = LocalDateTime.now();
        sessionRepository.deactivateAllUserSessions(id);
        refreshTokenRepository.revokeAllByUtilisateurId(id, now);
        auditSecuriteService.logAdminAction("REVOKE_USER_SESSIONS", claims.userId(), extractClientIp(request),
                "Révocation forcée de toutes les sessions actives de l'utilisateur ID " + id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<List<UtilisateurDto>> getAll(HttpServletRequest request) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request);
        if (claims.role() != RoleUtilisateur.ADMINISTRATEUR) {
            throw new ForbiddenException("Accès interdit : seul un administrateur peut consulter la liste des utilisateurs.");
        }
        return ResponseEntity.ok(utilisateurService.getAllUtilisateurs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UtilisateurDto> getById(@PathVariable Long id, HttpServletRequest request) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request);
        if (claims.role() != RoleUtilisateur.ADMINISTRATEUR && !claims.userId().equals(id)) {
            throw new ForbiddenException("Accès interdit : vous ne pouvez consulter que votre propre profil.");
        }
        return ResponseEntity.ok(utilisateurService.getByIdUtilisateur(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UtilisateurDto> update(@PathVariable Long id,
                                                 @Valid @RequestBody UtilisateurDto utilisateurDto,
                                                 HttpServletRequest request) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request);
        boolean isAdmin = claims.role() == RoleUtilisateur.ADMINISTRATEUR;
        if (!isAdmin && !claims.userId().equals(id)) {
            throw new ForbiddenException("Accès interdit : vous ne pouvez modifier que votre propre profil.");
        }
        UtilisateurDto updated = utilisateurService.updateUtilisateur(id, utilisateurDto, isAdmin);
        if (isAdmin && utilisateurDto.getRole() != null) {
            auditSecuriteService.logRoleChange(id, "ANCIEN", updated.getRole().name(), claims.userId(), extractClientIp(request));
        }
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, HttpServletRequest request) {
        SessionTokenService.SessionClaims claims = requireAuthenticated(request);
        if (claims.role() != RoleUtilisateur.ADMINISTRATEUR) {
            throw new ForbiddenException("Accès interdit : seul un administrateur peut supprimer un compte utilisateur.");
        }
        if (claims.userId().equals(id)) {
            throw new BadRequestException("Action refusée : vous ne pouvez pas supprimer votre propre compte administrateur actif.");
        }
        utilisateurService.deleteUtilisateur(id);
        auditSecuriteService.logAdminAction("DELETE_USER", claims.userId(), extractClientIp(request), "Suppression de l'utilisateur ID " + id);
        return ResponseEntity.noContent().build();
    }

    private SessionTokenService.SessionClaims requireAuthenticated(HttpServletRequest request) {
        String token = sessionTokenService.extractToken(request);
        return sessionTokenService.verifyToken(token);
    }

    private ResponseCookie buildSessionCookie(String token, Duration maxAge) {
        return ResponseCookie.from(SessionTokenService.COOKIE_NAME, token)
                .httpOnly(true)
                .path("/")
                .maxAge(maxAge)
                .sameSite("Lax")
                .build();
    }

    private ResponseCookie buildRefreshCookie(String token, Duration maxAge) {
        return ResponseCookie.from(SessionTokenService.REFRESH_COOKIE_NAME, token)
                .httpOnly(true)
                .path("/")
                .maxAge(maxAge)
                .sameSite("Lax")
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
