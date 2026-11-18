package com.uasz.ms_utilisateur.controllers;

import com.uasz.ms_utilisateur.dto.ConnexionRequest;
import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.exceptions.BadRequestException;
import com.uasz.ms_utilisateur.exceptions.ForbiddenException;
import com.uasz.ms_utilisateur.exceptions.UnauthorizedException;
import com.uasz.ms_utilisateur.security.SessionTokenService;
import com.uasz.ms_utilisateur.services.IUtilisateurService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
import java.util.List;

@RestController
@RequestMapping("/api/utilisateurs")
@RequiredArgsConstructor
public class UtilisateurController {

    private final IUtilisateurService utilisateurService;
    private final SessionTokenService sessionTokenService;

    @PostMapping
    public ResponseEntity<UtilisateurDto> inscrire(@Valid @RequestBody UtilisateurDto utilisateurDto) {
        // Enregistrement public : attribue obligatoirement le rôle TOURISTE
        UtilisateurDto created = utilisateurService.inscrireUtilisateur(utilisateurDto);
        String token = sessionTokenService.createToken(created);
        ResponseCookie cookie = buildSessionCookie(token, Duration.ofHours(8));
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(created);
    }

    @PostMapping("/admin")
    public ResponseEntity<UtilisateurDto> creerParAdmin(@Valid @RequestBody UtilisateurDto utilisateurDto,
                                                        HttpServletRequest request) {
        String existingToken = sessionTokenService.extractToken(request);
        if (existingToken == null) {
            throw new UnauthorizedException("Authentification requise pour créer un compte staff.");
        }
        SessionTokenService.SessionClaims claims = sessionTokenService.verifyToken(existingToken);
        if (claims.role() != RoleUtilisateur.ADMINISTRATEUR) {
            throw new ForbiddenException("Accès interdit : seul un administrateur peut créer des comptes avec rôle spécifique.");
        }
        UtilisateurDto created = utilisateurService.creerUtilisateurParAdmin(utilisateurDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/connexion")
    public ResponseEntity<UtilisateurDto> connecter(@Valid @RequestBody ConnexionRequest request) {
        UtilisateurDto connected = utilisateurService.connecterUtilisateur(request);
        String token = sessionTokenService.createToken(connected);
        ResponseCookie cookie = buildSessionCookie(token, Duration.ofHours(8));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(connected);
    }

    @GetMapping("/me")
    public ResponseEntity<UtilisateurDto> getCurrentSession(HttpServletRequest request) {
        String token = sessionTokenService.extractToken(request);
        SessionTokenService.SessionClaims claims = sessionTokenService.verifyToken(token);
        UtilisateurDto user = utilisateurService.getByIdUtilisateur(claims.userId());
        if (!user.isActif()) {
            throw new ForbiddenException("Ce compte utilisateur a été désactivé");
        }
        return ResponseEntity.ok(user);
    }

    @PostMapping("/deconnexion")
    public ResponseEntity<Void> deconnecter(HttpServletRequest request) {
        String token = sessionTokenService.extractToken(request);
        sessionTokenService.revokeToken(token);
        ResponseCookie clearCookie = buildSessionCookie("", Duration.ZERO);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clearCookie.toString())
                .build();
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
        return ResponseEntity.ok(utilisateurService.updateUtilisateur(id, utilisateurDto, isAdmin));
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
}
