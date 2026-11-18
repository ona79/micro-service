package com.uasz.ms_utilisateur.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uasz.ms_utilisateur.dto.ConnexionRequest;
import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.exceptions.GlobalExceptionHandler;
import com.uasz.ms_utilisateur.exceptions.UnauthorizedException;
import com.uasz.ms_utilisateur.repositories.RefreshTokenRepository;
import com.uasz.ms_utilisateur.repositories.SessionUtilisateurRepository;
import com.uasz.ms_utilisateur.security.AuthSessionManager;
import com.uasz.ms_utilisateur.security.LoginRateLimiterService;
import com.uasz.ms_utilisateur.security.SessionTokenService;
import com.uasz.ms_utilisateur.services.AuditSecuriteService;
import com.uasz.ms_utilisateur.services.IUtilisateurService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UtilisateurSecurityControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private IUtilisateurService utilisateurService;

    @Mock
    private SessionTokenService sessionTokenService;

    @Mock
    private AuthSessionManager authSessionManager;

    @Mock
    private LoginRateLimiterService rateLimiterService;

    @Mock
    private AuditSecuriteService auditSecuriteService;

    @Mock
    private SessionUtilisateurRepository sessionRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @BeforeEach
    void setUp() {
        UtilisateurController controller = new UtilisateurController(
                utilisateurService,
                sessionTokenService,
                authSessionManager,
                rateLimiterService,
                auditSecuriteService,
                sessionRepository,
                refreshTokenRepository
        );
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void connecter_identifiantsInvalides_retourneMessageGeneriqueAntiEnumeration() throws Exception {
        when(rateLimiterService.isBlocked(any(), any())).thenReturn(false);
        when(utilisateurService.connecterUtilisateur(any(ConnexionRequest.class)))
                .thenThrow(new UnauthorizedException("Email ou mot de passe incorrect"));

        ConnexionRequest request = new ConnexionRequest("inconnu@uasz.sn", "MauvaisMdp");

        mockMvc.perform(post("/api/utilisateurs/connexion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erreur").value("Identifiants invalides. Vérifiez votre adresse email et votre mot de passe."));
    }

    @Test
    void connecter_tropDeTentatives_retourne429TooManyRequests() throws Exception {
        when(rateLimiterService.isBlocked(any(), any())).thenReturn(true);
        when(rateLimiterService.getRemainingLockoutSeconds(any(), any())).thenReturn(240L);

        ConnexionRequest request = new ConnexionRequest("attaquant@uasz.sn", "bruteForce");

        mockMvc.perform(post("/api/utilisateurs/connexion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "240"));
    }

    @Test
    void connecter_succes_retourneCookiesHttpOnlySansExposerHeaderXRefreshToken() throws Exception {
        when(rateLimiterService.isBlocked(any(), any())).thenReturn(false);

        UtilisateurDto connectedUser = UtilisateurDto.builder()
                .id(2L)
                .email("moussa@uasz.sn")
                .nom("Diop")
                .prenom("Moussa")
                .role(RoleUtilisateur.TOURISTE)
                .actif(true)
                .build();

        when(utilisateurService.connecterUtilisateur(any(ConnexionRequest.class))).thenReturn(connectedUser);

        AuthSessionManager.SessionAuthResult sessionResult = new AuthSessionManager.SessionAuthResult(
                connectedUser,
                "jwt.access.token",
                "refresh-opaque-token-64hex",
                "sess-uuid-123",
                "csrf.token.sig"
        );

        when(authSessionManager.createSession(eq(connectedUser), any(), any())).thenReturn(sessionResult);

        ConnexionRequest request = new ConnexionRequest("moussa@uasz.sn", "Passer123!");

        var mvcResult = mockMvc.perform(post("/api/utilisateurs/connexion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("moussa@uasz.sn"))
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(header().string("Authorization", "Bearer jwt.access.token"))
                .andExpect(header().string("X-XSRF-TOKEN", "csrf.token.sig"))
                .andExpect(header().doesNotExist("X-Refresh-Token"))
                .andReturn();

        List<String> setCookies = mvcResult.getResponse().getHeaders("Set-Cookie");
        assertThat(setCookies).anyMatch(c -> c.startsWith("PATRIMOINE_SESSION=") && c.contains("HttpOnly") && c.contains("Path=/") && c.contains("SameSite=Strict"));
        assertThat(setCookies).anyMatch(c -> c.startsWith("PATRIMOINE_REFRESH=") && c.contains("HttpOnly") && c.contains("Path=/api/utilisateurs") && c.contains("SameSite=Strict"));
        assertThat(setCookies).anyMatch(c -> c.startsWith("XSRF-TOKEN=") && c.contains("Path=/") && !c.contains("HttpOnly"));
    }

    @Test
    void refresh_sansCookieHttpOnly_rejette401MemeSiHeaderXRefreshTokenPresent() throws Exception {
        when(sessionTokenService.extractRefreshToken(any())).thenReturn(null);

        mockMvc.perform(post("/api/utilisateurs/refresh")
                        .header("X-Refresh-Token", "refresh-token-dans-header-interdit"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erreur").value("Jeton de renouvellement absent (cookie HttpOnly PATRIMOINE_REFRESH requis). Veuillez vous reconnecter."));
    }

    @Test
    void update_changementDeRoleParAdmin_revoqueImmediatementToutesLesSessions() throws Exception {
        SessionTokenService.SessionClaims adminClaims = new SessionTokenService.SessionClaims(
                1L, "admin@uasz.sn", RoleUtilisateur.ADMINISTRATEUR,
                List.of("UTILISATEUR:GERER_ROLES"), "sess-admin", 9999999999L, "jti-admin"
        );
        UtilisateurDto adminDto = UtilisateurDto.builder()
                .id(1L).email("admin@uasz.sn").role(RoleUtilisateur.ADMINISTRATEUR).actif(true).build();
        UtilisateurDto beforeUser = UtilisateurDto.builder()
                .id(5L).nom("Kaboré").prenom("Fatou").email("fatou@uasz.sn").role(RoleUtilisateur.CONSERVATEUR).actif(true).build();
        UtilisateurDto updatedUser = UtilisateurDto.builder()
                .id(5L).nom("Kaboré").prenom("Fatou").email("fatou@uasz.sn").role(RoleUtilisateur.TOURISTE).actif(true).build();

        when(sessionTokenService.extractToken(any())).thenReturn("admin.jwt.token");
        when(sessionTokenService.verifyToken("admin.jwt.token")).thenReturn(adminClaims);
        when(authSessionManager.isSessionActive("sess-admin")).thenReturn(true);
        when(utilisateurService.getByIdUtilisateur(1L)).thenReturn(adminDto);
        when(utilisateurService.getByIdUtilisateur(5L)).thenReturn(beforeUser);
        when(utilisateurService.updateUtilisateur(eq(5L), any(UtilisateurDto.class), eq(true))).thenReturn(updatedUser);

        mockMvc.perform(put("/api/utilisateurs/5")
                        .header("Authorization", "Bearer admin.jwt.token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("TOURISTE"));

        verify(authSessionManager).revokeAllUserSessions(eq(5L), eq("ROLE_CHANGED:CONSERVATEUR->TOURISTE"));
        verify(auditSecuriteService).logRoleChange(eq(5L), eq("CONSERVATEUR"), eq("TOURISTE"), eq(1L), any());
    }

    @Test
    void deconnecter_supprimeLesCookiesAvecPathAdapte() throws Exception {
        var mvcResult = mockMvc.perform(post("/api/utilisateurs/deconnexion")
                        .cookie(new Cookie("PATRIMOINE_REFRESH", "rt-123")))
                .andExpect(status().isNoContent())
                .andReturn();

        List<String> setCookies = mvcResult.getResponse().getHeaders("Set-Cookie");
        assertThat(setCookies).anyMatch(c -> c.startsWith("PATRIMOINE_SESSION=;") && c.contains("Max-Age=0") && c.contains("Path=/"));
        assertThat(setCookies).anyMatch(c -> c.startsWith("PATRIMOINE_REFRESH=;") && c.contains("Max-Age=0") && c.contains("Path=/api/utilisateurs"));
        assertThat(setCookies).anyMatch(c -> c.startsWith("XSRF-TOKEN=;") && c.contains("Max-Age=0") && c.contains("Path=/"));
    }

    @Test
    void auditEtStatsUtilisateurs_interditsAuxNonAdministrateurs() throws Exception {
        SessionTokenService.SessionClaims managerClaims = new SessionTokenService.SessionClaims(
                3L, "awa@uasz.sn", RoleUtilisateur.GESTIONNAIRE_SITE,
                List.of("GUIDE:VALIDER"), "sess-mgr", 9999999999L, "jti-mgr"
        );
        UtilisateurDto managerDto = UtilisateurDto.builder()
                .id(3L).email("awa@uasz.sn").role(RoleUtilisateur.GESTIONNAIRE_SITE).actif(true).build();

        when(sessionTokenService.extractToken(any())).thenReturn("mgr.jwt.token");
        when(sessionTokenService.verifyToken("mgr.jwt.token")).thenReturn(managerClaims);
        when(authSessionManager.isSessionActive("sess-mgr")).thenReturn(true);
        when(utilisateurService.getByIdUtilisateur(3L)).thenReturn(managerDto);

        mockMvc.perform(get("/api/utilisateurs/statistiques")
                        .header("Authorization", "Bearer mgr.jwt.token"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/utilisateurs/audit")
                        .header("Authorization", "Bearer mgr.jwt.token"))
                .andExpect(status().isForbidden());
    }
}
