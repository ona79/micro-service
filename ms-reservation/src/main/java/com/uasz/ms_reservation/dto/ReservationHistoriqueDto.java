package com.uasz.ms_reservation.dto;

import com.uasz.ms_reservation.entities.StatutReservation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReservationHistoriqueDto {
    private Long id;
    private StatutReservation ancienStatut;
    private StatutReservation nouveauStatut;
    private Long acteurId;
    private String acteurRole;
    private String acteurType;
    private String correlationId;
    private String referencePaiement;
    private String motif;
    private LocalDateTime dateTransition;
}
