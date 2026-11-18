package com.uasz.ms_reservation.dto;

import com.uasz.ms_reservation.entities.CategorieSignalement;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignalementCreateRequest {

    private CategorieSignalement categorie;

    @NotBlank(message = "Le motif du signalement est obligatoire")
    @Size(min = 10, max = 600, message = "Le motif doit contenir entre 10 et 600 caractères")
    private String motif;
}
