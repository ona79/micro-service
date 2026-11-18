package com.uasz.ms_paiement.services;

import com.uasz.ms_paiement.clients.NotificationClient;
import com.uasz.ms_paiement.clients.ReservationClient;
import com.uasz.ms_paiement.dto.EvenementPaiementAckDto;
import com.uasz.ms_paiement.dto.PaiementDto;
import com.uasz.ms_paiement.dto.ReservationDto;
import com.uasz.ms_paiement.dto.SimulationPaiementRequest;
import com.uasz.ms_paiement.entities.DecisionSimulation;
import com.uasz.ms_paiement.entities.ModePaiement;
import com.uasz.ms_paiement.entities.Paiement;
import com.uasz.ms_paiement.entities.PaiementOutbox;
import com.uasz.ms_paiement.entities.StatutOutbox;
import com.uasz.ms_paiement.entities.StatutPaiement;
import com.uasz.ms_paiement.exceptions.BadRequestException;
import com.uasz.ms_paiement.exceptions.ConflictException;
import com.uasz.ms_paiement.exceptions.ServiceIndisponibleException;
import com.uasz.ms_paiement.mappers.PaiementMapper;
import com.uasz.ms_paiement.repositories.PaiementOutboxRepository;
import com.uasz.ms_paiement.repositories.PaiementRepository;
import com.uasz.ms_paiement.security.SecurityUserContext;
import com.uasz.ms_paiement.security.SecurityUserContextHolder;
import feign.FeignException;
import feign.Request;
import feign.RequestTemplate;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaiementServiceTest {

    @Mock
    private PaiementRepository paiementRepository;
    @Mock
    private PaiementOutboxRepository outboxRepository;
    @Mock
    private ReservationClient reservationClient;
    @Mock
    private NotificationClient notificationClient;

    private final PaiementMapper paiementMapper = Mappers.getMapper(PaiementMapper.class);
    private final SimulatedMobileMoneyProvider provider = new SimulatedMobileMoneyProvider();
    private PaiementOutboxRelayService outboxRelayService;
    private PaiementService paiementService;

    @BeforeEach
    void setUp() {
        outboxRelayService = new PaiementOutboxRelayService(outboxRepository, paiementRepository, reservationClient);
        paiementService = new PaiementService(
                paiementRepository, outboxRepository, paiementMapper,
                reservationClient, notificationClient, provider, outboxRelayService
        );
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "moussa@uasz.sn", false, null));
    }

    @AfterEach
    void tearDown() {
        SecurityUserContextHolder.clear();
    }

    private ReservationDto sampleReservation(String statut) {
        ReservationDto res = new ReservationDto(2L, "Moussa Diop", "moussa@uasz.sn",
                "+221771234567", 2, LocalDateTime.now(), "CIRCUIT", statut, 30000.0, 1L, null);
        res.setUtilisateurId(2L);
        res.setExpiresAt(LocalDateTime.now(Paiement.CASAMANCE_ZONE).plusMinutes(20));
        return res;
    }

    @Test
    void effectuerPaiement_wave_initieEnCoursPuisSimuleAcceptationEtSynchroniseReservation() {
        ReservationDto res = sampleReservation("EN_ATTENTE_PAIEMENT");
        when(reservationClient.getReservationById(2L)).thenReturn(res);
        when(paiementRepository.save(any(Paiement.class))).thenAnswer(inv -> {
            Paiement p = inv.getArgument(0);
            if (p.getId() == null) p.setId(1L);
            return p;
        });

        PaiementDto input = PaiementDto.builder()
                .reservationId(2L)
                .modePaiement(ModePaiement.WAVE)
                .numeroTelephoneSimule("+221771234567")
                .build();

        PaiementDto initiated = paiementService.effectuerPaiement(input, "idem-pay-1");

        assertThat(initiated.getId()).isEqualTo(1L);
        assertThat(initiated.getStatut()).isEqualTo(StatutPaiement.EN_COURS);
        assertThat(initiated.getReferenceTransaction()).startsWith("PAY-SIM-WAV-");
        assertThat(initiated.getMontant()).isEqualByComparingTo("30000.00");
        assertThat(initiated.isEstSimule()).isTrue();
        assertThat(initiated.getNumeroTelephoneMasque()).contains("4567");
        assertThat(initiated.getHistorique()).hasSize(2);

        Paiement persisted = Paiement.builder()
                .id(1L).utilisateurId(2L).reservationId(2L)
                .referenceTransaction(initiated.getReferenceTransaction())
                .montant(new BigDecimal("30000.00")).devise("XOF")
                .modePaiement(ModePaiement.WAVE).statut(StatutPaiement.EN_COURS)
                .estSimule(true).correlationId("corr-1")
                .dateExpiration(LocalDateTime.now(Paiement.CASAMANCE_ZONE).plusMinutes(10))
                .build();
        PaiementOutbox outbox10 = PaiementOutbox.builder()
                .id(10L).eventId("evt-10").paiementId(1L).reservationId(2L)
                .eventType("PAIEMENT_ACCEPTE").referenceTransaction(initiated.getReferenceTransaction())
                .montant(new BigDecimal("30000.00")).devise("XOF").statut(StatutOutbox.EN_ATTENTE).build();
        when(paiementRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(persisted));
        when(paiementRepository.findById(1L)).thenReturn(Optional.of(persisted));
        when(outboxRepository.save(any(PaiementOutbox.class))).thenReturn(outbox10);
        when(outboxRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(outbox10));
        when(reservationClient.notifierEvenementPaiement(eq(2L), any()))
                .thenReturn(EvenementPaiementAckDto.builder().accepte(true).statutReservation("CONFIRMEE").build());

        PaiementDto simulated = paiementService.simulerDecisionPaiement(
                1L, new SimulationPaiementRequest(DecisionSimulation.ACCEPTER, null, null), null);

        assertThat(simulated.getStatut()).isEqualTo(StatutPaiement.ACCEPTE);
        assertThat(simulated.getSynchroReservationStatut()).isEqualTo("SYNCHRONISEE");
        verify(notificationClient).envoyerNotification(any());

        // Seconde acceptation interdite (409)
        assertThatThrownBy(() -> paiementService.simulerDecisionPaiement(
                1L, new SimulationPaiementRequest(DecisionSimulation.ACCEPTER, null, null), null))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void simulerAcceptation_conservePaiementAccepteQuandReservationTemporairementIndisponiblePuisReprendViaOutbox() {
        Paiement persisted = Paiement.builder()
                .id(7L).utilisateurId(2L).reservationId(2L)
                .referenceTransaction("PAY-SIM-OM-7").montant(new BigDecimal("15000.00")).devise("XOF")
                .modePaiement(ModePaiement.ORANGE_MONEY).statut(StatutPaiement.EN_COURS)
                .estSimule(true).correlationId("corr-7")
                .dateExpiration(LocalDateTime.now(Paiement.CASAMANCE_ZONE).plusMinutes(10))
                .build();

        Request req = Request.create(Request.HttpMethod.GET, "/api/reservations/2", Map.of(), null, new RequestTemplate());
        when(paiementRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(persisted));
        when(paiementRepository.findById(7L)).thenReturn(Optional.of(persisted));
        when(paiementRepository.save(any(Paiement.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reservationClient.getReservationById(2L))
                .thenThrow(new FeignException.ServiceUnavailable("Temporarily down", req, null, null));
        when(reservationClient.notifierEvenementPaiement(eq(2L), any()))
                .thenThrow(new FeignException.ServiceUnavailable("Callback down", req, null, null))
                .thenReturn(EvenementPaiementAckDto.builder().accepte(true).statutReservation("CONFIRMEE").build());

        PaiementOutbox savedOutbox = PaiementOutbox.builder()
                .id(20L).eventId("evt-7").paiementId(7L).reservationId(2L)
                .eventType("PAIEMENT_ACCEPTE").referenceTransaction("PAY-SIM-OM-7")
                .montant(new BigDecimal("15000.00")).devise("XOF").statut(StatutOutbox.EN_ATTENTE).build();
        when(outboxRepository.save(any(PaiementOutbox.class))).thenReturn(savedOutbox);
        when(outboxRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(savedOutbox));

        PaiementDto result = paiementService.simulerDecisionPaiement(
                7L, new SimulationPaiementRequest(DecisionSimulation.ACCEPTER, null, null), null);

        // Le paiement reste ACCEPTE et non perdu malgré la panne temporaire de ms-reservation
        assertThat(result.getStatut()).isEqualTo(StatutPaiement.ACCEPTE);
        assertThat(result.getSynchroReservationStatut()).isEqualTo("EN_ATTENTE_REPRISE");
        assertThat(savedOutbox.getStatut()).isEqualTo(StatutOutbox.EN_ATTENTE);
        assertThat(savedOutbox.getTentatives()).isEqualTo(1);

        // Reprise lorsque ms-reservation redevient disponible
        SecurityUserContextHolder.setContext(new SecurityUserContext(1L, "ADMINISTRATEUR", "admin@uasz.sn", false, null));
        when(outboxRepository.findByStatutOrderByCreatedAtAsc(StatutOutbox.EN_ATTENTE)).thenReturn(List.of(savedOutbox));
        int replayed = paiementService.rejouerOutboxEnAttente();

        assertThat(replayed).isEqualTo(1);
        assertThat(savedOutbox.getStatut()).isEqualTo(StatutOutbox.TRAITE);
        assertThat(persisted.getSynchroReservationStatut()).isEqualTo("SYNCHRONISEE");
    }

    @Test
    void effectuerPaiement_montantManipuleOuReservationAnnuleeOuIndisponible_rejete() {
        ReservationDto canceled = sampleReservation("ANNULEE");
        when(reservationClient.getReservationById(2L)).thenReturn(canceled);
        assertThatThrownBy(() -> paiementService.effectuerPaiement(
                PaiementDto.builder().reservationId(2L).modePaiement(ModePaiement.WAVE).build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("annulée");

        ReservationDto valid = sampleReservation("EN_ATTENTE_PAIEMENT");
        when(reservationClient.getReservationById(2L)).thenReturn(valid);
        assertThatThrownBy(() -> paiementService.effectuerPaiement(
                PaiementDto.builder().reservationId(2L).modePaiement(ModePaiement.WAVE)
                        .montant(new BigDecimal("100.00")).build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Montant manipulé");

        Request req = Request.create(Request.HttpMethod.GET, "/api/reservations/99", Map.of(), null, new RequestTemplate());
        when(reservationClient.getReservationById(99L))
                .thenThrow(new FeignException.ServiceUnavailable("Down", req, null, null));
        assertThatThrownBy(() -> paiementService.effectuerPaiement(
                PaiementDto.builder().reservationId(99L).modePaiement(ModePaiement.ORANGE_MONEY).build()))
                .isInstanceOf(ServiceIndisponibleException.class);
    }

    @Test
    void simulerAcceptation_paiementOuReservationExpiree_classeExpireJamaisAccepte() {
        Paiement expiredPay = Paiement.builder()
                .id(8L).utilisateurId(2L).reservationId(2L)
                .referenceTransaction("PAY-EXP-8").montant(new BigDecimal("15000.00")).devise("XOF")
                .modePaiement(ModePaiement.WAVE).statut(StatutPaiement.EN_COURS)
                .estSimule(true).dateExpiration(LocalDateTime.now(Paiement.CASAMANCE_ZONE).minusMinutes(2))
                .build();
        when(paiementRepository.findByIdForUpdate(8L)).thenReturn(Optional.of(expiredPay));
        when(paiementRepository.findById(8L)).thenReturn(Optional.of(expiredPay));
        when(reservationClient.getReservationById(2L)).thenReturn(sampleReservation("EN_ATTENTE_PAIEMENT"));
        when(paiementRepository.save(any(Paiement.class))).thenAnswer(inv -> inv.getArgument(0));
        when(outboxRepository.save(any(PaiementOutbox.class))).thenAnswer(inv -> inv.getArgument(0));

        PaiementDto dto = paiementService.simulerDecisionPaiement(
                8L, new SimulationPaiementRequest(DecisionSimulation.ACCEPTER, null, null), null);
        assertThat(dto.getStatut()).isEqualTo(StatutPaiement.EXPIRE);
    }

    @Test
    void rembourserPaiement_adminValideRemboursementIntegral() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(1L, "ADMINISTRATEUR", "admin@uasz.sn", false, null));
        Paiement accepted = Paiement.builder()
                .id(15L).utilisateurId(2L).reservationId(2L)
                .referenceTransaction("PAY-ACC-15").montant(new BigDecimal("30000.00")).devise("XOF")
                .modePaiement(ModePaiement.WAVE).statut(StatutPaiement.ACCEPTE).estSimule(true).build();
        PaiementOutbox outbox33 = PaiementOutbox.builder()
                .id(33L).eventId("evt-33").paiementId(15L).reservationId(2L)
                .eventType("PAIEMENT_REMBOURSE").referenceTransaction("PAY-ACC-15")
                .montant(new BigDecimal("30000.00")).devise("XOF").statut(StatutOutbox.EN_ATTENTE).build();
        when(paiementRepository.findByIdForUpdate(15L)).thenReturn(Optional.of(accepted));
        when(paiementRepository.findById(15L)).thenReturn(Optional.of(accepted));
        when(paiementRepository.save(any(Paiement.class))).thenAnswer(inv -> inv.getArgument(0));
        when(outboxRepository.save(any(PaiementOutbox.class))).thenReturn(outbox33);
        when(outboxRepository.findByIdForUpdate(33L)).thenReturn(Optional.of(outbox33));
        when(reservationClient.notifierEvenementPaiement(eq(2L), any()))
                .thenReturn(EvenementPaiementAckDto.builder().accepte(true).statutReservation("REMBOURSEE").build());

        PaiementDto refunded = paiementService.rembourserPaiement(15L, "Annulation autorisée", null);
        assertThat(refunded.getStatut()).isEqualTo(StatutPaiement.REMBOURSE);
        assertThat(refunded.getSynchroReservationStatut()).isEqualTo("SYNCHRONISEE");
    }
}
