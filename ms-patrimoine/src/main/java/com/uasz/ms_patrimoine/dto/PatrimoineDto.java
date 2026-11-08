package com.uasz.ms_patrimoine.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatrimoineDto {

    private Long id;

    @NotBlank(message = "Le nom du patrimoine est obligatoire")
    private String nomPatrimoine;

    @NotBlank(message = "Le code du patrimoine est obligatoire")
    private String codePatrimoine;

    @Size(max = 2000, message = "La description ne doit pas dépasser 2000 caractères")
    private String descriptionPatrimoine;

    @Size(max = 2000, message = "L'historique ne doit pas dépasser 2000 caractères")
    private String historiquePatrimoine;

    private String adressePatrimoine;

    @PositiveOrZero(message = "La capacité doit être positive ou nulle")
    private int capacitePatrimoine;

    private float latitudePatrimoine;

    private float longitudePatrimoine;
}
