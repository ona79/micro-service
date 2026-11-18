package com.uasz.ms_patrimoine.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatrimoineStatsDto {
    private long total;
    private long brouillons;
    private long soumis;
    private long publies;
    private long archives;
    private String scope;
    private Map<String, Long> parCategorie;
    private Map<String, Long> parZone;
    private long capaciteTotalePubliee;
    private double tarifMoyenPublie;
}
