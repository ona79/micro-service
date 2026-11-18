package com.uasz.ms_reservation.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "avis",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_avis_reservation_cible",
                columnNames = {"reservation_id", "cible_type", "cible_id"}
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Avis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "auteur_id", nullable = false)
    private Long auteurId;

    @Column(name = "auteur_nom", nullable = false, length = 160)
    private String auteurNom;

    @Enumerated(EnumType.STRING)
    @Column(name = "cible_type", nullable = false, length = 30)
    private CibleAvis cibleType;

    @Column(name = "cible_id", nullable = false)
    private Long cibleId;

    @Column(name = "cible_nom", length = 255)
    private String cibleNom;

    @Column(name = "reservation_id", nullable = false)
    private Long reservationId;

    @Column(nullable = false)
    private int note;

    @Column(nullable = false, length = 2000)
    private String commentaire;

    @Column(name = "experience_verifiee", nullable = false)
    @Builder.Default
    private boolean experienceVerifiee = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_moderation", nullable = false, length = 30)
    @Builder.Default
    private StatutModerationAvis statutModeration = StatutModerationAvis.APPROUVE;

    @Column(name = "motif_moderation", length = 500)
    private String motifModeration;

    @Column(name = "modere_par_id")
    private Long modereParId;

    @Column(name = "date_publication", nullable = false)
    private LocalDateTime datePublication;

    @Column(name = "date_modification")
    private LocalDateTime dateModification;

    @Column(name = "date_moderation")
    private LocalDateTime dateModeration;

    @Column(name = "reponse_guide", length = 2000)
    private String reponseGuide;

    @Column(name = "date_reponse_guide")
    private LocalDateTime dateReponseGuide;

    @Column(name = "guide_repondeur_id")
    private Long guideRepondeurId;

    @Column(name = "guide_repondeur_nom", length = 160)
    private String guideRepondeurNom;
}
