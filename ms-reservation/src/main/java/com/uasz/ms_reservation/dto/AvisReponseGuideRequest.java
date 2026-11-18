package com.uasz.ms_reservation.dto;

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
public class AvisReponseGuideRequest {

    @NotBlank(message = "La réponse ne peut pas être vide")
    @Size(max = 2000, message = "La réponse ne peut pas dépasser 2000 caractères")
    private String reponse;
}
