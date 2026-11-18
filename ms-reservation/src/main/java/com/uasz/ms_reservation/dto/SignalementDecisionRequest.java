package com.uasz.ms_reservation.dto;

import com.uasz.ms_reservation.entities.StatutModerationAvis;
import com.uasz.ms_reservation.entities.StatutSignalement;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignalementDecisionRequest {

    @NotNull(message = "La décision de traitement du signalement est obligatoire")
    private StatutSignalement decisionSignalement;

    // Obligatoire si decisionSignalement == VALIDE_CONTENU_RETIRE (MASQUE ou REJETE)
    private StatutModerationAvis statutAvisCible;

    @NotBlank(message = "Le commentaire de décision est obligatoire")
    @Size(min = 5, max = 600, message = "Le commentaire doit contenir entre 5 et 600 caractères")
    private String commentaire;
}
