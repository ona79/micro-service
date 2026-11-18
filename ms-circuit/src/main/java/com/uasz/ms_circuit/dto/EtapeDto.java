package com.uasz.ms_circuit.dto;

import com.uasz.ms_circuit.entities.MoyenTransport;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EtapeDto {

    private Long id;

    @Positive(message = "L'ordre de l'étape doit être strictement positif")
    private int ordre;

    @PositiveOrZero(message = "La durée de visite doit être positive ou nulle")
    private int dureeVisite;

    @NotNull(message = "L'identifiant du patrimoine de l'étape est obligatoire")
    private Long patrimoineId;

    @Size(max = 1000, message = "La description de l'étape ne doit pas dépasser 1000 caractères")
    private String descriptionEtape;

    private MoyenTransport moyenTransport;

    /** Détails du patrimoine récupérés depuis ms-patrimoine (lecture seule) */
    private PatrimoineDto patrimoine;

    /**
     * Constructeur de compatibilité ascendante P01/P02 (5 paramètres).
     */
    public EtapeDto(Long id, int ordre, int dureeVisite, Long patrimoineId, PatrimoineDto patrimoine) {
        this.id = id;
        this.ordre = ordre;
        this.dureeVisite = dureeVisite;
        this.patrimoineId = patrimoineId;
        this.patrimoine = patrimoine;
    }
}
