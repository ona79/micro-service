package com.uasz.ms_utilisateur.dto;

import com.uasz.ms_utilisateur.entities.StatutValidationGuide;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuideProfilDto {
    private Long id;
    private Long utilisateurId;
    private String nom;
    private String prenom;
    private String email;
    private String telephone;
    private boolean compteActif;

    private String presentationCourte;
    private String biographie;
    private String languesParlees;
    private String specialites;
    private String zonesIntervention;
    private int anneesExperience;
    private String numeroCarteProfessionnelle;
    private String documentsJustificatifs;
    private BigDecimal tarifJournalierIndicatif;
    private String devise;
    private boolean disponible;
    private boolean visibilitePublique;

    private StatutValidationGuide statutValidation;
    private String motifDecision;
    private Long valideParId;
    private LocalDateTime dateSoumission;
    private LocalDateTime dateValidation;
    private LocalDateTime dateSuspension;
    private LocalDateTime dateDesactivation;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
