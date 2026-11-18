package com.uasz.ms_circuit.controllers;

import com.uasz.ms_circuit.dto.CircuitDto;
import com.uasz.ms_circuit.dto.PageResponseDto;
import com.uasz.ms_circuit.entities.Difficulte;
import com.uasz.ms_circuit.entities.MoyenTransport;
import com.uasz.ms_circuit.entities.StatutCircuit;
import com.uasz.ms_circuit.services.ICircuitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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

    @GetMapping("/recherche")
    public ResponseEntity<PageResponseDto<CircuitDto>> rechercherCircuits(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Difficulte difficulte,
            @RequestParam(required = false) MoyenTransport moyenTransport,
            @RequestParam(required = false) String zone,
            @RequestParam(required = false) StatutCircuit statut,
            @RequestParam(required = false) Integer dureeMax,
            @RequestParam(required = false) Double distanceMax,
            @RequestParam(required = false) Double prixMax,
            @RequestParam(defaultValue = "false") boolean inclureNonPublies,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "nom") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        return ResponseEntity.ok(circuitService.rechercherCircuits(
                q, difficulte, moyenTransport, zone, statut, dureeMax, distanceMax, prixMax,
                inclureNonPublies, page, size, sortBy, sortDir));
    }

    @GetMapping("/statistiques")
    public ResponseEntity<com.uasz.ms_circuit.dto.CircuitStatsDto> getStatistiques() {
        return ResponseEntity.ok(circuitService.getStatistiques());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CircuitDto> getByIdCircuit(@PathVariable Long id) {
        return ResponseEntity.ok(circuitService.getByIdCircuit(id));
    }

    @GetMapping("/guide/mes-circuits")
    public ResponseEntity<List<CircuitDto>> getMesCircuitsGuide() {
        return ResponseEntity.ok(circuitService.getMesCircuitsGuide());
    }

    @GetMapping("/guide/{guideId}")
    public ResponseEntity<List<CircuitDto>> getCircuitsByGuide(@PathVariable Long guideId) {
        return ResponseEntity.ok(circuitService.getCircuitsByGuide(guideId));
    }

    @PatchMapping("/{id}/guide")
    public ResponseEntity<CircuitDto> affecterGuideResponsable(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Long> body
    ) {
        Long guideId = body != null ? body.get("guideResponsableId") : null;
        return ResponseEntity.ok(circuitService.affecterGuideResponsable(id, guideId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CircuitDto> updateCircuit(@PathVariable Long id,
                                                    @Valid @RequestBody CircuitDto circuitDto) {
        return ResponseEntity.ok(circuitService.updateCircuit(id, circuitDto));
    }

    @PutMapping("/{id}/soumettre")
    public ResponseEntity<CircuitDto> soumettreCircuit(@PathVariable Long id) {
        return ResponseEntity.ok(circuitService.soumettreCircuit(id));
    }

    @PutMapping("/{id}/publier")
    public ResponseEntity<CircuitDto> publierCircuit(@PathVariable Long id) {
        return ResponseEntity.ok(circuitService.publierCircuit(id));
    }

    @PutMapping("/{id}/archiver")
    public ResponseEntity<CircuitDto> archiverCircuit(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String motif = body != null ? body.get("motif") : null;
        return ResponseEntity.ok(circuitService.archiverCircuit(id, motif));
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
