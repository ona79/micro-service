package com.uasz.ms_circuit.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EtapeDto {

    private Long id;

    @Positive(message = "L'ordre de l'étape doit être strictement positif")
    private int ordre;

    @PositiveOrZero(message = "La durée de visite doit être positive ou nulle")
    private int dureeVisite;

    @NotNull(message = "L'identifiant du patrimoine de l'étape est obligatoire")
    private Long patrimoineId;

    /** Détails du patrimoine récupérés depuis ms-patrimoine (lecture seule) */
    private PatrimoineDto patrimoine;
}

