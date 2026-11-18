package com.uasz.ms_paiement;

import com.uasz.ms_paiement.clients.NotificationClient;
import com.uasz.ms_paiement.clients.ReservationClient;
import com.uasz.ms_paiement.dto.EvenementPaiementAckDto;
import com.uasz.ms_paiement.dto.PaiementDto;
import com.uasz.ms_paiement.dto.ReservationDto;
import com.uasz.ms_paiement.dto.SimulationPaiementRequest;
import com.uasz.ms_paiement.entities.DecisionSimulation;
import com.uasz.ms_paiement.entities.ModePaiement;
import com.uasz.ms_paiement.entities.Paiement;
import com.uasz.ms_paiement.entities.StatutOutbox;
import com.uasz.ms_paiement.entities.StatutPaiement;
import com.uasz.ms_paiement.repositories.PaiementOutboxRepository;
import com.uasz.ms_paiement.repositories.PaiementRepository;
import com.uasz.ms_paiement.security.SecurityUserContext;
import com.uasz.ms_paiement.security.SecurityUserContextHolder;
import com.uasz.ms_paiement.services.IPaiementService;
import feign.FeignException;
import feign.Request;
import feign.RequestTemplate;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
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
class PaiementPostgres16OutboxTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired
    private IPaiementService paiementService;

    @Autowired
    private PaiementRepository paiementRepository;

    @Autowired
    private PaiementOutboxRepository outboxRepository;

    @MockitoBean
    private ReservationClient reservationClient;

    @MockitoBean
    private NotificationClient notificationClient;

    @AfterEach
    void clearSecurity() {
        SecurityUserContextHolder.clear();
    }

    @Test
    void flywayV1ToV4_migreDonneesV2_garantitIdempotenceEtOutboxRecoverySurPostgres16() {
        // 1. Vérifier que V4 a migré 'VALIDE' -> 'ACCEPTE' sur les lignes seedées V2 sans erreur JPA
        List<Paiement> seeded = paiementRepository.findAll();
        assertThat(seeded).hasSizeGreaterThanOrEqualTo(2);
        assertThat(seeded).allMatch(p -> p.getStatut() == StatutPaiement.ACCEPTE);

        // 2. Initier un paiement simulé Orange Money sur PostgreSQL 16 + rejouer Idempotency-Key
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "moussa@uasz.sn", false, null));
        ReservationDto res = new ReservationDto(80L, "Moussa Diop", "moussa@uasz.sn",
                "+221771234567", 2, LocalDateTime.now(), "CIRCUIT", "EN_ATTENTE_PAIEMENT", 24000.0, 1L, null);
        res.setUtilisateurId(2L);
        res.setExpiresAt(LocalDateTime.now(Paiement.CASAMANCE_ZONE).plusMinutes(25));
        when(reservationClient.getReservationById(80L)).thenReturn(res);

        PaiementDto init = paiementService.effectuerPaiement(
                PaiementDto.builder().reservationId(80L).modePaiement(ModePaiement.ORANGE_MONEY).build(),
                "pg16-idem-om-80");
        PaiementDto replay = paiementService.effectuerPaiement(
                PaiementDto.builder().reservationId(80L).modePaiement(ModePaiement.ORANGE_MONEY).build(),
                "pg16-idem-om-80");
        assertThat(replay.getId()).isEqualTo(init.getId());
        assertThat(replay.isRejoueeIdempotence()).isTrue();

        // 3. Simuler acceptation alors que ms-reservation tombe en panne lors du callback outbox
        Request req = Request.create(Request.HttpMethod.POST, "/api/reservations/internal/80/evenement-paiement", Map.of(), null, new RequestTemplate());
        when(reservationClient.notifierEvenementPaiement(eq(80L), any()))
                .thenThrow(new FeignException.ServiceUnavailable("Timeout", req, null, null))
                .thenReturn(EvenementPaiementAckDto.builder().accepte(true).statutReservation("CONFIRMEE").build());

        PaiementDto acceptedDuringOutage = paiementService.simulerDecisionPaiement(
                init.getId(), new SimulationPaiementRequest(DecisionSimulation.ACCEPTER, "Validation OM PG16", null), null);
        assertThat(acceptedDuringOutage.getStatut()).isEqualTo(StatutPaiement.ACCEPTE);
        assertThat(acceptedDuringOutage.getSynchroReservationStatut()).isEqualTo("EN_ATTENTE_REPRISE");
        assertThat(outboxRepository.countByStatut(StatutOutbox.EN_ATTENTE)).isEqualTo(1);

        // 4. Reprise administrative une fois ms-reservation rétabli
        SecurityUserContextHolder.setContext(new SecurityUserContext(1L, "ADMINISTRATEUR", "admin@uasz.sn", false, null));
        int replayed = paiementService.rejouerOutboxEnAttente();
        assertThat(replayed).isEqualTo(1);
        assertThat(outboxRepository.countByStatut(StatutOutbox.EN_ATTENTE)).isZero();

        PaiementDto synced = paiementService.getByIdPaiement(init.getId());
        assertThat(synced.getSynchroReservationStatut()).isEqualTo("SYNCHRONISEE");

        // 5. Remboursement intégral simulé persisté sur PostgreSQL 16
        when(reservationClient.notifierEvenementPaiement(eq(80L), any()))
                .thenReturn(EvenementPaiementAckDto.builder().accepte(true).statutReservation("REMBOURSEE").build());
        PaiementDto refunded = paiementService.rembourserPaiement(init.getId(), "Test PG16", null);
        assertThat(refunded.getStatut()).isEqualTo(StatutPaiement.REMBOURSE);
    }
}
