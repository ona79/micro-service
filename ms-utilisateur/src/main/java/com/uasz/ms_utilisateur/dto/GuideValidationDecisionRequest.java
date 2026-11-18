package com.uasz.ms_utilisateur.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuideValidationDecisionRequest {

    @Size(max = 500, message = "Le motif ne doit pas dépasser 500 caractères")
    private String motif;
}
