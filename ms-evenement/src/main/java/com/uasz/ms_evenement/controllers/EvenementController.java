package com.uasz.ms_evenement.controllers;

import com.uasz.ms_evenement.dto.EvenementDto;
import com.uasz.ms_evenement.dto.PageResponseDto;
import com.uasz.ms_evenement.entities.StatutEvenement;
import com.uasz.ms_evenement.entities.TypeEvenement;
import com.uasz.ms_evenement.services.IEvenementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/evenements")
@RequiredArgsConstructor
public class EvenementController {

    private final IEvenementService evenementService;

    @PostMapping
    public ResponseEntity<EvenementDto> saveEvenement(@Valid @RequestBody EvenementDto evenementDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(evenementService.saveEvenement(evenementDto));
    }

    @GetMapping
    public ResponseEntity<List<EvenementDto>> getAllEvenements() {
        return ResponseEntity.ok(evenementService.getAllEvenements());
    }

    @GetMapping("/a-venir")
    public ResponseEntity<List<EvenementDto>> getEvenementsAVenir() {
        return ResponseEntity.ok(evenementService.getEvenementsAVenir());
    }

    @GetMapping("/reservables")
    public ResponseEntity<List<EvenementDto>> getEvenementsReservables() {
        return ResponseEntity.ok(evenementService.getEvenementsReservables());
    }

    @GetMapping("/recherche")
    public ResponseEntity<PageResponseDto<EvenementDto>> rechercherEvenements(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) TypeEvenement type,
            @RequestParam(required = false) String zone,
            @RequestParam(required = false) Long patrimoineId,
            @RequestParam(required = false) StatutEvenement statut,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateMin,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateMax,
            @RequestParam(required = false) Double prixMax,
            @RequestParam(defaultValue = "false") boolean aVenirUniquement,
            @RequestParam(defaultValue = "false") boolean inclureNonPublies,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "dateDebut") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        return ResponseEntity.ok(evenementService.rechercherEvenements(
                q, type, zone, patrimoineId, statut, dateMin, dateMax, prixMax,
                aVenirUniquement, inclureNonPublies, page, size, sortBy, sortDir));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EvenementDto> getByIdEvenement(@PathVariable Long id) {
        return ResponseEntity.ok(evenementService.getByIdEvenement(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EvenementDto> updateEvenement(@PathVariable Long id,
                                                        @Valid @RequestBody EvenementDto evenementDto) {
        return ResponseEntity.ok(evenementService.updateEvenement(id, evenementDto));
    }

    @PutMapping("/{id}/soumettre")
    public ResponseEntity<EvenementDto> soumettreEvenement(@PathVariable Long id) {
        return ResponseEntity.ok(evenementService.soumettreEvenement(id));
    }

    @PutMapping("/{id}/publier")
    public ResponseEntity<EvenementDto> publierEvenement(@PathVariable Long id) {
        return ResponseEntity.ok(evenementService.publierEvenement(id));
    }

    @PutMapping("/{id}/annuler")
    public ResponseEntity<EvenementDto> annulerEvenement(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String motif = body != null ? body.get("motif") : null;
        return ResponseEntity.ok(evenementService.annulerEvenement(id, motif));
    }

    @PutMapping("/{id}/terminer")
    public ResponseEntity<EvenementDto> terminerEvenement(@PathVariable Long id) {
        return ResponseEntity.ok(evenementService.terminerEvenement(id));
    }

    @PutMapping("/{id}/archiver")
    public ResponseEntity<EvenementDto> archiverEvenement(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String motif = body != null ? body.get("motif") : null;
        return ResponseEntity.ok(evenementService.archiverEvenement(id, motif));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvenement(@PathVariable Long id) {
        evenementService.deleteEvenement(id);
        return ResponseEntity.noContent().build();
    }
}
