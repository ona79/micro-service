package com.uasz.ms_reservation.dto;

import com.uasz.ms_reservation.entities.StatutReservation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvenementPaiementAckDto {
    private String eventId;
    private String correlationId;
    private Long reservationId;
    private StatutReservation statutReservation;
    private boolean accepte;
    private boolean dejaTraite;
    private String codeRejet;
    private String message;
}
