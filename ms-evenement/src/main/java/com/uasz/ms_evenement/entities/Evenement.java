package com.uasz.ms_evenement.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Evenement {

    public static final ZoneId CASAMANCE_ZONE = ZoneId.of("Africa/Dakar");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nomEvenement;

    @Column(length = 2000)
    private String descriptionEvenement;

    @Enumerated(EnumType.STRING)
    private TypeEvenement typeEvenement;

    @Column(nullable = false)
    private LocalDateTime dateDebut;

    @Column(nullable = false)
    private LocalDateTime dateFin;

    @Column(name = "horaires", length = 255)
    private String horaires;

    private String lieu;

    @Column(name = "zone_geographique", nullable = false, length = 50)
    @Builder.Default
    private String zoneGeographique = "BASSE_CASAMANCE";

    @Column(name = "localite", length = 150)
    private String localite;

    @Column(name = "organisateur", length = 255)
    private String organisateur;

    @Column(name = "contact_organisateur", length = 255)
    private String contactOrganisateur;

    private int capaciteMax;

    private double prix;

    @Column(name = "conditions_acces", length = 1000)
    private String conditionsAcces;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "support_communication", length = 1000)
    private String supportCommunication;

    /** Identifiant optionnel du patrimoine hébergeant l'événement (dans ms-patrimoine) */
    private Long patrimoineId;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_evenement", nullable = false, length = 30)
    @Builder.Default
    private StatutEvenement statutEvenement = StatutEvenement.PUBLIE;

    @Column(name = "motif_annulation", length = 500)
    private String motifAnnulation;

    @Column(name = "fuseau_horaire", nullable = false, length = 50)
    @Builder.Default
    private String fuseauHoraire = "Africa/Dakar";

    @Column(name = "donnee_demonstration", nullable = false)
    @Builder.Default
    private boolean donneeDemonstration = true;

    @Column(name = "cree_par_id")
    private Long creeParId;

    @Column(name = "modifie_par_id")
    private Long modifieParId;

    @Column(name = "valide_par_id")
    private Long valideParId;

    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_modification", nullable = false)
    private LocalDateTime dateModification;

    @Column(name = "date_publication")
    private LocalDateTime datePublication;

    @PrePersist
    public void onPrePersist() {
        LocalDateTime now = LocalDateTime.now(CASAMANCE_ZONE);
        if (this.zoneGeographique == null || this.zoneGeographique.isBlank()) {
            this.zoneGeographique = "BASSE_CASAMANCE";
        }
        if (this.statutEvenement == null) {
            this.statutEvenement = StatutEvenement.PUBLIE;
        }
        if (this.fuseauHoraire == null || this.fuseauHoraire.isBlank()) {
            this.fuseauHoraire = "Africa/Dakar";
        }
        if (this.dateCreation == null) {
            this.dateCreation = now;
        }
        if (this.dateModification == null) {
            this.dateModification = now;
        }
        if (this.statutEvenement == StatutEvenement.PUBLIE && this.datePublication == null) {
            this.datePublication = now;
        }
    }

    @PreUpdate
    public void onPreUpdate() {
        this.dateModification = LocalDateTime.now(CASAMANCE_ZONE);
    }
}
