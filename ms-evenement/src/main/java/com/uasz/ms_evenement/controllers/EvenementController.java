package com.uasz.ms_evenement.controllers;

import com.uasz.ms_evenement.dto.EvenementDto;
import com.uasz.ms_evenement.services.IEvenementService;
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

    @GetMapping("/{id}")
    public ResponseEntity<EvenementDto> getByIdEvenement(@PathVariable Long id) {
        return ResponseEntity.ok(evenementService.getByIdEvenement(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EvenementDto> updateEvenement(@PathVariable Long id,
                                                        @Valid @RequestBody EvenementDto evenementDto) {
        return ResponseEntity.ok(evenementService.updateEvenement(id, evenementDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvenement(@PathVariable Long id) {
        evenementService.deleteEvenement(id);
        return ResponseEntity.noContent().build();
    }
}

