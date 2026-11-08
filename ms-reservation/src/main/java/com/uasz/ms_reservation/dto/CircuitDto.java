package com.uasz.ms_reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Miroir du CircuitDto exposé par ms-circuit (port 3002) */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CircuitDto {

    private Long id;
    private String nomCircuit;
    private String descriptionCircuit;
    private String difficulte;
    private int dureeEstimee;
    private double distanceTotale;
    private int placesMax;
    private double prix;
}

