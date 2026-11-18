package com.uasz.ms_circuit.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CircuitStatsDto {
    private long total;
    private long brouillons;
    private long soumis;
    private long publies;
    private long archives;
    private long avecGuideAffecte;
    private long sansGuide;
    private String scope;
    private Map<String, Long> parDifficulte;
    private Map<String, Long> parMoyenTransport;
    private Map<String, Long> parZone;
    private double prixMoyenPublie;
    private double dureeMoyenneMinutes;
}
