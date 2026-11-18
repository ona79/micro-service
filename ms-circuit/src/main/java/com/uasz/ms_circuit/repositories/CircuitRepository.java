package com.uasz.ms_circuit.repositories;

import com.uasz.ms_circuit.entities.Circuit;
import com.uasz.ms_circuit.entities.Difficulte;
import com.uasz.ms_circuit.entities.StatutCircuit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface CircuitRepository extends JpaRepository<Circuit, Long>, JpaSpecificationExecutor<Circuit> {

    List<Circuit> findByStatutCircuit(StatutCircuit statutCircuit);

    List<Circuit> findByDifficulteAndStatutCircuit(Difficulte difficulte, StatutCircuit statutCircuit);
}
