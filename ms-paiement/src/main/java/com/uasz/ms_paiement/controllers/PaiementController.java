package com.uasz.ms_paiement.controllers;

import com.uasz.ms_paiement.dto.PaiementDto;
import com.uasz.ms_paiement.services.IPaiementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/paiements")
@RequiredArgsConstructor
public class PaiementController {

    private final IPaiementService paiementService;

    @PostMapping
    public ResponseEntity<PaiementDto> effectuer(@Valid @RequestBody PaiementDto paiementDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(paiementService.effectuerPaiement(paiementDto));
    }

    @GetMapping
    public ResponseEntity<List<PaiementDto>> getAll() {
        return ResponseEntity.ok(paiementService.getAllPaiements());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaiementDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(paiementService.getByIdPaiement(id));
    }
}

