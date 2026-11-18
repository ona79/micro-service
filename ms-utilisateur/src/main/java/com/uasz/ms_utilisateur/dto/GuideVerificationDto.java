package com.uasz.ms_utilisateur.dto;

import com.uasz.ms_utilisateur.entities.StatutValidationGuide;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuideVerificationDto {
    private Long utilisateurId;
    private Long profilId;
    private String nomComplet;
    private String email;
    private String role;
    private boolean compteActif;
    private StatutValidationGuide statutValidation;
    private boolean profilValide;
    private boolean disponible;
    private String zonesIntervention;
    private String languesParlees;
}
