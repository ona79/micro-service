package com.uasz.ms_reservation.services;

import com.uasz.ms_reservation.clients.CircuitClient;
import com.uasz.ms_reservation.clients.EvenementClient;
import com.uasz.ms_reservation.clients.PatrimoineClient;
import com.uasz.ms_reservation.clients.UtilisateurGuideClient;
import com.uasz.ms_reservation.dto.AvisCreateRequest;
import com.uasz.ms_reservation.dto.AvisDto;
import com.uasz.ms_reservation.dto.AvisEligibiliteDto;
import com.uasz.ms_reservation.dto.AvisModerationHistoriqueDto;
import com.uasz.ms_reservation.dto.AvisResumeDto;
import com.uasz.ms_reservation.dto.AvisUpdateRequest;
import com.uasz.ms_reservation.dto.CircuitDto;
import com.uasz.ms_reservation.dto.EvenementDto;
import com.uasz.ms_reservation.dto.GuideVerificationDto;
import com.uasz.ms_reservation.dto.ModerationDecisionRequest;
import com.uasz.ms_reservation.dto.PageResponseDto;
import com.uasz.ms_reservation.dto.PatrimoineDto;
import com.uasz.ms_reservation.dto.SignalementCreateRequest;
import com.uasz.ms_reservation.dto.SignalementDecisionRequest;
import com.uasz.ms_reservation.dto.SignalementDto;
import com.uasz.ms_reservation.entities.Avis;
import com.uasz.ms_reservation.entities.AvisModerationHistorique;
import com.uasz.ms_reservation.entities.AvisSignalement;
import com.uasz.ms_reservation.entities.CategorieSignalement;
import com.uasz.ms_reservation.entities.CibleAvis;
import com.uasz.ms_reservation.entities.Reservation;
import com.uasz.ms_reservation.entities.ReservationNotificationOutbox;
import com.uasz.ms_reservation.entities.StatutModerationAvis;
import com.uasz.ms_reservation.entities.StatutOutbox;
import com.uasz.ms_reservation.entities.StatutReservation;
import com.uasz.ms_reservation.entities.StatutSignalement;
import com.uasz.ms_reservation.entities.TypeReservation;
import com.uasz.ms_reservation.exceptions.BadRequestException;
import com.uasz.ms_reservation.exceptions.ConflictException;
import com.uasz.ms_reservation.exceptions.ForbiddenException;
import com.uasz.ms_reservation.exceptions.ResourceNotFoundException;
import com.uasz.ms_reservation.exceptions.ServiceIndisponibleException;
import com.uasz.ms_reservation.exceptions.UnauthorizedException;
import com.uasz.ms_reservation.repositories.AvisModerationHistoriqueRepository;
import com.uasz.ms_reservation.repositories.AvisRepository;
import com.uasz.ms_reservation.repositories.AvisSignalementRepository;
import com.uasz.ms_reservation.repositories.ReservationNotificationOutboxRepository;
import com.uasz.ms_reservation.repositories.ReservationRepository;
import com.uasz.ms_reservation.security.SecurityUserContext;
import com.uasz.ms_reservation.security.SecurityUserContextHolder;
import feign.FeignException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Slf4j
@Service
@Transactional
public class AvisModerationService implements IAvisModerationService {

    private static final int MAX_PAGE_SIZE = 50;

    private final AvisRepository avisRepository;
    private final AvisSignalementRepository signalementRepository;
    private final AvisModerationHistoriqueRepository moderationHistoriqueRepository;
    private final ReservationRepository reservationRepository;
    private final CircuitClient circuitClient;
    private final EvenementClient evenementClient;
    private final PatrimoineClient patrimoineClient;
    private final UtilisateurGuideClient utilisateurGuideClient;
    private final ReservationNotificationOutboxRepository notificationOutboxRepository;
    private final ReservationNotificationOutboxRelayService notificationOutboxRelayService;

