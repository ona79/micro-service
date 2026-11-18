package com.uasz.ms_utilisateur.security;

import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.AuditSecurite;
import com.uasz.ms_utilisateur.entities.RefreshToken;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.entities.SessionUtilisateur;
import com.uasz.ms_utilisateur.exceptions.UnauthorizedException;
import com.uasz.ms_utilisateur.repositories.AuditSecuriteRepository;
import com.uasz.ms_utilisateur.repositories.RefreshTokenRepository;
import com.uasz.ms_utilisateur.repositories.SessionUtilisateurRepository;
import com.uasz.ms_utilisateur.services.IUtilisateurService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Tests d'intégration réels (sans mocks) vérifiant :
 * 1) La persistance effective de la révocation de famille et de l'audit malgré le rejet 401 lors d'un rejeu.
 * 2) La sécurité de la rotation concurrente d'un même Refresh Token (aucun double successeur).
 * 3) L'invalidation immédiate des sessions et des Access Tokens lors d'un changement de rôle.
 */
@SpringBootTest(properties = {
        "spring.cloud.discovery.enabled=false",
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false"
})
class UtilisateurSessionIntegrationTest {

    @Autowired
    private IUtilisateurService utilisateurService;

    @Autowired
    private AuthSessionManager authSessionManager;

    @Autowired
    private SessionTokenService sessionTokenService;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private SessionUtilisateurRepository sessionRepository;

    @Autowired
    private AuditSecuriteRepository auditRepository;

