package com.uasz.ms_paiement.dto;

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
    private String statutReservation;
    private boolean accepte;
    private boolean dejaTraite;
    private String codeRejet;
    private String message;
}
