package com.uasz.ms_utilisateur.services;

import com.uasz.ms_utilisateur.dto.GuideHistoriqueDto;
import com.uasz.ms_utilisateur.dto.GuideProfilDto;
import com.uasz.ms_utilisateur.dto.GuideSelfUpdateRequest;
import com.uasz.ms_utilisateur.dto.GuideVerificationDto;
import com.uasz.ms_utilisateur.entities.GuideHistoriqueValidation;
import com.uasz.ms_utilisateur.entities.GuideProfil;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.entities.StatutOutbox;
import com.uasz.ms_utilisateur.entities.StatutValidationGuide;
import com.uasz.ms_utilisateur.entities.Utilisateur;
import com.uasz.ms_utilisateur.entities.UtilisateurNotificationOutbox;
import com.uasz.ms_utilisateur.exceptions.BadRequestException;
import com.uasz.ms_utilisateur.exceptions.ConflictException;
import com.uasz.ms_utilisateur.exceptions.ForbiddenException;
import com.uasz.ms_utilisateur.exceptions.ResourceNotFoundException;
import com.uasz.ms_utilisateur.exceptions.UnauthorizedException;
import com.uasz.ms_utilisateur.repositories.GuideHistoriqueValidationRepository;
import com.uasz.ms_utilisateur.repositories.GuideProfilRepository;
import com.uasz.ms_utilisateur.repositories.UtilisateurNotificationOutboxRepository;
import com.uasz.ms_utilisateur.repositories.UtilisateurRepository;
import com.uasz.ms_utilisateur.security.SecurityUserContext;
import com.uasz.ms_utilisateur.security.SecurityUserContextHolder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

@Slf4j
@Service
public class GuideService implements IGuideService {

    public static final ZoneId CASAMANCE_ZONE = ZoneId.of("Africa/Dakar");
    private static final String DEVISE_XOF = "XOF";

    private final GuideProfilRepository guideProfilRepository;
    private final GuideHistoriqueValidationRepository historiqueRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final UtilisateurNotificationOutboxRepository outboxRepository;
    private final UtilisateurNotificationOutboxRelayService outboxRelayService;
    private final AuditSecuriteService auditSecuriteService;
    private final PlatformTransactionManager transactionManager;

    @Autowired
    public GuideService(
            GuideProfilRepository guideProfilRepository,
            GuideHistoriqueValidationRepository historiqueRepository,
            UtilisateurRepository utilisateurRepository,
            UtilisateurNotificationOutboxRepository outboxRepository,
            UtilisateurNotificationOutboxRelayService outboxRelayService,
            AuditSecuriteService auditSecuriteService,
            @Autowired(required = false) PlatformTransactionManager transactionManager
    ) {
        this.guideProfilRepository = guideProfilRepository;
        this.historiqueRepository = historiqueRepository;
        this.utilisateurRepository = utilisateurRepository;
        this.outboxRepository = outboxRepository;
        this.outboxRelayService = outboxRelayService;
        this.auditSecuriteService = auditSecuriteService;
        this.transactionManager = transactionManager;
    }

