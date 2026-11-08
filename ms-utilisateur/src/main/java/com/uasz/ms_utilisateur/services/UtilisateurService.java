package com.uasz.ms_utilisateur.services;

import com.uasz.ms_utilisateur.dto.ConnexionRequest;
import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.entities.Utilisateur;
import com.uasz.ms_utilisateur.exceptions.BadRequestException;
import com.uasz.ms_utilisateur.exceptions.ResourceNotFoundException;
import com.uasz.ms_utilisateur.mappers.UtilisateurMapper;
import com.uasz.ms_utilisateur.repositories.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class UtilisateurService implements IUtilisateurService {

    private final UtilisateurRepository utilisateurRepository;
    private final UtilisateurMapper utilisateurMapper;

    @Override
    public UtilisateurDto inscrireUtilisateur(UtilisateurDto dto) {
        if (utilisateurRepository.existsByEmail(dto.getEmail())) {
            throw new BadRequestException("Un compte existe déjà avec l'email : " + dto.getEmail());
        }
        Utilisateur utilisateur = utilisateurMapper.toEntity(dto);
        utilisateur.setId(null);
        if (utilisateur.getRole() == null) {
            utilisateur.setRole(RoleUtilisateur.TOURISTE);
        }
        utilisateur.setActif(true);
        utilisateur.setDateInscription(LocalDateTime.now());
        return utilisateurMapper.toDto(utilisateurRepository.save(utilisateur));
    }

    @Override
    @Transactional(readOnly = true)
    public UtilisateurDto connecterUtilisateur(ConnexionRequest request) {
        Utilisateur utilisateur = utilisateurRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Identifiants invalides"));
        if (utilisateur.getMotDePasse() == null || !utilisateur.getMotDePasse().equals(request.getMotDePasse())) {
            throw new BadRequestException("Identifiants invalides");
        }
        if (!utilisateur.isActif()) {
            throw new BadRequestException("Ce compte utilisateur est désactivé");
        }
        return utilisateurMapper.toDto(utilisateur);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UtilisateurDto> getAllUtilisateurs() {
        return utilisateurRepository.findAll().stream()
                .map(utilisateurMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public UtilisateurDto getByIdUtilisateur(Long id) {
        return utilisateurMapper.toDto(findUtilisateur(id));
    }

    @Override
    public UtilisateurDto updateUtilisateur(Long id, UtilisateurDto dto) {
        Utilisateur utilisateur = findUtilisateur(id);
        utilisateurMapper.updateEntity(dto, utilisateur);
        if (dto.getMotDePasse() != null && !dto.getMotDePasse().isBlank()) {
            utilisateur.setMotDePasse(dto.getMotDePasse());
        }
        return utilisateurMapper.toDto(utilisateurRepository.save(utilisateur));
    }

    @Override
    public void deleteUtilisateur(Long id) {
        if (!utilisateurRepository.existsById(id)) {
            throw new ResourceNotFoundException("Utilisateur introuvable avec l'id : " + id);
        }
        utilisateurRepository.deleteById(id);
    }

    private Utilisateur findUtilisateur(Long id) {
        return utilisateurRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable avec l'id : " + id));
    }
}

