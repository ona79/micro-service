package com.uasz.ms_patrimoine.entities;

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

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Patrimoine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nomPatrimoine;

    @Column(nullable = false, unique = true)
    private String codePatrimoine;

    @Column(length = 2000)
    private String descriptionPatrimoine;

    @Column(length = 2000)
    private String historiquePatrimoine;

    private String adressePatrimoine;

    private int capacitePatrimoine;

    private float latitudePatrimoine;

    private float longitudePatrimoine;

    @Enumerated(EnumType.STRING)
    @Column(name = "categorie_patrimoine", nullable = false, length = 50)
    @Builder.Default
    private CategoriePatrimoine categoriePatrimoine = CategoriePatrimoine.CULTUREL;

    @Column(name = "type_patrimoine", length = 120)
    private String typePatrimoine;

    @Enumerated(EnumType.STRING)
    @Column(name = "zone_geographique", nullable = false, length = 50)
    @Builder.Default
    private ZoneCasamance zoneGeographique = ZoneCasamance.BASSE_CASAMANCE;

    @Column(name = "localite", length = 150)
    private String localite;

    @Column(name = "informations_culturelles", length = 2000)
    private String informationsCulturelles;

    @Column(name = "horaires_ouverture", length = 255)
    private String horairesOuverture;

    @Column(name = "tarif_entree", nullable = false)
    @Builder.Default
    private double tarifEntree = 0.0;

    @Column(name = "informations_pratiques", length = 1000)
    private String informationsPratiques;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "galerie_medias", length = 2000)
    private String galerieMedias;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_publication", nullable = false, length = 30)
    @Builder.Default
    private StatutPublication statutPublication = StatutPublication.PUBLIE;

    @Column(name = "donnee_demonstration", nullable = false)
    @Builder.Default
    private boolean donneeDemonstration = true;

    @Column(name = "cree_par_id")
    private Long creeParId;

    @Column(name = "modifie_par_id")
    private Long modifieParId;

    @Column(name = "valide_par_id")
    private Long valideParId;

    @Column(name = "motif_statut", length = 500)
    private String motifStatut;

    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_modification", nullable = false)
    private LocalDateTime dateModification;

    @Column(name = "date_publication")
    private LocalDateTime datePublication;

    @Column(name = "date_archivage")
    private LocalDateTime dateArchivage;

    @PrePersist
    public void onPrePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (this.categoriePatrimoine == null) {
            this.categoriePatrimoine = CategoriePatrimoine.CULTUREL;
        }
        if (this.zoneGeographique == null) {
            this.zoneGeographique = ZoneCasamance.BASSE_CASAMANCE;
        }
        if (this.statutPublication == null) {
            this.statutPublication = StatutPublication.PUBLIE;
        }
        if (this.dateCreation == null) {
            this.dateCreation = now;
        }
        if (this.dateModification == null) {
            this.dateModification = now;
        }
        if (this.statutPublication == StatutPublication.PUBLIE && this.datePublication == null) {
            this.datePublication = now;
        }
    }

    @PreUpdate
    public void onPreUpdate() {
        this.dateModification = LocalDateTime.now();
    }
}
