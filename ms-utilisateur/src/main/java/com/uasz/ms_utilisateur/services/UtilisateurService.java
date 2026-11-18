package com.uasz.ms_utilisateur.services;

import com.uasz.ms_utilisateur.dto.ConnexionRequest;
import com.uasz.ms_utilisateur.dto.PageResponseDto;
import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.dto.UtilisateurStatsDto;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.entities.Utilisateur;
import com.uasz.ms_utilisateur.exceptions.BadRequestException;
import com.uasz.ms_utilisateur.exceptions.ForbiddenException;
import com.uasz.ms_utilisateur.exceptions.ResourceNotFoundException;
import com.uasz.ms_utilisateur.exceptions.UnauthorizedException;
import com.uasz.ms_utilisateur.mappers.UtilisateurMapper;
import com.uasz.ms_utilisateur.repositories.UtilisateurRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

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
    public PageResponseDto<UtilisateurDto> rechercherUtilisateurs(
            String q,
            RoleUtilisateur role,
            Boolean actif,
            int page,
            int size
    ) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        String qLower = (q != null && !q.isBlank()) ? q.trim().toLowerCase(Locale.ROOT) : null;

        Specification<Utilisateur> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (role != null) {
                predicates.add(cb.equal(root.get("role"), role));
            }
            if (actif != null) {
                predicates.add(cb.equal(root.get("actif"), actif));
            }
            if (qLower != null) {
                String pattern = "%" + qLower + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("nom"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("prenom"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("email"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("telephone"), "")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Utilisateur> result = utilisateurRepository.findAll(
                spec,
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "id"))
        );
        return PageResponseDto.<UtilisateurDto>builder()
                .content(result.getContent().stream().map(utilisateurMapper::toDto).toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .last(result.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public UtilisateurStatsDto getUtilisateursStats() {
        long total = utilisateurRepository.count();
        long actifs = utilisateurRepository.countByActifTrue();
        Map<String, Long> parRole = new LinkedHashMap<>();
        for (RoleUtilisateur r : RoleUtilisateur.values()) {
            parRole.put(r.name(), utilisateurRepository.countByRole(r));
        }
        return UtilisateurStatsDto.builder()
                .total(total)
                .actifs(actifs)
                .inactifs(Math.max(0L, total - actifs))
                .parRole(parRole)
                .build();
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
