package com.uasz.ms_circuit.entities;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Circuit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nomCircuit;

    @Column(length = 2000)
    private String descriptionCircuit;

    @Column(name = "presentation_touristique", length = 2000)
    private String presentationTouristique;

    @Enumerated(EnumType.STRING)
    private Difficulte difficulte;

    @Enumerated(EnumType.STRING)
    @Column(name = "moyen_transport", nullable = false, length = 50)
    @Builder.Default
    private MoyenTransport moyenTransport = MoyenTransport.MIXTE;

    @Column(name = "zone_geographique", nullable = false, length = 50)
    @Builder.Default
    private String zoneGeographique = "BASSE_CASAMANCE";

    @Column(name = "point_depart", length = 150)
    private String pointDepart;

    @Column(name = "point_arrivee", length = 150)
    private String pointArrivee;

    @Column(name = "informations_pratiques", length = 1000)
    private String informationsPratiques;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    /** Durée estimée en minutes (somme des durées de visite des étapes) - calculée */
    private int dureeEstimee;

    /** Distance totale indicative en km entre les étapes successives */
    private double distanceTotale;

    /** Indique explicitement la nature de la distance (ex: ESTIMATION_ORTHODROMIQUE_INDICATIVE) */
    @Column(name = "mode_calcul_distance", nullable = false, length = 60)
    @Builder.Default
    private String modeCalculDistance = "ESTIMATION_ORTHODROMIQUE_INDICATIVE";

    /** Nombre maximal de participants (utilisé par ms-reservation) */
    private int placesMax;

    private double prix;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_circuit", nullable = false, length = 30)
    @Builder.Default
    private StatutCircuit statutCircuit = StatutCircuit.PUBLIE;

    @Column(name = "donnee_demonstration", nullable = false)
    @Builder.Default
    private boolean donneeDemonstration = true;

    @Column(name = "cree_par_id")
    private Long creeParId;

    @Column(name = "modifie_par_id")
    private Long modifieParId;

    @Column(name = "valide_par_id")
    private Long valideParId;

    @Column(name = "guide_responsable_id")
    private Long guideResponsableId;

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

    @OneToMany(mappedBy = "circuit", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordre ASC")
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Etape> etapes = new ArrayList<>();

    @PrePersist
    public void onPrePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (this.moyenTransport == null) {
            this.moyenTransport = MoyenTransport.MIXTE;
        }
        if (this.zoneGeographique == null || this.zoneGeographique.isBlank()) {
            this.zoneGeographique = "BASSE_CASAMANCE";
        }
        if (this.modeCalculDistance == null || this.modeCalculDistance.isBlank()) {
            this.modeCalculDistance = "ESTIMATION_ORTHODROMIQUE_INDICATIVE";
        }
        if (this.statutCircuit == null) {
            this.statutCircuit = StatutCircuit.PUBLIE;
        }
        if (this.dateCreation == null) {
            this.dateCreation = now;
        }
        if (this.dateModification == null) {
            this.dateModification = now;
        }
        if (this.statutCircuit == StatutCircuit.PUBLIE && this.datePublication == null) {
            this.datePublication = now;
        }
    }

    @PreUpdate
    public void onPreUpdate() {
        this.dateModification = LocalDateTime.now();
    }
}
