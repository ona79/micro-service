package com.uasz.ms_circuit.services;

import com.uasz.ms_circuit.dto.CircuitDto;
import com.uasz.ms_circuit.dto.PageResponseDto;
import com.uasz.ms_circuit.dto.PatrimoineDto;
import com.uasz.ms_circuit.entities.Difficulte;
import com.uasz.ms_circuit.entities.MoyenTransport;
import com.uasz.ms_circuit.entities.StatutCircuit;

import java.util.List;

public interface ICircuitService {

    CircuitDto saveCircuit(CircuitDto circuitDto);

    List<CircuitDto> getAllCircuits();

    PageResponseDto<CircuitDto> rechercherCircuits(
            String q,
            Difficulte difficulte,
            MoyenTransport moyenTransport,
            String zone,
            StatutCircuit statut,
            Integer dureeMax,
            Double distanceMax,
            Double prixMax,
            boolean inclureNonPublies,
            int page,
            int size,
            String sortBy,
            String sortDir
    );

    CircuitDto getByIdCircuit(Long id);

    List<CircuitDto> getMesCircuitsGuide();

    CircuitDto updateCircuit(Long id, CircuitDto circuitDto);

    CircuitDto affecterGuideResponsable(Long circuitId, Long guideUtilisateurId);

    CircuitDto soumettreCircuit(Long id);

    CircuitDto publierCircuit(Long id);

    CircuitDto archiverCircuit(Long id, String motif);

    void deleteCircuit(Long id);

    PatrimoineDto testerCommunication(String mode, Long patrimoineId);
}
