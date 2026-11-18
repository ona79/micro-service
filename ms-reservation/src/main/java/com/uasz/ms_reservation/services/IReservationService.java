package com.uasz.ms_reservation.services;

import com.uasz.ms_reservation.dto.DisponibiliteDto;
import com.uasz.ms_reservation.dto.EvenementPaiementAckDto;
import com.uasz.ms_reservation.dto.EvenementPaiementNotificationRequest;
import com.uasz.ms_reservation.dto.ManifesteParticipantDto;
import com.uasz.ms_reservation.dto.PageResponseDto;
import com.uasz.ms_reservation.dto.ReservationDto;
import com.uasz.ms_reservation.dto.ReservationStatsDto;
import com.uasz.ms_reservation.entities.StatutReservation;
import com.uasz.ms_reservation.entities.TypeReservation;

import java.time.LocalDate;
import java.util.List;

public interface IReservationService {

    ReservationDto saveReservation(ReservationDto dto, String idempotencyKeyHeader);

    default ReservationDto saveReservation(ReservationDto dto) {
        return saveReservation(dto, null);
    }

    ReservationDto soumettreReservation(Long id);

    List<ReservationDto> getAllReservations();

    PageResponseDto<ReservationDto> rechercherReservations(
            String q,
            StatutReservation statut,
            TypeReservation type,
            Long prestationId,
            LocalDate dateMin,
            LocalDate dateMax,
            int page,
            int size,
            String sortBy,
            String sortDir
    );

    ReservationDto getByIdReservation(Long id);

    DisponibiliteDto verifierDisponibilite(TypeReservation type, Long prestationId, LocalDate datePrestation);

    ReservationDto annulerReservation(Long id, String motif);

    default ReservationDto annulerReservation(Long id) {
        return annulerReservation(id, null);
    }

    void deleteReservation(Long id);

    EvenementPaiementAckDto traiterEvenementPaiement(Long reservationId, EvenementPaiementNotificationRequest request);

    ReservationDto synchroniserPaiement(Long reservationId);

    ReservationStatsDto getStatistiques();

    List<ManifesteParticipantDto> getManifesteGuidePourCircuit(Long circuitId);

    int expirerReservationsEchues();

    List<com.uasz.ms_reservation.dto.BilletDto> getBilletsByReservation(Long reservationId);

    com.uasz.ms_reservation.dto.ValidationBilletResponse validerBillet(String tokenQr);

    com.uasz.ms_reservation.dto.BilletDto verifierBillet(String tokenQr);
}
