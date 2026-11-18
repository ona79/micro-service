package com.uasz.ms_patrimoine.dto;

import com.uasz.ms_patrimoine.entities.CategoriePatrimoine;
import com.uasz.ms_patrimoine.entities.StatutPublication;
import com.uasz.ms_patrimoine.entities.ZoneCasamance;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatrimoineDto {

    private Long id;

    @NotBlank(message = "Le nom du patrimoine est obligatoire")
    @Size(max = 255, message = "Le nom du patrimoine ne doit pas dépasser 255 caractères")
    private String nomPatrimoine;

    @NotBlank(message = "Le code du patrimoine est obligatoire")
    @Size(max = 100, message = "Le code du patrimoine ne doit pas dépasser 100 caractères")
    private String codePatrimoine;

    @Size(max = 2000, message = "La description ne doit pas dépasser 2000 caractères")
    private String descriptionPatrimoine;

    @Size(max = 2000, message = "L'historique ne doit pas dépasser 2000 caractères")
    private String historiquePatrimoine;

    @Size(max = 255, message = "L'adresse ne doit pas dépasser 255 caractères")
    private String adressePatrimoine;

    @PositiveOrZero(message = "La capacité doit être positive ou nulle")
    private int capacitePatrimoine;

    @DecimalMin(value = "-90.0", message = "La latitude doit être comprise entre -90 et 90 degrés")
    @DecimalMax(value = "90.0", message = "La latitude doit être comprise entre -90 et 90 degrés")
    private float latitudePatrimoine;

    @DecimalMin(value = "-180.0", message = "La longitude doit être comprise entre -180 et 180 degrés")
    @DecimalMax(value = "180.0", message = "La longitude doit être comprise entre -180 et 180 degrés")
    private float longitudePatrimoine;

    @Builder.Default
    private CategoriePatrimoine categoriePatrimoine = CategoriePatrimoine.CULTUREL;

    @Size(max = 120, message = "Le type de patrimoine ne doit pas dépasser 120 caractères")
    private String typePatrimoine;

    @Builder.Default
    private ZoneCasamance zoneGeographique = ZoneCasamance.BASSE_CASAMANCE;

    @Size(max = 150, message = "La localité ne doit pas dépasser 150 caractères")
    private String localite;

    @Size(max = 2000, message = "Les informations culturelles ne doivent pas dépasser 2000 caractères")
    private String informationsCulturelles;

    @Size(max = 255, message = "Les horaires d'ouverture ne doivent pas dépasser 255 caractères")
    private String horairesOuverture;

    @PositiveOrZero(message = "Le tarif d'entrée doit être positif ou nul")
    @Builder.Default
    private double tarifEntree = 0.0;

    @Size(max = 1000, message = "Les informations pratiques ne doivent pas dépasser 1000 caractères")
    private String informationsPratiques;

    @Size(max = 500, message = "L'URL de l'image ne doit pas dépasser 500 caractères")
    private String imageUrl;

    @Size(max = 2000, message = "La galerie médias ne doit pas dépasser 2000 caractères")
    private String galerieMedias;

    @Builder.Default
    private StatutPublication statutPublication = StatutPublication.PUBLIE;

    @Builder.Default
    private boolean donneeDemonstration = true;

    private Long creeParId;
    private Long modifieParId;
    private Long valideParId;

    @Size(max = 500, message = "Le motif du statut ne doit pas dépasser 500 caractères")
    private String motifStatut;

    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;
    private LocalDateTime datePublication;
    private LocalDateTime dateArchivage;

    /** Distance indicative en kilomètres par rapport à la position GPS demandée */
    private Double distanceKm;

    /**
     * Constructeur de compatibilité ascendante P01/P02 (9 paramètres).
     */
    public PatrimoineDto(Long id,
                         String nomPatrimoine,
                         String codePatrimoine,
                         String descriptionPatrimoine,
                         String historiquePatrimoine,
                         String adressePatrimoine,
                         int capacitePatrimoine,
                         float latitudePatrimoine,
                         float longitudePatrimoine) {
        this.id = id;
        this.nomPatrimoine = nomPatrimoine;
        this.codePatrimoine = codePatrimoine;
        this.descriptionPatrimoine = descriptionPatrimoine;
        this.historiquePatrimoine = historiquePatrimoine;
        this.adressePatrimoine = adressePatrimoine;
        this.capacitePatrimoine = capacitePatrimoine;
        this.latitudePatrimoine = latitudePatrimoine;
        this.longitudePatrimoine = longitudePatrimoine;
        this.categoriePatrimoine = CategoriePatrimoine.CULTUREL;
        this.zoneGeographique = ZoneCasamance.BASSE_CASAMANCE;
        this.statutPublication = StatutPublication.PUBLIE;
        this.donneeDemonstration = true;
    }
}
