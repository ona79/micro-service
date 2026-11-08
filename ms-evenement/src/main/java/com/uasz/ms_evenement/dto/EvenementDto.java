package com.uasz.ms_evenement.dto;

import com.uasz.ms_evenement.entities.TypeEvenement;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EvenementDto {

    private Long id;

    @NotBlank(message = "Le nom de l'événement est obligatoire")
    private String nomEvenement;

    @Size(max = 2000, message = "La description ne doit pas dépasser 2000 caractères")
    private String descriptionEvenement;

    @NotNull(message = "Le type d'événement est obligatoire")
    private TypeEvenement typeEvenement;

    @NotNull(message = "La date de début est obligatoire")
    private LocalDateTime dateDebut;

    @NotNull(message = "La date de fin est obligatoire")
    private LocalDateTime dateFin;

    private String lieu;

    @Positive(message = "La capacité maximale doit être strictement positive")
    private int capaciteMax;

    @PositiveOrZero(message = "Le prix doit être positif ou nul")
    private double prix;

    @NotNull(message = "L'identifiant du patrimoine est obligatoire")
    private Long patrimoineId;

    /** Détails du site patrimonial récupérés depuis ms-patrimoine via OpenFeign */
    private PatrimoineDto patrimoine;
}

