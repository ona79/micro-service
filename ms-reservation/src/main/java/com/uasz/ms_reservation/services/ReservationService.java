package com.uasz.ms_reservation.services;

import com.uasz.ms_reservation.clients.CircuitClient;
import com.uasz.ms_reservation.clients.EvenementClient;
import com.uasz.ms_reservation.clients.NotificationClient;
import com.uasz.ms_reservation.clients.PaiementClient;
import com.uasz.ms_reservation.dto.CircuitDto;
import com.uasz.ms_reservation.dto.DisponibiliteDto;
import com.uasz.ms_reservation.dto.EvenementDto;
import com.uasz.ms_reservation.dto.EvenementPaiementAckDto;
import com.uasz.ms_reservation.dto.EvenementPaiementNotificationRequest;
import com.uasz.ms_reservation.dto.ManifesteParticipantDto;
import com.uasz.ms_reservation.dto.NotificationRequest;
import com.uasz.ms_reservation.dto.PageResponseDto;
import com.uasz.ms_reservation.dto.PaiementResumeDto;
import com.uasz.ms_reservation.dto.ParticipantDto;
import com.uasz.ms_reservation.dto.ReservationDto;
import com.uasz.ms_reservation.dto.ReservationStatsDto;
import com.uasz.ms_reservation.entities.DisponibilitePrestation;
import com.uasz.ms_reservation.entities.Reservation;
import com.uasz.ms_reservation.entities.ReservationEvenementRecu;
import com.uasz.ms_reservation.entities.ReservationHistorique;
import com.uasz.ms_reservation.entities.ReservationNotificationOutbox;
import com.uasz.ms_reservation.entities.ReservationParticipant;
import com.uasz.ms_reservation.entities.StatutOutbox;
import com.uasz.ms_reservation.entities.StatutReservation;
import com.uasz.ms_reservation.entities.TypeReservation;
import com.uasz.ms_reservation.exceptions.BadRequestException;
import com.uasz.ms_reservation.exceptions.ConflictException;
import com.uasz.ms_reservation.exceptions.ForbiddenException;
import com.uasz.ms_reservation.exceptions.ResourceNotFoundException;
import com.uasz.ms_reservation.exceptions.ServiceIndisponibleException;
import com.uasz.ms_reservation.exceptions.UnauthorizedException;
import com.uasz.ms_reservation.mappers.ReservationMapper;
import com.uasz.ms_reservation.repositories.DisponibilitePrestationRepository;
import com.uasz.ms_reservation.repositories.ReservationEvenementRecuRepository;
import com.uasz.ms_reservation.repositories.ReservationNotificationOutboxRepository;
import com.uasz.ms_reservation.repositories.ReservationRepository;
import com.uasz.ms_reservation.security.SecurityUserContext;
import com.uasz.ms_reservation.security.SecurityUserContextHolder;
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
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@Transactional
public class ReservationService implements IReservationService {

    private static final String DEVISE_XOF = "XOF";
    private static final int MAX_PAGE_SIZE = 50;
    private static final DateTimeFormatter REF_DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final Set<StatutReservation> ACTIVE_SEAT_HOLDING_STATUTS =
            EnumSet.of(StatutReservation.EN_ATTENTE_PAIEMENT, StatutReservation.CONFIRMEE);

    private static final Map<StatutReservation, Set<StatutReservation>> ALLOWED_TRANSITIONS = buildTransitions();

    private final ReservationRepository reservationRepository;
    private final DisponibilitePrestationRepository disponibiliteRepository;
    private final ReservationEvenementRecuRepository evenementRecuRepository;
    private final DisponibiliteLockService disponibiliteLockService;
    private final ReservationMapper reservationMapper;
    private final CircuitClient circuitClient;
    private final EvenementClient evenementClient;
    private final PaiementClient paiementClient;
    private final NotificationClient notificationClient;

    @Autowired(required = false)
    private ReservationNotificationOutboxRepository notificationOutboxRepository;

    @Autowired(required = false)
    private ReservationNotificationOutboxRelayService notificationOutboxRelayService;

    @Value("${reservation.expiration-minutes:30}")
    private int expirationMinutes = 30;

    @Autowired
    public ReservationService(
            ReservationRepository reservationRepository,
            DisponibilitePrestationRepository disponibiliteRepository,
            ReservationEvenementRecuRepository evenementRecuRepository,
            DisponibiliteLockService disponibiliteLockService,
            ReservationMapper reservationMapper,
            CircuitClient circuitClient,
            EvenementClient evenementClient,
            @Autowired(required = false) PaiementClient paiementClient,
            @Autowired(required = false) NotificationClient notificationClient
    ) {
        this.reservationRepository = reservationRepository;
        this.disponibiliteRepository = disponibiliteRepository;
        this.evenementRecuRepository = evenementRecuRepository;
        this.disponibiliteLockService = disponibiliteLockService;
        this.reservationMapper = reservationMapper;
        this.circuitClient = circuitClient;
        this.evenementClient = evenementClient;
        this.paiementClient = paiementClient;
        this.notificationClient = notificationClient;
    }

    private static Map<StatutReservation, Set<StatutReservation>> buildTransitions() {
        EnumMap<StatutReservation, Set<StatutReservation>> map = new EnumMap<>(StatutReservation.class);
        map.put(StatutReservation.BROUILLON, EnumSet.of(StatutReservation.EN_ATTENTE_PAIEMENT, StatutReservation.ANNULEE));
        map.put(StatutReservation.EN_ATTENTE_PAIEMENT, EnumSet.of(
                StatutReservation.CONFIRMEE, StatutReservation.EXPIREE, StatutReservation.ANNULEE, StatutReservation.ECHEC));
        map.put(StatutReservation.CONFIRMEE, EnumSet.of(StatutReservation.ANNULEE, StatutReservation.REMBOURSEE));
        map.put(StatutReservation.ANNULEE, EnumSet.of(StatutReservation.REMBOURSEE));
        map.put(StatutReservation.EXPIREE, EnumSet.noneOf(StatutReservation.class));
        map.put(StatutReservation.ECHEC, EnumSet.noneOf(StatutReservation.class));
        map.put(StatutReservation.REMBOURSEE, EnumSet.noneOf(StatutReservation.class));
        return map;
    }

