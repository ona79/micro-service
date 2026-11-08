package com.uasz.ms_circuit.controllers;

import com.uasz.ms_circuit.dto.CircuitDto;
import com.uasz.ms_circuit.services.ICircuitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/circuits")
@RequiredArgsConstructor
public class CircuitController {

    private final ICircuitService circuitService;

    @PostMapping
    public ResponseEntity<CircuitDto> saveCircuit(@Valid @RequestBody CircuitDto circuitDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(circuitService.saveCircuit(circuitDto));
    }

    @GetMapping
    public ResponseEntity<List<CircuitDto>> getAllCircuits() {
        return ResponseEntity.ok(circuitService.getAllCircuits());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CircuitDto> getByIdCircuit(@PathVariable Long id) {
        return ResponseEntity.ok(circuitService.getByIdCircuit(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CircuitDto> updateCircuit(@PathVariable Long id,
                                                    @Valid @RequestBody CircuitDto circuitDto) {
        return ResponseEntity.ok(circuitService.updateCircuit(id, circuitDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCircuit(@PathVariable Long id) {
        circuitService.deleteCircuit(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Endpoint de démonstration TP2 : permet de tester les 3 clients HTTP
     * (mode = feign | resttemplate | webclient) vers ms-patrimoine.
     */
    @GetMapping("/communication/{mode}/patrimoines/{patrimoineId}")
    public ResponseEntity<Map<String, Object>> testerCommunication(@PathVariable String mode,
                                                                   @PathVariable Long patrimoineId) {
        return ResponseEntity.ok(Map.of(
                "clientUtilise", mode.toUpperCase(),
                "patrimoine", circuitService.testerCommunication(mode, patrimoineId)
        ));
    }
}
