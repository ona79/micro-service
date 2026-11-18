package com.uasz.ms_utilisateur.controllers;

import com.uasz.ms_utilisateur.dto.GuideHistoriqueDto;
import com.uasz.ms_utilisateur.dto.GuideProfilDto;
import com.uasz.ms_utilisateur.dto.GuideSelfUpdateRequest;
import com.uasz.ms_utilisateur.dto.GuideValidationDecisionRequest;
import com.uasz.ms_utilisateur.dto.GuideVerificationDto;
import com.uasz.ms_utilisateur.entities.StatutValidationGuide;
import com.uasz.ms_utilisateur.services.IGuideService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
@RequestMapping("/api/guides")
@RequiredArgsConstructor
public class GuideController {

    private final IGuideService guideService;

    @GetMapping
    public ResponseEntity<List<GuideProfilDto>> getPublicGuides(
            @RequestParam(required = false) String zone,
            @RequestParam(required = false) String langue,
            @RequestParam(required = false) String q
    ) {
        return ResponseEntity.ok(guideService.getPublicGuides(zone, langue, q));
    }

    @GetMapping("/mon-profil")
    public ResponseEntity<GuideProfilDto> getMonProfil() {
        return ResponseEntity.ok(guideService.getMonProfil());
    }

    @PutMapping("/mon-profil")
    public ResponseEntity<GuideProfilDto> upsertMonProfil(@Valid @RequestBody GuideSelfUpdateRequest request) {
        return ResponseEntity.ok(guideService.upsertMonProfil(request));
    }

    @PostMapping("/mon-profil/soumettre")
    public ResponseEntity<GuideProfilDto> soumettreMonProfil() {
        return ResponseEntity.ok(guideService.soumettreMonProfil());
    }

    @PatchMapping("/mon-profil/disponibilite")
    public ResponseEntity<GuideProfilDto> changerDisponibilite(@RequestBody Map<String, Object> body) {
        boolean disponible = body != null && Boolean.TRUE.equals(body.get("disponible"));
        Boolean visibilite = (body != null && body.get("visibilitePublique") instanceof Boolean b) ? b : null;
        return ResponseEntity.ok(guideService.changerMaDisponibilite(disponible, visibilite));
    }

    @PostMapping("/mon-profil/desactiver")
    public ResponseEntity<GuideProfilDto> desactiverMonProfil(
            @RequestBody(required = false) GuideValidationDecisionRequest body
    ) {
        return ResponseEntity.ok(guideService.desactiverMonProfil(body != null ? body.getMotif() : null));
    }

    @GetMapping("/admin/tous")
    public ResponseEntity<List<GuideProfilDto>> getAllAdmin(
            @RequestParam(required = false) StatutValidationGuide statut
    ) {
        return ResponseEntity.ok(guideService.getAllAdmin(statut));
    }

    @GetMapping("/utilisateur/{utilisateurId}")
    public ResponseEntity<GuideProfilDto> getByUtilisateur(@PathVariable Long utilisateurId) {
        return ResponseEntity.ok(guideService.getGuideByUtilisateurId(utilisateurId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GuideProfilDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(guideService.getGuideById(id));
    }

    @GetMapping("/{id}/historique")
    public ResponseEntity<List<GuideHistoriqueDto>> getHistorique(@PathVariable Long id) {
        return ResponseEntity.ok(guideService.getHistorique(id));
    }

    @PostMapping("/{id}/valider")
    public ResponseEntity<GuideProfilDto> valider(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) GuideValidationDecisionRequest body
    ) {
        return ResponseEntity.ok(guideService.validerProfil(id, body != null ? body.getMotif() : null));
    }

    @PostMapping("/{id}/rejeter")
    public ResponseEntity<GuideProfilDto> rejeter(
            @PathVariable Long id,
            @Valid @RequestBody GuideValidationDecisionRequest body
    ) {
        return ResponseEntity.ok(guideService.rejeterProfil(id, body.getMotif()));
    }

    @PostMapping("/{id}/suspendre")
    public ResponseEntity<GuideProfilDto> suspendre(
            @PathVariable Long id,
            @Valid @RequestBody GuideValidationDecisionRequest body
    ) {
        return ResponseEntity.ok(guideService.suspendreProfil(id, body.getMotif()));
    }

    @PostMapping("/{id}/reactiver")
    public ResponseEntity<GuideProfilDto> reactiver(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) GuideValidationDecisionRequest body
    ) {
        return ResponseEntity.ok(guideService.reactiverProfil(id, body != null ? body.getMotif() : null));
    }

    @PostMapping("/{id}/desactiver")
    public ResponseEntity<GuideProfilDto> desactiver(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) GuideValidationDecisionRequest body
    ) {
        return ResponseEntity.ok(guideService.desactiverProfilParAdmin(id, body != null ? body.getMotif() : null));
    }

    @GetMapping("/internal/utilisateur/{utilisateurId}")
    public ResponseEntity<GuideVerificationDto> verifierGuideInterne(@PathVariable Long utilisateurId) {
        return ResponseEntity.ok(guideService.verifierGuidePourCircuit(utilisateurId));
    }
}