    @Override
    public ReservationDto saveReservation(ReservationDto dto, String idempotencyKeyHeader) {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        if (!caller.hasPermission("RESERVATION:CREER") && !caller.hasPermission("RESERVATION:GERER")) {
            throw new ForbiddenException("Accès interdit : votre rôle (" + caller.role() + ") ne possède pas la permission RESERVATION:CREER.");
        }
        if (dto == null || dto.getTypeReservation() == null) {
            throw new BadRequestException("Les informations de réservation et le type de prestation sont obligatoires.");
        }
        if (dto.getStatut() == StatutReservation.CONFIRMEE
                || dto.getStatut() == StatutReservation.REMBOURSEE
                || dto.getStatut() == StatutReservation.EXPIREE) {
            throw new ForbiddenException("Accès interdit : le statut '" + dto.getStatut() + "' ne peut jamais être imposé par le client.");
        }
        if (dto.getNombrePlaces() <= 0) {
            throw new BadRequestException("Le nombre de participants doit être strictement positif.");
        }
        validerDevise(dto.getDevise());
        validerParticipants(dto.getParticipants(), dto.getNombrePlaces());

        Long effectiveUserId = (caller.hasPermission("RESERVATION:GERER") && dto.getUtilisateurId() != null)
                ? dto.getUtilisateurId()
                : caller.userId();

        String normalizedIdempotencyKey = normalizeKey(idempotencyKeyHeader != null ? idempotencyKeyHeader : dto.getIdempotencyKey());
        if (normalizedIdempotencyKey != null) {
            Optional<Reservation> existingIdempotent = reservationRepository
                    .findByUtilisateurIdAndIdempotencyKey(effectiveUserId, normalizedIdempotencyKey);
            if (existingIdempotent.isPresent()) {
                return handleIdempotentReplay(existingIdempotent.get(), dto);
            }
        }

        LocalDateTime now = LocalDateTime.now(Reservation.CASAMANCE_ZONE);
        PrestationValidation contextePrestation = validerEtChargerPrestation(dto, now);

        BigDecimal montantTotal = calculerEtValiderMontant(contextePrestation.prixUnitaire(), dto.getNombrePlaces(), dto.getMontantTotal());
        boolean submitImmediately = dto.isSoumettrePourPaiement();
        StatutReservation targetStatut = submitImmediately ? StatutReservation.EN_ATTENTE_PAIEMENT : StatutReservation.BROUILLON;

        if (submitImmediately) {
            Reservation replayedAfterLock = acquireCapacityAndExpireStale(
                    dto,
                    contextePrestation.prestationId(),
                    contextePrestation.effectiveDate(),
                    contextePrestation.allocationLockDate(),
                    contextePrestation.capaciteMax(),
                    dto.getNombrePlaces(),
                    effectiveUserId,
                    normalizedIdempotencyKey,
                    now
            );
            if (replayedAfterLock != null) {
                return handleIdempotentReplay(replayedAfterLock, dto);
            }
        }

        Reservation entity = buildNewReservationEntity(dto, caller, effectiveUserId, normalizedIdempotencyKey,
                contextePrestation, montantTotal, targetStatut, now);
        Reservation saved = reservationRepository.save(entity);
        return enrichirDto(saved, contextePrestation.circuit(), contextePrestation.evenement(), false);
    }

    @Override
    public ReservationDto soumettreReservation(Long id) {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        Reservation reservation = findReservationForUpdate(id);

        if (!caller.hasPermission("RESERVATION:CREER") && !caller.hasPermission("RESERVATION:GERER")) {
            throw new ForbiddenException("Accès interdit : permission requise pour soumettre la réservation.");
        }
        if (!caller.hasPermission("RESERVATION:GERER")) {
            verifyStrictOwnership(caller, reservation, "soumettre");
        }
        if (reservation.getStatut() != StatutReservation.BROUILLON) {
            throw new ConflictException("Seule une réservation au statut BROUILLON peut être soumise au paiement (statut actuel : " + reservation.getStatut() + ").");
        }

        LocalDateTime now = LocalDateTime.now(Reservation.CASAMANCE_ZONE);
        ReservationDto lookupDto = ReservationDto.builder()
                .typeReservation(reservation.getTypeReservation())
                .circuitId(reservation.getCircuitId())
                .evenementId(reservation.getEvenementId())
                .datePrestation(reservation.getDatePrestation())
                .nombrePlaces(reservation.getNombrePlaces())
                .build();
        PrestationValidation prestation = validerEtChargerPrestation(lookupDto, now);
        BigDecimal total = calculerEtValiderMontant(prestation.prixUnitaire(), reservation.getNombrePlaces(), null);

        acquireCapacityAndExpireStale(
                lookupDto,
                prestation.prestationId(),
                prestation.effectiveDate(),
                prestation.allocationLockDate(),
                prestation.capaciteMax(),
                reservation.getNombrePlaces(),
                reservation.getUtilisateurId(),
                null,
                now
        );

        reservation.setPrixUnitaire(prestation.prixUnitaire());
        reservation.setMontantTotal(total);
        reservation.setExpiresAt(now.plusMinutes(Math.max(1, expirationMinutes)));
        appliquerTransition(reservation, StatutReservation.EN_ATTENTE_PAIEMENT, caller.userId(), caller.role(), "USER",
                reservation.getCorrelationId(), null, "Soumission de la réservation en attente de paiement");

        Reservation saved = reservationRepository.save(reservation);
        return enrichirDto(saved, prestation.circuit(), prestation.evenement(), false);
    }

