package com.uasz.ms_patrimoine.controllers;

import com.uasz.ms_patrimoine.dto.PatrimoineDto;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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

    @GetMapping("/{id}")
    public ResponseEntity<PatrimoineDto> getByIdPatrimoine(@PathVariable Long id) {
        return ResponseEntity.ok(patrimoineService.getByIdPatrimoine(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PatrimoineDto> updatePatrimoine(@PathVariable Long id,
                                                          @Valid @RequestBody PatrimoineDto patrimoineDto) {
        return ResponseEntity.ok(patrimoineService.updatePatrimoine(id, patrimoineDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePatrimoine(@PathVariable Long id) {
        patrimoineService.deletePatrimoine(id);
        return ResponseEntity.noContent().build();
    }
}

