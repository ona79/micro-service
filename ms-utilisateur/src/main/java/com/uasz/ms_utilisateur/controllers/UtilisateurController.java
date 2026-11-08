package com.uasz.ms_utilisateur.controllers;

import com.uasz.ms_utilisateur.dto.ConnexionRequest;
import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.services.IUtilisateurService;
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
@RequestMapping("/api/utilisateurs")
@RequiredArgsConstructor
public class UtilisateurController {

    private final IUtilisateurService utilisateurService;

    @PostMapping
    public ResponseEntity<UtilisateurDto> inscrire(@Valid @RequestBody UtilisateurDto utilisateurDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(utilisateurService.inscrireUtilisateur(utilisateurDto));
    }

    @PostMapping("/connexion")
    public ResponseEntity<UtilisateurDto> connecter(@Valid @RequestBody ConnexionRequest request) {
        return ResponseEntity.ok(utilisateurService.connecterUtilisateur(request));
    }

    @GetMapping
    public ResponseEntity<List<UtilisateurDto>> getAll() {
        return ResponseEntity.ok(utilisateurService.getAllUtilisateurs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UtilisateurDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(utilisateurService.getByIdUtilisateur(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UtilisateurDto> update(@PathVariable Long id,
                                                 @Valid @RequestBody UtilisateurDto utilisateurDto) {
        return ResponseEntity.ok(utilisateurService.updateUtilisateur(id, utilisateurDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        utilisateurService.deleteUtilisateur(id);
        return ResponseEntity.noContent().build();
    }
}