    @Test
    @DisplayName("Section 3 : Rejeu de Refresh Token -> la révocation de toute la famille et l'audit persistent en base malgré l'exception 401")
    void replayDetection_persisteRevocationDeFamilleEtAuditEnBaseMalgreException401() {
        String email = "replay.test." + UUID.randomUUID() + "@uasz.sn";
        UtilisateurDto user = utilisateurService.inscrireUtilisateur(UtilisateurDto.builder()
                .nom("Diallo").prenom("Ibrahima").email(email).motDePasse("Secret2026!").build());

        // 1. Création de session -> RT1
        AuthSessionManager.SessionAuthResult session1 = authSessionManager.createSession(user, "10.0.0.1", "TestClient");
        String rt1 = session1.refreshToken();

        // 2. Rotation légitime RT1 -> RT2
        AuthSessionManager.SessionAuthResult session2 = authSessionManager.refreshSession(rt1, "10.0.0.1", "TestClient");
        String rt2 = session2.refreshToken();
        String rt2Hash = sessionTokenService.hashToken(rt2);

        RefreshToken rt2BeforeReplay = refreshTokenRepository.findByTokenHash(rt2Hash).orElseThrow();
        assertThat(rt2BeforeReplay.isRevoked()).isFalse();

        // 3. Attaque par rejeu avec RT1 (déjà consommé) -> lève UnauthorizedException (401)
        assertThatThrownBy(() -> authSessionManager.refreshSession(rt1, "10.0.0.99", "AttackerClient"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Alerte de sécurité");

        // 4. Vérification en base : la transaction de révocation N'A PAS été annulée par l'exception !
        RefreshToken rt2AfterReplay = refreshTokenRepository.findByTokenHash(rt2Hash).orElseThrow();
        assertThat(rt2AfterReplay.isRevoked())
                .as("Le token successeur RT2 doit être persisté comme révoqué en base après rejeu de RT1")
                .isTrue();

        SessionUtilisateur dbSession = sessionRepository.findBySessionId(session1.sessionId()).orElseThrow();
        assertThat(dbSession.isActive())
                .as("La session doit être persistée comme inactive en base")
                .isFalse();

        List<AuditSecurite> audits = auditRepository.findByUtilisateurIdOrderByTimestampDesc(user.getId());
        assertThat(audits).anyMatch(a -> "ALERT_TOKEN_REPLAY".equals(a.getEventType()) && "ALERT".equals(a.getStatus()));
    }

    @Test
    @DisplayName("Section 3 : Renouvellements concurrents du même Refresh Token -> au plus 1 successeur créé")
    void concurrentRefresh_empecheDeuxSuccesseursValidesDuMemeToken() throws Exception {
        String email = "race.test." + UUID.randomUUID() + "@uasz.sn";
        UtilisateurDto user = utilisateurService.inscrireUtilisateur(UtilisateurDto.builder()
                .nom("Sane").prenom("Ousmane").email(email).motDePasse("Secret2026!").build());

        AuthSessionManager.SessionAuthResult initial = authSessionManager.createSession(user, "10.0.0.2", "RaceClient");
        String rawToken = initial.refreshToken();
        String parentHash = sessionTokenService.hashToken(rawToken);

        int threadCount = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);

        List<Callable<Void>> tasks = new ArrayList<>();
        for (int i = 0; i < threadCount; i++) {
            final int idx = i;
            tasks.add(() -> {
                readyLatch.countDown();
                startLatch.await(5, TimeUnit.SECONDS);
                try {
                    authSessionManager.refreshSession(rawToken, "10.0.0." + (10 + idx), "RaceThread-" + idx);
                    successCount.incrementAndGet();
                } catch (Exception ex) {
                    rejectedCount.incrementAndGet();
                }
                return null;
            });
        }

        List<Future<Void>> futures = new ArrayList<>();
        for (Callable<Void> task : tasks) {
            futures.add(pool.submit(task));
        }

        readyLatch.await(5, TimeUnit.SECONDS);
        startLatch.countDown();

        for (Future<Void> f : futures) {
            f.get(10, TimeUnit.SECONDS);
        }
        pool.shutdown();

        assertThat(successCount.get())
                .as("Au plus un seul thread concurrent peut réussir la rotation du même Refresh Token")
                .isLessThanOrEqualTo(1);
        assertThat(rejectedCount.get()).isGreaterThanOrEqualTo(threadCount - 1);

        List<RefreshToken> successors = refreshTokenRepository.findByParentTokenHash(parentHash);
        assertThat(successors)
                .as("La base de données ne doit contenir au maximum qu'un seul token successeur pour parent_token_hash")
                .hasSizeLessThanOrEqualTo(1);
    }

    @Test
    @DisplayName("Section 8 : Changement de rôle pendant une session active -> révocation immédiate et rejet de l'access token")
    void roleChange_invalideImmediatementSessionEtAccessTokenActif() {
        String email = "rolechange." + UUID.randomUUID() + "@uasz.sn";
        UtilisateurDto conservateur = utilisateurService.creerUtilisateurParAdmin(UtilisateurDto.builder()
                .nom("Badiane").prenom("Mariama").email(email).motDePasse("Secret2026!")
                .role(RoleUtilisateur.CONSERVATEUR).actif(true).build());

        AuthSessionManager.SessionAuthResult session = authSessionManager.createSession(conservateur, "10.0.0.5", "Browser");
        SessionTokenService.SessionClaims claims = sessionTokenService.verifyToken(session.accessToken());

        // Avant changement de rôle : la session est active et valide
        UtilisateurDto validated = authSessionManager.validateActiveSessionAndRole(claims);
        assertThat(validated.getRole()).isEqualTo(RoleUtilisateur.CONSERVATEUR);

        // Changement de rôle par l'administrateur : CONSERVATEUR -> TOURISTE + révocation
        conservateur.setRole(RoleUtilisateur.TOURISTE);
        utilisateurService.updateUtilisateur(conservateur.getId(), conservateur, true);
        authSessionManager.revokeAllUserSessions(conservateur.getId(), "ROLE_CHANGED:CONSERVATEUR->TOURISTE");

        // Après changement de rôle :
        // 1. La session est désactivée en base
        assertThat(authSessionManager.isSessionActive(session.sessionId())).isFalse();

        // 2. Le Refresh Token ne peut plus être utilisé
        assertThatThrownBy(() -> authSessionManager.refreshSession(session.refreshToken(), "10.0.0.5", "Browser"))
                .isInstanceOf(UnauthorizedException.class);

        // 3. L'Access Token déjà émis (pourtant non expiré) est rejeté immédiatement
        assertThatThrownBy(() -> authSessionManager.validateActiveSessionAndRole(claims))
                .isInstanceOf(UnauthorizedException.class);
    }
}
