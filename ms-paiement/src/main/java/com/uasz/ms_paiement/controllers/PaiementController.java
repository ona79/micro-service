package com.uasz.ms_paiement.controllers;

import com.uasz.ms_paiement.dto.PageResponseDto;
import com.uasz.ms_paiement.dto.PaiementDto;
import com.uasz.ms_paiement.dto.PaiementStatsDto;
import com.uasz.ms_paiement.dto.RemboursementRequest;
import com.uasz.ms_paiement.dto.SimulationPaiementRequest;
import com.uasz.ms_paiement.entities.ModePaiement;
import com.uasz.ms_paiement.entities.StatutPaiement;
import com.uasz.ms_paiement.services.IPaiementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/paiements")
@RequiredArgsConstructor
public class PaiementController {

    private final IPaiementService paiementService;

    @PostMapping
    public ResponseEntity<PaiementDto> effectuer(
            @Valid @RequestBody PaiementDto paiementDto,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        PaiementDto result = paiementService.effectuerPaiement(paiementDto, idempotencyKey);
        HttpStatus status = result.isRejoueeIdempotence() ? HttpStatus.OK : HttpStatus.CREATED;
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(status);
        if (result.isRejoueeIdempotence()) {
            builder.header("X-Idempotency-Replayed", "true");
        }
        return builder.body(result);
    }

    @PostMapping("/{id}/simuler")
    public ResponseEntity<PaiementDto> simulerDecision(
            @PathVariable Long id,
            @Valid @RequestBody SimulationPaiementRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        return ResponseEntity.ok(paiementService.simulerDecisionPaiement(id, request, idempotencyKey));
    }

    @PostMapping("/{id}/rembourser")
    public ResponseEntity<PaiementDto> rembourser(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) RemboursementRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        String motif = request != null ? request.getMotif() : null;
        return ResponseEntity.ok(paiementService.rembourserPaiement(id, motif, idempotencyKey));
    }

    @GetMapping
    public ResponseEntity<List<PaiementDto>> getAll() {
        return ResponseEntity.ok(paiementService.getAllPaiements());
    }

    @GetMapping("/recherche")
    public ResponseEntity<PageResponseDto<PaiementDto>> rechercher(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) StatutPaiement statut,
            @RequestParam(required = false) ModePaiement modePaiement,
            @RequestParam(required = false) Long reservationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateMin,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateMax,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "dateCreation") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        return ResponseEntity.ok(paiementService.rechercherPaiements(
                q, statut, modePaiement, reservationId, dateMin, dateMax, page, size, sortBy, sortDir));
    }

    @GetMapping("/statistiques")
    public ResponseEntity<PaiementStatsDto> getStatistiques() {
        return ResponseEntity.ok(paiementService.getStatistiques());
    }

    @GetMapping("/reservation/{reservationId}")
    public ResponseEntity<List<PaiementDto>> getByReservation(@PathVariable Long reservationId) {
        return ResponseEntity.ok(paiementService.getPaiementsByReservation(reservationId));
    }

    @GetMapping("/internal/reservation/{reservationId}")
    public ResponseEntity<List<PaiementDto>> getInternalByReservation(@PathVariable Long reservationId) {
        return ResponseEntity.ok(paiementService.getPaiementsByReservation(reservationId));
    }

    @PostMapping("/outbox/rejouer")
    public ResponseEntity<Map<String, Object>> rejouerOutbox() {
        int count = paiementService.rejouerOutboxEnAttente();
        return ResponseEntity.ok(Map.of("evenementsSynchronises", count));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaiementDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(paiementService.getByIdPaiement(id));
    }
}
