package com.uasz.ms_reservation.entities;

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
@Table(name = "avis_moderation_historique")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvisModerationHistorique {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "avis_id", nullable = false)
    private Long avisId;

    @Column(name = "signalement_id")
    private Long signalementId;

    @Enumerated(EnumType.STRING)
    @Column(name = "ancien_statut", length = 30)
    private StatutModerationAvis ancienStatut;

    @Enumerated(EnumType.STRING)
    @Column(name = "nouveau_statut", nullable = false, length = 30)
    private StatutModerationAvis nouveauStatut;

    @Column(name = "acteur_id", nullable = false)
    private Long acteurId;

    @Column(name = "acteur_role", nullable = false, length = 40)
    private String acteurRole;

    @Column(nullable = false, length = 600)
    private String justification;

    @Column(name = "correlation_id", length = 100)
    private String correlationId;

    @Column(name = "date_decision", nullable = false)
    private LocalDateTime dateDecision;
}
