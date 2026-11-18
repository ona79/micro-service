package com.uasz.ms_reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaiementResumeDto {
    private Long id;
    private String referenceTransaction;
    private Long reservationId;
    private Long utilisateurId;
    private BigDecimal montant;
    private String devise;
    private String modePaiement;
    private String statut;
    private String correlationId;
    private LocalDateTime datePaiement;
}
