package com.uasz.ms_reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReservationStatsDto {
    private long totalReservations;
    private long brouillon;
    private long enAttentePaiement;
    private long confirmees;
    private long expirees;
    private long annulees;
    private long echecs;
    private long remboursees;
    private long placesReserveesActives;
    private BigDecimal montantTotalConfirme;
    private BigDecimal montantTotalEnAttente;
    private String devise;
    private long reservationsParCircuit;
    private long reservationsParEvenement;
}
