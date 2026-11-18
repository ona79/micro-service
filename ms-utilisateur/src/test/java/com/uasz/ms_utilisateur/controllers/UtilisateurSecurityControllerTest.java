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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
    void connecter_succes_retourneCookiesSessionEtRefresh() throws Exception {
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
                "sess-uuid-123"
        );

        when(authSessionManager.createSession(eq(connectedUser), any(), any())).thenReturn(sessionResult);

        ConnexionRequest request = new ConnexionRequest("moussa@uasz.sn", "Passer123!");

        mockMvc.perform(post("/api/utilisateurs/connexion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("moussa@uasz.sn"))
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(header().string("Authorization", "Bearer jwt.access.token"))
                .andExpect(header().string("X-Refresh-Token", "refresh-opaque-token-64hex"));
    }
}
