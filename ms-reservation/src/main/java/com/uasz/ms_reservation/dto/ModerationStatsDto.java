package com.uasz.ms_reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ModerationStatsDto {
    private long totalAvis;
    private long approuves;
    private long enAttente;
    private long masques;
    private long rejetes;
    private double noteMoyenneApprouves;
    private long totalSignalements;
    private long signalementsOuverts;
    private long signalementsFondes;
    private long signalementsRejetes;
    private Map<String, Long> avisParCible;
}
