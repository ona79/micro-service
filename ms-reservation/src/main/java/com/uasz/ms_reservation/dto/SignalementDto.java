package com.uasz.ms_reservation.dto;

import com.uasz.ms_reservation.entities.CategorieSignalement;
import com.uasz.ms_reservation.entities.StatutModerationAvis;
import com.uasz.ms_reservation.entities.StatutSignalement;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignalementDto {
    private Long id;
    private Long avisId;
    private Long signaleParId;
    private String signaleParNom;
    private CategorieSignalement categorie;
    private String motif;
    private StatutSignalement statut;
    private String decisionCommentaire;
    private Long traiteParId;
    private LocalDateTime dateSignalement;
    private LocalDateTime dateResolution;

    // Contexte résumé de l'avis signalé pour la console de modération
    private AvisDto avis;
    private StatutModerationAvis avisStatutActuel;
}
