package com.uasz.ms_paiement.services;

import com.uasz.ms_paiement.clients.NotificationClient;
import com.uasz.ms_paiement.clients.ReservationClient;
import com.uasz.ms_paiement.dto.NotificationRequest;
import com.uasz.ms_paiement.dto.PageResponseDto;
import com.uasz.ms_paiement.dto.PaiementDto;
import com.uasz.ms_paiement.dto.PaiementStatsDto;
import com.uasz.ms_paiement.dto.ReservationDto;
import com.uasz.ms_paiement.dto.SimulationPaiementRequest;
import com.uasz.ms_paiement.entities.ModePaiement;
import com.uasz.ms_paiement.entities.Paiement;
import com.uasz.ms_paiement.entities.PaiementHistorique;
import com.uasz.ms_paiement.entities.PaiementOutbox;
import com.uasz.ms_paiement.entities.StatutOutbox;
import com.uasz.ms_paiement.entities.StatutPaiement;
import com.uasz.ms_paiement.exceptions.BadRequestException;
import com.uasz.ms_paiement.exceptions.ConflictException;
import com.uasz.ms_paiement.exceptions.ForbiddenException;
import com.uasz.ms_paiement.exceptions.ResourceNotFoundException;
import com.uasz.ms_paiement.exceptions.ServiceIndisponibleException;
import com.uasz.ms_paiement.exceptions.UnauthorizedException;
import com.uasz.ms_paiement.mappers.PaiementMapper;
import com.uasz.ms_paiement.repositories.PaiementOutboxRepository;
import com.uasz.ms_paiement.repositories.PaiementRepository;
import com.uasz.ms_paiement.security.SecurityUserContext;
import com.uasz.ms_paiement.security.SecurityUserContextHolder;
import feign.FeignException;
import jakarta.persistence.criteria.Predicate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;

@Slf4j
@Service
@Transactional
public class PaiementService implements IPaiementService {

    private static final String DEVISE_XOF = "XOF";
    private static final int MAX_PAGE_SIZE = 50;
    private static final DateTimeFormatter REF_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final Map<StatutPaiement, Set<StatutPaiement>> ALLOWED_TRANSITIONS = buildTransitions();

    private final PaiementRepository paiementRepository;
    private final PaiementOutboxRepository outboxRepository;
    private final PaiementMapper paiementMapper;
    private final ReservationClient reservationClient;
    private final NotificationClient notificationClient;
    private final SimulatedMobileMoneyProvider mobileMoneyProvider;
    private final PaiementOutboxRelayService outboxRelayService;
    private final PlatformTransactionManager transactionManager;

    @Value("${paiement.expiration-minutes:15}")
    private int paiementExpirationMinutes = 15;

    public PaiementService(
            PaiementRepository paiementRepository,
            PaiementOutboxRepository outboxRepository,
            PaiementMapper paiementMapper,
            ReservationClient reservationClient,
            NotificationClient notificationClient,
            SimulatedMobileMoneyProvider mobileMoneyProvider,
            PaiementOutboxRelayService outboxRelayService
    ) {
        this(paiementRepository, outboxRepository, paiementMapper, reservationClient,
                notificationClient, mobileMoneyProvider, outboxRelayService, null);
    }

    @Autowired
    public PaiementService(
            PaiementRepository paiementRepository,
            PaiementOutboxRepository outboxRepository,
            PaiementMapper paiementMapper,
            ReservationClient reservationClient,
            @Autowired(required = false) NotificationClient notificationClient,
            SimulatedMobileMoneyProvider mobileMoneyProvider,
            PaiementOutboxRelayService outboxRelayService,
            @Autowired(required = false) PlatformTransactionManager transactionManager
    ) {
        this.paiementRepository = paiementRepository;
        this.outboxRepository = outboxRepository;
        this.paiementMapper = paiementMapper;
        this.reservationClient = reservationClient;
        this.notificationClient = notificationClient;
        this.mobileMoneyProvider = mobileMoneyProvider;
        this.outboxRelayService = outboxRelayService;
        this.transactionManager = transactionManager;
    }

