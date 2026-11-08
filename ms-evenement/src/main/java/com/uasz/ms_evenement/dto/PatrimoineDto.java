package com.uasz.ms_evenement.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
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
}

