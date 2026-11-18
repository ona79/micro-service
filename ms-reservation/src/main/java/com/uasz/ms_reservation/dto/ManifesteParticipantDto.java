package com.uasz.ms_reservation.dto;

import com.uasz.ms_reservation.entities.StatutReservation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Vue non financière destinée aux guides pour la préparation des visites sur leurs circuits.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManifesteParticipantDto {
    private Long reservationId;
    private String referenceReservation;
    private Long circuitId;
    private String nomClient;
    private int nombrePlaces;
    private LocalDate datePrestation;
    private String creneauPrestation;
    private StatutReservation statut;
    private String commentaire;
    private List<ParticipantDto> participants;
}
