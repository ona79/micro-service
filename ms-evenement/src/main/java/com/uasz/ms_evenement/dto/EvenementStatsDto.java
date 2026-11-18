package com.uasz.ms_evenement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvenementStatsDto {
    private long total;
    private long brouillons;
    private long soumis;
    private long publies;
    private long annules;
    private long termines;
    private long archives;
    private long aVenirPublies;
    private long ouvertsReservation;
    private Map<String, Long> parType;
    private Map<String, Long> parZone;
}
