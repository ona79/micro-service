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
public class PaiementStatsDto {
    private long totalTransactions;
    private long enCours;
    private long acceptees;
    private long refusees;
    private long expirees;
    private long annulees;
    private long remboursees;
    private BigDecimal montantTotalAccepteSimule;
    private BigDecimal montantTotalRembourseSimule;
    private BigDecimal montantWaveSimule;
    private BigDecimal montantOrangeMoneySimule;
    private long outboxEnAttente;
    private String devise;
    private boolean estSimule;
}
