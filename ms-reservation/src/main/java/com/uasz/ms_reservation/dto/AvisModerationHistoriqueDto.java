package com.uasz.ms_reservation.dto;

import com.uasz.ms_reservation.entities.StatutModerationAvis;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvisModerationHistoriqueDto {
    private Long id;
    private Long avisId;
    private Long signalementId;
    private StatutModerationAvis ancienStatut;
    private StatutModerationAvis nouveauStatut;
    private Long acteurId;
    private String acteurRole;
    private String justification;
    private String correlationId;
    private LocalDateTime dateDecision;
}
