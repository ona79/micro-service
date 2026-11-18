package com.uasz.ms_reservation.dto;

import com.uasz.ms_reservation.entities.StatutModerationAvis;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerationDecisionRequest {

    @NotNull(message = "Le nouveau statut de modération est obligatoire")
    private StatutModerationAvis decision;

    @NotBlank(message = "Une justification est obligatoire pour toute décision de modération")
    @Size(min = 5, max = 600, message = "La justification doit contenir entre 5 et 600 caractères")
    private String justification;
}
