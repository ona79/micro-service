package com.uasz.ms_utilisateur.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuideStatsDto {
    private long total;
    private long brouillons;
    private long enAttenteValidation;
    private long valides;
    private long rejetes;
    private long suspendus;
    private long desactives;
    private long disponiblesEtValides;
    private long visiblesPublic;
    private Map<String, Long> parZone;
    private Map<String, Long> parLangue;
}
