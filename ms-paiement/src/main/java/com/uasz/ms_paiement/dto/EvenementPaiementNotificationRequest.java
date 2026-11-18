package com.uasz.ms_paiement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvenementPaiementNotificationRequest {
    private String eventId;
    private String correlationId;
    private Long paiementId;
    private String referenceTransaction;
    private String typeEvenement;
    private BigDecimal montant;
    private String devise;
    private String motif;
}
