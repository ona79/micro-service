package com.uasz.ms_paiement.dto;

import com.uasz.ms_paiement.entities.DecisionSimulation;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimulationPaiementRequest {

    @NotNull(message = "La décision de simulation (ACCEPTER, REFUSER, EXPIRER, ANNULER) est obligatoire")
    private DecisionSimulation decision;

    @Size(max = 500)
    private String motif;

    @Size(max = 128)
    private String idempotencyKey;
}