    @Autowired
    public AvisModerationService(
            AvisRepository avisRepository,
            AvisSignalementRepository signalementRepository,
            AvisModerationHistoriqueRepository moderationHistoriqueRepository,
            ReservationRepository reservationRepository,
            CircuitClient circuitClient,
            EvenementClient evenementClient,
            @Autowired(required = false) PatrimoineClient patrimoineClient,
            @Autowired(required = false) UtilisateurGuideClient utilisateurGuideClient,
            @Autowired(required = false) ReservationNotificationOutboxRepository notificationOutboxRepository,
            @Autowired(required = false) ReservationNotificationOutboxRelayService notificationOutboxRelayService
    ) {
        this.avisRepository = avisRepository;
        this.signalementRepository = signalementRepository;
        this.moderationHistoriqueRepository = moderationHistoriqueRepository;
        this.reservationRepository = reservationRepository;
        this.circuitClient = circuitClient;
        this.evenementClient = evenementClient;
        this.patrimoineClient = patrimoineClient;
        this.utilisateurGuideClient = utilisateurGuideClient;
        this.notificationOutboxRepository = notificationOutboxRepository;
        this.notificationOutboxRelayService = notificationOutboxRelayService;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDto<AvisDto> getAvisPublics(CibleAvis cibleType, Long cibleId, int page, int size) {
        if (cibleType == null || cibleId == null) {
            throw new BadRequestException("cibleType et cibleId sont obligatoires.");
        }
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<Avis> result = avisRepository.findByCibleTypeAndCibleIdAndStatutModerationOrderByDatePublicationDescIdDesc(
                cibleType, cibleId, StatutModerationAvis.APPROUVE, pageable);
        List<AvisDto> content = result.getContent().stream().map(this::toPublicDto).toList();
        return PageResponseDto.<AvisDto>builder()
                .content(content)
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .last(result.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AvisResumeDto getResumeEvaluations(CibleAvis cibleType, Long cibleId) {
        if (cibleType == null || cibleId == null) {
            throw new BadRequestException("cibleType et cibleId sont obligatoires.");
        }
        List<Avis> approved = avisRepository.findByCibleTypeAndCibleIdAndStatutModerationOrderByDatePublicationDescIdDesc(
                cibleType, cibleId, StatutModerationAvis.APPROUVE);
        return buildResume(cibleType, cibleId, approved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AvisResumeDto> getResumesBatch(CibleAvis cibleType, List<Long> cibleIds) {
        if (cibleType == null || cibleIds == null || cibleIds.isEmpty()) {
            return List.of();
        }
        return cibleIds.stream()
                .distinct()
                .limit(50)
                .map(id -> getResumeEvaluations(cibleType, id))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AvisEligibiliteDto verifierEligibilite(CibleAvis cibleType, Long cibleId) {
        if (cibleType == null || cibleId == null) {
            throw new BadRequestException("cibleType et cibleId sont obligatoires.");
        }
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        if (caller == null || caller.userId() == null) {
            return AvisEligibiliteDto.builder()
                    .cibleType(cibleType)
                    .cibleId(cibleId)
                    .eligible(false)
                    .dejaEvalue(false)
                    .reservationsEligiblesIds(List.of())
                    .motifIneligibilite("Connectez-vous avec votre compte touriste pour déposer un avis vérifié.")
                    .build();
        }
        if (cibleType == CibleAvis.GUIDE && cibleId.equals(caller.userId())) {
            return AvisEligibiliteDto.builder()
                    .cibleType(cibleType)
                    .cibleId(cibleId)
                    .eligible(false)
                    .dejaEvalue(false)
                    .reservationsEligiblesIds(List.of())
                    .motifIneligibilite("Un guide ne peut pas évaluer son propre profil.")
                    .build();
        }

        List<Reservation> userReservations = reservationRepository.findByUtilisateurId(caller.userId());
        Map<Long, CircuitDto> circuitCache = new HashMap<>();
        Map<Long, EvenementDto> evenementCache = new HashMap<>();
        LocalDate today = LocalDate.now(Reservation.CASAMANCE_ZONE);

        List<Long> matchingConfirmed = userReservations.stream()
                .filter(r -> isReservationRealiseePourCible(r, cibleType, cibleId, today, circuitCache, evenementCache))
                .map(Reservation::getId)
                .toList();

        List<Long> unusedEligible = matchingConfirmed.stream()
                .filter(resId -> !avisRepository.existsByReservationIdAndCibleTypeAndCibleId(resId, cibleType, cibleId))
                .toList();

        boolean dejaEvalue = !matchingConfirmed.isEmpty() && unusedEligible.isEmpty();
        String motif = null;
        if (unusedEligible.isEmpty()) {
            motif = dejaEvalue
                    ? "Vous avez déjà publié un avis vérifié pour chacune de vos réservations réalisées sur cette expérience."
                    : "Une réservation confirmée et dont la date de prestation est passée est requise pour publier un avis vérifié.";
        }

        return AvisEligibiliteDto.builder()
                .cibleType(cibleType)
                .cibleId(cibleId)
                .eligible(!unusedEligible.isEmpty())
                .dejaEvalue(dejaEvalue)
                .reservationsEligiblesIds(unusedEligible)
                .motifIneligibilite(motif)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AvisDto> getMesAvis() {
        SecurityUserContext caller = requireAuthenticatedUser();
        return avisRepository.findByAuteurIdOrderByDatePublicationDescIdDesc(caller.userId()).stream()
                .map(this::toDetailedDto)
                .toList();
    }

    @Override
    public AvisDto creerAvis(AvisCreateRequest req) {
        SecurityUserContext caller = requireAuthenticatedUser();
        if (!caller.hasPermission("AVIS:CREER")) {
            throw new ForbiddenException("Accès interdit : votre rôle (" + caller.role() + ") ne permet pas de déposer un avis.");
        }
        if (req.getAuteurId() != null && !req.getAuteurId().equals(caller.userId())) {
            throw new ForbiddenException("Accès interdit : usurpation d'auteur détectée.");
        }
        if (req.getExperienceVerifiee() != null || (req.getStatutModeration() != null && !req.getStatutModeration().isBlank())) {
            throw new ForbiddenException("Accès interdit : les champs experienceVerifiee et statutModeration sont calculés exclusivement par le serveur.");
        }
        if (req.getNote() == null || req.getNote() < 1 || req.getNote() > 5) {
            throw new BadRequestException("La note doit être comprise entre 1 et 5.");
        }

        TargetResolution target = resolveTarget(req.getCibleType(), req.getCibleId(), caller);
        LocalDate today = LocalDate.now(Reservation.CASAMANCE_ZONE);
        Map<Long, CircuitDto> circuitCache = new HashMap<>();
        Map<Long, EvenementDto> evenementCache = new HashMap<>();

        Reservation chosenReservation;
        if (req.getReservationId() != null) {
            Reservation explicit = reservationRepository.findById(req.getReservationId())
                    .orElseThrow(() -> new BadRequestException("Réservation #" + req.getReservationId() + " introuvable."));
            if (!caller.userId().equals(explicit.getUtilisateurId())) {
                throw new ForbiddenException("Accès interdit (BOLA) : vous ne pouvez pas associer la réservation d'un autre utilisateur.");
            }
            if (explicit.getStatut() != StatutReservation.CONFIRMEE) {
                throw new ForbiddenException("Avis refusé : la réservation doit être au statut CONFIRMEE (statut actuel : " + explicit.getStatut() + ").");
            }
            if (!isDateRealisee(explicit, today, evenementCache)) {
                throw new ForbiddenException("Avis refusé : la prestation prévue le " + explicit.getDatePrestation() + " n'a pas encore été réalisée.");
            }
            if (!matchesTarget(explicit, req.getCibleType(), req.getCibleId(), circuitCache, evenementCache)) {
                throw new BadRequestException("La réservation #" + req.getReservationId() + " ne correspond pas à l'entité évaluée.");
            }
            if (avisRepository.existsByReservationIdAndCibleTypeAndCibleId(explicit.getId(), req.getCibleType(), req.getCibleId())) {
                throw new ConflictException("Vous avez déjà évalué cette expérience pour la réservation #" + explicit.getId() + ".");
            }
            chosenReservation = explicit;
        } else {
            List<Reservation> candidates = reservationRepository.findByUtilisateurId(caller.userId()).stream()
                    .filter(r -> isReservationRealiseePourCible(r, req.getCibleType(), req.getCibleId(), today, circuitCache, evenementCache))
                    .toList();
            if (candidates.isEmpty()) {
                throw new ForbiddenException("Avis refusé : aucune réservation confirmée et réalisée ne permet d'attester cette expérience.");
            }
            chosenReservation = candidates.stream()
                    .filter(r -> !avisRepository.existsByReservationIdAndCibleTypeAndCibleId(r.getId(), req.getCibleType(), req.getCibleId()))
                    .findFirst()
                    .orElseThrow(() -> new ConflictException("Vous avez déjà publié un avis vérifié pour cette expérience."));
        }

        LocalDateTime now = LocalDateTime.now(Reservation.CASAMANCE_ZONE);
        String auteurNom = (chosenReservation.getNomClient() != null && !chosenReservation.getNomClient().isBlank())
                ? chosenReservation.getNomClient().trim()
                : (caller.email() != null && !caller.email().isBlank() ? caller.email() : "Visiteur #" + caller.userId());

        Avis entity = Avis.builder()
                .auteurId(caller.userId())
                .auteurNom(auteurNom)
                .cibleType(req.getCibleType())
                .cibleId(req.getCibleId())
                .cibleNom(target.cibleNom())
                .reservationId(chosenReservation.getId())
                .note(req.getNote())
                .commentaire(req.getCommentaire().trim())
                .experienceVerifiee(true)
                .statutModeration(StatutModerationAvis.APPROUVE)
                .datePublication(now)
                .build();

        Avis saved;
        try {
            saved = avisRepository.saveAndFlush(entity);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("Un avis vérifié existe déjà pour cette réservation et cette cible.");
        }

        moderationHistoriqueRepository.save(AvisModerationHistorique.builder()
                .avisId(saved.getId())
                .ancienStatut(null)
                .nouveauStatut(StatutModerationAvis.APPROUVE)
                .acteurId(caller.userId())
                .acteurRole(caller.role())
                .justification("Publication vérifiée sur réservation confirmée #" + chosenReservation.getId())
                .correlationId("AVIS-PUB-" + saved.getId())
                .dateDecision(now)
                .build());

        // Notifier le guide si l'avis concerne directement un guide
        if (target.guideEmail() != null && target.guideUserId() != null && !target.guideUserId().equals(caller.userId())) {
            queueAndRelayNotification(
                    target.guideUserId(),
                    target.guideEmail(),
                    "Nouvel avis vérifié reçu (" + saved.getNote() + "/5)",
                    "Un visiteur (" + saved.getAuteurNom() + ") vient de publier un avis vérifié (" + saved.getNote()
                            + "/5) concernant votre profil de guide : « " + truncate(saved.getCommentaire(), 180) + " ».",
                    chosenReservation.getId(),
                    "AVIS_PUBLIE",
                    "AVIS",
                    saved.getId(),
                    "AVIS-PUB-" + saved.getId(),
                    "AVIS:" + saved.getId() + ":PUBLIE:GUIDE"
            );
        }

        return toDetailedDto(saved);
    }

    @Override
    public AvisDto modifierAvis(Long id, AvisUpdateRequest req) {
        SecurityUserContext caller = requireAuthenticatedUser();
        if (!caller.hasPermission("AVIS:MODIFIER_PROPRE")) {
            throw new ForbiddenException("Accès interdit : permission AVIS:MODIFIER_PROPRE requise.");
        }
        Avis avis = findAvisOrThrow(id);
        if (!caller.userId().equals(avis.getAuteurId())) {
            throw new ForbiddenException("Accès interdit (BOLA) : vous ne pouvez modifier que vos propres avis.");
        }
        if (avis.getStatutModeration() == StatutModerationAvis.REJETE) {
            throw new ConflictException("Un avis définitivement rejeté par la modération ne peut plus être modifié.");
        }
        if (req.getNote() == null || req.getNote() < 1 || req.getNote() > 5) {
            throw new BadRequestException("La note doit être comprise entre 1 et 5.");
        }

        LocalDateTime now = LocalDateTime.now(Reservation.CASAMANCE_ZONE);
        StatutModerationAvis previous = avis.getStatutModeration();
        avis.setNote(req.getNote());
        avis.setCommentaire(req.getCommentaire().trim());
        avis.setDateModification(now);

        if (previous == StatutModerationAvis.MASQUE) {
            avis.setStatutModeration(StatutModerationAvis.EN_ATTENTE);
            moderationHistoriqueRepository.save(AvisModerationHistorique.builder()
                    .avisId(avis.getId())
                    .ancienStatut(previous)
                    .nouveauStatut(StatutModerationAvis.EN_ATTENTE)
                    .acteurId(caller.userId())
                    .acteurRole(caller.role())
                    .justification("Avis masqué modifié par son auteur : soumis à réexamen de modération.")
                    .correlationId("AVIS-EDIT-" + avis.getId())
                    .dateDecision(now)
                    .build());
        }

        return toDetailedDto(avisRepository.save(avis));
    }

    @Override
    public void supprimerAvis(Long id) {
        SecurityUserContext caller = requireAuthenticatedUser();
        if (!caller.hasPermission("AVIS:SUPPRIMER_PROPRE")) {
            throw new ForbiddenException("Accès interdit : permission AVIS:SUPPRIMER_PROPRE requise.");
        }
        Avis avis = findAvisOrThrow(id);
        if (!caller.userId().equals(avis.getAuteurId())) {
            throw new ForbiddenException("Accès interdit (BOLA) : vous ne pouvez supprimer que vos propres avis.");
        }
        avisRepository.delete(avis);
    }

    @Override
    public AvisDto repondreAvis(Long id, com.uasz.ms_reservation.dto.AvisReponseGuideRequest req) {
        if (req == null || req.getReponse() == null || req.getReponse().isBlank()) {
            throw new BadRequestException("La réponse ne peut pas être vide.");
        }
        SecurityUserContext caller = requireAuthenticatedUser();
        Avis avis = findAvisOrThrow(id);

        boolean isStaff = caller.hasPermission("AVIS:MODERER") || "ADMINISTRATEUR".equals(caller.role());
        boolean isGuideEligible = false;

        if ("GUIDE".equals(caller.role())) {
            if (avis.getCibleType() == CibleAvis.CIRCUIT) {
                try {
                    CircuitDto circuit = circuitClient.getCircuitById(avis.getCibleId());
                    if (circuit != null && Objects.equals(circuit.getGuideResponsableId(), caller.userId())) {
                        isGuideEligible = true;
                    }
                } catch (Exception ex) {
                    log.warn("Impossible de vérifier le circuit {} pour le droit de réponse : {}", avis.getCibleId(), ex.getMessage());
                }
            } else if (avis.getCibleType() == CibleAvis.GUIDE) {
                if (Objects.equals(avis.getCibleId(), caller.userId())) {
                    isGuideEligible = true;
                }
            }
        }

        if (!isStaff && !isGuideEligible) {
            throw new ForbiddenException("Accès interdit (BOLA) : vous n'êtes pas autorisé à apporter un droit de réponse à cet avis.");
        }

        String rep = req.getReponse().trim();
        if (rep.length() > 2000) {
            throw new BadRequestException("La réponse ne peut pas dépasser 2000 caractères.");
        }

        avis.setReponseGuide(rep);
        avis.setDateReponseGuide(LocalDateTime.now(Reservation.CASAMANCE_ZONE));
        avis.setGuideRepondeurId(caller.userId());
        avis.setGuideRepondeurNom(caller.email() != null && !caller.email().isBlank()
                ? caller.email()
                : "Guide officiel Casamance");

        Avis updated = avisRepository.save(avis);
        return toDetailedDto(updated);
    }

    @Override
    public SignalementDto signalerAvis(Long avisId, SignalementCreateRequest req) {
        SecurityUserContext caller = requireAuthenticatedUser();
        if (!caller.hasPermission("AVIS:SIGNALER")) {
            throw new ForbiddenException("Accès interdit : permission AVIS:SIGNALER requise.");
        }
        Avis avis = findAvisOrThrow(avisId);
        if (caller.userId().equals(avis.getAuteurId())) {
            throw new BadRequestException("Vous ne pouvez pas signaler votre propre avis (vous pouvez le modifier ou le supprimer).");
        }
        if (avis.getStatutModeration() == StatutModerationAvis.REJETE) {
            throw new ConflictException("Cet avis a déjà été rejeté par la modération.");
        }
        if (signalementRepository.existsByAvisIdAndSignaleParIdAndStatut(avisId, caller.userId(), StatutSignalement.OUVERT)) {
            throw new ConflictException("Vous avez déjà un signalement ouvert en cours d'examen sur cet avis.");
        }

        AvisSignalement saved = signalementRepository.save(AvisSignalement.builder()
                .avisId(avisId)
                .signaleParId(caller.userId())
                .signaleParNom(caller.email() != null && !caller.email().isBlank() ? caller.email() : "Utilisateur #" + caller.userId())
                .categorie(req.getCategorie() != null ? req.getCategorie() : CategorieSignalement.CONTENU_INAPPROPRIE)
                .motif(req.getMotif().trim())
                .statut(StatutSignalement.OUVERT)
                .dateSignalement(LocalDateTime.now(Reservation.CASAMANCE_ZONE))
                .build());

        return toSignalementDto(saved, avis);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AvisDto> getAvisModeration(CibleAvis cibleType, StatutModerationAvis statut) {
        requireModeratorPermission();
        return avisRepository.findAllAdminFiltered(cibleType, statut).stream()
                .map(this::toDetailedDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SignalementDto> getSignalementsModeration(StatutSignalement statut) {
        requireModeratorPermission();
        List<AvisSignalement> list = statut != null
                ? signalementRepository.findByStatutOrderByDateSignalementDescIdDesc(statut)
                : signalementRepository.findAllByOrderByDateSignalementDescIdDesc();
        return list.stream()
                .map(s -> toSignalementDto(s, avisRepository.findById(s.getAvisId()).orElse(null)))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AvisModerationHistoriqueDto> getHistoriqueModeration(Long avisId) {
        SecurityUserContext caller = requireAuthenticatedUser();
        Avis avis = findAvisOrThrow(avisId);
        boolean isOwner = caller.userId().equals(avis.getAuteurId());
        if (!isOwner && !caller.hasPermission("AVIS:MODERER")) {
            throw new ForbiddenException("Accès interdit : permission AVIS:MODERER requise.");
        }
        return moderationHistoriqueRepository.findByAvisIdOrderByDateDecisionDescIdDesc(avisId).stream()
                .map(this::toHistoriqueDto)
                .toList();
    }

    @Override
    public AvisDto deciderModerationAvis(Long avisId, ModerationDecisionRequest req) {
        SecurityUserContext caller = requireModeratorPermission();
        Avis avis = findAvisOrThrow(avisId);
        if (caller.userId().equals(avis.getAuteurId())) {
            throw new ForbiddenException("Un modérateur ne peut pas modérer son propre avis.");
        }

        StatutModerationAvis current = avis.getStatutModeration();
        StatutModerationAvis target = req.getDecision();
        validateModerationTransition(current, target);

        LocalDateTime now = LocalDateTime.now(Reservation.CASAMANCE_ZONE);
        String justification = req.getJustification().trim();
        String corrId = "MOD-AVIS-" + avisId + "-" + UUID.randomUUID().toString().substring(0, 8);

        avis.setStatutModeration(target);
        avis.setMotifModeration(justification);
        avis.setModereParId(caller.userId());
        avis.setDateModeration(now);
        Avis saved = avisRepository.save(avis);

        moderationHistoriqueRepository.save(AvisModerationHistorique.builder()
                .avisId(avisId)
                .ancienStatut(current)
                .nouveauStatut(target)
                .acteurId(caller.userId())
                .acteurRole(caller.role())
                .justification(justification)
                .correlationId(corrId)
                .dateDecision(now)
                .build());

        // Cohérence automatique avec d'éventuels signalements ouverts sur cet avis
        if (target == StatutModerationAvis.MASQUE || target == StatutModerationAvis.REJETE || target == StatutModerationAvis.APPROUVE) {
            StatutSignalement autoResolution = (target == StatutModerationAvis.APPROUVE)
                    ? StatutSignalement.REJETE_ABUSIF
                    : StatutSignalement.VALIDE_CONTENU_RETIRE;
            List<AvisSignalement> openFlags = signalementRepository.findByAvisIdAndStatut(avisId, StatutSignalement.OUVERT);
            for (AvisSignalement flag : openFlags) {
                flag.setStatut(autoResolution);
                flag.setDecisionCommentaire("Décision globale modération (" + target + ") : " + justification);
                flag.setTraiteParId(caller.userId());
                flag.setDateResolution(now);
                signalementRepository.save(flag);
                notifyReporterOutcome(flag, avis, corrId);
            }
        }

        notifyAuthorModerationOutcome(saved, justification, corrId);
        return toDetailedDto(saved);
    }

    @Override
    public SignalementDto traiterSignalement(Long signalementId, SignalementDecisionRequest req) {
        SecurityUserContext caller = requireModeratorPermission();
        AvisSignalement signalement = signalementRepository.findById(signalementId)
                .orElseThrow(() -> new ResourceNotFoundException("Signalement #" + signalementId + " introuvable."));

        if (signalement.getStatut() != StatutSignalement.OUVERT) {
            throw new ConflictException("Ce signalement a déjà été traité (statut : " + signalement.getStatut() + ").");
        }
        if (caller.userId().equals(signalement.getSignaleParId())) {
            throw new ForbiddenException("Vous ne pouvez pas statuer sur un signalement que vous avez vous-même soumis.");
        }

        Avis avis = findAvisOrThrow(signalement.getAvisId());
        if (caller.userId().equals(avis.getAuteurId())) {
            throw new ForbiddenException("Un modérateur ne peut pas traiter un signalement visant son propre avis.");
        }

        StatutSignalement decisionFlag = req.getDecisionSignalement();
        if (decisionFlag == StatutSignalement.OUVERT) {
            throw new BadRequestException("La décision doit clôturer le signalement (VALIDE_CONTENU_RETIRE ou REJETE_ABUSIF).");
        }

        LocalDateTime now = LocalDateTime.now(Reservation.CASAMANCE_ZONE);
        String comment = req.getCommentaire().trim();
        String corrId = "MOD-FLAG-" + signalementId + "-" + UUID.randomUUID().toString().substring(0, 8);

        if (decisionFlag == StatutSignalement.VALIDE_CONTENU_RETIRE) {
            StatutModerationAvis cibleAvis = req.getStatutAvisCible() != null
                    ? req.getStatutAvisCible()
                    : StatutModerationAvis.MASQUE;
            if (cibleAvis != StatutModerationAvis.MASQUE && cibleAvis != StatutModerationAvis.REJETE) {
                throw new BadRequestException("Lorsque le signalement est validé, l'avis doit passer à MASQUE ou REJETE.");
            }
            if (avis.getStatutModeration() != cibleAvis) {
                validateModerationTransition(avis.getStatutModeration(), cibleAvis);
                StatutModerationAvis previous = avis.getStatutModeration();
                avis.setStatutModeration(cibleAvis);
                avis.setMotifModeration(comment);
                avis.setModereParId(caller.userId());
                avis.setDateModeration(now);
                avis = avisRepository.save(avis);

                moderationHistoriqueRepository.save(AvisModerationHistorique.builder()
                        .avisId(avis.getId())
                        .signalementId(signalementId)
                        .ancienStatut(previous)
                        .nouveauStatut(cibleAvis)
                        .acteurId(caller.userId())
                        .acteurRole(caller.role())
                        .justification("Suite signalement #" + signalementId + " : " + comment)
                        .correlationId(corrId)
                        .dateDecision(now)
                        .build());

                notifyAuthorModerationOutcome(avis, comment, corrId);
            }
        }

        signalement.setStatut(decisionFlag);
        signalement.setDecisionCommentaire(comment);
        signalement.setTraiteParId(caller.userId());
        signalement.setDateResolution(now);
        AvisSignalement savedFlag = signalementRepository.save(signalement);

        notifyReporterOutcome(savedFlag, avis, corrId);
        return toSignalementDto(savedFlag, avis);
    }

    private void validateModerationTransition(StatutModerationAvis current, StatutModerationAvis target) {
        if (target == null) {
            throw new BadRequestException("La décision de modération est obligatoire.");
        }
        if (current == target) {
            throw new ConflictException("Décision redondante refusée : l'avis est déjà au statut " + current + ".");
        }
        if (current == StatutModerationAvis.REJETE) {
            throw new ConflictException("Un avis définitivement REJETE ne peut plus changer de statut.");
        }
        if (target == StatutModerationAvis.EN_ATTENTE) {
            throw new BadRequestException("Un modérateur doit trancher vers APPROUVE, MASQUE ou REJETE.");
        }
    }

    private void notifyAuthorModerationOutcome(Avis avis, String motif, String corrId) {
        Reservation res = reservationRepository.findById(avis.getReservationId()).orElse(null);
        String email = res != null && res.getEmailClient() != null ? res.getEmailClient() : null;
        if (email == null || email.isBlank()) {
            return;
        }
        String sujet = "Décision de modération sur votre avis (#" + avis.getId() + ")";
        String contenu = "Votre avis publié sur " + avis.getCibleType() + " #" + avis.getCibleId()
                + " est désormais au statut " + avis.getStatutModeration() + ". Justification : " + motif;
        queueAndRelayNotification(
                avis.getAuteurId(), email, sujet, contenu, avis.getReservationId(),
                "AVIS_MODERE", "AVIS", avis.getId(), corrId,
                "AVIS:" + avis.getId() + ":MODERE:" + avis.getStatutModeration() + ":" + corrId
        );
    }

    private void notifyReporterOutcome(AvisSignalement flag, Avis avis, String corrId) {
        String recipient = flag.getSignaleParNom();
        if (recipient == null || !recipient.contains("@")) {
            return;
        }
        String sujet = "Traitement de votre signalement (#" + flag.getId() + ")";
        String contenu = "Votre signalement concernant l'avis #" + flag.getAvisId()
                + " a été examiné avec la décision : " + flag.getStatut()
                + ". Commentaire : " + flag.getDecisionCommentaire();
        queueAndRelayNotification(
                flag.getSignaleParId(), recipient, sujet, contenu,
                avis != null ? avis.getReservationId() : null,
                "SIGNALEMENT_TRAITE", "SIGNALEMENT", flag.getId(), corrId,
                "SIGNALEMENT:" + flag.getId() + ":TRAITE:" + corrId
        );
    }

    private void queueAndRelayNotification(
            Long userId,
            String email,
            String sujet,
            String contenu,
            Long reservationId,
            String eventType,
            String cibleType,
            Long cibleId,
            String corrId,
            String idemKey
    ) {
        if (notificationOutboxRepository == null || email == null || email.isBlank()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now(Reservation.CASAMANCE_ZONE);
        ReservationNotificationOutbox saved = notificationOutboxRepository.save(ReservationNotificationOutbox.builder()
                .eventId(UUID.randomUUID().toString())
                .correlationId(corrId)
                .utilisateurId(userId)
                .destinataire(email)
                .sujet(sujet)
                .contenu(contenu)
                .reservationId(reservationId)
                .typeEvenement(eventType)
                .cibleType(cibleType)
                .cibleId(cibleId)
                .idempotencyKey(idemKey)
                .statut(StatutOutbox.EN_ATTENTE)
                .prochaineTentativeAt(now)
                .createdAt(now)
                .build());

        if (notificationOutboxRelayService != null) {
            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCommit() {
                        notificationOutboxRelayService.tenterLivraison(saved.getId());
                    }
                });
            } else {
                notificationOutboxRelayService.tenterLivraison(saved.getId());
            }
        }
    }

    private boolean isReservationRealiseePourCible(
            Reservation r,
            CibleAvis cibleType,
            Long cibleId,
            LocalDate today,
            Map<Long, CircuitDto> circuitCache,
            Map<Long, EvenementDto> evenementCache
    ) {
        if (r.getStatut() != StatutReservation.CONFIRMEE) {
            return false;
        }
        if (!isDateRealisee(r, today, evenementCache)) {
            return false;
        }
        return matchesTarget(r, cibleType, cibleId, circuitCache, evenementCache);
    }

    private boolean isDateRealisee(Reservation r, LocalDate today, Map<Long, EvenementDto> evenementCache) {
        if (r.getDatePrestation() != null && !r.getDatePrestation().isAfter(today)) {
            return true;
        }
        if (r.getTypeReservation() == TypeReservation.EVENEMENT && r.getEvenementId() != null) {
            EvenementDto ev = loadEvenementSafe(r.getEvenementId(), evenementCache);
            if (ev != null) {
                if ("TERMINE".equalsIgnoreCase(ev.getStatutEvenement())) {
                    return true;
                }
                if (ev.getDateFin() != null && !ev.getDateFin().toLocalDate().isAfter(today)) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean matchesTarget(
            Reservation r,
            CibleAvis cibleType,
            Long cibleId,
            Map<Long, CircuitDto> circuitCache,
            Map<Long, EvenementDto> evenementCache
    ) {
        return switch (cibleType) {
            case CIRCUIT -> r.getTypeReservation() == TypeReservation.CIRCUIT && cibleId.equals(r.getCircuitId());
            case EVENEMENT -> r.getTypeReservation() == TypeReservation.EVENEMENT && cibleId.equals(r.getEvenementId());
            case GUIDE -> {
                if (r.getTypeReservation() != TypeReservation.CIRCUIT || r.getCircuitId() == null) {
                    yield false;
                }
                CircuitDto c = loadCircuitSafe(r.getCircuitId(), circuitCache);
                yield c != null && cibleId.equals(c.getGuideResponsableId());
            }
            case PATRIMOINE -> {
                if (r.getTypeReservation() == TypeReservation.CIRCUIT && r.getCircuitId() != null) {
                    CircuitDto c = loadCircuitSafe(r.getCircuitId(), circuitCache);
                    yield c != null && c.getEtapes() != null
                            && c.getEtapes().stream().anyMatch(e -> cibleId.equals(e.getPatrimoineId()));
                }
                if (r.getTypeReservation() == TypeReservation.EVENEMENT && r.getEvenementId() != null) {
                    EvenementDto ev = loadEvenementSafe(r.getEvenementId(), evenementCache);
                    yield ev != null && cibleId.equals(ev.getPatrimoineId());
                }
                yield false;
            }
        };
    }

    private CircuitDto loadCircuitSafe(Long circuitId, Map<Long, CircuitDto> cache) {
        if (circuitId == null || circuitClient == null) return null;
        if (cache.containsKey(circuitId)) return cache.get(circuitId);
        try {
            CircuitDto dto = circuitClient.getCircuitById(circuitId);
            cache.put(circuitId, dto);
            return dto;
        } catch (FeignException ex) {
            log.debug("Circuit #{} inaccessible lors du contrôle d'éligibilité : {}", circuitId, ex.getMessage());
            cache.put(circuitId, null);
            return null;
        }
    }

    private EvenementDto loadEvenementSafe(Long evenementId, Map<Long, EvenementDto> cache) {
        if (evenementId == null || evenementClient == null) return null;
        if (cache.containsKey(evenementId)) return cache.get(evenementId);
        try {
            EvenementDto dto = evenementClient.getEvenementById(evenementId);
            cache.put(evenementId, dto);
            return dto;
        } catch (FeignException ex) {
            log.debug("Événement #{} inaccessible lors du contrôle d'éligibilité : {}", evenementId, ex.getMessage());
            cache.put(evenementId, null);
            return null;
        }
    }

    private TargetResolution resolveTarget(CibleAvis type, Long id, SecurityUserContext caller) {
        return switch (type) {
            case CIRCUIT -> {
                try {
                    CircuitDto c = circuitClient.getCircuitById(id);
                    if (c == null) throw new ResourceNotFoundException("Circuit #" + id + " introuvable.");
                    if (caller.userId().equals(c.getGuideResponsableId())) {
                        throw new ForbiddenException("Un guide ne peut pas évaluer un circuit dont il est responsable.");
                    }
                    yield new TargetResolution(c.getNomCircuit(), c.getGuideResponsableId(), null);
                } catch (FeignException.NotFound ex) {
                    throw new ResourceNotFoundException("Circuit #" + id + " introuvable.");
                } catch (FeignException ex) {
                    throw new ServiceIndisponibleException("ms-circuit indisponible pour vérifier la cible de l'avis.");
                }
            }
            case EVENEMENT -> {
                try {
                    EvenementDto e = evenementClient.getEvenementById(id);
                    if (e == null) throw new ResourceNotFoundException("Événement #" + id + " introuvable.");
                    yield new TargetResolution(e.getNomEvenement(), null, null);
                } catch (FeignException.NotFound ex) {
                    throw new ResourceNotFoundException("Événement #" + id + " introuvable.");
                } catch (FeignException ex) {
                    throw new ServiceIndisponibleException("ms-evenement indisponible pour vérifier la cible de l'avis.");
                }
            }
            case GUIDE -> {
                if (caller.userId().equals(id)) {
                    throw new ForbiddenException("Un guide ne peut pas évaluer son propre profil.");
                }
                if (utilisateurGuideClient == null) {
                    yield new TargetResolution("Guide #" + id, id, null);
                }
                try {
                    GuideVerificationDto g = utilisateurGuideClient.verifierGuide(id);
                    if (g == null || !"GUIDE".equalsIgnoreCase(g.getRole())) {
                        throw new ResourceNotFoundException("Guide touristique #" + id + " introuvable.");
                    }
                    yield new TargetResolution(g.getNomComplet(), g.getUtilisateurId(), g.getEmail());
                } catch (FeignException.NotFound ex) {
                    throw new ResourceNotFoundException("Guide #" + id + " introuvable.");
                } catch (FeignException ex) {
                    throw new ServiceIndisponibleException("ms-utilisateur indisponible pour vérifier le guide évalué.");
                }
            }
            case PATRIMOINE -> {
                if (patrimoineClient == null) {
                    yield new TargetResolution("Site patrimonial #" + id, null, null);
                }
                try {
                    PatrimoineDto p = patrimoineClient.getPatrimoineById(id);
                    if (p == null) throw new ResourceNotFoundException("Patrimoine #" + id + " introuvable.");
                    yield new TargetResolution(p.getNomPatrimoine(), null, null);
                } catch (FeignException.NotFound ex) {
                    throw new ResourceNotFoundException("Patrimoine #" + id + " introuvable.");
                } catch (FeignException ex) {
                    throw new ServiceIndisponibleException("ms-patrimoine indisponible pour vérifier le site évalué.");
                }
            }
        };
    }

    private record TargetResolution(String cibleNom, Long guideUserId, String guideEmail) {}

    private AvisResumeDto buildResume(CibleAvis cibleType, Long cibleId, List<Avis> approved) {
        Map<Integer, Long> dist = new LinkedHashMap<>();
        for (int note = 5; note >= 1; note--) {
            dist.put(note, 0L);
        }
        long sum = 0L;
        for (Avis a : approved) {
            sum += a.getNote();
            dist.computeIfPresent(a.getNote(), (k, v) -> v + 1L);
        }
        long count = approved.size();
        double avg = count > 0 ? Math.round(((double) sum / count) * 100.0) / 100.0 : 0.0;
        return AvisResumeDto.builder()
                .cibleType(cibleType)
                .cibleId(cibleId)
                .noteMoyenne(avg)
                .totalAvis(count)
                .repartition(dist)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public com.uasz.ms_reservation.dto.ModerationStatsDto getStatistiques() {
        requireModeratorPermission();
        List<Avis> avisList = avisRepository.findAll();
        List<AvisSignalement> signalements = signalementRepository.findAll();

        long approuves = 0L;
        long enAttente = 0L;
        long masques = 0L;
        long rejetes = 0L;
        long sumNotes = 0L;
        Map<String, Long> avisParCible = new LinkedHashMap<>();

        for (Avis a : avisList) {
            StatutModerationAvis st = a.getStatutModeration() != null ? a.getStatutModeration() : StatutModerationAvis.APPROUVE;
            switch (st) {
                case APPROUVE -> {
                    approuves++;
                    sumNotes += a.getNote();
                }
                case EN_ATTENTE -> enAttente++;
                case MASQUE -> masques++;
                case REJETE -> rejetes++;
            }
            String cible = a.getCibleType() != null ? a.getCibleType().name() : "AUTRE";
            avisParCible.merge(cible, 1L, Long::sum);
        }

        long sigOuverts = 0L;
        long sigFondes = 0L;
        long sigRejetes = 0L;
        for (AvisSignalement s : signalements) {
            StatutSignalement st = s.getStatut() != null ? s.getStatut() : StatutSignalement.OUVERT;
            switch (st) {
                case OUVERT -> sigOuverts++;
                case VALIDE_CONTENU_RETIRE -> sigFondes++;
                case REJETE_ABUSIF -> sigRejetes++;
            }
        }

        double noteMoy = approuves > 0 ? Math.round(((double) sumNotes / approuves) * 100.0) / 100.0 : 0.0;
        return com.uasz.ms_reservation.dto.ModerationStatsDto.builder()
                .totalAvis(avisList.size())
                .approuves(approuves)
                .enAttente(enAttente)
                .masques(masques)
                .rejetes(rejetes)
                .noteMoyenneApprouves(noteMoy)
                .totalSignalements(signalements.size())
                .signalementsOuverts(sigOuverts)
                .signalementsFondes(sigFondes)
                .signalementsRejetes(sigRejetes)
                .avisParCible(avisParCible)
                .build();
    }

    private AvisDto toPublicDto(Avis a) {
        return AvisDto.builder()
                .id(a.getId())
                .auteurId(a.getAuteurId())
                .auteurNom(a.getAuteurNom())
                .cibleType(a.getCibleType())
                .cibleId(a.getCibleId())
                .cibleNom(a.getCibleNom())
                .note(a.getNote())
                .commentaire(a.getCommentaire())
                .experienceVerifiee(a.isExperienceVerifiee())
                .statutModeration(a.getStatutModeration())
                .datePublication(a.getDatePublication())
                .dateModification(a.getDateModification())
                .reponseGuide(a.getReponseGuide())
                .dateReponseGuide(a.getDateReponseGuide())
                .guideRepondeurId(a.getGuideRepondeurId())
                .guideRepondeurNom(a.getGuideRepondeurNom())
                .build();
    }

    private AvisDto toDetailedDto(Avis a) {
        return AvisDto.builder()
                .id(a.getId())
                .auteurId(a.getAuteurId())
                .auteurNom(a.getAuteurNom())
                .cibleType(a.getCibleType())
                .cibleId(a.getCibleId())
                .cibleNom(a.getCibleNom())
                .reservationId(a.getReservationId())
                .note(a.getNote())
                .commentaire(a.getCommentaire())
                .experienceVerifiee(a.isExperienceVerifiee())
                .statutModeration(a.getStatutModeration())
                .motifModeration(a.getMotifModeration())
                .modereParId(a.getModereParId())
                .datePublication(a.getDatePublication())
                .dateModification(a.getDateModification())
                .dateModeration(a.getDateModeration())
                .reponseGuide(a.getReponseGuide())
                .dateReponseGuide(a.getDateReponseGuide())
                .guideRepondeurId(a.getGuideRepondeurId())
                .guideRepondeurNom(a.getGuideRepondeurNom())
                .build();
    }

    private SignalementDto toSignalementDto(AvisSignalement s, Avis avis) {
        return SignalementDto.builder()
                .id(s.getId())
                .avisId(s.getAvisId())
                .signaleParId(s.getSignaleParId())
                .signaleParNom(s.getSignaleParNom())
                .categorie(s.getCategorie())
                .motif(s.getMotif())
                .statut(s.getStatut())
                .decisionCommentaire(s.getDecisionCommentaire())
                .traiteParId(s.getTraiteParId())
                .dateSignalement(s.getDateSignalement())
                .dateResolution(s.getDateResolution())
                .avis(avis != null ? toDetailedDto(avis) : null)
                .avisStatutActuel(avis != null ? avis.getStatutModeration() : null)
                .build();
    }

    private AvisModerationHistoriqueDto toHistoriqueDto(AvisModerationHistorique h) {
        return AvisModerationHistoriqueDto.builder()
                .id(h.getId())
                .avisId(h.getAvisId())
                .signalementId(h.getSignalementId())
                .ancienStatut(h.getAncienStatut())
                .nouveauStatut(h.getNouveauStatut())
                .acteurId(h.getActeurId())
                .acteurRole(h.getActeurRole())
                .justification(h.getJustification())
                .correlationId(h.getCorrelationId())
                .dateDecision(h.getDateDecision())
                .build();
    }

    private Avis findAvisOrThrow(Long id) {
        return avisRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Avis introuvable avec l'id : " + id));
    }

    private SecurityUserContext requireAuthenticatedUser() {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        if (caller == null || caller.userId() == null) {
            throw new UnauthorizedException("Authentification requise.");
        }
        return caller;
    }

    private SecurityUserContext requireModeratorPermission() {
        SecurityUserContext caller = requireAuthenticatedUser();
        if (!caller.hasPermission("AVIS:MODERER")) {
            throw new ForbiddenException("Accès interdit : permission AVIS:MODERER requise pour les opérations de modération.");
        }
        return caller;
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }
}
