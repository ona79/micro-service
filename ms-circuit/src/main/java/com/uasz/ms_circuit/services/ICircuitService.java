package com.uasz.ms_circuit.services;

import com.uasz.ms_circuit.dto.CircuitDto;
import com.uasz.ms_circuit.dto.PatrimoineDto;

import java.util.List;

public interface ICircuitService {

    CircuitDto saveCircuit(CircuitDto circuitDto);

    List<CircuitDto> getAllCircuits();

    CircuitDto getByIdCircuit(Long id);

    CircuitDto updateCircuit(Long id, CircuitDto circuitDto);

    void deleteCircuit(Long id);

    PatrimoineDto testerCommunication(String mode, Long patrimoineId);
}
