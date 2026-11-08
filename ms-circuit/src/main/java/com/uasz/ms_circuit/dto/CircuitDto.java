package com.uasz.ms_circuit.dto;

import com.uasz.ms_circuit.entities.Difficulte;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CircuitDto {

    private Long id;

    @NotBlank(message = "Le nom du circuit est obligatoire")
    private String nomCircuit;

    @Size(max = 2000, message = "La description ne doit pas dépasser 2000 caractères")
    private String descriptionCircuit;

    private Difficulte difficulte;

    /** Calculée par le service (minutes) : ignorée en entrée */
    private int dureeEstimee;

    /** Calculée par le service (km) : ignorée en entrée */
    private double distanceTotale;

    @PositiveOrZero(message = "Le nombre de places doit être positif ou nul")
    private int placesMax;

    @PositiveOrZero(message = "Le prix doit être positif ou nul")
    private double prix;

    @NotEmpty(message = "Un circuit doit contenir au moins une étape")
    @Valid
    private List<EtapeDto> etapes = new ArrayList<>();
}