    public GuideService(
            GuideProfilRepository guideProfilRepository,
            GuideHistoriqueValidationRepository historiqueRepository,
            UtilisateurRepository utilisateurRepository,
            UtilisateurNotificationOutboxRepository outboxRepository,
            UtilisateurNotificationOutboxRelayService outboxRelayService,
            AuditSecuriteService auditSecuriteService
    ) {
        this(guideProfilRepository, historiqueRepository, utilisateurRepository, outboxRepository,
                outboxRelayService, auditSecuriteService, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<GuideProfilDto> getPublicGuides(String zone, String langue, String q) {
        String z = blankToNull(zone);
        String l = blankToNull(langue);
        String query = blankToNull(q);
        return guideProfilRepository.searchPublicGuides(z, l, query).stream()
                .map(this::toPublicDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public GuideProfilDto getGuideById(Long id) {
        GuideProfil profil = findProfilOrThrow(id);
        return formatForCaller(profil);
    }

    @Override
    @Transactional(readOnly = true)
    public GuideProfilDto getGuideByUtilisateurId(Long utilisateurId) {
        GuideProfil profil = guideProfilRepository.findByUtilisateurId(utilisateurId)
                .orElseThrow(() -> new ResourceNotFoundException("Profil guide introuvable pour l'utilisateur #" + utilisateurId));
        return formatForCaller(profil);
    }

    @Override
    @Transactional(readOnly = true)
    public GuideProfilDto getMonProfil() {
        SecurityUserContext caller = requireAuthenticatedGuide();
        GuideProfil profil = guideProfilRepository.findByUtilisateurId(caller.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Vous n'avez pas encore créé votre profil de guide professionnel."));
        return toDetailedDto(profil);
    }

    @Override
    @Transactional
    public GuideProfilDto upsertMonProfil(GuideSelfUpdateRequest req) {
        SecurityUserContext caller = requireAuthenticatedGuide();
        rejectTamperedValidationFields(caller, req);

        Utilisateur guideUser = utilisateurRepository.findById(caller.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Compte guide introuvable."));
        if (!guideUser.isActif() || guideUser.getRole() != RoleUtilisateur.GUIDE) {
            throw new ForbiddenException("Accès interdit : votre compte guide n'est pas actif.");
        }

        LocalDateTime now = LocalDateTime.now(CASAMANCE_ZONE);
        GuideProfil profil = guideProfilRepository.findByUtilisateurId(caller.userId()).orElse(null);

        if (profil == null) {
            boolean requestedDisponibilite = req.getDisponible() == null || req.getDisponible();
            GuideProfil created = GuideProfil.builder()
                    .utilisateur(guideUser)
                    .presentationCourte(req.getPresentationCourte().trim())
                    .biographie(req.getBiographie().trim())
                    .languesParlees(req.getLanguesParlees().trim())
                    .specialites(req.getSpecialites().trim())
                    .zonesIntervention(req.getZonesIntervention().trim())
                    .anneesExperience(req.getAnneesExperience())
                    .numeroCarteProfessionnelle(blankToNull(req.getNumeroCarteProfessionnelle()))
                    .documentsJustificatifs(blankToNull(req.getDocumentsJustificatifs()))
                    .tarifJournalierIndicatif(req.getTarifJournalierIndicatif())
                    .devise(DEVISE_XOF)
                    .disponible(requestedDisponibilite)
                    .visibilitePublique(false)
                    .statutValidation(StatutValidationGuide.BROUILLON)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
            GuideProfil saved = guideProfilRepository.save(created);
            recordHistory(saved.getId(), null, StatutValidationGuide.BROUILLON, caller.userId(), caller.role(),
                    "Création initiale du profil guide", null, now);
            return toDetailedDto(saved);
        }

        StatutValidationGuide currentStatus = profil.getStatutValidation();
        if ((currentStatus == StatutValidationGuide.SUSPENDU || currentStatus == StatutValidationGuide.DESACTIVE)
                && (Boolean.TRUE.equals(req.getDisponible()) || Boolean.TRUE.equals(req.getVisibilitePublique()))) {
            throw new ConflictException("Impossible d'activer la disponibilité ou la visibilité publique d'un profil " + currentStatus + ".");
        }

        profil.setPresentationCourte(req.getPresentationCourte().trim());
        profil.setBiographie(req.getBiographie().trim());
        profil.setLanguesParlees(req.getLanguesParlees().trim());
        profil.setSpecialites(req.getSpecialites().trim());
        profil.setZonesIntervention(req.getZonesIntervention().trim());
        profil.setAnneesExperience(req.getAnneesExperience());
        profil.setNumeroCarteProfessionnelle(blankToNull(req.getNumeroCarteProfessionnelle()));
        profil.setDocumentsJustificatifs(blankToNull(req.getDocumentsJustificatifs()));
        profil.setTarifJournalierIndicatif(req.getTarifJournalierIndicatif());
        if (req.getDisponible() != null) {
            profil.setDisponible(currentStatus != StatutValidationGuide.SUSPENDU
                    && currentStatus != StatutValidationGuide.DESACTIVE
                    && req.getDisponible());
        }
        if (currentStatus == StatutValidationGuide.VALIDE && req.getVisibilitePublique() != null) {
            profil.setVisibilitePublique(req.getVisibilitePublique());
        } else if (currentStatus != StatutValidationGuide.VALIDE) {
            profil.setVisibilitePublique(false);
        }
        profil.setUpdatedAt(now);

        return toDetailedDto(guideProfilRepository.save(profil));
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public GuideProfilDto soumettreMonProfil() {
        SecurityUserContext caller = requireAuthenticatedGuide();
        record Phase1(GuideProfil saved, Long outboxId) {}

        Phase1 p1 = executeInWriteTx(() -> {
            GuideProfil profil = guideProfilRepository.findByUtilisateurId(caller.userId())
                    .orElseThrow(() -> new BadRequestException("Veuillez d'abord renseigner votre profil de guide avant de le soumettre."));

            if (profil.getStatutValidation() != StatutValidationGuide.BROUILLON
                    && profil.getStatutValidation() != StatutValidationGuide.REJETE) {
                throw new ConflictException("Seul un profil au statut BROUILLON ou REJETE peut être soumis pour validation (statut actuel : " + profil.getStatutValidation() + ").");
            }

            LocalDateTime now = LocalDateTime.now(CASAMANCE_ZONE);
            StatutValidationGuide prev = profil.getStatutValidation();
            profil.setStatutValidation(StatutValidationGuide.EN_ATTENTE_VALIDATION);
            profil.setDateSoumission(now);
            profil.setVisibilitePublique(false);
            profil.setUpdatedAt(now);
            GuideProfil saved = guideProfilRepository.save(profil);

            String correlationId = "GUIDE-SUB-" + saved.getId() + "-" + UUID.randomUUID().toString().substring(0, 8);
            recordHistory(saved.getId(), prev, StatutValidationGuide.EN_ATTENTE_VALIDATION,
                    caller.userId(), caller.role(), "Soumission du profil pour validation administrative", correlationId, now);

            UtilisateurNotificationOutbox outbox = queueNotification(
                    saved.getUtilisateur(),
                    "Dossier guide soumis pour validation",
                    "Votre profil de guide professionnel a bien été soumis et est en cours d'examen par l'équipe de gestion.",
                    "GUIDE_PROFILE_SOUMIS",
                    "GUIDE",
                    saved.getId(),
                    correlationId,
                    "GUIDE:" + saved.getId() + ":SOUMIS:" + now.toEpochSecond(java.time.ZoneOffset.UTC),
                    now
            );
            return new Phase1(saved, outbox.getId());
        });

        relayerSilencieusement(p1.outboxId());
        return toDetailedDto(p1.saved());
    }

    @Override
    @Transactional
    public GuideProfilDto changerMaDisponibilite(boolean disponible, Boolean visibilitePublique) {
        SecurityUserContext caller = requireAuthenticatedGuide();
        GuideProfil profil = guideProfilRepository.findByUtilisateurId(caller.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Profil guide introuvable."));

        if (profil.getStatutValidation() != StatutValidationGuide.VALIDE && disponible) {
            throw new ConflictException("Seul un profil guide VALIDE peut être marqué disponible aux réservations.");
        }
        if (profil.getStatutValidation() == StatutValidationGuide.SUSPENDU
                || profil.getStatutValidation() == StatutValidationGuide.DESACTIVE) {
            throw new ConflictException("Action impossible : votre profil est actuellement " + profil.getStatutValidation() + ".");
        }

        profil.setDisponible(disponible);
        if (visibilitePublique != null) {
            if (profil.getStatutValidation() != StatutValidationGuide.VALIDE && visibilitePublique) {
                throw new ConflictException("Un profil non validé ne peut pas être rendu public.");
            }
            profil.setVisibilitePublique(visibilitePublique);
        }
        profil.setUpdatedAt(LocalDateTime.now(CASAMANCE_ZONE));
        return toDetailedDto(guideProfilRepository.save(profil));
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public GuideProfilDto desactiverMonProfil(String motif) {
        SecurityUserContext caller = requireAuthenticatedGuide();
        String effectiveMotif = (motif != null && !motif.isBlank()) ? motif.trim() : "Désactivation volontaire par le guide";
        return appliquerTransitionGestionnaire(null, caller, true, StatutValidationGuide.DESACTIVE, effectiveMotif, "GUIDE_PROFILE_DESACTIVE");
    }

    @Override
    @Transactional(readOnly = true)
    public List<GuideProfilDto> getAllAdmin(StatutValidationGuide statut) {
        SecurityUserContext caller = requireManagerPermission("GUIDE:VALIDER");
        return guideProfilRepository.findAllAdminFiltered(statut).stream()
                .map(this::toDetailedDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<GuideHistoriqueDto> getHistorique(Long guideId) {
        SecurityUserContext caller = requireAuthenticatedCaller();
        GuideProfil profil = findProfilOrThrow(guideId);
        boolean isOwner = caller.userId() != null && caller.userId().equals(profil.getUtilisateur().getId());
        boolean isManager = caller.hasPermission("GUIDE:VALIDER") || caller.hasPermission("GUIDE:SUSPENDRE");
        if (!isOwner && !isManager) {
            throw new ForbiddenException("Accès interdit : vous ne pouvez pas consulter l'historique de validation de ce guide.");
        }
        return historiqueRepository.findByGuideProfilIdOrderByDateTransitionDescIdDesc(guideId).stream()
                .map(this::toHistoriqueDto)
                .toList();
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public GuideProfilDto validerProfil(Long guideId, String motif) {
        SecurityUserContext caller = requireManagerPermission("GUIDE:VALIDER");
        String effectiveMotif = (motif != null && !motif.isBlank()) ? motif.trim() : "Profil guide vérifié et validé par le gestionnaire.";
        return appliquerTransitionGestionnaire(guideId, caller, false, StatutValidationGuide.VALIDE, effectiveMotif, "GUIDE_PROFILE_VALIDE");
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public GuideProfilDto rejeterProfil(Long guideId, String motif) {
        SecurityUserContext caller = requireManagerPermission("GUIDE:VALIDER");
        if (motif == null || motif.isBlank()) {
            throw new BadRequestException("Un motif explicite est obligatoire pour rejeter un profil guide.");
        }
        return appliquerTransitionGestionnaire(guideId, caller, false, StatutValidationGuide.REJETE, motif.trim(), "GUIDE_PROFILE_REJETE");
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public GuideProfilDto suspendreProfil(Long guideId, String motif) {
        SecurityUserContext caller = requireManagerPermission("GUIDE:SUSPENDRE");
        if (motif == null || motif.isBlank()) {
            throw new BadRequestException("Un motif explicite est obligatoire pour suspendre un guide.");
        }
        return appliquerTransitionGestionnaire(guideId, caller, false, StatutValidationGuide.SUSPENDU, motif.trim(), "GUIDE_PROFILE_SUSPENDU");
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public GuideProfilDto reactiverProfil(Long guideId, String motif) {
        SecurityUserContext caller = requireManagerPermission("GUIDE:VALIDER");
        String effectiveMotif = (motif != null && !motif.isBlank()) ? motif.trim() : "Profil guide réactivé après réexamen.";
        return appliquerTransitionGestionnaire(guideId, caller, false, StatutValidationGuide.VALIDE, effectiveMotif, "GUIDE_PROFILE_REACTIVE");
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public GuideProfilDto desactiverProfilParAdmin(Long guideId, String motif) {
        SecurityUserContext caller = requireManagerPermission("GUIDE:SUSPENDRE");
        String effectiveMotif = (motif != null && !motif.isBlank()) ? motif.trim() : "Profil désactivé par l'administration.";
        return appliquerTransitionGestionnaire(guideId, caller, false, StatutValidationGuide.DESACTIVE, effectiveMotif, "GUIDE_PROFILE_DESACTIVE");
    }

    @Override
    @Transactional(readOnly = true)
    public GuideVerificationDto verifierGuidePourCircuit(Long utilisateurId) {
        SecurityUserContext caller = requireAuthenticatedCaller();
        boolean serviceAllowed = caller.serviceCall() && ("ms-circuit".equals(caller.serviceName()) || "ms-reservation".equals(caller.serviceName()));
        boolean managerAllowed = caller.hasPermission("GUIDE:VALIDER") || caller.hasPermission("CIRCUIT:MODIFIER");
        if (!serviceAllowed && !managerAllowed) {
            throw new ForbiddenException("Accès interdit : vérification guide réservée aux services autorisés.");
        }
        Utilisateur user = utilisateurRepository.findById(utilisateurId)
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur #" + utilisateurId + " introuvable."));
        GuideProfil profil = guideProfilRepository.findByUtilisateurId(utilisateurId).orElse(null);

        boolean profilValide = user.isActif()
                && user.getRole() == RoleUtilisateur.GUIDE
                && profil != null
                && profil.getStatutValidation() == StatutValidationGuide.VALIDE;

        return GuideVerificationDto.builder()
                .utilisateurId(user.getId())
                .profilId(profil != null ? profil.getId() : null)
                .nomComplet((user.getPrenom() + " " + user.getNom()).trim())
                .email(user.getEmail())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .compteActif(user.isActif())
                .statutValidation(profil != null ? profil.getStatutValidation() : null)
                .profilValide(profilValide)
                .disponible(profil != null && profil.isDisponible())
                .zonesIntervention(profil != null ? profil.getZonesIntervention() : null)
                .languesParlees(profil != null ? profil.getLanguesParlees() : null)
                .build();
    }

    private GuideProfilDto appliquerTransitionGestionnaire(
            Long guideId,
            SecurityUserContext caller,
            boolean selfDeactivate,
            StatutValidationGuide target,
            String motif,
            String eventType
    ) {
        record Phase1Transition(GuideProfil saved, Long outboxId, Long targetUserId, String details) {}

        Phase1Transition p1 = executeInWriteTx(() -> {
            GuideProfil profil = selfDeactivate
                    ? guideProfilRepository.findByUtilisateurId(caller.userId())
                            .orElseThrow(() -> new ResourceNotFoundException("Profil guide introuvable."))
                    : findProfilOrThrow(guideId);

            if (!selfDeactivate && caller.userId() != null && caller.userId().equals(profil.getUtilisateur().getId())) {
                throw new ForbiddenException("Un guide ne peut pas effectuer une décision administrative sur son propre profil.");
            }

            StatutValidationGuide current = profil.getStatutValidation();
            if (!isTransitionAllowed(current, target, selfDeactivate)) {
                throw new ConflictException("Transition de statut guide invalide : " + current + " -> " + target + ".");
            }

            if (target == StatutValidationGuide.VALIDE) {
                if (!profil.getUtilisateur().isActif() || profil.getUtilisateur().getRole() != RoleUtilisateur.GUIDE) {
                    throw new ConflictException("Impossible de valider ce guide : son compte utilisateur est inactif ou n'a pas le rôle GUIDE.");
                }
            }

            LocalDateTime now = LocalDateTime.now(CASAMANCE_ZONE);
            profil.setStatutValidation(target);
            profil.setMotifDecision(motif);
            profil.setUpdatedAt(now);

            switch (target) {
                case VALIDE -> {
                    profil.setValideParId(caller.userId());
                    profil.setDateValidation(now);
                    profil.setVisibilitePublique(true);
                    profil.setDisponible(true);
                }
                case REJETE -> {
                    profil.setValideParId(caller.userId());
                    profil.setVisibilitePublique(false);
                    profil.setDisponible(false);
                }
                case SUSPENDU -> {
                    profil.setVisibilitePublique(false);
                    profil.setDisponible(false);
                    profil.setDateSuspension(now);
                }
                case DESACTIVE -> {
                    profil.setVisibilitePublique(false);
                    profil.setDisponible(false);
                    profil.setDateDesactivation(now);
                }
                default -> {
                }
            }

            GuideProfil saved = guideProfilRepository.save(profil);
            String correlationId = "GUIDE-" + saved.getId() + "-" + target + "-" + UUID.randomUUID().toString().substring(0, 8);
            recordHistory(saved.getId(), current, target, caller.userId(), caller.role(), motif, correlationId, now);

            String sujet = buildNotificationSubject(target);
            String contenu = "Votre profil de guide touristique (" + saved.getUtilisateur().getPrenom() + " "
                    + saved.getUtilisateur().getNom() + ") est désormais au statut " + target + ". Motif : " + motif;

            UtilisateurNotificationOutbox outbox = queueNotification(
                    saved.getUtilisateur(),
                    sujet,
                    contenu,
                    eventType,
                    "GUIDE",
                    saved.getId(),
                    correlationId,
                    "GUIDE:" + saved.getId() + ":" + eventType + ":" + correlationId,
                    now
            );

            return new Phase1Transition(saved, outbox.getId(), saved.getUtilisateur().getId(),
                    "Transition " + current + " -> " + target + " sur profil guide #" + saved.getId() + " (" + motif + ")");
        });

        if (auditSecuriteService != null) {
            auditSecuriteService.logAdminAction(eventType, caller.userId(), "0.0.0.0", p1.details());
        }
        relayerSilencieusement(p1.outboxId());
        return toDetailedDto(p1.saved());
    }

    private boolean isTransitionAllowed(StatutValidationGuide current, StatutValidationGuide target, boolean selfDeactivate) {
        if (current == target) {
            return false;
        }
        return switch (target) {
            case VALIDE -> current == StatutValidationGuide.BROUILLON
                    || current == StatutValidationGuide.EN_ATTENTE_VALIDATION
                    || current == StatutValidationGuide.REJETE
                    || current == StatutValidationGuide.SUSPENDU
                    || current == StatutValidationGuide.DESACTIVE;
            case REJETE -> current == StatutValidationGuide.EN_ATTENTE_VALIDATION
                    || current == StatutValidationGuide.BROUILLON;
            case SUSPENDU -> current == StatutValidationGuide.VALIDE;
            case DESACTIVE -> selfDeactivate || current != StatutValidationGuide.DESACTIVE;
            default -> false;
        };
    }

    private String buildNotificationSubject(StatutValidationGuide target) {
        return switch (target) {
            case VALIDE -> "Profil de guide touristique validé et activé";
            case REJETE -> "Demande de validation de profil guide refusée";
            case SUSPENDU -> "Profil de guide touristique suspendu";
            case DESACTIVE -> "Profil de guide touristique désactivé";
            default -> "Mise à jour de votre profil guide";
        };
    }

    private void rejectTamperedValidationFields(SecurityUserContext caller, GuideSelfUpdateRequest req) {
        if ((req.getStatutValidation() != null && !req.getStatutValidation().isBlank())
                || req.getValideParId() != null
                || (req.getMotifDecision() != null && !req.getMotifDecision().isBlank())
                || (req.getUtilisateurId() != null && !req.getUtilisateurId().equals(caller.userId()))) {
            throw new ForbiddenException("Accès interdit : vous ne pouvez pas modifier le statut ou les champs réservés à la validation administrative.");
        }
    }

    private GuideProfilDto formatForCaller(GuideProfil profil) {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        boolean isOwner = caller != null && caller.userId() != null && caller.userId().equals(profil.getUtilisateur().getId());
        boolean isManager = caller != null && (caller.hasPermission("GUIDE:VALIDER") || caller.hasPermission("GUIDE:SUSPENDRE"));

        if (isOwner || isManager) {
            return toDetailedDto(profil);
        }
        if (profil.getStatutValidation() != StatutValidationGuide.VALIDE
                || !profil.isVisibilitePublique()
                || !profil.getUtilisateur().isActif()) {
            throw new ResourceNotFoundException("Profil guide introuvable ou non public.");
        }
        return toPublicDto(profil);
    }

    private GuideProfilDto toPublicDto(GuideProfil gp) {
        Utilisateur u = gp.getUtilisateur();
        return GuideProfilDto.builder()
                .id(gp.getId())
                .utilisateurId(u.getId())
                .nom(u.getNom())
                .prenom(u.getPrenom())
                .compteActif(u.isActif())
                .presentationCourte(gp.getPresentationCourte())
                .biographie(gp.getBiographie())
                .languesParlees(gp.getLanguesParlees())
                .specialites(gp.getSpecialites())
                .zonesIntervention(gp.getZonesIntervention())
                .anneesExperience(gp.getAnneesExperience())
                .tarifJournalierIndicatif(gp.getTarifJournalierIndicatif())
                .devise(gp.getDevise())
                .disponible(gp.isDisponible())
                .visibilitePublique(gp.isVisibilitePublique())
                .statutValidation(gp.getStatutValidation())
                .dateValidation(gp.getDateValidation())
                .build();
    }

    private GuideProfilDto toDetailedDto(GuideProfil gp) {
        Utilisateur u = gp.getUtilisateur();
        return GuideProfilDto.builder()
                .id(gp.getId())
                .utilisateurId(u.getId())
                .nom(u.getNom())
                .prenom(u.getPrenom())
                .email(u.getEmail())
                .telephone(u.getTelephone())
                .compteActif(u.isActif())
                .presentationCourte(gp.getPresentationCourte())
                .biographie(gp.getBiographie())
                .languesParlees(gp.getLanguesParlees())
                .specialites(gp.getSpecialites())
                .zonesIntervention(gp.getZonesIntervention())
                .anneesExperience(gp.getAnneesExperience())
                .numeroCarteProfessionnelle(gp.getNumeroCarteProfessionnelle())
                .documentsJustificatifs(gp.getDocumentsJustificatifs())
                .tarifJournalierIndicatif(gp.getTarifJournalierIndicatif())
                .devise(gp.getDevise())
                .disponible(gp.isDisponible())
                .visibilitePublique(gp.isVisibilitePublique())
                .statutValidation(gp.getStatutValidation())
                .motifDecision(gp.getMotifDecision())
                .valideParId(gp.getValideParId())
                .dateSoumission(gp.getDateSoumission())
                .dateValidation(gp.getDateValidation())
                .dateSuspension(gp.getDateSuspension())
                .dateDesactivation(gp.getDateDesactivation())
                .createdAt(gp.getCreatedAt())
                .updatedAt(gp.getUpdatedAt())
                .build();
    }

    private GuideHistoriqueDto toHistoriqueDto(GuideHistoriqueValidation h) {
        return GuideHistoriqueDto.builder()
                .id(h.getId())
                .guideProfilId(h.getGuideProfilId())
                .ancienStatut(h.getAncienStatut())
                .nouveauStatut(h.getNouveauStatut())
                .acteurId(h.getActeurId())
                .acteurRole(h.getActeurRole())
                .motif(h.getMotif())
                .correlationId(h.getCorrelationId())
                .dateTransition(h.getDateTransition())
                .build();
    }

    private void recordHistory(
            Long profilId,
            StatutValidationGuide ancien,
            StatutValidationGuide nouveau,
            Long acteurId,
            String acteurRole,
            String motif,
            String correlationId,
            LocalDateTime now
    ) {
        historiqueRepository.save(GuideHistoriqueValidation.builder()
                .guideProfilId(profilId)
                .ancienStatut(ancien)
                .nouveauStatut(nouveau)
                .acteurId(acteurId)
                .acteurRole(acteurRole)
                .motif(motif)
                .correlationId(correlationId)
                .dateTransition(now)
                .build());
    }

    private UtilisateurNotificationOutbox queueNotification(
            Utilisateur targetUser,
            String sujet,
            String contenu,
            String eventType,
            String cibleType,
            Long cibleId,
            String correlationId,
            String idempotencyKey,
            LocalDateTime now
    ) {
        return outboxRepository.save(UtilisateurNotificationOutbox.builder()
                .eventId(UUID.randomUUID().toString())
                .correlationId(correlationId)
                .utilisateurId(targetUser.getId())
                .destinataire(targetUser.getEmail())
                .sujet(sujet)
                .contenu(contenu)
                .typeEvenement(eventType)
                .cibleType(cibleType)
                .cibleId(cibleId)
                .idempotencyKey(idempotencyKey)
                .statut(StatutOutbox.EN_ATTENTE)
                .prochaineTentativeAt(now)
                .createdAt(now)
                .build());
    }

    private void relayerSilencieusement(Long outboxId) {
        if (outboxRelayService != null && outboxId != null) {
            outboxRelayService.tenterLivraison(outboxId);
        }
    }

    private GuideProfil findProfilOrThrow(Long id) {
        return guideProfilRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Profil guide introuvable avec l'id : " + id));
    }

    private SecurityUserContext requireAuthenticatedCaller() {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        if (caller == null) {
            throw new UnauthorizedException("Authentification requise.");
        }
        return caller;
    }

    private SecurityUserContext requireAuthenticatedGuide() {
        SecurityUserContext caller = requireAuthenticatedCaller();
        if (caller.userId() == null) {
            throw new UnauthorizedException("Authentification requise.");
        }
        if (!"GUIDE".equals(caller.role()) || !caller.hasPermission("GUIDE:GERER_PROPRE_PROFIL")) {
            throw new ForbiddenException("Accès interdit : espace réservé aux guides touristiques.");
        }
        return caller;
    }

    private SecurityUserContext requireManagerPermission(String permission) {
        SecurityUserContext caller = requireAuthenticatedCaller();
        if (caller.userId() == null) {
            throw new UnauthorizedException("Authentification requise.");
        }
        if (!caller.hasPermission(permission)) {
            throw new ForbiddenException("Accès interdit : permission '" + permission + "' requise.");
        }
        return caller;
    }

    private <T> T executeInWriteTx(Supplier<T> work) {
        if (transactionManager == null) {
            return work.get();
        }
        TransactionTemplate tpl = new TransactionTemplate(transactionManager);
        tpl.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return tpl.execute(status -> work.get());
    }

    private String blankToNull(String val) {
        return (val == null || val.isBlank()) ? null : val.trim();
    }
}
