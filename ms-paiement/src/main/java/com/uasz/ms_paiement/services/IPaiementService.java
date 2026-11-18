package com.uasz.ms_paiement.services;

import com.uasz.ms_paiement.dto.PageResponseDto;
import com.uasz.ms_paiement.dto.PaiementDto;
import com.uasz.ms_paiement.dto.PaiementStatsDto;
import com.uasz.ms_paiement.dto.SimulationPaiementRequest;
import com.uasz.ms_paiement.entities.ModePaiement;
import com.uasz.ms_paiement.entities.StatutPaiement;

import java.time.LocalDateTime;
import java.util.List;

public interface IPaiementService {

    PaiementDto effectuerPaiement(PaiementDto dto, String idempotencyKeyHeader);

    default PaiementDto effectuerPaiement(PaiementDto dto) {
        return effectuerPaiement(dto, null);
    }

    PaiementDto simulerDecisionPaiement(Long paiementId, SimulationPaiementRequest request, String idempotencyKeyHeader);

    PaiementDto rembourserPaiement(Long paiementId, String motif, String idempotencyKeyHeader);

    List<PaiementDto> getAllPaiements();

    PageResponseDto<PaiementDto> rechercherPaiements(
            String q,
            StatutPaiement statut,
            ModePaiement modePaiement,
            Long reservationId,
            LocalDateTime dateMin,
            LocalDateTime dateMax,
            int page,
            int size,
            String sortBy,
            String sortDir
    );

    PaiementDto getByIdPaiement(Long id);

    List<PaiementDto> getPaiementsByReservation(Long reservationId);

    PaiementStatsDto getStatistiques();

    int rejouerOutboxEnAttente();
}
