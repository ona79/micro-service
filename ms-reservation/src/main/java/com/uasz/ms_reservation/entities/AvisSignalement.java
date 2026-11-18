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
@Table(name = "avis_signalement")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AvisSignalement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "avis_id", nullable = false)
    private Long avisId;

    @Column(name = "signale_par_id", nullable = false)
    private Long signaleParId;

    @Column(name = "signale_par_nom", nullable = false, length = 160)
    private String signaleParNom;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 60)
    @Builder.Default
    private CategorieSignalement categorie = CategorieSignalement.CONTENU_INAPPROPRIE;

    @Column(nullable = false, length = 600)
    private String motif;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    @Builder.Default
    private StatutSignalement statut = StatutSignalement.OUVERT;

    @Column(name = "decision_commentaire", length = 600)
    private String decisionCommentaire;

    @Column(name = "traite_par_id")
    private Long traiteParId;

    @Column(name = "date_signalement", nullable = false)
    private LocalDateTime dateSignalement;

    @Column(name = "date_resolution")
    private LocalDateTime dateResolution;
}
