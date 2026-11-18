package com.uasz.ms_reservation.controllers;

import com.uasz.ms_reservation.dto.AvisCreateRequest;
import com.uasz.ms_reservation.dto.AvisDto;
import com.uasz.ms_reservation.dto.AvisEligibiliteDto;
import com.uasz.ms_reservation.dto.AvisResumeDto;
import com.uasz.ms_reservation.dto.AvisUpdateRequest;
import com.uasz.ms_reservation.dto.PageResponseDto;
import com.uasz.ms_reservation.dto.SignalementCreateRequest;
import com.uasz.ms_reservation.dto.SignalementDto;
import com.uasz.ms_reservation.entities.CibleAvis;
import com.uasz.ms_reservation.services.IAvisModerationService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/avis")
@RequiredArgsConstructor
public class AvisController {

    private final IAvisModerationService avisModerationService;

    @GetMapping
    public ResponseEntity<PageResponseDto<AvisDto>> getPublicAvis(
            @RequestParam CibleAvis cibleType,
            @RequestParam Long cibleId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(avisModerationService.getAvisPublics(cibleType, cibleId, page, size));
    }

    @GetMapping("/resume")
    public ResponseEntity<AvisResumeDto> getResume(
            @RequestParam CibleAvis cibleType,
            @RequestParam Long cibleId
    ) {
        return ResponseEntity.ok(avisModerationService.getResumeEvaluations(cibleType, cibleId));
    }

    @GetMapping("/resumes")
    public ResponseEntity<List<AvisResumeDto>> getResumesBatch(
            @RequestParam CibleAvis cibleType,
            @RequestParam List<Long> cibleIds
    ) {
        return ResponseEntity.ok(avisModerationService.getResumesBatch(cibleType, cibleIds));
    }

    @GetMapping("/eligibilite")
    public ResponseEntity<AvisEligibiliteDto> verifierEligibilite(
            @RequestParam CibleAvis cibleType,
            @RequestParam Long cibleId
    ) {
        return ResponseEntity.ok(avisModerationService.verifierEligibilite(cibleType, cibleId));
    }

    @GetMapping("/mes-avis")
    public ResponseEntity<List<AvisDto>> getMesAvis() {
        return ResponseEntity.ok(avisModerationService.getMesAvis());
    }

    @PostMapping
    public ResponseEntity<AvisDto> creer(@Valid @RequestBody AvisCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(avisModerationService.creerAvis(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AvisDto> modifier(
            @PathVariable Long id,
            @Valid @RequestBody AvisUpdateRequest request
    ) {
        return ResponseEntity.ok(avisModerationService.modifierAvis(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(@PathVariable Long id) {
        avisModerationService.supprimerAvis(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/signaler")
    public ResponseEntity<SignalementDto> signaler(
            @PathVariable Long id,
            @Valid @RequestBody SignalementCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(avisModerationService.signalerAvis(id, request));
    }
}
