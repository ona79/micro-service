package com.uasz.ms_evenement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Copie du DTO exposé par ms-patrimoine (reçu via OpenFeign) */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatrimoineDto {

    private Long id;
    private String nomPatrimoine;
    private String codePatrimoine;
    private String descriptionPatrimoine;
    private String historiquePatrimoine;
    private String adressePatrimoine;
    private int capacitePatrimoine;
    private float latitudePatrimoine;
    private float longitudePatrimoine;
    private String categoriePatrimoine;
    private String zoneGeographique;
    private String localite;
    private String statutPublication;
    private String imageUrl;

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
        this.statutPublication = "PUBLIE";
    }
}
