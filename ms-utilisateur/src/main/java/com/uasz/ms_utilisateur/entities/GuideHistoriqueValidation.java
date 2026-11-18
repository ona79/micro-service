package com.uasz.ms_utilisateur.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "guide_validation_historique")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuideHistoriqueValidation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "guide_profil_id", nullable = false)
    private Long guideProfilId;

    @Enumerated(EnumType.STRING)
    @Column(name = "ancien_statut", length = 40)
    private StatutValidationGuide ancienStatut;

    @Enumerated(EnumType.STRING)
    @Column(name = "nouveau_statut", nullable = false, length = 40)
    private StatutValidationGuide nouveauStatut;

    @Column(name = "acteur_id")
    private Long acteurId;

    @Column(name = "acteur_role", length = 40)
    private String acteurRole;

    @Column(length = 500)
    private String motif;

    @Column(name = "correlation_id", length = 100)
    private String correlationId;

    @Column(name = "date_transition", nullable = false)
    private LocalDateTime dateTransition;
}
