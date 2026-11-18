package com.uasz.ms_reservation.controllers;

import com.uasz.ms_reservation.dto.DisponibiliteDto;
import com.uasz.ms_reservation.dto.EvenementPaiementAckDto;
import com.uasz.ms_reservation.dto.EvenementPaiementNotificationRequest;
import com.uasz.ms_reservation.dto.ManifesteParticipantDto;
import com.uasz.ms_reservation.dto.PageResponseDto;
import com.uasz.ms_reservation.dto.ReservationDto;
import com.uasz.ms_reservation.dto.ReservationStatsDto;
import com.uasz.ms_reservation.entities.StatutReservation;
import com.uasz.ms_reservation.entities.TypeReservation;
import com.uasz.ms_reservation.services.IReservationService;
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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final IReservationService reservationService;

    @GetMapping("/disponibilite")
    public ResponseEntity<DisponibiliteDto> verifierDisponibilite(
            @RequestParam("type") TypeReservation type,
            @RequestParam("prestationId") Long prestationId,
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(reservationService.verifierDisponibilite(type, prestationId, date));
    }

    @PostMapping
    public ResponseEntity<ReservationDto> saveReservation(
            @Valid @RequestBody ReservationDto reservationDto,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        ReservationDto result = reservationService.saveReservation(reservationDto, idempotencyKey);
        HttpStatus status = result.isRejoueeIdempotence() ? HttpStatus.OK : HttpStatus.CREATED;
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(status);
        if (result.isRejoueeIdempotence()) {
            builder.header("X-Idempotency-Replayed", "true");
        }
        return builder.body(result);
    }

    @PutMapping("/{id}/soumettre")
    public ResponseEntity<ReservationDto> soumettreReservation(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.soumettreReservation(id));
    }

    @GetMapping
    public ResponseEntity<List<ReservationDto>> getAllReservations() {
        return ResponseEntity.ok(reservationService.getAllReservations());
    }

    @GetMapping("/recherche")
    public ResponseEntity<PageResponseDto<ReservationDto>> rechercherReservations(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) StatutReservation statut,
            @RequestParam(required = false) TypeReservation type,
            @RequestParam(required = false) Long prestationId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateMin,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateMax,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "dateCreation") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        return ResponseEntity.ok(reservationService.rechercherReservations(
                q, statut, type, prestationId, dateMin, dateMax, page, size, sortBy, sortDir));
    }

    @GetMapping("/statistiques")
    public ResponseEntity<ReservationStatsDto> getStatistiques() {
        return ResponseEntity.ok(reservationService.getStatistiques());
    }

    @GetMapping("/guide/circuits/{circuitId}")
    public ResponseEntity<List<ManifesteParticipantDto>> getManifesteGuide(@PathVariable Long circuitId) {
        return ResponseEntity.ok(reservationService.getManifesteGuidePourCircuit(circuitId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReservationDto> getByIdReservation(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.getByIdReservation(id));
    }

    @PutMapping("/{id}/annuler")
    public ResponseEntity<ReservationDto> annulerReservation(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String motif = body != null ? body.get("motif") : null;
        return ResponseEntity.ok(reservationService.annulerReservation(id, motif));
    }

    @PostMapping("/{id}/synchroniser")
    public ResponseEntity<ReservationDto> synchroniserPaiement(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.synchroniserPaiement(id));
    }

    @PostMapping("/internal/{id}/evenement-paiement")
    public ResponseEntity<EvenementPaiementAckDto> recevoirEvenementPaiement(
            @PathVariable Long id,
            @Valid @RequestBody EvenementPaiementNotificationRequest request
    ) {
        EvenementPaiementAckDto ack = reservationService.traiterEvenementPaiement(id, request);
        return ResponseEntity.ok(ack);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReservation(@PathVariable Long id) {
        reservationService.deleteReservation(id);
        return ResponseEntity.noContent().build();
    }
}
