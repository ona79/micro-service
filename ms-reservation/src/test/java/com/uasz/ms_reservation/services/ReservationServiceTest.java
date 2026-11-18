package com.uasz.ms_reservation.services;

import com.uasz.ms_reservation.clients.CircuitClient;
import com.uasz.ms_reservation.clients.EvenementClient;
import com.uasz.ms_reservation.clients.NotificationClient;
import com.uasz.ms_reservation.clients.PaiementClient;
import com.uasz.ms_reservation.dto.CircuitDto;
import com.uasz.ms_reservation.dto.DisponibiliteDto;
import com.uasz.ms_reservation.dto.EvenementDto;
import com.uasz.ms_reservation.dto.EvenementPaiementAckDto;
import com.uasz.ms_reservation.dto.EvenementPaiementNotificationRequest;
import com.uasz.ms_reservation.dto.ParticipantDto;
import com.uasz.ms_reservation.dto.ReservationDto;
import com.uasz.ms_reservation.entities.DisponibilitePrestation;
import com.uasz.ms_reservation.entities.Reservation;
import com.uasz.ms_reservation.entities.StatutReservation;
import com.uasz.ms_reservation.entities.TypeReservation;
import com.uasz.ms_reservation.exceptions.BadRequestException;
import com.uasz.ms_reservation.exceptions.ConflictException;
import com.uasz.ms_reservation.exceptions.ForbiddenException;
import com.uasz.ms_reservation.exceptions.ServiceIndisponibleException;
import com.uasz.ms_reservation.mappers.ReservationMapper;
import com.uasz.ms_reservation.repositories.DisponibilitePrestationRepository;
import com.uasz.ms_reservation.repositories.ReservationEvenementRecuRepository;
import com.uasz.ms_reservation.repositories.ReservationRepository;
import com.uasz.ms_reservation.security.SecurityUserContext;
import com.uasz.ms_reservation.security.SecurityUserContextHolder;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationServiceTest {

    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private DisponibilitePrestationRepository disponibiliteRepository;
    @Mock
    private ReservationEvenementRecuRepository evenementRecuRepository;
    @Mock
    private DisponibiliteLockService disponibiliteLockService;
    @Mock
    private CircuitClient circuitClient;
    @Mock
    private EvenementClient evenementClient;
    @Mock
    private PaiementClient paiementClient;
    @Mock
    private NotificationClient notificationClient;

    private final ReservationMapper reservationMapper = Mappers.getMapper(ReservationMapper.class);
    private ReservationService reservationService;

    @BeforeEach
    void setUp() {
        reservationService = new ReservationService(
                reservationRepository, disponibiliteRepository, evenementRecuRepository,
                disponibiliteLockService, reservationMapper, circuitClient, evenementClient,
                paiementClient, notificationClient);
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "moussa@uasz.sn", false, null));
        lenient().when(disponibiliteLockService.acquerirVerrou(any(), any(), any(), eq(25)))
                .thenReturn(DisponibilitePrestation.builder().capaciteTotale(25).placesReservees(0).build());
        lenient().when(disponibiliteLockService.acquerirVerrou(any(), any(), any(), eq(80)))
                .thenReturn(DisponibilitePrestation.builder().capaciteTotale(80).placesReservees(0).build());
    }

    @AfterEach
    void tearDown() {
        SecurityUserContextHolder.clear();
    }

    @Test
    void saveReservation_circuit_calculeMontantServeurEtPasseEnAttentePaiement() {
        CircuitDto circuit = new CircuitDto(1L, "Circuit Casamance", "Desc", "FACILE", 120, 12.0, 25, 5000.0);
        when(circuitClient.getCircuitById(1L)).thenReturn(circuit);
        when(reservationRepository.sumPlacesByCircuitIdAndDateAndStatutIn(eq(1L), any(), any())).thenReturn(10);
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> {
            Reservation r = inv.getArgument(0);
            r.setId(1L);
            return r;
        });

        ReservationDto dto = ReservationDto.builder()
                .nomClient("Moussa Diop")
                .emailClient("moussa@uasz.sn")
                .telephoneClient("771234567")
                .nombrePlaces(4)
                .typeReservation(TypeReservation.CIRCUIT)
                .circuitId(1L)
                .datePrestation(LocalDate.now(Reservation.CASAMANCE_ZONE).plusDays(5))
                .participants(List.of(ParticipantDto.builder().nomComplet("Moussa Diop").build()))
                .build();

        ReservationDto saved = reservationService.saveReservation(dto, "idem-key-1");

        assertThat(saved.getId()).isEqualTo(1L);
        assertThat(saved.getReferenceReservation()).startsWith("RES-");
        assertThat(saved.getUtilisateurId()).isEqualTo(2L);
        assertThat(saved.getStatut()).isEqualTo(StatutReservation.EN_ATTENTE_PAIEMENT);
        assertThat(saved.getMontantTotal()).isEqualByComparingTo("20000.00");
        assertThat(saved.getDevise()).isEqualTo("XOF");
        assertThat(saved.getExpiresAt()).isNotNull();
        assertThat(saved.getHistorique()).hasSize(1);
        assertThat(saved.getParticipants()).hasSize(1);
    }

    @Test
    void saveReservation_circuitBrouillonOuNonPublie_refuseBadRequest() {
        CircuitDto brouillon = new CircuitDto(1L, "Brouillon", "Desc", "FACILE", 90, 5.0, 20, 4000.0);
        brouillon.setStatutCircuit("BROUILLON");
        when(circuitClient.getCircuitById(1L)).thenReturn(brouillon);

        ReservationDto dto = ReservationDto.builder()
                .nomClient("Moussa").emailClient("moussa@uasz.sn")
                .nombrePlaces(2).typeReservation(TypeReservation.CIRCUIT).circuitId(1L).build();

        assertThatThrownBy(() -> reservationService.saveReservation(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("BROUILLON");
    }

    @Test
    void saveReservation_evenementNonOuvertReservation_refuseBadRequest() {
        LocalDateTime debut = LocalDateTime.now(Reservation.CASAMANCE_ZONE).plusDays(10);
        EvenementDto ev = new EvenementDto(2L, "Journées Mémorielles", "Desc", "EXPOSITION",
                debut, debut.plusDays(1), "Ziguinchor", 100, 3000.0, 1L);
        ev.setOuvertReservation(false);
        when(evenementClient.getEvenementById(2L)).thenReturn(ev);

        ReservationDto dto = ReservationDto.builder()
                .nomClient("Moussa").emailClient("moussa@uasz.sn")
                .nombrePlaces(2).typeReservation(TypeReservation.EVENEMENT).evenementId(2L).build();

        assertThatThrownBy(() -> reservationService.saveReservation(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("pas ouvert à la réservation");
    }

    @Test
    void saveReservation_circuitSansCapaciteLimitee_autoriseReservation() {
        CircuitDto illimite = new CircuitDto(9L, "Balade libre", "Desc", "FACILE", 60, 4.0, 0, 2500.0);
        when(circuitClient.getCircuitById(9L)).thenReturn(illimite);
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> {
            Reservation r = inv.getArgument(0);
            r.setId(9L);
            return r;
        });

        ReservationDto dto = ReservationDto.builder()
                .nomClient("Moussa").emailClient("moussa@uasz.sn")
                .nombrePlaces(3).typeReservation(TypeReservation.CIRCUIT).circuitId(9L).build();

        ReservationDto saved = reservationService.saveReservation(dto);
        assertThat(saved.getStatut()).isEqualTo(StatutReservation.EN_ATTENTE_PAIEMENT);
        assertThat(saved.getMontantTotal()).isEqualByComparingTo("7500.00");

        DisponibiliteDto dispo = reservationService.verifierDisponibilite(TypeReservation.CIRCUIT, 9L, null);
        assertThat(dispo.isCapaciteLimitee()).isFalse();
        assertThat(dispo.isReservable()).isTrue();
    }

    @Test
    void saveReservation_circuit_capaciteDepassee_leveBadRequest() {
        CircuitDto circuit = new CircuitDto(1L, "Circuit Gorée", "Desc", "FACILE", 120, 12.0, 25, 5000.0);
        when(circuitClient.getCircuitById(1L)).thenReturn(circuit);
        when(reservationRepository.sumPlacesByCircuitIdAndDateAndStatutIn(eq(1L), any(), any())).thenReturn(20);

        ReservationDto dto = ReservationDto.builder()
                .nomClient("Moussa Diop").emailClient("moussa@uasz.sn")
                .nombrePlaces(10).typeReservation(TypeReservation.CIRCUIT).circuitId(1L).build();

        assertThatThrownBy(() -> reservationService.saveReservation(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("5 place(s) disponible(s)");
    }

    @Test
    void saveReservation_montantManipuleParClient_refuseBadRequest() {
        CircuitDto circuit = new CircuitDto(1L, "Circuit", "Desc", "FACILE", 120, 12.0, 25, 5000.0);
        when(circuitClient.getCircuitById(1L)).thenReturn(circuit);

        ReservationDto dto = ReservationDto.builder()
                .nomClient("Fraudeur").emailClient("f@uasz.sn")
                .nombrePlaces(2).typeReservation(TypeReservation.CIRCUIT).circuitId(1L)
                .montantTotal(new BigDecimal("100.00"))
                .build();

        assertThatThrownBy(() -> reservationService.saveReservation(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("côté serveur");
    }

    @Test
    void saveReservation_doubleReservationActive_leveConflictException() {
        CircuitDto circuit = new CircuitDto(1L, "Circuit", "Desc", "FACILE", 120, 12.0, 25, 5000.0);
        when(circuitClient.getCircuitById(1L)).thenReturn(circuit);
        Reservation active = Reservation.builder().id(8L).referenceReservation("RES-EXIST").build();
        when(reservationRepository.findActiveDuplicateReservations(any(), any(), any(), any(), any()))
                .thenReturn(List.of(active));

        ReservationDto dto = ReservationDto.builder()
                .nomClient("Moussa").emailClient("moussa@uasz.sn")
                .nombrePlaces(2).typeReservation(TypeReservation.CIRCUIT).circuitId(1L).build();

        assertThatThrownBy(() -> reservationService.saveReservation(dto))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("RES-EXIST");
    }

    @Test
    void saveReservation_serviceCircuitIndisponible_leveServiceIndisponibleException() {
        Request req = Request.create(Request.HttpMethod.GET, "/api/circuits/1", Map.of(), null, new RequestTemplate());
        when(circuitClient.getCircuitById(1L)).thenThrow(new FeignException.ServiceUnavailable("Down", req, null, null));

        ReservationDto dto = ReservationDto.builder()
                .nomClient("Moussa").emailClient("moussa@uasz.sn")
                .nombrePlaces(2).typeReservation(TypeReservation.CIRCUIT).circuitId(1L).build();

        assertThatThrownBy(() -> reservationService.saveReservation(dto))
                .isInstanceOf(ServiceIndisponibleException.class);
    }

    @Test
    void traiterEvenementPaiement_confirmePuisRejoueIdempotenceEtRejetteSiExpiree() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(null, "SYSTEM", "", true, "ms-paiement"));

        Reservation res = Reservation.builder()
                .id(10L)
                .referenceReservation("RES-10")
                .utilisateurId(2L)
                .nomClient("Moussa")
                .emailClient("moussa@uasz.sn")
                .nombrePlaces(2)
                .typeReservation(TypeReservation.CIRCUIT)
                .circuitId(1L)
                .datePrestation(LocalDate.now(Reservation.CASAMANCE_ZONE).plusDays(4))
                .montantTotal(new BigDecimal("10000.00"))
                .devise("XOF")
                .statut(StatutReservation.EN_ATTENTE_PAIEMENT)
                .expiresAt(LocalDateTime.now(Reservation.CASAMANCE_ZONE).plusMinutes(20))
                .build();

        when(evenementRecuRepository.findByEventId("evt-1")).thenReturn(Optional.empty());
        when(reservationRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(res));
        when(reservationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        EvenementPaiementNotificationRequest notif = EvenementPaiementNotificationRequest.builder()
                .eventId("evt-1")
                .correlationId("corr-1")
                .paiementId(50L)
                .referenceTransaction("PAY-WAV-1")
                .typeEvenement("PAIEMENT_ACCEPTE")
                .montant(new BigDecimal("10000.00"))
                .devise("XOF")
                .build();

        EvenementPaiementAckDto ack = reservationService.traiterEvenementPaiement(10L, notif);
        assertThat(ack.isAccepte()).isTrue();
        assertThat(res.getStatut()).isEqualTo(StatutReservation.CONFIRMEE);
        assertThat(res.getReferencePaiement()).isEqualTo("PAY-WAV-1");
        verify(evenementRecuRepository).save(any());

        // Réservation expirée -> ne peut JAMAIS être confirmée
        Reservation expiredRes = Reservation.builder()
                .id(11L).referenceReservation("RES-11").utilisateurId(2L)
                .typeReservation(TypeReservation.CIRCUIT).circuitId(1L)
                .montantTotal(new BigDecimal("10000.00")).devise("XOF")
                .statut(StatutReservation.EXPIREE)
                .build();
        when(evenementRecuRepository.findByEventId("evt-2")).thenReturn(Optional.empty());
        when(reservationRepository.findByIdForUpdate(11L)).thenReturn(Optional.of(expiredRes));

        EvenementPaiementAckDto ackExp = reservationService.traiterEvenementPaiement(11L,
                EvenementPaiementNotificationRequest.builder()
                        .eventId("evt-2").paiementId(51L).referenceTransaction("PAY-WAV-2")
                        .typeEvenement("PAIEMENT_ACCEPTE").montant(new BigDecimal("10000.00")).devise("XOF").build());
        assertThat(ackExp.isAccepte()).isFalse();
        assertThat(ackExp.getCodeRejet()).isEqualTo("RESERVATION_EXPIREE");
        assertThat(expiredRes.getStatut()).isEqualTo(StatutReservation.EXPIREE);
    }

    @Test
    void workflowBrouillonPuisSoumissionEtAnnulation_controleTransitions() {
        CircuitDto circuit = new CircuitDto(1L, "Circuit Casamance", "Desc", "FACILE", 120, 12.0, 25, 5000.0);
        when(circuitClient.getCircuitById(1L)).thenReturn(circuit);
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> {
            Reservation r = inv.getArgument(0);
            if (r.getId() == null) r.setId(44L);
            return r;
        });

        ReservationDto draftReq = ReservationDto.builder()
                .nomClient("Moussa").emailClient("moussa@uasz.sn").nombrePlaces(2)
                .typeReservation(TypeReservation.CIRCUIT).circuitId(1L)
                .soumettrePourPaiement(false)
                .build();
        ReservationDto draft = reservationService.saveReservation(draftReq);
        assertThat(draft.getStatut()).isEqualTo(StatutReservation.BROUILLON);

        Reservation persisted = Reservation.builder()
                .id(44L).referenceReservation(draft.getReferenceReservation()).utilisateurId(2L)
                .nomClient("Moussa").emailClient("moussa@uasz.sn").nombrePlaces(2)
                .datePrestation(LocalDate.now(Reservation.CASAMANCE_ZONE).plusDays(2))
                .typeReservation(TypeReservation.CIRCUIT).circuitId(1L)
                .statut(StatutReservation.BROUILLON).prixUnitaire(new BigDecimal("5000.00"))
                .montantTotal(new BigDecimal("10000.00")).devise("XOF").build();
        when(reservationRepository.findByIdForUpdate(44L)).thenReturn(Optional.of(persisted));

        ReservationDto submitted = reservationService.soumettreReservation(44L);
        assertThat(submitted.getStatut()).isEqualTo(StatutReservation.EN_ATTENTE_PAIEMENT);

        ReservationDto cancelled = reservationService.annulerReservation(44L, "Changement de programme");
        assertThat(cancelled.getStatut()).isEqualTo(StatutReservation.ANNULEE);

        assertThatThrownBy(() -> reservationService.soumettreReservation(44L))
                .isInstanceOf(ConflictException.class);
    }
}
