package com.uasz.ms_reservation.services;

import com.uasz.ms_reservation.clients.CircuitClient;
import com.uasz.ms_reservation.clients.EvenementClient;
import com.uasz.ms_reservation.dto.CircuitDto;
import com.uasz.ms_reservation.dto.EvenementDto;
import com.uasz.ms_reservation.dto.ReservationDto;
import com.uasz.ms_reservation.entities.Reservation;
import com.uasz.ms_reservation.entities.StatutReservation;
import com.uasz.ms_reservation.entities.TypeReservation;
import com.uasz.ms_reservation.exceptions.BadRequestException;
import com.uasz.ms_reservation.mappers.ReservationMapper;
import com.uasz.ms_reservation.repositories.ReservationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private CircuitClient circuitClient;

    @Mock
    private EvenementClient evenementClient;

    private final ReservationMapper reservationMapper = Mappers.getMapper(ReservationMapper.class);

    private ReservationService reservationService;

    @BeforeEach
    void setUp() {
        reservationService = new ReservationService(reservationRepository, reservationMapper, circuitClient, evenementClient);
    }

    @Test
    void saveReservation_circuit_calculeMontantEtConfirme() {
        CircuitDto circuit = new CircuitDto(1L, "Circuit Gorée", "Desc", "FACILE", 120, 12.0, 25, 5000.0);
        when(circuitClient.getCircuitById(1L)).thenReturn(circuit);
        when(reservationRepository.sumPlacesByCircuitIdAndStatutNot(1L, StatutReservation.ANNULEE)).thenReturn(10);
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> {
            Reservation r = inv.getArgument(0);
            r.setId(1L);
            return r;
        });

        ReservationDto dto = new ReservationDto(null, "Moussa Diop", "moussa@uasz.sn", "771234567",
                4, null, TypeReservation.CIRCUIT, null, 0.0, 1L, null, null, null);

        ReservationDto saved = reservationService.saveReservation(dto);

        assertThat(saved.getId()).isEqualTo(1L);
        assertThat(saved.getStatut()).isEqualTo(StatutReservation.CONFIRMEE);
        assertThat(saved.getMontantTotal()).isEqualTo(20000.0);
        assertThat(saved.getCircuit().getNomCircuit()).isEqualTo("Circuit Gorée");
    }

    @Test
    void saveReservation_circuit_capaciteDepassee_leveBadRequest() {
        CircuitDto circuit = new CircuitDto(1L, "Circuit Gorée", "Desc", "FACILE", 120, 12.0, 25, 5000.0);
        when(circuitClient.getCircuitById(1L)).thenReturn(circuit);
        when(reservationRepository.sumPlacesByCircuitIdAndStatutNot(1L, StatutReservation.ANNULEE)).thenReturn(20);

        ReservationDto dto = new ReservationDto(null, "Moussa Diop", "moussa@uasz.sn", "771234567",
                10, null, TypeReservation.CIRCUIT, null, 0.0, 1L, null, null, null);

        assertThatThrownBy(() -> reservationService.saveReservation(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("5 place(s) disponible(s)");
    }

    @Test
    void saveReservation_evenement_calculeMontantEtConfirme() {
        EvenementDto ev = new EvenementDto(1L, "Expo Gorée", "Desc", "EXPOSITION",
                LocalDateTime.now(), LocalDateTime.now().plusHours(4), "Gorée", 80, 3000.0, 2L);
        when(evenementClient.getEvenementById(1L)).thenReturn(ev);
        when(reservationRepository.sumPlacesByEvenementIdAndStatutNot(1L, StatutReservation.ANNULEE)).thenReturn(0);
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> {
            Reservation r = inv.getArgument(0);
            r.setId(2L);
            return r;
        });

        ReservationDto dto = new ReservationDto(null, "Fatou Ndiaye", "fatou@uasz.sn", "780000000",
                3, null, TypeReservation.EVENEMENT, null, 0.0, null, 1L, null, null);

        ReservationDto saved = reservationService.saveReservation(dto);

        assertThat(saved.getId()).isEqualTo(2L);
        assertThat(saved.getStatut()).isEqualTo(StatutReservation.CONFIRMEE);
        assertThat(saved.getMontantTotal()).isEqualTo(9000.0);
        assertThat(saved.getEvenement().getNomEvenement()).isEqualTo("Expo Gorée");
    }
}

