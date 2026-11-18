package com.uasz.ms_patrimoine.controllers;

import com.uasz.ms_patrimoine.dto.PageResponseDto;
import com.uasz.ms_patrimoine.dto.PatrimoineDto;
import com.uasz.ms_patrimoine.entities.CategoriePatrimoine;
import com.uasz.ms_patrimoine.entities.StatutPublication;
import com.uasz.ms_patrimoine.entities.ZoneCasamance;
import com.uasz.ms_patrimoine.services.IPatrimoineService;
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
import java.util.Map;

@RestController
@RequestMapping("/api/patrimoines")
@RequiredArgsConstructor
public class PatrimoineController {

    private final IPatrimoineService patrimoineService;

    @PostMapping
    public ResponseEntity<PatrimoineDto> savePatrimoine(@Valid @RequestBody PatrimoineDto patrimoineDto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(patrimoineService.savePatrimoine(patrimoineDto));
    }

    @GetMapping
    public ResponseEntity<List<PatrimoineDto>> getAllPatrimoines() {
        return ResponseEntity.ok(patrimoineService.getAllPatrimoines());
    }

    @GetMapping("/recherche")
    public ResponseEntity<PageResponseDto<PatrimoineDto>> rechercherPatrimoines(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) CategoriePatrimoine categorie,
            @RequestParam(required = false) ZoneCasamance zone,
            @RequestParam(required = false) String localite,
            @RequestParam(required = false) StatutPublication statut,
            @RequestParam(required = false) Integer capaciteMin,
            @RequestParam(required = false) Double tarifMax,
            @RequestParam(defaultValue = "false") boolean inclureNonPublies,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "nom") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir
    ) {
        return ResponseEntity.ok(patrimoineService.rechercherPatrimoines(
                q, categorie, zone, localite, statut, capaciteMin, tarifMax, inclureNonPublies, page, size, sortBy, sortDir));
    }

    @GetMapping("/statistiques")
    public ResponseEntity<com.uasz.ms_patrimoine.dto.PatrimoineStatsDto> getStatistiques() {
        return ResponseEntity.ok(patrimoineService.getStatistiques());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatrimoineDto> getByIdPatrimoine(@PathVariable Long id) {
        return ResponseEntity.ok(patrimoineService.getByIdPatrimoine(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PatrimoineDto> updatePatrimoine(@PathVariable Long id,
                                                          @Valid @RequestBody PatrimoineDto patrimoineDto) {
        return ResponseEntity.ok(patrimoineService.updatePatrimoine(id, patrimoineDto));
    }

    @PutMapping("/{id}/soumettre")
    public ResponseEntity<PatrimoineDto> soumettrePatrimoine(@PathVariable Long id) {
        return ResponseEntity.ok(patrimoineService.soumettrePatrimoine(id));
    }

    @PutMapping("/{id}/publier")
    public ResponseEntity<PatrimoineDto> publierPatrimoine(@PathVariable Long id) {
        return ResponseEntity.ok(patrimoineService.publierPatrimoine(id));
    }

    @PutMapping("/{id}/archiver")
    public ResponseEntity<PatrimoineDto> archiverPatrimoine(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String motif = body != null ? body.get("motif") : null;
        return ResponseEntity.ok(patrimoineService.archiverPatrimoine(id, motif));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePatrimoine(@PathVariable Long id) {
        patrimoineService.deletePatrimoine(id);
        return ResponseEntity.noContent().build();
    }
}
