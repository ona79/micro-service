package com.uasz.ms_reservation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
    @NotBlank
    private String eventId;
    private String correlationId;
    @NotNull
    private Long paiementId;
    @NotBlank
    private String referenceTransaction;
    @NotBlank
    private String typeEvenement;
    @NotNull
    private BigDecimal montant;
    private String devise;
    private String motif;
}
