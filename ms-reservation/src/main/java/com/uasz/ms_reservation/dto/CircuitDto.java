package com.uasz.ms_reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Miroir du CircuitDto exposé par ms-circuit (port 3002) */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CircuitDto {

    private Long id;
    private String nomCircuit;
    private String descriptionCircuit;
    private String difficulte;
    private int dureeEstimee;
    private double distanceTotale;
    private int placesMax;
    private BigDecimal prix;
    private String devise;
    private String statutCircuit;
    private Long guideResponsableId;
    private String pointDepart;
    private String pointArrivee;
    private String zoneGeographique;

    public CircuitDto(Long id, String nomCircuit, String descriptionCircuit, String difficulte,
                      int dureeEstimee, double distanceTotale, int placesMax, double prix) {
        this(id, nomCircuit, descriptionCircuit, difficulte, dureeEstimee, distanceTotale, placesMax,
                BigDecimal.valueOf(prix), "XOF", "PUBLIE", null, null, null, "BASSE_CASAMANCE");
    }

    public CircuitDto(Long id, String nomCircuit, String descriptionCircuit, String difficulte,
                      int dureeEstimee, double distanceTotale, int placesMax, BigDecimal prix) {
        this(id, nomCircuit, descriptionCircuit, difficulte, dureeEstimee, distanceTotale, placesMax,
                prix, "XOF", "PUBLIE", null, null, null, "BASSE_CASAMANCE");
    }
}
