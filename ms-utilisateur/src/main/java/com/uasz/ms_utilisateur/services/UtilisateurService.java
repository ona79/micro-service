package com.uasz.ms_utilisateur.services;

import com.uasz.ms_utilisateur.dto.ConnexionRequest;
import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.entities.Utilisateur;
import com.uasz.ms_utilisateur.exceptions.BadRequestException;
import com.uasz.ms_utilisateur.exceptions.ForbiddenException;
import com.uasz.ms_utilisateur.exceptions.ResourceNotFoundException;
import com.uasz.ms_utilisateur.exceptions.UnauthorizedException;
import com.uasz.ms_utilisateur.mappers.UtilisateurMapper;
import com.uasz.ms_utilisateur.repositories.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final PasswordEncoder passwordEncoder;

    @Override
    public UtilisateurDto inscrireUtilisateur(UtilisateurDto dto) {
        return saveNewUser(dto, false);
    }

    @Override
    public UtilisateurDto creerUtilisateurParAdmin(UtilisateurDto dto) {
        return saveNewUser(dto, true);
    }

    private UtilisateurDto saveNewUser(UtilisateurDto dto, boolean allowCustomRole) {
        String normalizedEmail = dto.getEmail() != null ? dto.getEmail().trim().toLowerCase() : "";
        if (normalizedEmail.isBlank()) {
            throw new BadRequestException("L'adresse email est obligatoire");
        }
        if (utilisateurRepository.existsByEmail(normalizedEmail)) {
            throw new BadRequestException("Un compte existe déjà avec l'email : " + normalizedEmail);
        }
        if (dto.getMotDePasse() == null || dto.getMotDePasse().trim().length() < 6) {
            throw new BadRequestException("Le mot de passe doit contenir au moins 6 caractères");
        }

        Utilisateur utilisateur = utilisateurMapper.toEntity(dto);
        utilisateur.setId(null);
        utilisateur.setEmail(normalizedEmail);
        utilisateur.setMotDePasse(passwordEncoder.encode(dto.getMotDePasse()));

        // Sécurité : ne jamais faire confiance à un rôle transmis librement lors d'une auto-inscription
        if (!allowCustomRole || utilisateur.getRole() == null) {
            utilisateur.setRole(RoleUtilisateur.TOURISTE);
        }
        utilisateur.setActif(true);
        utilisateur.setDateInscription(LocalDateTime.now());
        return utilisateurMapper.toDto(utilisateurRepository.save(utilisateur));
    }

    @Override
    @Transactional(readOnly = true)
    public UtilisateurDto connecterUtilisateur(ConnexionRequest request) {
        String normalizedEmail = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        Utilisateur utilisateur = utilisateurRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new UnauthorizedException("Identifiants invalides"));
        if (utilisateur.getMotDePasse() == null
                || !passwordEncoder.matches(request.getMotDePasse(), utilisateur.getMotDePasse())) {
            throw new UnauthorizedException("Identifiants invalides");
        }
        if (!utilisateur.isActif()) {
            throw new ForbiddenException("Ce compte utilisateur est désactivé");
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
    public UtilisateurDto updateUtilisateur(Long id, UtilisateurDto dto, boolean isAdminCaller) {
        Utilisateur utilisateur = findUtilisateur(id);
        RoleUtilisateur previousRole = utilisateur.getRole();
        boolean previousActif = utilisateur.isActif();

        utilisateurMapper.updateEntity(dto, utilisateur);

        if (!isAdminCaller) {
            utilisateur.setRole(previousRole);
            utilisateur.setActif(previousActif);
        } else if (dto.getRole() == null) {
            utilisateur.setRole(previousRole);
        }

        if (dto.getMotDePasse() != null && !dto.getMotDePasse().isBlank()) {
            if (dto.getMotDePasse().trim().length() < 6) {
                throw new BadRequestException("Le mot de passe doit contenir au moins 6 caractères");
            }
            utilisateur.setMotDePasse(passwordEncoder.encode(dto.getMotDePasse()));
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
