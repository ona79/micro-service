package com.uasz.ms_paiement.dto;

import com.uasz.ms_paiement.entities.StatutPaiement;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaiementHistoriqueDto {
    private Long id;
    private StatutPaiement ancienStatut;
    private StatutPaiement nouveauStatut;
    private Long acteurId;
    private String acteurRole;
    private String acteurType;
    private String correlationId;
    private String motif;
    private LocalDateTime dateTransition;
}
