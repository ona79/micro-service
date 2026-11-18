package com.uasz.ms_reservation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ValidationBilletRequest {

    @NotBlank(message = "Le token QR est obligatoire pour valider l'accès.")
    private String tokenQr;
}
