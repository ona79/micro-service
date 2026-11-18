package com.uasz.ms_utilisateur.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuideSelfUpdateRequest {

    @NotBlank(message = "La présentation courte est obligatoire")
    @Size(max = 500, message = "La présentation courte ne doit pas dépasser 500 caractères")
    private String presentationCourte;

    @NotBlank(message = "La biographie professionnelle est obligatoire")
    @Size(min = 20, max = 4000, message = "La biographie doit contenir entre 20 et 4000 caractères")
    private String biographie;

    @NotBlank(message = "Les langues parlées sont obligatoires")
    @Size(max = 300, message = "Les langues parlées ne doivent pas dépasser 300 caractères")
    private String languesParlees;

    @NotBlank(message = "Les spécialités sont obligatoires")
    @Size(max = 500, message = "Les spécialités ne doivent pas dépasser 500 caractères")
    private String specialites;

    @NotBlank(message = "Les zones d'intervention en Casamance sont obligatoires")
    @Size(max = 400, message = "Les zones d'intervention ne doivent pas dépasser 400 caractères")
    private String zonesIntervention;

    @Min(value = 0, message = "Les années d'expérience doivent être positives ou nulles")
    @Max(value = 70, message = "Les années d'expérience semblent invalides")
    private int anneesExperience;

    @Size(max = 100, message = "Le numéro de carte professionnelle ne doit pas dépasser 100 caractères")
    private String numeroCarteProfessionnelle;

    @Size(max = 1000, message = "Les références justificatives ne doivent pas dépasser 1000 caractères")
    private String documentsJustificatifs;

    @DecimalMin(value = "0.0", inclusive = true, message = "Le tarif journalier doit être positif")
    private BigDecimal tarifJournalierIndicatif;

    private Boolean disponible;

    private Boolean visibilitePublique;

    // Champs réservés à l'administration : rejetés explicitement si fournis pour tenter une élévation de privilèges
    private String statutValidation;
    private Long valideParId;
    private String motifDecision;
    private Long utilisateurId;
}
