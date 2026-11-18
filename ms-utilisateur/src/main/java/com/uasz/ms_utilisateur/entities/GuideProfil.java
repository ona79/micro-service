package com.uasz.ms_utilisateur.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "guide_profil")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuideProfil {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "utilisateur_id", nullable = false, unique = true)
    private Utilisateur utilisateur;

    @Column(name = "presentation_courte", nullable = false, length = 500)
    private String presentationCourte;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String biographie;

    @Column(name = "langues_parlees", nullable = false, length = 300)
    private String languesParlees;

    @Column(nullable = false, length = 500)
    private String specialites;

    @Column(name = "zones_intervention", nullable = false, length = 400)
    private String zonesIntervention;

    @Column(name = "annees_experience", nullable = false)
    @Builder.Default
    private int anneesExperience = 0;

    @Column(name = "numero_carte_professionnelle", length = 100)
    private String numeroCarteProfessionnelle;

    @Column(name = "documents_justificatifs", length = 1000)
    private String documentsJustificatifs;

    @Column(name = "tarif_journalier_indicatif", precision = 12, scale = 2)
    private BigDecimal tarifJournalierIndicatif;

    @Column(nullable = false, length = 10)
    @Builder.Default
    private String devise = "XOF";

    @Column(nullable = false)
    @Builder.Default
    private boolean disponible = true;

    @Column(name = "visibilite_publique", nullable = false)
    @Builder.Default
    private boolean visibilitePublique = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_validation", nullable = false, length = 40)
    @Builder.Default
    private StatutValidationGuide statutValidation = StatutValidationGuide.BROUILLON;

    @Column(name = "motif_decision", length = 500)
    private String motifDecision;

    @Column(name = "valide_par_id")
    private Long valideParId;

    @Column(name = "date_soumission")
    private LocalDateTime dateSoumission;

    @Column(name = "date_validation")
    private LocalDateTime dateValidation;

    @Column(name = "date_suspension")
    private LocalDateTime dateSuspension;

    @Column(name = "date_desactivation")
    private LocalDateTime dateDesactivation;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