    private static Map<StatutPaiement, Set<StatutPaiement>> buildTransitions() {
        EnumMap<StatutPaiement, Set<StatutPaiement>> map = new EnumMap<>(StatutPaiement.class);
        map.put(StatutPaiement.INITIE, EnumSet.of(StatutPaiement.EN_COURS, StatutPaiement.ANNULE, StatutPaiement.EXPIRE));
        map.put(StatutPaiement.EN_COURS, EnumSet.of(StatutPaiement.ACCEPTE, StatutPaiement.REFUSE, StatutPaiement.EXPIRE, StatutPaiement.ANNULE));
        map.put(StatutPaiement.ACCEPTE, EnumSet.of(StatutPaiement.REMBOURSE));
        map.put(StatutPaiement.REFUSE, EnumSet.noneOf(StatutPaiement.class));
        map.put(StatutPaiement.EXPIRE, EnumSet.noneOf(StatutPaiement.class));
        map.put(StatutPaiement.ANNULE, EnumSet.noneOf(StatutPaiement.class));
        map.put(StatutPaiement.REMBOURSE, EnumSet.noneOf(StatutPaiement.class));
        return map;
    }

    @Override
    public PaiementDto effectuerPaiement(PaiementDto dto, String idempotencyKeyHeader) {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        if (!caller.hasPermission("PAIEMENT:INITIER")) {
            throw new ForbiddenException("Accès interdit : votre rôle (" + caller.role() + ") ne possède pas la permission PAIEMENT:INITIER.");
        }
        if (dto == null || dto.getReservationId() == null || dto.getModePaiement() == null) {
            throw new BadRequestException("Les champs reservationId et modePaiement (WAVE ou ORANGE_MONEY) sont obligatoires.");
        }
        if (dto.getStatut() == StatutPaiement.ACCEPTE || dto.getStatut() == StatutPaiement.REMBOURSE) {
            throw new ForbiddenException("Accès interdit : le statut '" + dto.getStatut() + "' ne peut pas être imposé par le client.");
        }
        validerDevise(dto.getDevise());

        String normalizedKey = normalizeKey(idempotencyKeyHeader != null ? idempotencyKeyHeader : dto.getIdempotencyKey());
        if (normalizedKey != null) {
            Optional<Paiement> existingIdem = paiementRepository.findByUtilisateurIdAndIdempotencyKey(caller.userId(), normalizedKey);
            if (existingIdem.isPresent()) {
                return handleIdempotentReplay(existingIdem.get(), dto);
            }
        }

        if (paiementRepository.existsByReservationIdAndStatutIn(dto.getReservationId(), List.of(StatutPaiement.ACCEPTE))) {
            throw new ConflictException("La réservation " + dto.getReservationId() + " a déjà fait l'objet d'un paiement accepté.");
        }

        ReservationDto reservation = recupererReservation(dto.getReservationId());
        verifyReservationOwnership(caller, reservation);
        validerReservationPayable(reservation);

        LocalDateTime now = LocalDateTime.now(Paiement.CASAMANCE_ZONE);
        expirerTentativesObsolètesPourReservation(dto.getReservationId(), now);

        if (paiementRepository.existsByReservationIdAndStatutIn(dto.getReservationId(), List.of(StatutPaiement.INITIE, StatutPaiement.EN_COURS))) {
            throw new ConflictException("Une transaction simulée est déjà en cours pour la réservation " + dto.getReservationId()
                    + ". Finalisez-la ou annulez-la avant d'en initier une nouvelle.");
        }

        BigDecimal montantAutoritatif = validerEtExtraireMontantReservation(reservation, dto.getMontant());
        LocalDateTime dateExp = computeExpirationDate(now, reservation.getExpiresAt());
        String correlationId = UUID.randomUUID().toString();
        String modeTag = dto.getModePaiement() == ModePaiement.WAVE ? "WAV" : "OM";
        String refTx = "PAY-SIM-" + modeTag + "-" + now.format(REF_FMT) + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
        Long ownerId = reservation.getUtilisateurId() != null ? reservation.getUtilisateurId() : caller.userId();

        Paiement paiement = Paiement.builder()
                .utilisateurId(ownerId)
                .referenceTransaction(refTx)
                .reservationId(dto.getReservationId())
                .montant(montantAutoritatif)
                .devise(DEVISE_XOF)
                .modePaiement(dto.getModePaiement())
                .statut(StatutPaiement.EN_COURS)
                .datePaiement(now)
                .estSimule(true)
                .mentionSimulation(Paiement.MENTION_SIMULATION_DEFAUT)
                .numeroTelephoneMasque(SimulatedMobileMoneyProvider.masquerTelephone(dto.getNumeroTelephoneSimule()))
                .jetonSimulation(UUID.randomUUID().toString())
                .correlationId(correlationId)
                .idempotencyKey(normalizedKey)
                .motifDecision("Initiation simulée " + dto.getModePaiement() + " en attente de validation")
                .dateCreation(now)
                .dateModification(now)
                .dateExpiration(dateExp)
                .synchroReservationStatut("EN_ATTENTE_VALIDATION")
                .build();

        paiement.getHistorique().add(PaiementHistorique.builder()
                .paiement(paiement).ancienStatut(null).nouveauStatut(StatutPaiement.INITIE)
                .acteurId(caller.userId()).acteurRole(caller.role()).acteurType("USER")
                .correlationId(correlationId).motif("Initiation du paiement simulé " + dto.getModePaiement()).dateTransition(now).build());
        paiement.getHistorique().add(PaiementHistorique.builder()
                .paiement(paiement).ancienStatut(StatutPaiement.INITIE).nouveauStatut(StatutPaiement.EN_COURS)
                .acteurId(caller.userId()).acteurRole(caller.role()).acteurType("SYSTEM")
                .correlationId(correlationId).motif("Attente de confirmation portefeuille simulé " + dto.getModePaiement()).dateTransition(now).build());

        Paiement saved = paiementRepository.save(paiement);
        PaiementDto result = toDetailedDto(saved);
        result.setReservation(reservation);
        return result;
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public PaiementDto simulerDecisionPaiement(Long paiementId, SimulationPaiementRequest request, String idempotencyKeyHeader) {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        if (!caller.hasPermission("PAIEMENT:INITIER")) {
            throw new ForbiddenException("Accès interdit : permission PAIEMENT:INITIER requise.");
        }
        if (request == null || request.getDecision() == null) {
            throw new BadRequestException("La décision de simulation est obligatoire.");
        }

        record Phase1Simulation(Paiement saved, Long paiementId, Long outboxId, ReservationDto reservationLive, boolean shouldNotify) {}

        Phase1Simulation phase1 = executeInWriteTx(() -> {
            Paiement paiement = findPaiementForUpdate(paiementId);
            verifyPaiementOwnership(caller, paiement, "simuler");

            if (paiement.getStatut() == StatutPaiement.ACCEPTE || paiement.getStatut() == StatutPaiement.REMBOURSE) {
                throw new ConflictException("Transaction " + paiement.getReferenceTransaction()
                        + " déjà finalisée (" + paiement.getStatut() + ") : impossible de la valider une seconde fois.");
            }
            if (paiement.getStatut() != StatutPaiement.EN_COURS && paiement.getStatut() != StatutPaiement.INITIE) {
                throw new ConflictException("Transaction dans un état non modifiable : " + paiement.getStatut());
            }

            LocalDateTime now = LocalDateTime.now(Paiement.CASAMANCE_ZONE);
            ReservationDto reservationLive = null;
            boolean reservationTemporarilyUnreachable = false;
            try {
                reservationLive = reservationClient.getReservationById(paiement.getReservationId());
            } catch (FeignException.NotFound | FeignException.Forbidden ex) {
                throw new ForbiddenException("Réservation introuvable ou accès refusé côté ms-reservation.");
            } catch (FeignException ex) {
                reservationTemporarilyUnreachable = true;
                log.warn("ms-reservation indisponible lors de la simulation du paiement {} : {}", paiementId, ex.getMessage());
            }

            SimulatedMobileMoneyProvider.SimulationResult outcome;
            if (reservationLive != null && !"EN_ATTENTE_PAIEMENT".equalsIgnoreCase(reservationLive.getStatut())
                    && request.getDecision() == com.uasz.ms_paiement.entities.DecisionSimulation.ACCEPTER) {
                if ("EXPIREE".equalsIgnoreCase(reservationLive.getStatut())) {
                    outcome = new SimulatedMobileMoneyProvider.SimulationResult(
                            StatutPaiement.EXPIRE, "PAIEMENT_EXPIRE",
                            "La réservation cible a expiré avant l'acceptation du paiement simulé.");
                } else {
                    throw new ConflictException("La réservation #" + paiement.getReservationId()
                            + " n'est plus en attente de paiement (statut : " + reservationLive.getStatut() + ").");
                }
            } else if (reservationLive != null && reservationLive.getExpiresAt() != null
                    && reservationLive.getExpiresAt().isBefore(now)
                    && request.getDecision() == com.uasz.ms_paiement.entities.DecisionSimulation.ACCEPTER) {
                outcome = new SimulatedMobileMoneyProvider.SimulationResult(
                        StatutPaiement.EXPIRE, "PAIEMENT_EXPIRE",
                        "Le délai de validité de la réservation est expiré ; paiement classé EXPIRE.");
            } else {
                outcome = mobileMoneyProvider.evaluer(paiement, request.getDecision(), request.getMotif(), now);
            }

            if (!isTransitionAllowed(paiement.getStatut(), outcome.targetStatut())) {
                throw new ConflictException("Transition de paiement interdite : " + paiement.getStatut() + " -> " + outcome.targetStatut());
            }

            StatutPaiement previous = paiement.getStatut();
            paiement.setStatut(outcome.targetStatut());
            paiement.setMotifDecision(outcome.motif());
            paiement.setDateModification(now);
            if (outcome.targetStatut() == StatutPaiement.ACCEPTE) {
                paiement.setDateConfirmation(now);
            }
            paiement.setSynchroReservationStatut(reservationTemporarilyUnreachable ? "EN_ATTENTE_REPRISE" : "EN_COURS_SYNCHRO");
            paiement.getHistorique().add(PaiementHistorique.builder()
                    .paiement(paiement)
                    .ancienStatut(previous)
                    .nouveauStatut(outcome.targetStatut())
                    .acteurId(caller.userId())
                    .acteurRole(caller.role())
                    .acteurType("USER")
                    .correlationId(paiement.getCorrelationId())
                    .motif(outcome.motif())
                    .dateTransition(now)
                    .build());

            Paiement saved = paiementRepository.save(paiement);

            PaiementOutbox outbox = outboxRepository.save(PaiementOutbox.builder()
                    .eventId(UUID.randomUUID().toString())
                    .correlationId(saved.getCorrelationId())
                    .paiementId(saved.getId())
                    .reservationId(saved.getReservationId())
                    .eventType(outcome.eventType())
                    .referenceTransaction(saved.getReferenceTransaction())
                    .montant(saved.getMontant())
                    .devise(saved.getDevise())
                    .motif(outcome.motif())
                    .utilisateurId(caller.userId())
                    .utilisateurRole(caller.role())
                    .utilisateurEmail(caller.email())
                    .statut(StatutOutbox.EN_ATTENTE)
                    .createdAt(now)
                    .prochaineTentativeAt(now)
                    .build());

            boolean shouldNotify = outcome.targetStatut() == StatutPaiement.ACCEPTE
                    || outcome.targetStatut() == StatutPaiement.REFUSE;
            return new Phase1Simulation(saved, saved.getId(), outbox.getId(), reservationLive, shouldNotify);
        });

        if (outboxRelayService != null) {
            outboxRelayService.tenterLivraison(phase1.outboxId());
        }

        if (phase1.shouldNotify()) {
            envoyerNotificationNonBloquante(phase1.saved(), phase1.reservationLive());
        }

        return executeInReadTx(() -> {
            Paiement reloaded = paiementRepository.findById(phase1.paiementId()).orElse(phase1.saved());
            PaiementDto result = toDetailedDto(reloaded);
            result.setReservation(phase1.reservationLive());
            return result;
        });
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public PaiementDto rembourserPaiement(Long paiementId, String motif, String idempotencyKeyHeader) {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        if (!caller.hasPermission("PAIEMENT:REMBOURSER")) {
            throw new ForbiddenException("Accès interdit : la permission PAIEMENT:REMBOURSER est requise pour simuler un remboursement.");
        }

        record Phase1Remboursement(Paiement saved, Long paiementId, Long outboxId) {}

        Phase1Remboursement phase1 = executeInWriteTx(() -> {
            Paiement paiement = findPaiementForUpdate(paiementId);
            if (paiement.getStatut() == StatutPaiement.REMBOURSE) {
                throw new ConflictException("Ce paiement (" + paiement.getReferenceTransaction() + ") a déjà été remboursé.");
            }
            if (!isTransitionAllowed(paiement.getStatut(), StatutPaiement.REMBOURSE)) {
                throw new ConflictException("Seul un paiement ACCEPTE peut être remboursé (statut actuel : " + paiement.getStatut() + ").");
            }

            LocalDateTime now = LocalDateTime.now(Paiement.CASAMANCE_ZONE);
            String effectiveMotif = (motif != null && !motif.isBlank())
                    ? motif.trim()
                    : "Remboursement intégral simulé validé par l'administration";

            StatutPaiement previous = paiement.getStatut();
            paiement.setStatut(StatutPaiement.REMBOURSE);
            paiement.setDateRemboursement(now);
            paiement.setDateModification(now);
            paiement.setMotifDecision(effectiveMotif);
            paiement.setSynchroReservationStatut("EN_COURS_SYNCHRO");
            paiement.getHistorique().add(PaiementHistorique.builder()
                    .paiement(paiement)
                    .ancienStatut(previous)
                    .nouveauStatut(StatutPaiement.REMBOURSE)
                    .acteurId(caller.userId())
                    .acteurRole(caller.role())
                    .acteurType("USER")
                    .correlationId(paiement.getCorrelationId())
                    .motif(effectiveMotif)
                    .dateTransition(now)
                    .build());

            Paiement saved = paiementRepository.save(paiement);

            PaiementOutbox outbox = outboxRepository.save(PaiementOutbox.builder()
                    .eventId(UUID.randomUUID().toString())
                    .correlationId(saved.getCorrelationId())
                    .paiementId(saved.getId())
                    .reservationId(saved.getReservationId())
                    .eventType("PAIEMENT_REMBOURSE")
                    .referenceTransaction(saved.getReferenceTransaction())
                    .montant(saved.getMontant())
                    .devise(saved.getDevise())
                    .motif(effectiveMotif)
                    .utilisateurId(caller.userId())
                    .utilisateurRole(caller.role())
                    .utilisateurEmail(caller.email())
                    .statut(StatutOutbox.EN_ATTENTE)
                    .createdAt(now)
                    .prochaineTentativeAt(now)
                    .build());

            return new Phase1Remboursement(saved, saved.getId(), outbox.getId());
        });

        if (outboxRelayService != null) {
            outboxRelayService.tenterLivraison(phase1.outboxId());
        }
        envoyerNotificationNonBloquante(phase1.saved(), null);

        return executeInReadTx(() -> {
            Paiement reloaded = paiementRepository.findById(phase1.paiementId()).orElse(phase1.saved());
            return toDetailedDto(reloaded);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaiementDto> getAllPaiements() {
        SecurityUserContext caller = requireAuthenticatedContext(false);

        if (caller.hasPermission("PAIEMENT:LIRE_TOUT")) {
            return paiementRepository.findAll().stream().map(this::toDetailedDto).toList();
        }
        if (caller.hasPermission("PAIEMENT:LIRE_PROPRE")) {
            return paiementRepository.findByUtilisateurId(caller.userId()).stream().map(this::toDetailedDto).toList();
        }
        throw new ForbiddenException("Accès interdit : permission de consultation des paiements absente.");
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDto<PaiementDto> rechercherPaiements(
            String q,
            StatutPaiement statut,
            ModePaiement modePaiement,
            Long reservationId,
            LocalDateTime dateMin,
            LocalDateTime dateMax,
            int page,
            int size,
            String sortBy,
            String sortDir
    ) {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        boolean canReadAll = caller.hasPermission("PAIEMENT:LIRE_TOUT");
        boolean canReadOwn = caller.hasPermission("PAIEMENT:LIRE_PROPRE");
        if (!canReadAll && !canReadOwn) {
            throw new ForbiddenException("Accès interdit : permission de consultation des paiements requise.");
        }

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        Long scopeUserId = canReadAll ? null : caller.userId();

        Specification<Paiement> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (scopeUserId != null) {
                predicates.add(cb.equal(root.get("utilisateurId"), scopeUserId));
            }
            if (statut != null) {
                predicates.add(cb.equal(root.get("statut"), statut));
            }
            if (modePaiement != null) {
                predicates.add(cb.equal(root.get("modePaiement"), modePaiement));
            }
            if (reservationId != null) {
                predicates.add(cb.equal(root.get("reservationId"), reservationId));
            }
            if (dateMin != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("dateCreation"), dateMin));
            }
            if (dateMax != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("dateCreation"), dateMax));
            }
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("referenceTransaction"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("correlationId"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("motifDecision"), "")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        String sortField = "montant".equalsIgnoreCase(sortBy) ? "montant" : "dateCreation";
        Sort.Direction dir = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(dir, sortField));

        Page<Paiement> dbPage = paiementRepository.findAll(spec, pageable);
        if (dbPage == null) {
            return PageResponseDto.<PaiementDto>builder()
                    .content(List.of()).page(safePage).size(safeSize).totalElements(0).totalPages(0).last(true).build();
        }
        return PageResponseDto.<PaiementDto>builder()
                .content(dbPage.getContent().stream().map(this::toDetailedDto).toList())
                .page(dbPage.getNumber())
                .size(dbPage.getSize())
                .totalElements(dbPage.getTotalElements())
                .totalPages(dbPage.getTotalPages())
                .last(dbPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PaiementDto getByIdPaiement(Long id) {
        SecurityUserContext caller = requireAuthenticatedContext(false);

        if (!caller.hasPermission("PAIEMENT:LIRE_TOUT") && !caller.hasPermission("PAIEMENT:LIRE_PROPRE")) {
            throw new ForbiddenException("Accès interdit : permission de consultation des reçus de paiement requise.");
        }

        Paiement paiement = paiementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement introuvable avec l'id : " + id));

        verifyPaiementOwnership(caller, paiement, "consulter");

        PaiementDto dto = toDetailedDto(paiement);
        try {
            dto.setReservation(reservationClient.getReservationById(paiement.getReservationId()));
        } catch (FeignException ex) {
            log.warn("Impossible d'enrichir le paiement {} : {}", id, ex.getMessage());
        }
        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaiementDto> getPaiementsByReservation(Long reservationId) {
        SecurityUserContext caller = requireAuthenticatedContext(true);
        if (caller.isServiceCall()) {
            return paiementRepository.findByReservationIdOrderByDateCreationDesc(reservationId).stream()
                    .map(this::toDetailedDto)
                    .toList();
        }

        if (!caller.hasPermission("PAIEMENT:LIRE_TOUT") && !caller.hasPermission("PAIEMENT:LIRE_PROPRE")) {
            throw new ForbiddenException("Accès interdit : permission de consultation des paiements requise.");
        }

        List<Paiement> list = paiementRepository.findByReservationIdOrderByDateCreationDesc(reservationId);
        if (!caller.hasPermission("PAIEMENT:LIRE_TOUT")) {
            if (!list.isEmpty()) {
                for (Paiement p : list) {
                    verifyPaiementOwnership(caller, p, "consulter");
                }
            } else {
                ReservationDto res = recupererReservation(reservationId);
                verifyReservationOwnership(caller, res);
            }
        }
        return list.stream().map(this::toDetailedDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PaiementStatsDto getStatistiques() {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        if (!caller.hasPermission("PAIEMENT:LIRE_TOUT")) {
            throw new ForbiddenException("Accès interdit : permission PAIEMENT:LIRE_TOUT requise.");
        }
        List<Paiement> all = paiementRepository.findAll();
        return PaiementStatsDto.builder()
                .totalTransactions(all.size())
                .enCours(countByStatus(all, StatutPaiement.EN_COURS) + countByStatus(all, StatutPaiement.INITIE))
                .acceptees(countByStatus(all, StatutPaiement.ACCEPTE))
                .refusees(countByStatus(all, StatutPaiement.REFUSE))
                .expirees(countByStatus(all, StatutPaiement.EXPIRE))
                .annulees(countByStatus(all, StatutPaiement.ANNULE))
                .remboursees(countByStatus(all, StatutPaiement.REMBOURSE))
                .montantTotalAccepteSimule(sumMontant(all, StatutPaiement.ACCEPTE, null))
                .montantTotalRembourseSimule(sumMontant(all, StatutPaiement.REMBOURSE, null))
                .montantWaveSimule(sumMontant(all, StatutPaiement.ACCEPTE, ModePaiement.WAVE))
                .montantOrangeMoneySimule(sumMontant(all, StatutPaiement.ACCEPTE, ModePaiement.ORANGE_MONEY))
                .outboxEnAttente(outboxRepository.countByStatut(StatutOutbox.EN_ATTENTE))
                .devise(DEVISE_XOF)
                .estSimule(true)
                .build();
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public int rejouerOutboxEnAttente() {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        if (!caller.hasPermission("PAIEMENT:LIRE_TOUT")) {
            throw new ForbiddenException("Accès interdit : permission PAIEMENT:LIRE_TOUT requise pour rejouer l'outbox.");
        }
        return outboxRelayService.forcerRejeuToutEnAttente();
    }

    private <T> T executeInWriteTx(Supplier<T> work) {
        if (transactionManager == null) {
            return work.get();
        }
        TransactionTemplate tpl = new TransactionTemplate(transactionManager);
        tpl.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return tpl.execute(status -> work.get());
    }

    private <T> T executeInReadTx(Supplier<T> work) {
        if (transactionManager == null) {
            return work.get();
        }
        TransactionTemplate tpl = new TransactionTemplate(transactionManager);
        tpl.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tpl.setReadOnly(true);
        return tpl.execute(status -> work.get());
    }

    private void expirerTentativesObsolètesPourReservation(Long reservationId, LocalDateTime now) {
        List<Paiement> existing = paiementRepository.findByReservationIdOrderByDateCreationDesc(reservationId);
        if (existing == null) return;
        for (Paiement p : existing) {
            if ((p.getStatut() == StatutPaiement.EN_COURS || p.getStatut() == StatutPaiement.INITIE)
                    && p.getDateExpiration() != null && p.getDateExpiration().isBefore(now)) {
                StatutPaiement prev = p.getStatut();
                p.setStatut(StatutPaiement.EXPIRE);
                p.setMotifDecision("Expiration automatique de la tentative précédente");
                p.getHistorique().add(PaiementHistorique.builder()
                        .paiement(p).ancienStatut(prev).nouveauStatut(StatutPaiement.EXPIRE)
                        .acteurType("SYSTEM").correlationId(p.getCorrelationId())
                        .motif("Délai écoulé avant validation simulée").dateTransition(now).build());
                paiementRepository.save(p);
            }
        }
    }

    private PaiementDto handleIdempotentReplay(Paiement existing, PaiementDto requestDto) {
        if (!Objects.equals(existing.getReservationId(), requestDto.getReservationId())
                || existing.getModePaiement() != requestDto.getModePaiement()) {
            throw new ConflictException("La clé d'idempotence '" + existing.getIdempotencyKey()
                    + "' a déjà été utilisée pour une autre transaction.");
        }
        PaiementDto dto = toDetailedDto(existing);
        dto.setRejoueeIdempotence(true);
        return dto;
    }

    private BigDecimal validerEtExtraireMontantReservation(ReservationDto reservation, BigDecimal clientSuppliedMontant) {
        if (reservation.getMontantTotal() == null || reservation.getMontantTotal().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Le montant de la réservation doit être strictement positif.");
        }
        if (reservation.getDevise() != null && !DEVISE_XOF.equalsIgnoreCase(reservation.getDevise().trim())) {
            throw new BadRequestException("Devise de réservation invalide : " + reservation.getDevise());
        }
        BigDecimal serverAmount = reservation.getMontantTotal().setScale(2, RoundingMode.HALF_UP);
        if (clientSuppliedMontant != null) {
            if (clientSuppliedMontant.compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException("Le montant de paiement ne peut pas être négatif.");
            }
            if (clientSuppliedMontant.compareTo(BigDecimal.ZERO) > 0
                    && clientSuppliedMontant.setScale(2, RoundingMode.HALF_UP).compareTo(serverAmount) != 0) {
                throw new BadRequestException("Montant manipulé ou incohérent : attendu " + serverAmount + " XOF.");
            }
        }
        return serverAmount;
    }

    private void validerReservationPayable(ReservationDto reservation) {
        String st = reservation.getStatut() != null ? reservation.getStatut().trim().toUpperCase(Locale.ROOT) : "";
        if ("ANNULEE".equals(st)) {
            throw new BadRequestException("Impossible de payer une réservation annulée");
        }
        if ("EXPIREE".equals(st) || (reservation.getExpiresAt() != null
                && reservation.getExpiresAt().isBefore(LocalDateTime.now(Paiement.CASAMANCE_ZONE)))) {
            throw new ConflictException("Impossible de payer une réservation expirée.");
        }
        if ("CONFIRMEE".equals(st) || "REMBOURSEE".equals(st)) {
            throw new ConflictException("Cette réservation (" + st + ") n'est pas payable.");
        }
        if (!"EN_ATTENTE_PAIEMENT".equals(st)) {
            throw new BadRequestException("La réservation doit être en statut EN_ATTENTE_PAIEMENT (statut actuel : " + st + ").");
        }
    }

    private LocalDateTime computeExpirationDate(LocalDateTime now, LocalDateTime reservationExpiresAt) {
        LocalDateTime maxWindow = now.plusMinutes(Math.max(1, paiementExpirationMinutes));
        if (reservationExpiresAt != null && reservationExpiresAt.isBefore(maxWindow)) {
            return reservationExpiresAt;
        }
        return maxWindow;
    }

    private boolean isTransitionAllowed(StatutPaiement from, StatutPaiement to) {
        return from != null && to != null && ALLOWED_TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }

    private void verifyReservationOwnership(SecurityUserContext caller, ReservationDto reservation) {
        if (!caller.hasPermission("PAIEMENT:LIRE_TOUT")) {
            if (reservation.getUtilisateurId() == null) {
                throw new ForbiddenException(
                        "Accès interdit (Fail-Closed) : cette réservation n'a pas de propriétaire vérifié et ne peut pas être payée par un compte non administrateur.");
            }
            if (!caller.userId().equals(reservation.getUtilisateurId())) {
                throw new ForbiddenException(
                        "Accès interdit : vous ne pouvez pas payer la réservation d'un autre utilisateur.");
            }
        }
    }

    private void verifyPaiementOwnership(SecurityUserContext caller, Paiement paiement, String action) {
        if (!caller.hasPermission("PAIEMENT:LIRE_TOUT")) {
            if (paiement.getUtilisateurId() == null) {
                throw new ForbiddenException(
                        "Accès interdit (Fail-Closed) : ce reçu de paiement n'a pas de propriétaire vérifié.");
            }
            if (!caller.userId().equals(paiement.getUtilisateurId())) {
                throw new ForbiddenException(
                        "Accès interdit : vous ne pouvez pas " + action + " le paiement d'un autre utilisateur.");
            }
        }
    }

    private SecurityUserContext requireAuthenticatedContext(boolean allowReservationServiceCall) {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        if (caller == null) {
            throw new UnauthorizedException("Accès refusé (Fail-Closed) : contexte de sécurité utilisateur absent.");
        }
        if (caller.isServiceCall()) {
            if (!allowReservationServiceCall || !"ms-reservation".equals(caller.serviceName())) {
                throw new ForbiddenException("Accès interdit : aucun service interne non autorisé ne peut appeler directement ms-paiement.");
            }
            return caller;
        }
        if (caller.userId() == null) {
            throw new UnauthorizedException("Accès refusé (Fail-Closed) : identifiant utilisateur manquant dans le contexte de sécurité.");
        }
        return caller;
    }

    private Paiement findPaiementForUpdate(Long id) {
        return paiementRepository.findByIdForUpdate(id)
                .or(() -> paiementRepository.findById(id))
                .orElseThrow(() -> new ResourceNotFoundException("Paiement introuvable avec l'id : " + id));
    }

    private ReservationDto recupererReservation(Long reservationId) {
        try {
            return reservationClient.getReservationById(reservationId);
        } catch (FeignException.Forbidden ex) {
            throw new ForbiddenException("Accès interdit : vous ne pouvez pas payer la réservation d'un autre utilisateur.");
        } catch (FeignException.NotFound ex) {
            throw new BadRequestException("La réservation " + reservationId + " n'existe pas dans ms-reservation");
        } catch (FeignException ex) {
            log.error("Erreur lors de l'appel à ms-reservation", ex);
            throw new ServiceIndisponibleException("Le service ms-reservation est indisponible");
        }
    }

    private void envoyerNotificationNonBloquante(Paiement saved, ReservationDto cachedReservation) {
        if (notificationClient == null) return;
        try {
            ReservationDto res = cachedReservation != null ? cachedReservation : reservationClient.getReservationById(saved.getReservationId());
            if (res == null || res.getEmailClient() == null || res.getEmailClient().isBlank()) return;
            String sujet = switch (saved.getStatut()) {
                case ACCEPTE -> "Confirmation de paiement simulé " + saved.getReferenceTransaction();
                case REMBOURSE -> "Remboursement simulé " + saved.getReferenceTransaction();
                case REFUSE -> "Échec du paiement simulé " + saved.getReferenceTransaction();
                default -> "Mise à jour paiement simulé " + saved.getReferenceTransaction();
            };
            String contenu = "Bonjour " + res.getNomClient() + ", statut de votre paiement simulé "
                    + saved.getReferenceTransaction() + " (" + saved.getMontant() + " " + saved.getDevise()
                    + " via " + saved.getModePaiement() + ") pour la réservation #" + saved.getReservationId()
                    + " : " + saved.getStatut() + ". [Mode Simulation P04 - Aucun transfert financier réel]";
            notificationClient.envoyerNotification(new NotificationRequest(
                    res.getEmailClient(), sujet, contenu, "EMAIL", saved.getReservationId()));
        } catch (Exception ex) {
            log.warn("Impossible d'envoyer la notification de paiement : {}", ex.getMessage());
        }
    }

    private PaiementDto toDetailedDto(Paiement paiement) {
        PaiementDto dto = paiementMapper.toDto(paiement);
        dto.setHistorique(paiementMapper.toHistoriqueDtos(paiement.getHistorique()));
        return dto;
    }

    private void validerDevise(String devise) {
        if (devise != null && !devise.isBlank() && !DEVISE_XOF.equalsIgnoreCase(devise.trim())) {
            throw new BadRequestException("Devise non supportée : " + devise + " (seule XOF est autorisée).");
        }
    }

    private String normalizeKey(String key) {
        if (key == null || key.isBlank()) return null;
        String trimmed = key.trim();
        if (trimmed.length() > 128) {
            throw new BadRequestException("La clé d'idempotence ne doit pas dépasser 128 caractères.");
        }
        return trimmed;
    }

    private long countByStatus(List<Paiement> all, StatutPaiement statut) {
        return all.stream().filter(p -> p.getStatut() == statut).count();
    }

    private BigDecimal sumMontant(List<Paiement> all, StatutPaiement statut, ModePaiement mode) {
        return all.stream()
                .filter(p -> p.getStatut() == statut && (mode == null || p.getModePaiement() == mode))
                .map(p -> p.getMontant() != null ? p.getMontant() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
