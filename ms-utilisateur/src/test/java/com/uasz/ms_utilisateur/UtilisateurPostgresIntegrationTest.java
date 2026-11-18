package com.uasz.ms_utilisateur;

import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.AuditSecurite;
import com.uasz.ms_utilisateur.entities.RefreshToken;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.entities.SessionUtilisateur;
import com.uasz.ms_utilisateur.exceptions.UnauthorizedException;
import com.uasz.ms_utilisateur.repositories.AuditSecuriteRepository;
import com.uasz.ms_utilisateur.repositories.RefreshTokenRepository;
import com.uasz.ms_utilisateur.repositories.SessionUtilisateurRepository;
import com.uasz.ms_utilisateur.repositories.UtilisateurRepository;
import com.uasz.ms_utilisateur.security.AuthSessionManager;
import com.uasz.ms_utilisateur.security.SessionTokenService;
import com.uasz.ms_utilisateur.services.IUtilisateurService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

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

@SpringBootTest
@ActiveProfiles("prod")
@Tag("postgres")
@EnabledIfEnvironmentVariable(named = "POSTGRES_INTEGRATION_TEST", matches = "true")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://${TEST_DB_HOST:localhost}:${TEST_DB_PORT:5432}/utilisateur_db",
        "spring.datasource.username=${UTILISATEUR_DB_USER:utilisateur_user}",
        "spring.datasource.password=${UTILISATEUR_DB_PASSWORD:${DB_PASSWORD:}}",
        "spring.cloud.discovery.enabled=false"
})
class UtilisateurPostgresIntegrationTest {

    @Autowired
    private UtilisateurRepository utilisateurRepository;

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
    void testPostgresConnectionFlywayAndHibernateValidation() {
        assertThat(utilisateurRepository).isNotNull();
        long count = utilisateurRepository.count();
        System.out.println(">>> [POSTGRES 16 TEST] ms-utilisateur connecté avec succès ! Nombre d'utilisateurs : " + count);
        assertThat(count).isGreaterThanOrEqualTo(5);
    }

    @Test
    void testPostgres16_concurrentRefreshRotationAndReplayPersistence() throws Exception {
        String email = "pg16.concurrent." + UUID.randomUUID() + "@zig.univ.sn";
        UtilisateurDto user = utilisateurService.inscrireUtilisateur(UtilisateurDto.builder()
                .nom("Manga").prenom("Seydou").email(email).motDePasse("Postgres2026!").build());

        try {
            // 1. Test de course concurrente sur PostgreSQL 16 réel (10 threads simultanés)
            AuthSessionManager.SessionAuthResult initial = authSessionManager.createSession(user, "172.20.0.10", "PG16-LoadTester");
            String rawToken = initial.refreshToken();
            String parentHash = sessionTokenService.hashToken(rawToken);

            int threads = 10;
            ExecutorService executor = Executors.newFixedThreadPool(threads);
            CountDownLatch ready = new CountDownLatch(threads);
            CountDownLatch go = new CountDownLatch(1);
            AtomicInteger successes = new AtomicInteger(0);
            AtomicInteger failures = new AtomicInteger(0);

            List<Future<Void>> futures = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                final int idx = i;
                Callable<Void> task = () -> {
                    ready.countDown();
                    go.await(5, TimeUnit.SECONDS);
                    try {
                        authSessionManager.refreshSession(rawToken, "172.20.0." + (20 + idx), "PG16-Thread-" + idx);
                        successes.incrementAndGet();
                    } catch (Exception ex) {
                        failures.incrementAndGet();
                    }
                    return null;
                };
                futures.add(executor.submit(task));
            }

            ready.await(5, TimeUnit.SECONDS);
            go.countDown();
            for (Future<Void> f : futures) {
                f.get(15, TimeUnit.SECONDS);
            }
            executor.shutdown();

            List<RefreshToken> successors = refreshTokenRepository.findByParentTokenHash(parentHash);
            System.out.println(">>> [POSTGRES 16 CONCURRENCY] Threads=" + threads
                    + ", Succès=" + successes.get() + ", Rejets=" + failures.get()
                    + ", SuccesseursCréés=" + successors.size());

            assertThat(successes.get()).isEqualTo(1);
            assertThat(failures.get()).isEqualTo(threads - 1);
            assertThat(successors).hasSize(1);

            // 2. Test de persistance de révocation après rejeu sur PostgreSQL 16
            AuthSessionManager.SessionAuthResult sessionReplay = authSessionManager.createSession(user, "172.20.0.11", "PG16-ReplayTester");
            String rt1 = sessionReplay.refreshToken();
            AuthSessionManager.SessionAuthResult rotated = authSessionManager.refreshSession(rt1, "172.20.0.11", "PG16-ReplayTester");
            String rt2Hash = sessionTokenService.hashToken(rotated.refreshToken());

            assertThatThrownBy(() -> authSessionManager.refreshSession(rt1, "172.20.0.99", "PG16-Attacker"))
                    .isInstanceOf(UnauthorizedException.class);

            RefreshToken rt2InPg = refreshTokenRepository.findByTokenHash(rt2Hash).orElseThrow();
            SessionUtilisateur sessInPg = sessionRepository.findBySessionId(sessionReplay.sessionId()).orElseThrow();
            List<AuditSecurite> auditsInPg = auditRepository.findByUtilisateurIdOrderByTimestampDesc(user.getId());

            assertThat(rt2InPg.isRevoked()).isTrue();
            assertThat(sessInPg.isActive()).isFalse();
            assertThat(auditsInPg).anyMatch(a -> "ALERT_TOKEN_REPLAY".equals(a.getEventType()));
        } finally {
            utilisateurService.deleteUtilisateur(user.getId());
        }
    }
}
