package com.uasz.ms_reservation.controllers;

import com.uasz.ms_reservation.dto.AvisDto;
import com.uasz.ms_reservation.dto.AvisModerationHistoriqueDto;
import com.uasz.ms_reservation.dto.ModerationDecisionRequest;
import com.uasz.ms_reservation.dto.SignalementDecisionRequest;
import com.uasz.ms_reservation.dto.SignalementDto;
import com.uasz.ms_reservation.entities.CibleAvis;
import com.uasz.ms_reservation.entities.StatutModerationAvis;
import com.uasz.ms_reservation.entities.StatutSignalement;
import com.uasz.ms_reservation.services.IAvisModerationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/moderation")
@RequiredArgsConstructor
public class ModerationController {

    private final IAvisModerationService avisModerationService;

    @GetMapping("/avis")
    public ResponseEntity<List<AvisDto>> listAvis(
            @RequestParam(required = false) CibleAvis cibleType,
            @RequestParam(required = false) StatutModerationAvis statut
    ) {
        return ResponseEntity.ok(avisModerationService.getAvisModeration(cibleType, statut));
    }

    @GetMapping("/signalements")
    public ResponseEntity<List<SignalementDto>> listSignalements(
            @RequestParam(required = false) StatutSignalement statut
    ) {
        return ResponseEntity.ok(avisModerationService.getSignalementsModeration(statut));
    }

    @GetMapping("/avis/{avisId}/historique")
    public ResponseEntity<List<AvisModerationHistoriqueDto>> getHistorique(@PathVariable Long avisId) {
        return ResponseEntity.ok(avisModerationService.getHistoriqueModeration(avisId));
    }

    @PostMapping("/avis/{avisId}/decision")
    public ResponseEntity<AvisDto> deciderAvis(
            @PathVariable Long avisId,
            @Valid @RequestBody ModerationDecisionRequest request
    ) {
        return ResponseEntity.ok(avisModerationService.deciderModerationAvis(avisId, request));
    }

    @PostMapping("/signalements/{signalementId}/decision")
    public ResponseEntity<SignalementDto> deciderSignalement(
            @PathVariable Long signalementId,
            @Valid @RequestBody SignalementDecisionRequest request
    ) {
        return ResponseEntity.ok(avisModerationService.traiterSignalement(signalementId, request));
    }
}
