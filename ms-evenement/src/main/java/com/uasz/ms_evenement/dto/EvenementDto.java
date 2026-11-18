package com.uasz.ms_evenement.dto;

import com.uasz.ms_evenement.entities.StatutEvenement;
import com.uasz.ms_evenement.entities.TypeEvenement;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
public class EvenementDto {

    private Long id;

    @NotBlank(message = "Le nom de l'événement est obligatoire")
    @Size(max = 255, message = "Le nom de l'événement ne doit pas dépasser 255 caractères")
    private String nomEvenement;

    @Size(max = 2000, message = "La description ne doit pas dépasser 2000 caractères")
    private String descriptionEvenement;

    @NotNull(message = "Le type d'événement est obligatoire")
    private TypeEvenement typeEvenement;

    @NotNull(message = "La date de début est obligatoire")
    private LocalDateTime dateDebut;

    @NotNull(message = "La date de fin est obligatoire")
    private LocalDateTime dateFin;

    @Size(max = 255, message = "Les horaires ne doivent pas dépasser 255 caractères")
    private String horaires;

    @Size(max = 255, message = "Le lieu ne doit pas dépasser 255 caractères")
    private String lieu;

    @Size(max = 50, message = "La zone géographique ne doit pas dépasser 50 caractères")
    @Builder.Default
    private String zoneGeographique = "BASSE_CASAMANCE";

    @Size(max = 150, message = "La localité ne doit pas dépasser 150 caractères")
    private String localite;

    @Size(max = 255, message = "L'organisateur ne doit pas dépasser 255 caractères")
    private String organisateur;

    @Size(max = 255, message = "Le contact organisateur ne doit pas dépasser 255 caractères")
    private String contactOrganisateur;

    @Positive(message = "La capacité maximale doit être strictement positive")
    private int capaciteMax;

    @PositiveOrZero(message = "Le prix doit être positif ou nul")
    private double prix;

    @Size(max = 1000, message = "Les conditions d'accès ne doivent pas dépasser 1000 caractères")
    private String conditionsAcces;

    @Size(max = 500, message = "L'URL de l'image ne doit pas dépasser 500 caractères")
    private String imageUrl;

    @Size(max = 1000, message = "Le support de communication ne doit pas dépasser 1000 caractères")
    private String supportCommunication;

    /** Identifiant optionnel du site patrimonial associé */
    private Long patrimoineId;

    /** Détails du site patrimonial récupérés depuis ms-patrimoine via OpenFeign */
    private PatrimoineDto patrimoine;

    @Builder.Default
    private StatutEvenement statutEvenement = StatutEvenement.PUBLIE;

    @Size(max = 500, message = "Le motif d'annulation ne doit pas dépasser 500 caractères")
    private String motifAnnulation;

    @Builder.Default
    private String fuseauHoraire = "Africa/Dakar";

    @Builder.Default
    private boolean donneeDemonstration = true;

    private Long creeParId;
    private Long modifieParId;
    private Long valideParId;
    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;
    private LocalDateTime datePublication;

    /**
     * Constructeur de compatibilité ascendante P01/P02 (11 paramètres).
     */
    public EvenementDto(Long id,
                        String nomEvenement,
                        String descriptionEvenement,
                        TypeEvenement typeEvenement,
                        LocalDateTime dateDebut,
                        LocalDateTime dateFin,
                        String lieu,
                        int capaciteMax,
                        double prix,
                        Long patrimoineId,
                        PatrimoineDto patrimoine) {
        this.id = id;
        this.nomEvenement = nomEvenement;
        this.descriptionEvenement = descriptionEvenement;
        this.typeEvenement = typeEvenement;
        this.dateDebut = dateDebut;
        this.dateFin = dateFin;
        this.lieu = lieu;
        this.capaciteMax = capaciteMax;
        this.prix = prix;
        this.patrimoineId = patrimoineId;
        this.patrimoine = patrimoine;
        this.zoneGeographique = "BASSE_CASAMANCE";
        this.statutEvenement = StatutEvenement.PUBLIE;
        this.fuseauHoraire = "Africa/Dakar";
        this.donneeDemonstration = true;
    }
}