    @Override
    @Transactional(readOnly = true)
    public DisponibiliteDto verifierDisponibilite(TypeReservation type, Long prestationId, LocalDate datePrestation) {
        if (type == null || prestationId == null) {
            throw new BadRequestException("Les paramètres 'type' et 'prestationId' sont obligatoires.");
        }
        LocalDateTime now = LocalDateTime.now(Reservation.CASAMANCE_ZONE);
        if (type == TypeReservation.CIRCUIT) {
            CircuitDto circuit = recupererCircuit(prestationId);
            LocalDate targetDate = datePrestation != null ? datePrestation : LocalDate.now(Reservation.CASAMANCE_ZONE);
            String statut = safeUpper(circuit.getStatutCircuit(), "PUBLIE");
            boolean statutOk = "PUBLIE".equals(statut);
            boolean dateOk = !targetDate.isBefore(LocalDate.now(Reservation.CASAMANCE_ZONE));
            int cap = Math.max(0, circuit.getPlacesMax());
            int occupied = cap > 0
                    ? reservationRepository.sumPlacesByCircuitIdAndDateAndStatutIn(prestationId, targetDate, ACTIVE_SEAT_HOLDING_STATUTS)
                    : 0;
            Integer remaining = cap > 0 ? Math.max(0, cap - occupied) : null;
            boolean reservable = statutOk && dateOk && (cap == 0 || remaining > 0);
            String motif = !statutOk ? "Ce circuit n'est pas publié."
                    : (!dateOk ? "La date choisie est antérieure à aujourd'hui."
                    : (cap > 0 && remaining <= 0 ? "Aucune place disponible pour cette date." : null));
            return DisponibiliteDto.builder()
                    .typePrestation(TypeReservation.CIRCUIT)
                    .prestationId(prestationId)
                    .nomPrestation(circuit.getNomCircuit())
                    .datePrestation(targetDate)
                    .statutPrestation(statut)
                    .ouvertReservation(statutOk)
                    .reservable(reservable)
                    .capaciteLimitee(cap > 0)
                    .capaciteTotale(cap)
                    .placesReservees(occupied)
                    .placesDisponibles(remaining)
                    .prixUnitaire(extractNonNullPrice(circuit.getPrix()))
                    .devise(DEVISE_XOF)
                    .motifIndisponibilite(motif)
                    .build();
        }

        EvenementDto ev = recupererEvenement(prestationId);
        LocalDate start = ev.getDateDebut() != null ? ev.getDateDebut().toLocalDate() : LocalDate.now(Reservation.CASAMANCE_ZONE);
        LocalDate end = ev.getDateFin() != null ? ev.getDateFin().toLocalDate() : start;
        LocalDate targetDate = datePrestation != null ? datePrestation : start;
        String statut = safeUpper(ev.getStatutEvenement(), "PUBLIE");
        boolean statutOk = "PUBLIE".equals(statut);
        boolean openOk = ev.isOuvertReservation();
        boolean futureOk = ev.getDateFin() == null || !ev.getDateFin().isBefore(now);
        boolean dateInRange = !targetDate.isBefore(start) && !targetDate.isAfter(end);
        int cap = Math.max(0, ev.getCapaciteMax());
        int occupied = cap > 0
                ? reservationRepository.sumPlacesByEvenementIdAndStatutIn(prestationId, ACTIVE_SEAT_HOLDING_STATUTS)
                : 0;
        Integer remaining = cap > 0 ? Math.max(0, cap - occupied) : null;
        boolean reservable = statutOk && openOk && futureOk && dateInRange && (cap == 0 || remaining > 0);
        String motif = !statutOk ? "Cet événement n'est pas publié."
                : (!openOk ? "Cet événement n'est pas ouvert à la réservation."
                : (!futureOk ? "Cet événement est déjà terminé."
                : (!dateInRange ? "Date hors de la période de l'événement (" + start + " au " + end + ")."
                : (cap > 0 && remaining <= 0 ? "Capacité complète atteinte." : null))));
        return DisponibiliteDto.builder()
                .typePrestation(TypeReservation.EVENEMENT)
                .prestationId(prestationId)
                .nomPrestation(ev.getNomEvenement())
                .datePrestation(targetDate)
                .statutPrestation(statut)
                .ouvertReservation(openOk)
                .reservable(reservable)
                .capaciteLimitee(cap > 0)
                .capaciteTotale(cap)
                .placesReservees(occupied)
                .placesDisponibles(remaining)
                .prixUnitaire(extractNonNullPrice(ev.getPrix()))
                .devise(DEVISE_XOF)
                .motifIndisponibilite(motif)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReservationDto> getAllReservations() {
        SecurityUserContext caller = requireAuthenticatedContext(false);

        if (caller.hasPermission("RESERVATION:LIRE_TOUT")) {
            return reservationRepository.findAll().stream()
                    .map(reservationMapper::toDto)
                    .toList();
        }
        if (caller.hasPermission("RESERVATION:LIRE_PROPRE")) {
            return reservationRepository.findByUtilisateurId(caller.userId()).stream()
                    .map(reservationMapper::toDto)
                    .toList();
        }
        throw new ForbiddenException("Accès interdit : permission de consultation des réservations absente.");
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDto<ReservationDto> rechercherReservations(
            String q,
            StatutReservation statut,
            TypeReservation type,
            Long prestationId,
            LocalDate dateMin,
            LocalDate dateMax,
            int page,
            int size,
            String sortBy,
            String sortDir
    ) {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        boolean canReadAll = caller.hasPermission("RESERVATION:LIRE_TOUT");
        boolean canReadOwn = caller.hasPermission("RESERVATION:LIRE_PROPRE");
        if (!canReadAll && !canReadOwn) {
            throw new ForbiddenException("Accès interdit : permission de consultation des réservations requise.");
        }

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        Long scopeUserId = canReadAll ? null : caller.userId();

        Specification<Reservation> spec = buildSearchSpecification(q, statut, type, prestationId, dateMin, dateMax, scopeUserId);
        Sort sort = buildSafeSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(safePage, safeSize, sort);

        Page<Reservation> dbPage = reservationRepository.findAll(spec, pageable);
        if (dbPage != null) {
            List<ReservationDto> content = dbPage.getContent().stream().map(reservationMapper::toDto).toList();
            return PageResponseDto.<ReservationDto>builder()
                    .content(content)
                    .page(dbPage.getNumber())
                    .size(dbPage.getSize())
                    .totalElements(dbPage.getTotalElements())
                    .totalPages(dbPage.getTotalPages())
                    .last(dbPage.isLast())
                    .build();
        }
        return PageResponseDto.<ReservationDto>builder()
                .content(List.of()).page(safePage).size(safeSize).totalElements(0).totalPages(0).last(true).build();
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationDto getByIdReservation(Long id) {
        SecurityUserContext caller = requireAuthenticatedContext(true);
        Reservation reservation = findReservation(id);

        if (caller.isServiceCall()) {
            if (caller.userId() != null
                    && !caller.hasPermission("RESERVATION:LIRE_TOUT")
                    && !caller.hasPermission("PAIEMENT:LIRE_TOUT")) {
                verifyStrictOwnership(caller, reservation, "consulter");
            }
            return enrichirDtoAvecPrestation(reservation);
        }

        if (!caller.hasPermission("RESERVATION:LIRE_TOUT") && !caller.hasPermission("RESERVATION:LIRE_PROPRE")) {
            throw new ForbiddenException("Accès interdit : permission de lecture de réservation requise.");
        }
        if (!caller.hasPermission("RESERVATION:LIRE_TOUT")) {
            verifyStrictOwnership(caller, reservation, "consulter");
        }

        return enrichirDtoAvecPrestation(reservation);
    }

    @Override
    public ReservationDto annulerReservation(Long id, String motif) {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        Reservation reservation = findReservationForUpdate(id);

        if (!caller.hasPermission("RESERVATION:GERER") && !caller.hasPermission("RESERVATION:ANNULER_PROPRE")) {
            throw new ForbiddenException("Accès interdit : permission d'annulation de réservation requise.");
        }
        boolean isManager = caller.hasPermission("RESERVATION:GERER");
        if (!isManager) {
            verifyStrictOwnership(caller, reservation, "annuler");
        }

        StatutReservation current = reservation.getStatut();
        if (!isTransitionAllowed(current, StatutReservation.ANNULEE)) {
            throw new ConflictException("Impossible d'annuler une réservation déjà au statut '" + current + "'.");
        }

        LocalDate today = LocalDate.now(Reservation.CASAMANCE_ZONE);
        if (!isManager && current == StatutReservation.CONFIRMEE
                && reservation.getDatePrestation() != null
                && !reservation.getDatePrestation().isAfter(today)) {
            throw new BadRequestException("Une réservation confirmée ne peut plus être annulée par le touriste le jour même ou après la prestation.");
        }

        String effectiveMotif = (motif != null && !motif.isBlank())
                ? motif.trim()
                : (current == StatutReservation.CONFIRMEE
                ? "Annulation demandée après paiement confirmé (éligible au remboursement simulé)"
                : "Annulation demandée par l'utilisateur");

        LocalDateTime now = LocalDateTime.now(Reservation.CASAMANCE_ZONE);
        reservation.setDateAnnulation(now);
        appliquerTransition(reservation, StatutReservation.ANNULEE, caller.userId(), caller.role(), "USER",
                reservation.getCorrelationId(), reservation.getReferencePaiement(), effectiveMotif);

        Reservation saved = reservationRepository.save(reservation);
        libererPlacesSiApplicable(saved);
        notifierAsyncNonBloquant(saved, "Annulation de réservation " + saved.getReferenceReservation(),
                "Bonjour " + saved.getNomClient() + ", votre réservation " + saved.getReferenceReservation() + " a été annulée. Motif : " + effectiveMotif);
        return reservationMapper.toDto(saved);
    }

    @Override
    public void deleteReservation(Long id) {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        Reservation reservation = findReservation(id);

        if (!caller.hasPermission("RESERVATION:GERER") && !caller.hasPermission("RESERVATION:ANNULER_PROPRE")) {
            throw new ForbiddenException("Accès interdit : permission de suppression de réservation requise.");
        }
        boolean isManager = caller.hasPermission("RESERVATION:GERER");
        if (!isManager) {
            verifyStrictOwnership(caller, reservation, "supprimer");
        }
        if (reservation.getStatut() == StatutReservation.CONFIRMEE || reservation.getStatut() == StatutReservation.REMBOURSEE) {
            throw new BadRequestException("Suppression physique interdite pour une réservation confirmée ou remboursée afin de préserver la piste d'audit.");
        }

        reservationRepository.deleteById(id);
    }

    @Override
    public EvenementPaiementAckDto traiterEvenementPaiement(Long reservationId, EvenementPaiementNotificationRequest request) {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        if (caller == null || !caller.isServiceCall() || !"ms-paiement".equals(caller.serviceName())) {
            throw new ForbiddenException("Accès interdit : seul le service ms-paiement peut notifier un événement de paiement.");
        }

        Optional<ReservationEvenementRecu> dejaTraite = evenementRecuRepository.findByEventId(request.getEventId());
        Reservation reservation = findReservationForUpdate(reservationId);
        if (dejaTraite.isPresent()) {
            return EvenementPaiementAckDto.builder()
                    .eventId(request.getEventId())
                    .correlationId(request.getCorrelationId())
                    .reservationId(reservationId)
                    .statutReservation(reservation.getStatut())
                    .accepte(true)
                    .dejaTraite(true)
                    .message("Événement déjà traité de manière idempotente.")
                    .build();
        }

        EvenementPaiementAckDto ack = appliquerEvenementPaiement(reservation, request);
        if (ack.isAccepte() || "RESERVATION_EXPIREE".equals(ack.getCodeRejet())) {
            evenementRecuRepository.save(ReservationEvenementRecu.builder()
                    .eventId(request.getEventId())
                    .reservationId(reservationId)
                    .typeEvenement(request.getTypeEvenement())
                    .referenceTransaction(request.getReferenceTransaction())
                    .build());
        }
        return ack;
    }

    @Override
    public ReservationDto synchroniserPaiement(Long reservationId) {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        Reservation reservation = findReservationForUpdate(reservationId);

        if (!caller.hasPermission("RESERVATION:LIRE_TOUT") && !caller.hasPermission("RESERVATION:LIRE_PROPRE")) {
            throw new ForbiddenException("Accès interdit : permission requise.");
        }
        if (!caller.hasPermission("RESERVATION:LIRE_TOUT")) {
            verifyStrictOwnership(caller, reservation, "synchroniser");
        }
        if (paiementClient == null) {
            throw new ServiceIndisponibleException("Le client ms-paiement n'est pas configuré.");
        }

        List<PaiementResumeDto> paiements;
        try {
            paiements = paiementClient.getPaiementsByReservationId(reservationId);
        } catch (FeignException ex) {
            log.error("Échec de synchronisation paiement pour la réservation {}", reservationId, ex);
            throw new ServiceIndisponibleException("Le service ms-paiement est temporairement indisponible.");
        }

        if (paiements != null) {
            Optional<PaiementResumeDto> refunded = paiements.stream()
                    .filter(p -> "REMBOURSE".equalsIgnoreCase(p.getStatut()))
                    .findFirst();
            Optional<PaiementResumeDto> accepted = paiements.stream()
                    .filter(p -> "ACCEPTE".equalsIgnoreCase(p.getStatut()) || "VALIDE".equalsIgnoreCase(p.getStatut()))
                    .findFirst();

            if (refunded.isPresent() && isTransitionAllowed(reservation.getStatut(), StatutReservation.REMBOURSEE)) {
                PaiementResumeDto p = refunded.get();
                appliquerEvenementPaiement(reservation, EvenementPaiementNotificationRequest.builder()
                        .eventId("SYNC-" + UUID.randomUUID())
                        .correlationId(p.getCorrelationId())
                        .paiementId(p.getId())
                        .referenceTransaction(p.getReferenceTransaction())
                        .typeEvenement("PAIEMENT_REMBOURSE")
                        .montant(p.getMontant())
                        .devise(p.getDevise())
                        .motif("Réconciliation manuelle avec ms-paiement (remboursé)")
                        .build());
            } else if (accepted.isPresent() && reservation.getStatut() == StatutReservation.EN_ATTENTE_PAIEMENT) {
                PaiementResumeDto p = accepted.get();
                appliquerEvenementPaiement(reservation, EvenementPaiementNotificationRequest.builder()
                        .eventId("SYNC-" + UUID.randomUUID())
                        .correlationId(p.getCorrelationId())
                        .paiementId(p.getId())
                        .referenceTransaction(p.getReferenceTransaction())
                        .typeEvenement("PAIEMENT_ACCEPTE")
                        .montant(p.getMontant())
                        .devise(p.getDevise())
                        .motif("Réconciliation manuelle avec ms-paiement (accepté)")
                        .build());
            }
        }
        return enrichirDtoAvecPrestation(reservation);
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationStatsDto getStatistiques() {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        if (!caller.hasPermission("RESERVATION:LIRE_TOUT") && !caller.hasPermission("RESERVATION:GERER")) {
            throw new ForbiddenException("Accès interdit : privilèges gestionnaire ou administrateur requis.");
        }
        List<Reservation> all = reservationRepository.findAll();
        BigDecimal totalConfirme = all.stream()
                .filter(r -> r.getStatut() == StatutReservation.CONFIRMEE)
                .map(r -> r.getMontantTotal() != null ? r.getMontantTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalEnAttente = all.stream()
                .filter(r -> r.getStatut() == StatutReservation.EN_ATTENTE_PAIEMENT)
                .map(r -> r.getMontantTotal() != null ? r.getMontantTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return ReservationStatsDto.builder()
                .totalReservations(all.size())
                .brouillon(countByStatus(all, StatutReservation.BROUILLON))
                .enAttentePaiement(countByStatus(all, StatutReservation.EN_ATTENTE_PAIEMENT))
                .confirmees(countByStatus(all, StatutReservation.CONFIRMEE))
                .expirees(countByStatus(all, StatutReservation.EXPIREE))
                .annulees(countByStatus(all, StatutReservation.ANNULEE))
                .echecs(countByStatus(all, StatutReservation.ECHEC))
                .remboursees(countByStatus(all, StatutReservation.REMBOURSEE))
                .placesReserveesActives(all.stream()
                        .filter(r -> ACTIVE_SEAT_HOLDING_STATUTS.contains(r.getStatut()))
                        .mapToLong(Reservation::getNombrePlaces).sum())
                .montantTotalConfirme(totalConfirme)
                .montantTotalEnAttente(totalEnAttente)
                .devise(DEVISE_XOF)
                .reservationsParCircuit(all.stream().filter(r -> r.getTypeReservation() == TypeReservation.CIRCUIT).count())
                .reservationsParEvenement(all.stream().filter(r -> r.getTypeReservation() == TypeReservation.EVENEMENT).count())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ManifesteParticipantDto> getManifesteGuidePourCircuit(Long circuitId) {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        if (!"GUIDE".equals(caller.role()) && !caller.hasPermission("RESERVATION:LIRE_TOUT")) {
            throw new ForbiddenException("Accès interdit : manifeste réservé au guide responsable ou au gestionnaire.");
        }
        CircuitDto circuit = recupererCircuit(circuitId);
        if ("GUIDE".equals(caller.role()) && !Objects.equals(caller.userId(), circuit.getGuideResponsableId())) {
            throw new ForbiddenException("Accès interdit (BOLA) : vous n'êtes pas le guide responsable de ce circuit.");
        }

        return reservationRepository
                .findByCircuitIdAndStatutInOrderByDatePrestationAsc(circuitId, List.of(StatutReservation.CONFIRMEE, StatutReservation.EN_ATTENTE_PAIEMENT))
                .stream()
                .map(r -> ManifesteParticipantDto.builder()
                        .reservationId(r.getId())
                        .referenceReservation(r.getReferenceReservation())
                        .circuitId(r.getCircuitId())
                        .nomClient(r.getNomClient())
                        .nombrePlaces(r.getNombrePlaces())
                        .datePrestation(r.getDatePrestation())
                        .creneauPrestation(r.getCreneauPrestation())
                        .statut(r.getStatut())
                        .commentaire(r.getCommentaire())
                        .participants(reservationMapper.toParticipantDtos(r.getParticipants()))
                        .build())
                .toList();
    }

    @Override
    @Scheduled(fixedDelay = 30000)
    public int expirerReservationsEchues() {
        LocalDateTime now = LocalDateTime.now(Reservation.CASAMANCE_ZONE);
        List<Reservation> expiredList = reservationRepository.findExpiredReservations(StatutReservation.EN_ATTENTE_PAIEMENT, now);
        if (expiredList == null || expiredList.isEmpty()) {
            return 0;
        }
        int count = 0;
        for (Reservation candidate : expiredList) {
            Reservation locked = reservationRepository.findByIdForUpdate(candidate.getId()).orElse(null);
            if (locked == null || locked.getStatut() != StatutReservation.EN_ATTENTE_PAIEMENT) {
                continue;
            }
            if (locked.getExpiresAt() != null && locked.getExpiresAt().isBefore(now)) {
                appliquerTransition(locked, StatutReservation.EXPIREE, null, "SYSTEM", "SYSTEM",
                        locked.getCorrelationId(), null, "Délai de paiement expiré automatiquement");
                reservationRepository.save(locked);
                libererPlacesSiApplicable(locked);
                count++;
            }
        }
        if (count > 0) {
            log.info("Expiration automatique de {} réservation(s) en attente de paiement.", count);
        }
        return count;
    }

    private EvenementPaiementAckDto appliquerEvenementPaiement(Reservation reservation, EvenementPaiementNotificationRequest req) {
        LocalDateTime now = LocalDateTime.now(Reservation.CASAMANCE_ZONE);
        String eventType = safeUpper(req.getTypeEvenement(), "");
        StatutReservation current = reservation.getStatut();

        if ("PAIEMENT_ACCEPTE".equals(eventType)) {
            if (current == StatutReservation.CONFIRMEE && Objects.equals(req.getReferenceTransaction(), reservation.getReferencePaiement())) {
                return ackOk(req, reservation, true, "Réservation déjà confirmée pour cette transaction.");
            }
            if (!DEVISE_XOF.equalsIgnoreCase(req.getDevise() != null ? req.getDevise() : DEVISE_XOF)
                    || req.getMontant() == null
                    || req.getMontant().setScale(2, RoundingMode.HALF_UP).compareTo(reservation.getMontantTotal().setScale(2, RoundingMode.HALF_UP)) != 0) {
                return ackReject(req, reservation, "MONTANT_INCOHERENT",
                        "Montant ou devise incohérente entre paiement et réservation.");
            }
            if (current == StatutReservation.EXPIREE || (current == StatutReservation.EN_ATTENTE_PAIEMENT
                    && reservation.getExpiresAt() != null && reservation.getExpiresAt().isBefore(now))) {
                if (current == StatutReservation.EN_ATTENTE_PAIEMENT) {
                    appliquerTransition(reservation, StatutReservation.EXPIREE, null, "SYSTEM", "SERVICE",
                            req.getCorrelationId(), req.getReferenceTransaction(), "Expiration constatée lors du callback paiement");
                    reservationRepository.save(reservation);
                    libererPlacesSiApplicable(reservation);
                }
                return ackReject(req, reservation, "RESERVATION_EXPIREE",
                        "La réservation est expirée et ne peut pas être confirmée.");
            }
            if (current != StatutReservation.EN_ATTENTE_PAIEMENT) {
                return ackReject(req, reservation, "STATUT_INCOMPATIBLE",
                        "Statut de réservation incompatible pour confirmation : " + current);
            }

            reservation.setReferencePaiement(req.getReferenceTransaction());
            reservation.setDateConfirmation(now);
            appliquerTransition(reservation, StatutReservation.CONFIRMEE, null, "SYSTEM", "SERVICE",
                    req.getCorrelationId(), req.getReferenceTransaction(),
                    req.getMotif() != null ? req.getMotif() : "Paiement simulé accepté");
            reservationRepository.save(reservation);
            notifierAsyncNonBloquant(reservation,
                    "Confirmation de réservation " + reservation.getReferenceReservation(),
                    "Bonjour " + reservation.getNomClient() + ", votre réservation " + reservation.getReferenceReservation()
                            + " est confirmée suite au paiement simulé " + req.getReferenceTransaction()
                            + " (" + reservation.getMontantTotal() + " XOF).");
            return ackOk(req, reservation, false, "Réservation confirmée.");
        }

        if ("PAIEMENT_REFUSE".equals(eventType) && current == StatutReservation.EN_ATTENTE_PAIEMENT) {
            appliquerTransition(reservation, StatutReservation.ECHEC, null, "SYSTEM", "SERVICE",
                    req.getCorrelationId(), req.getReferenceTransaction(),
                    req.getMotif() != null ? req.getMotif() : "Paiement simulé refusé");
            reservation.setReferencePaiement(req.getReferenceTransaction());
            reservationRepository.save(reservation);
            libererPlacesSiApplicable(reservation);
            return ackOk(req, reservation, false, "Réservation passée en ECHEC suite au refus de paiement.");
        }

        if ("PAIEMENT_EXPIRE".equals(eventType) && current == StatutReservation.EN_ATTENTE_PAIEMENT) {
            appliquerTransition(reservation, StatutReservation.EXPIREE, null, "SYSTEM", "SERVICE",
                    req.getCorrelationId(), req.getReferenceTransaction(),
                    req.getMotif() != null ? req.getMotif() : "Paiement simulé expiré");
            reservationRepository.save(reservation);
            libererPlacesSiApplicable(reservation);
            return ackOk(req, reservation, false, "Réservation expirée suite à l'expiration du paiement.");
        }

        if ("PAIEMENT_ANNULE".equals(eventType)) {
            return ackOk(req, reservation, false, "Tentative de paiement annulée enregistrée.");
        }

        if ("PAIEMENT_REMBOURSE".equals(eventType)) {
            if (current == StatutReservation.REMBOURSEE) {
                return ackOk(req, reservation, true, "Réservation déjà remboursée.");
            }
            if (!isTransitionAllowed(current, StatutReservation.REMBOURSEE)) {
                return ackReject(req, reservation, "STATUT_INCOMPATIBLE",
                        "Impossible de passer en REMBOURSEE depuis " + current);
            }
            appliquerTransition(reservation, StatutReservation.REMBOURSEE, null, "SYSTEM", "SERVICE",
                    req.getCorrelationId(), req.getReferenceTransaction(),
                    req.getMotif() != null ? req.getMotif() : "Remboursement simulé intégral confirmé");
            reservationRepository.save(reservation);
            libererPlacesSiApplicable(reservation);
            notifierAsyncNonBloquant(reservation,
                    "Remboursement simulé - Réservation " + reservation.getReferenceReservation(),
                    "Bonjour " + reservation.getNomClient() + ", votre remboursement simulé pour la réservation "
                            + reservation.getReferenceReservation() + " (" + reservation.getMontantTotal() + " XOF) a été validé.");
            return ackOk(req, reservation, false, "Réservation passée en REMBOURSEE.");
        }

        return ackReject(req, reservation, "EVENEMENT_INCONNU", "Type d'événement paiement non géré : " + req.getTypeEvenement());
    }

    private PrestationValidation validerEtChargerPrestation(ReservationDto dto, LocalDateTime now) {
        if (dto.getTypeReservation() == TypeReservation.CIRCUIT) {
            if (dto.getCircuitId() == null) {
                throw new BadRequestException("L'identifiant du circuit (circuitId) est obligatoire pour une réservation de type CIRCUIT");
            }
            CircuitDto circuit = recupererCircuit(dto.getCircuitId());
            String statut = safeUpper(circuit.getStatutCircuit(), "PUBLIE");
            if (!"PUBLIE".equals(statut)) {
                throw new BadRequestException("Le circuit " + dto.getCircuitId() + " n'est pas publié (statut : " + statut + ").");
            }
            validerDevise(circuit.getDevise());
            LocalDate effectiveDate = dto.getDatePrestation() != null
                    ? dto.getDatePrestation()
                    : LocalDate.now(Reservation.CASAMANCE_ZONE);
            if (effectiveDate.isBefore(LocalDate.now(Reservation.CASAMANCE_ZONE))) {
                throw new BadRequestException("La date de prestation du circuit ne peut pas être dans le passé.");
            }
            return new PrestationValidation(
                    dto.getCircuitId(),
                    effectiveDate,
                    effectiveDate,
                    Math.max(0, circuit.getPlacesMax()),
                    extractNonNullPrice(circuit.getPrix()),
                    null,
                    circuit,
                    null
            );
        }

        if (dto.getEvenementId() == null) {
            throw new BadRequestException("L'identifiant de l'événement (evenementId) est obligatoire pour une réservation de type EVENEMENT");
        }
        EvenementDto evenement = recupererEvenement(dto.getEvenementId());
        String statut = safeUpper(evenement.getStatutEvenement(), "PUBLIE");
        if (!"PUBLIE".equals(statut)) {
            throw new BadRequestException("L'événement " + dto.getEvenementId() + " n'est pas publié (statut : " + statut + ").");
        }
        if (!evenement.isOuvertReservation()) {
            throw new BadRequestException("L'événement " + dto.getEvenementId() + " n'est pas ouvert à la réservation.");
        }
        validerDevise(evenement.getDevise());
        if (evenement.getDateFin() != null && evenement.getDateFin().isBefore(now)) {
            throw new BadRequestException("Impossible de réserver un événement déjà terminé.");
        }
        LocalDate start = evenement.getDateDebut() != null ? evenement.getDateDebut().toLocalDate() : LocalDate.now(Reservation.CASAMANCE_ZONE);
        LocalDate end = evenement.getDateFin() != null ? evenement.getDateFin().toLocalDate() : start;
        LocalDate effectiveDate = dto.getDatePrestation() != null ? dto.getDatePrestation() : start;
        if (effectiveDate.isBefore(start) || effectiveDate.isAfter(end)) {
            throw new BadRequestException("La date choisie (" + effectiveDate + ") doit être comprise entre " + start + " et " + end + ".");
        }
        return new PrestationValidation(
                dto.getEvenementId(),
                effectiveDate,
                start,
                Math.max(0, evenement.getCapaciteMax()),
                extractNonNullPrice(evenement.getPrix()),
                evenement.getHoraires(),
                null,
                evenement
        );
    }

    private Reservation acquireCapacityAndExpireStale(
            ReservationDto requestDto,
            Long prestationId,
            LocalDate effectiveDate,
            LocalDate allocationLockDate,
            int capacityLimit,
            int requestedSeats,
            Long utilisateurId,
            String normalizedIdempotencyKey,
            LocalDateTime now
    ) {
        TypeReservation type = requestDto.getTypeReservation();
        DisponibilitePrestation lock = disponibiliteLockService != null
                ? disponibiliteLockService.acquerirVerrou(type, prestationId, allocationLockDate, capacityLimit)
                : null;

        if (normalizedIdempotencyKey != null) {
            Optional<Reservation> existingAfterLock = reservationRepository
                    .findByUtilisateurIdAndIdempotencyKey(utilisateurId, normalizedIdempotencyKey);
            if (existingAfterLock.isPresent()) {
                return existingAfterLock.get();
            }
        }

        List<Reservation> expiredHolds = reservationRepository.findExpiredPendingForPrestation(type, prestationId, now);
        if (expiredHolds != null && !expiredHolds.isEmpty()) {
            for (Reservation stale : expiredHolds) {
                appliquerTransition(stale, StatutReservation.EXPIREE, null, "SYSTEM", "SYSTEM",
                        stale.getCorrelationId(), null, "Libération automatique après expiration du délai de paiement");
                reservationRepository.save(stale);
            }
        }

        List<Reservation> duplicates = reservationRepository.findActiveDuplicateReservations(
                utilisateurId, type, prestationId, effectiveDate, ACTIVE_SEAT_HOLDING_STATUTS);
        if (duplicates != null && !duplicates.isEmpty()) {
            throw new ConflictException("Vous disposez déjà d'une réservation active ("
                    + duplicates.getFirst().getReferenceReservation() + ") pour cette prestation à cette date.");
        }

        int occupied = countOccupiedSeats(type, prestationId, effectiveDate);
        if (capacityLimit > 0 && occupied + requestedSeats > capacityLimit) {
            int remaining = Math.max(0, capacityLimit - occupied);
            String label = type == TypeReservation.CIRCUIT ? "le circuit " : "l'événement ";
            throw new BadRequestException("Capacité insuffisante pour " + label + prestationId
                    + " : " + remaining + " place(s) disponible(s), " + requestedSeats + " demandée(s)");
        }

        if (lock != null && disponibiliteRepository != null) {
            lock.setCapaciteTotale(capacityLimit);
            lock.setPlacesReservees(occupied + requestedSeats);
            disponibiliteRepository.save(lock);
        }
        return null;
    }

    private void libererPlacesSiApplicable(Reservation saved) {
        if (disponibiliteRepository == null || saved.resolvePrestationId() == null || saved.getDatePrestation() == null) {
            return;
        }
        LocalDate lockDate = resolveAllocationDateForRelease(saved);
        disponibiliteRepository.findByKeyForUpdate(saved.getTypeReservation(), saved.resolvePrestationId(), lockDate)
                .ifPresent(lock -> {
                    int occupied = countOccupiedSeats(saved.getTypeReservation(), saved.resolvePrestationId(), saved.getDatePrestation());
                    lock.setPlacesReservees(occupied);
                    disponibiliteRepository.save(lock);
                });
    }

    private LocalDate resolveAllocationDateForRelease(Reservation r) {
        if (r.getTypeReservation() == TypeReservation.EVENEMENT && evenementClient != null) {
            try {
                EvenementDto ev = evenementClient.getEvenementById(r.getEvenementId());
                if (ev != null && ev.getDateDebut() != null) {
                    return ev.getDateDebut().toLocalDate();
                }
            } catch (FeignException ignored) {
                log.debug("Fallback datePrestation pour libération événement {}", r.getEvenementId());
            }
        }
        return r.getDatePrestation();
    }

    private int countOccupiedSeats(TypeReservation type, Long prestationId, LocalDate effectiveDate) {
        if (type == TypeReservation.CIRCUIT) {
            return reservationRepository.sumPlacesByCircuitIdAndDateAndStatutIn(prestationId, effectiveDate, ACTIVE_SEAT_HOLDING_STATUTS);
        }
        return reservationRepository.sumPlacesByEvenementIdAndStatutIn(prestationId, ACTIVE_SEAT_HOLDING_STATUTS);
    }

    private ReservationDto handleIdempotentReplay(Reservation existing, ReservationDto requestDto) {
        boolean samePrestation = existing.getTypeReservation() == requestDto.getTypeReservation()
                && Objects.equals(existing.resolvePrestationId(),
                requestDto.getTypeReservation() == TypeReservation.CIRCUIT ? requestDto.getCircuitId() : requestDto.getEvenementId())
                && existing.getNombrePlaces() == requestDto.getNombrePlaces()
                && (requestDto.getDatePrestation() == null || Objects.equals(existing.getDatePrestation(), requestDto.getDatePrestation()));
        if (!samePrestation) {
            throw new ConflictException("La clé d'idempotence '" + existing.getIdempotencyKey()
                    + "' a déjà été utilisée pour une autre réservation.");
        }
        ReservationDto replayDto = enrichirDtoAvecPrestation(existing);
        replayDto.setRejoueeIdempotence(true);
        return replayDto;
    }

    private Reservation buildNewReservationEntity(
            ReservationDto dto,
            SecurityUserContext caller,
            Long effectiveUserId,
            String idempotencyKey,
            PrestationValidation ctx,
            BigDecimal montantTotal,
            StatutReservation targetStatut,
            LocalDateTime now
    ) {
        String emailClient = (!caller.hasPermission("RESERVATION:GERER") && caller.email() != null && !caller.email().isBlank())
                ? caller.email()
                : dto.getEmailClient();

        String correlationId = UUID.randomUUID().toString();
        String ref = "RES-" + now.format(REF_DATE_FMT) + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);
        String creneau = (dto.getCreneauPrestation() != null && !dto.getCreneauPrestation().isBlank())
                ? dto.getCreneauPrestation().trim()
                : ctx.defaultCreneau();

        Reservation reservation = Reservation.builder()
                .referenceReservation(ref)
                .utilisateurId(effectiveUserId)
                .nomClient(dto.getNomClient().trim())
                .emailClient(emailClient != null ? emailClient.trim() : null)
                .telephoneClient(dto.getTelephoneClient() != null ? dto.getTelephoneClient().trim() : null)
                .nombrePlaces(dto.getNombrePlaces())
                .datePrestation(ctx.effectiveDate())
                .creneauPrestation(creneau)
                .commentaire(dto.getCommentaire() != null ? dto.getCommentaire().trim() : null)
                .dateReservation(now)
                .typeReservation(dto.getTypeReservation())
                .statut(targetStatut)
                .prixUnitaire(ctx.prixUnitaire())
                .montantTotal(montantTotal)
                .devise(DEVISE_XOF)
                .circuitId(dto.getTypeReservation() == TypeReservation.CIRCUIT ? ctx.prestationId() : null)
                .evenementId(dto.getTypeReservation() == TypeReservation.EVENEMENT ? ctx.prestationId() : null)
                .expiresAt(targetStatut == StatutReservation.EN_ATTENTE_PAIEMENT ? now.plusMinutes(Math.max(1, expirationMinutes)) : null)
                .dateCreation(now)
                .dateModification(now)
                .correlationId(correlationId)
                .idempotencyKey(idempotencyKey)
                .build();

        if (dto.getParticipants() != null) {
            for (ParticipantDto p : dto.getParticipants()) {
                reservation.getParticipants().add(ReservationParticipant.builder()
                        .reservation(reservation)
                        .nomComplet(p.getNomComplet().trim())
                        .email(p.getEmail() != null ? p.getEmail().trim() : null)
                        .telephone(p.getTelephone() != null ? p.getTelephone().trim() : null)
                        .categorie(p.getCategorie() != null && !p.getCategorie().isBlank() ? p.getCategorie().trim().toUpperCase(Locale.ROOT) : "ADULTE")
                        .build());
            }
        }

        reservation.getHistorique().add(ReservationHistorique.builder()
                .reservation(reservation)
                .ancienStatut(null)
                .nouveauStatut(targetStatut)
                .acteurId(caller.userId())
                .acteurRole(caller.role())
                .acteurType("USER")
                .correlationId(correlationId)
                .motif(targetStatut == StatutReservation.BROUILLON
                        ? "Création du brouillon de réservation"
                        : "Création en attente de paiement simulé")
                .dateTransition(now)
                .build());

        return reservation;
    }

    private void appliquerTransition(
            Reservation reservation,
            StatutReservation nouveauStatut,
            Long acteurId,
            String acteurRole,
            String acteurType,
            String correlationId,
            String referencePaiement,
            String motif
    ) {
        StatutReservation ancien = reservation.getStatut();
        if (!isTransitionAllowed(ancien, nouveauStatut)) {
            throw new ConflictException("Transition de réservation non autorisée : " + ancien + " -> " + nouveauStatut);
        }
        reservation.setStatut(nouveauStatut);
        reservation.setMotifStatut(motif);
        reservation.setDateModification(LocalDateTime.now(Reservation.CASAMANCE_ZONE));
        reservation.getHistorique().add(ReservationHistorique.builder()
                .reservation(reservation)
                .ancienStatut(ancien)
                .nouveauStatut(nouveauStatut)
                .acteurId(acteurId)
                .acteurRole(acteurRole)
                .acteurType(acteurType)
                .correlationId(correlationId)
                .referencePaiement(referencePaiement)
                .motif(motif)
                .dateTransition(LocalDateTime.now(Reservation.CASAMANCE_ZONE))
                .build());
    }

    private boolean isTransitionAllowed(StatutReservation from, StatutReservation to) {
        if (from == null || to == null) {
            return false;
        }
        return ALLOWED_TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }

    private BigDecimal calculerEtValiderMontant(BigDecimal prixUnitaire, int nombrePlaces, BigDecimal clientSuppliedTotal) {
        if (prixUnitaire.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Le tarif de la prestation ne peut pas être négatif.");
        }
        BigDecimal total = prixUnitaire.multiply(BigDecimal.valueOf(nombrePlaces)).setScale(2, RoundingMode.HALF_UP);
        if (clientSuppliedTotal != null && clientSuppliedTotal.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal supplied = clientSuppliedTotal.setScale(2, RoundingMode.HALF_UP);
            if (supplied.compareTo(total) != 0) {
                throw new BadRequestException("Montant invalide : le montant total doit être calculé côté serveur ("
                        + total + " XOF, reçu : " + supplied + ").");
            }
        }
        return total;
    }

    private void validerParticipants(List<ParticipantDto> participants, int nombrePlaces) {
        if (participants != null && !participants.isEmpty() && participants.size() > nombrePlaces) {
            throw new BadRequestException("Le nombre de participants détaillés (" + participants.size()
                    + ") ne peut pas dépasser le nombre de places réservées (" + nombrePlaces + ").");
        }
    }

    private void validerDevise(String devise) {
        if (devise == null || devise.isBlank()) {
            return;
        }
        if (!DEVISE_XOF.equalsIgnoreCase(devise.trim())) {
            throw new BadRequestException("Devise non prise en charge : " + devise + " (seule XOF / FCFA est autorisée).");
        }
    }

    private BigDecimal extractNonNullPrice(BigDecimal raw) {
        return (raw != null ? raw : BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizeKey(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        String trimmed = key.trim();
        if (trimmed.length() > 128) {
            throw new BadRequestException("La clé d'idempotence ne doit pas dépasser 128 caractères.");
        }
        return trimmed;
    }

    private String safeUpper(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value.trim().toUpperCase(Locale.ROOT);
    }

    private Specification<Reservation> buildSearchSpecification(
            String q,
            StatutReservation statut,
            TypeReservation type,
            Long prestationId,
            LocalDate dateMin,
            LocalDate dateMax,
            Long scopeUserId
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (scopeUserId != null) {
                predicates.add(cb.equal(root.get("utilisateurId"), scopeUserId));
            }
            if (statut != null) {
                predicates.add(cb.equal(root.get("statut"), statut));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("typeReservation"), type));
            }
            if (prestationId != null) {
                predicates.add(cb.or(
                        cb.equal(root.get("circuitId"), prestationId),
                        cb.equal(root.get("evenementId"), prestationId)
                ));
            }
            if (dateMin != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("datePrestation"), dateMin));
            }
            if (dateMax != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("datePrestation"), dateMax));
            }
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("referenceReservation"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("nomClient"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("emailClient"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("referencePaiement"), "")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort buildSafeSort(String sortBy, String sortDir) {
        String field = sortBy != null ? sortBy.trim().toLowerCase(Locale.ROOT) : "datecreation";
        String entityField = switch (field) {
            case "dateprestation" -> "datePrestation";
            case "montant", "montanttotal" -> "montantTotal";
            case "statut" -> "statut";
            case "reference", "referencereservation" -> "referenceReservation";
            default -> "dateReservation";
        };
        Sort.Direction dir = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(dir, entityField);
    }

    private long countByStatus(List<Reservation> all, StatutReservation statut) {
        return all.stream().filter(r -> r.getStatut() == statut).count();
    }

    private ReservationDto enrichirDtoAvecPrestation(Reservation reservation) {
        CircuitDto circuit = null;
        EvenementDto evenement = null;
        try {
            if (reservation.getTypeReservation() == TypeReservation.CIRCUIT && reservation.getCircuitId() != null) {
                circuit = circuitClient.getCircuitById(reservation.getCircuitId());
            } else if (reservation.getTypeReservation() == TypeReservation.EVENEMENT && reservation.getEvenementId() != null) {
                evenement = evenementClient.getEvenementById(reservation.getEvenementId());
            }
        } catch (FeignException ex) {
            log.warn("Impossible d'enrichir la réservation {} : {}", reservation.getId(), ex.getMessage());
        }
        return enrichirDto(reservation, circuit, evenement, false);
    }

    private ReservationDto enrichirDto(Reservation entity, CircuitDto circuit, EvenementDto evenement, boolean replayed) {
        ReservationDto dto = reservationMapper.toDto(entity);
        dto.setCircuit(circuit);
        dto.setEvenement(evenement);
        dto.setParticipants(reservationMapper.toParticipantDtos(entity.getParticipants()));
        dto.setHistorique(reservationMapper.toHistoriqueDtos(entity.getHistorique()));
        dto.setRejoueeIdempotence(replayed);
        return dto;
    }

    private void notifierAsyncNonBloquant(Reservation res, String sujet, String contenu) {
        if (res.getEmailClient() == null || res.getEmailClient().isBlank()) {
            return;
        }
        String eventType = switch (res.getStatut()) {
            case CONFIRMEE -> "RESERVATION_CONFIRMEE";
            case ANNULEE -> "RESERVATION_ANNULEE";
            case REMBOURSEE -> "RESERVATION_REMBOURSEE";
            case ECHEC -> "RESERVATION_ECHEC";
            case EXPIREE -> "RESERVATION_EXPIREE";
            default -> "RESERVATION_MISE_A_JOUR";
        };
        String corrId = res.getCorrelationId() != null ? res.getCorrelationId() : "RES-" + res.getId();
        String idemKey = "RES:" + res.getId() + ":" + eventType;

        if (notificationOutboxRepository != null) {
            LocalDateTime now = LocalDateTime.now(Reservation.CASAMANCE_ZONE);
            ReservationNotificationOutbox savedOutbox = notificationOutboxRepository.save(
                    ReservationNotificationOutbox.builder()
                            .eventId(UUID.randomUUID().toString())
                            .correlationId(corrId)
                            .utilisateurId(res.getUtilisateurId())
                            .destinataire(res.getEmailClient())
                            .sujet(sujet)
                            .contenu(contenu)
                            .reservationId(res.getId())
                            .typeEvenement(eventType)
                            .cibleType("RESERVATION")
                            .cibleId(res.getId())
                            .idempotencyKey(idemKey)
                            .statut(StatutOutbox.EN_ATTENTE)
                            .prochaineTentativeAt(now)
                            .createdAt(now)
                            .build()
            );
            if (notificationOutboxRelayService != null) {
                if (TransactionSynchronizationManager.isSynchronizationActive()) {
                    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                        @Override
                        public void afterCommit() {
                            notificationOutboxRelayService.tenterLivraison(savedOutbox.getId());
                        }
                    });
                } else {
                    notificationOutboxRelayService.tenterLivraison(savedOutbox.getId());
                }
            }
            return;
        }

        if (notificationClient == null) {
            return;
        }
        try {
            notificationClient.envoyerNotification(NotificationRequest.builder()
                    .destinataire(res.getEmailClient())
                    .utilisateurId(res.getUtilisateurId())
                    .sujet(sujet)
                    .contenu(contenu)
                    .canal("EMAIL")
                    .reservationId(res.getId())
                    .typeEvenement(eventType)
                    .cibleType("RESERVATION")
                    .cibleId(res.getId())
                    .correlationId(corrId)
                    .idempotencyKey(idemKey)
                    .build());
        } catch (Exception ex) {
            log.warn("Notification non envoyée pour réservation {} : {}", res.getId(), ex.getMessage());
        }
    }

    private SecurityUserContext requireAuthenticatedContext(boolean allowPaiementServiceCall) {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        if (caller == null) {
            throw new UnauthorizedException("Accès refusé (Fail-Closed) : contexte de sécurité utilisateur absent.");
        }
        if (caller.isServiceCall()) {
            if (!allowPaiementServiceCall || !"ms-paiement".equals(caller.serviceName())) {
                throw new ForbiddenException("Accès interdit : le service '" + caller.serviceName()
                        + "' n'est pas autorisé à exécuter cette opération sur ms-reservation.");
            }
            if ("SYSTEM".equals(caller.role())) {
                return caller;
            }
        }
        if (caller.userId() == null) {
            throw new UnauthorizedException("Accès refusé (Fail-Closed) : identifiant utilisateur manquant dans le contexte de sécurité.");
        }
        return caller;
    }

    private void verifyStrictOwnership(SecurityUserContext caller, Reservation reservation, String action) {
        if (reservation.getUtilisateurId() == null) {
            throw new ForbiddenException(
                    "Accès interdit (Fail-Closed) : cette réservation n'a pas de propriétaire vérifié et ne peut pas être accédée par un compte non administrateur.");
        }
        if (!caller.userId().equals(reservation.getUtilisateurId())) {
            throw new ForbiddenException(
                    "Accès interdit : vous ne pouvez pas " + action + " la réservation d'un autre utilisateur.");
        }
    }

    private Reservation findReservation(Long id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Réservation introuvable avec l'id : " + id));
    }

    private Reservation findReservationForUpdate(Long id) {
        Optional<Reservation> locked = reservationRepository.findByIdForUpdate(id);
        if (locked.isPresent()) {
            return locked.get();
        }
        return reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Réservation introuvable avec l'id : " + id));
    }

    private CircuitDto recupererCircuit(Long circuitId) {
        try {
            return circuitClient.getCircuitById(circuitId);
        } catch (FeignException.NotFound | FeignException.Forbidden ex) {
            throw new BadRequestException("Le circuit " + circuitId + " n'existe pas ou n'est pas accessible dans ms-circuit");
        } catch (FeignException ex) {
            log.error("Erreur lors de l'appel à ms-circuit", ex);
            throw new ServiceIndisponibleException("Le service ms-circuit est indisponible");
        }
    }

    private EvenementDto recupererEvenement(Long evenementId) {
        try {
            return evenementClient.getEvenementById(evenementId);
        } catch (FeignException.NotFound | FeignException.Forbidden ex) {
            throw new BadRequestException("L'événement " + evenementId + " n'existe pas ou n'est pas accessible dans ms-evenement");
        } catch (FeignException ex) {
            log.error("Erreur lors de l'appel à ms-evenement", ex);
            throw new ServiceIndisponibleException("Le service ms-evenement est indisponible");
        }
    }

    private EvenementPaiementAckDto ackOk(EvenementPaiementNotificationRequest req, Reservation res, boolean dejaTraite, String msg) {
        return EvenementPaiementAckDto.builder()
                .eventId(req.getEventId())
                .correlationId(req.getCorrelationId())
                .reservationId(res.getId())
                .statutReservation(res.getStatut())
                .accepte(true)
                .dejaTraite(dejaTraite)
                .message(msg)
                .build();
    }

    private EvenementPaiementAckDto ackReject(EvenementPaiementNotificationRequest req, Reservation res, String codeRejet, String msg) {
        return EvenementPaiementAckDto.builder()
                .eventId(req.getEventId())
                .correlationId(req.getCorrelationId())
                .reservationId(res.getId())
                .statutReservation(res.getStatut())
                .accepte(false)
                .dejaTraite(false)
                .codeRejet(codeRejet)
                .message(msg)
                .build();
    }

    private record PrestationValidation(
            Long prestationId,
            LocalDate effectiveDate,
            LocalDate allocationLockDate,
            int capaciteMax,
            BigDecimal prixUnitaire,
            String defaultCreneau,
            CircuitDto circuit,
            EvenementDto evenement
    ) {
    }
}
