package com.uasz.ms_circuit.dto;

import com.uasz.ms_circuit.entities.Difficulte;
import com.uasz.ms_circuit.entities.MoyenTransport;
import com.uasz.ms_circuit.entities.StatutCircuit;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CircuitDto {

    private Long id;

    @NotBlank(message = "Le nom du circuit est obligatoire")
    @Size(max = 255, message = "Le nom du circuit ne doit pas dépasser 255 caractères")
    private String nomCircuit;

    @Size(max = 2000, message = "La description ne doit pas dépasser 2000 caractères")
    private String descriptionCircuit;

    @Size(max = 2000, message = "La présentation touristique ne doit pas dépasser 2000 caractères")
    private String presentationTouristique;

    private Difficulte difficulte;

    @Builder.Default
    private MoyenTransport moyenTransport = MoyenTransport.MIXTE;

    @Size(max = 50, message = "La zone géographique ne doit pas dépasser 50 caractères")
    @Builder.Default
    private String zoneGeographique = "BASSE_CASAMANCE";

    @Size(max = 150, message = "Le point de départ ne doit pas dépasser 150 caractères")
    private String pointDepart;

    @Size(max = 150, message = "Le point d'arrivée ne doit pas dépasser 150 caractères")
    private String pointArrivee;

    @Size(max = 1000, message = "Les informations pratiques ne doivent pas dépasser 1000 caractères")
    private String informationsPratiques;

    @Size(max = 500, message = "L'URL de l'image ne doit pas dépasser 500 caractères")
    private String imageUrl;

    /** Calculée par le service (minutes) : ignorée en entrée */
    private int dureeEstimee;

    /** Calculée par le service (km) : distance orthodromique indicative entre étapes */
    private double distanceTotale;

    @Builder.Default
    private String modeCalculDistance = "ESTIMATION_ORTHODROMIQUE_INDICATIVE";

    @PositiveOrZero(message = "Le nombre de places doit être positif ou nul")
    private int placesMax;

    @PositiveOrZero(message = "Le prix doit être positif ou nul")
    private double prix;

    @Builder.Default
    private StatutCircuit statutCircuit = StatutCircuit.PUBLIE;

    @Builder.Default
    private boolean donneeDemonstration = true;

    private Long creeParId;
    private Long modifieParId;
    private Long valideParId;
    private Long guideResponsableId;

    @Size(max = 500, message = "Le motif de statut ne doit pas dépasser 500 caractères")
    private String motifStatut;

    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;
    private LocalDateTime datePublication;
    private LocalDateTime dateArchivage;

    @NotEmpty(message = "Un circuit doit contenir au moins une étape")
    @Valid
    @Builder.Default
    private List<EtapeDto> etapes = new ArrayList<>();

    /**
     * Constructeur de compatibilité ascendante P01/P02 (9 paramètres).
     */
    public CircuitDto(Long id,
                      String nomCircuit,
                      String descriptionCircuit,
                      Difficulte difficulte,
                      int dureeEstimee,
                      double distanceTotale,
                      int placesMax,
                      double prix,
                      List<EtapeDto> etapes) {
        this.id = id;
        this.nomCircuit = nomCircuit;
        this.descriptionCircuit = descriptionCircuit;
        this.difficulte = difficulte;
        this.dureeEstimee = dureeEstimee;
        this.distanceTotale = distanceTotale;
        this.placesMax = placesMax;
        this.prix = prix;
        this.etapes = etapes != null ? new ArrayList<>(etapes) : new ArrayList<>();
        this.moyenTransport = MoyenTransport.MIXTE;
        this.zoneGeographique = "BASSE_CASAMANCE";
        this.modeCalculDistance = "ESTIMATION_ORTHODROMIQUE_INDICATIVE";
        this.statutCircuit = StatutCircuit.PUBLIE;
        this.donneeDemonstration = true;
    }
}
