package com.uasz.ms_reservation;

import com.uasz.ms_reservation.clients.CircuitClient;
import com.uasz.ms_reservation.clients.EvenementClient;
import com.uasz.ms_reservation.dto.EvenementDto;
import com.uasz.ms_reservation.dto.EvenementPaiementAckDto;
import com.uasz.ms_reservation.dto.EvenementPaiementNotificationRequest;
import com.uasz.ms_reservation.dto.ReservationDto;
import com.uasz.ms_reservation.entities.StatutReservation;
import com.uasz.ms_reservation.entities.TypeReservation;
import com.uasz.ms_reservation.repositories.ReservationRepository;
import com.uasz.ms_reservation.security.SecurityUserContext;
import com.uasz.ms_reservation.security.SecurityUserContextHolder;
import com.uasz.ms_reservation.services.IReservationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("prod")
@Tag("postgres16")
@Testcontainers(disabledWithoutDocker = true)
@TestPropertySource(properties = {
        "DB_PASSWORD=testcontainers",
        "spring.cloud.discovery.enabled=false",
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false"
})
class ReservationPostgres16ConcurrencyTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired
    private IReservationService reservationService;

    @Autowired
    private ReservationRepository reservationRepository;

    @MockitoBean
    private CircuitClient circuitClient;

    @MockitoBean
    private EvenementClient evenementClient;

    @AfterEach
    void clearSecurity() {
        SecurityUserContextHolder.clear();
    }

    @Test
    void flywayV1ToV4_empecheSurReservationSousConcurrenceReellePostgres16() throws Exception {
        // Vérifie que V1..V4 Flyway et Hibernate ddl-auto=validate ont réussi sur PostgreSQL 16
        assertThat(reservationRepository.count()).isGreaterThanOrEqualTo(2);

        LocalDateTime debut = LocalDateTime.now(com.uasz.ms_reservation.entities.Reservation.CASAMANCE_ZONE).plusDays(15);
        EvenementDto event = new EvenementDto(
                50L, "Festival Concurrence PostgreSQL", "Test verrou pessimiste",
                "FESTIVAL", debut, debut.plusDays(1), "Ziguinchor", 8, 2500.0, 1L);
        event.setOuvertReservation(true);
        event.setStatutEvenement("PUBLIE");
        when(evenementClient.getEvenementById(50L)).thenReturn(event);

        int threadCount = 5;
        ExecutorService pool = Executors.newFixedThreadPool(threadCount);
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        List<Callable<Void>> tasks = new ArrayList<>();
        for (int i = 0; i < threadCount; i++) {
            final long userId = 100L + i;
            tasks.add(() -> {
                SecurityUserContextHolder.setContext(
                        new SecurityUserContext(userId, "TOURISTE", "user" + userId + "@uasz.sn", false, null));
                ready.countDown();
                start.await(10, TimeUnit.SECONDS);
                try {
                    ReservationDto dto = ReservationDto.builder()
                            .nomClient("Touriste " + userId)
                            .emailClient("user" + userId + "@uasz.sn")
                            .nombrePlaces(3)
                            .datePrestation(debut.toLocalDate())
                            .typeReservation(TypeReservation.EVENEMENT)
                            .evenementId(50L)
                            .build();
                    ReservationDto saved = reservationService.saveReservation(dto, "race-key-" + userId);
                    assertThat(saved.getMontantTotal()).isEqualByComparingTo("7500.00");
                    successCount.incrementAndGet();
                } catch (Exception ex) {
                    failureCount.incrementAndGet();
                } finally {
                    SecurityUserContextHolder.clear();
                }
                return null;
            });
        }

        List<Future<Void>> futures = new ArrayList<>();
        for (Callable<Void> task : tasks) {
            futures.add(pool.submit(task));
        }
        assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
        start.countDown();
        for (Future<Void> f : futures) {
            f.get(20, TimeUnit.SECONDS);
        }
        pool.shutdown();

        // Capacité max = 8, chaque thread demande 3 places -> maximum 2 succès (6 places), 3 rejets (pas de 9)
        assertThat(successCount.get()).isEqualTo(2);
        assertThat(failureCount.get()).isEqualTo(3);

        // Vérifier aussi la confirmation idempotente via événement paiement et remboursement sur PG16
        SecurityUserContextHolder.setContext(new SecurityUserContext(201L, "TOURISTE", "solo@uasz.sn", false, null));
        ReservationDto created = reservationService.saveReservation(ReservationDto.builder()
                .nomClient("Solo Client").emailClient("solo@uasz.sn").nombrePlaces(1)
                .datePrestation(debut.toLocalDate()).typeReservation(TypeReservation.EVENEMENT).evenementId(50L).build(), "solo-idem");
        ReservationDto replayed = reservationService.saveReservation(ReservationDto.builder()
                .nomClient("Solo Client").emailClient("solo@uasz.sn").nombrePlaces(1)
                .datePrestation(debut.toLocalDate()).typeReservation(TypeReservation.EVENEMENT).evenementId(50L).build(), "solo-idem");
        assertThat(replayed.isRejoueeIdempotence()).isTrue();
        assertThat(replayed.getId()).isEqualTo(created.getId());

        SecurityUserContextHolder.setContext(new SecurityUserContext(null, "SYSTEM", "", true, "ms-paiement"));
        EvenementPaiementAckDto ackConfirm = reservationService.traiterEvenementPaiement(created.getId(),
                EvenementPaiementNotificationRequest.builder()
                        .eventId("pg16-evt-1")
                        .correlationId("pg16-corr-1")
                        .paiementId(900L)
                        .referenceTransaction("PAY-PG16-01")
                        .typeEvenement("PAIEMENT_ACCEPTE")
                        .montant(new BigDecimal("2500.00"))
                        .devise("XOF")
                        .build());
        assertThat(ackConfirm.isAccepte()).isTrue();
        assertThat(ackConfirm.getStatutReservation()).isEqualTo(StatutReservation.CONFIRMEE);

        EvenementPaiementAckDto ackRefund = reservationService.traiterEvenementPaiement(created.getId(),
                EvenementPaiementNotificationRequest.builder()
                        .eventId("pg16-evt-2")
                        .correlationId("pg16-corr-1")
                        .paiementId(900L)
                        .referenceTransaction("PAY-PG16-01")
                        .typeEvenement("PAIEMENT_REMBOURSE")
                        .montant(new BigDecimal("2500.00"))
                        .devise("XOF")
                        .build());
        assertThat(ackRefund.isAccepte()).isTrue();
        assertThat(ackRefund.getStatutReservation()).isEqualTo(StatutReservation.REMBOURSEE);
    }
}
