package com.uasz.ms_utilisateur.dto;

import com.uasz.ms_utilisateur.entities.StatutValidationGuide;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuideHistoriqueDto {
    private Long id;
    private Long guideProfilId;
    private StatutValidationGuide ancienStatut;
    private StatutValidationGuide nouveauStatut;
    private Long acteurId;
    private String acteurRole;
    private String motif;
    private String correlationId;
    private LocalDateTime dateTransition;
}
