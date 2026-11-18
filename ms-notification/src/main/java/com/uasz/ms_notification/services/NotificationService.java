package com.uasz.ms_notification.services;

import com.uasz.ms_notification.dto.NotificationCompteurDto;
import com.uasz.ms_notification.dto.NotificationDto;
import com.uasz.ms_notification.dto.NotificationPageResponseDto;
import com.uasz.ms_notification.entities.Notification;
import com.uasz.ms_notification.entities.StatutNotification;
import com.uasz.ms_notification.exceptions.BadRequestException;
import com.uasz.ms_notification.exceptions.ConflictException;
import com.uasz.ms_notification.exceptions.ForbiddenException;
import com.uasz.ms_notification.exceptions.ResourceNotFoundException;
import com.uasz.ms_notification.exceptions.UnauthorizedException;
import com.uasz.ms_notification.mappers.NotificationMapper;
import com.uasz.ms_notification.repositories.NotificationRepository;
import com.uasz.ms_notification.security.SecurityUserContext;
import com.uasz.ms_notification.security.SecurityUserContextHolder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@Transactional
public class NotificationService implements INotificationService {

    public static final ZoneId CASAMANCE_ZONE = ZoneId.of("Africa/Dakar");
    private static final int DEFAULT_MAX_TENTATIVES = 3;
    private static final int MAX_PAGE_SIZE = 100;
    private static final Set<String> ALLOWED_EMITTERS = Set.of(
            "ms-paiement", "ms-reservation", "ms-utilisateur", "ms-circuit"
    );

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;
    private final NotificationDeliveryAdapter deliveryAdapter;

    @Autowired
    public NotificationService(
            NotificationRepository notificationRepository,
            NotificationMapper notificationMapper,
            NotificationDeliveryAdapter deliveryAdapter
    ) {
        this.notificationRepository = notificationRepository;
        this.notificationMapper = notificationMapper;
        this.deliveryAdapter = deliveryAdapter;
    }

    public NotificationService(NotificationRepository notificationRepository, NotificationMapper notificationMapper) {
        this(notificationRepository, notificationMapper, new NotificationDeliveryAdapter());
    }

    @Override
    public NotificationDto envoyerNotification(NotificationDto dto) {
        SecurityUserContext caller = requireAuthenticatedContext();
        boolean serviceAllowed = caller.serviceCall() && ALLOWED_EMITTERS.contains(caller.serviceName());
        boolean adminAllowed = !caller.serviceCall() && caller.isAdmin();
        if (!serviceAllowed && !adminAllowed) {
            throw new ForbiddenException("Accès interdit : seul un service métier autorisé ou un administrateur peut émettre une notification.");
        }

        String normalizedIdem = normalizeKey(dto.getIdempotencyKey());
        if (normalizedIdem != null) {
            Optional<Notification> existing = notificationRepository.findByIdempotencyKey(normalizedIdem);
            if (existing.isPresent()) {
                log.debug("Notification idempotente déjà enregistrée pour clé={}", normalizedIdem);
                return notificationMapper.toDto(existing.get());
            }
        }

        LocalDateTime now = LocalDateTime.now(CASAMANCE_ZONE);
        String correlationId = (dto.getCorrelationId() != null && !dto.getCorrelationId().isBlank())
                ? dto.getCorrelationId().trim()
                : "NOTIF-" + UUID.randomUUID().toString().substring(0, 12);
        String typeEvenement = (dto.getTypeEvenement() != null && !dto.getTypeEvenement().isBlank())
                ? dto.getTypeEvenement().trim().toUpperCase(Locale.ROOT)
                : "GENERAL";
        int maxTentatives = dto.getMaxTentatives() > 0 ? Math.min(dto.getMaxTentatives(), 10) : DEFAULT_MAX_TENTATIVES;

        Notification notification = Notification.builder()
                .destinataire(dto.getDestinataire().trim())
                .utilisateurId(dto.getUtilisateurId())
                .sujet(dto.getSujet().trim())
                .contenu(dto.getContenu().trim())
                .canal(dto.getCanal())
                .typeEvenement(typeEvenement)
                .cibleType(normalizeUpperOrNull(dto.getCibleType()))
                .cibleId(dto.getCibleId())
                .correlationId(correlationId)
                .idempotencyKey(normalizedIdem)
                .lue(false)
                .tentatives(1)
                .maxTentatives(maxTentatives)
                .dateEnvoi(now)
                .reservationId(dto.getReservationId())
                .build();

        tenterDispatch(notification, Boolean.TRUE.equals(dto.getSimulerEchecTemporaire()), now);

        try {
            Notification saved = notificationRepository.saveAndFlush(notification);
            return notificationMapper.toDto(saved);
        } catch (DataIntegrityViolationException ex) {
            if (normalizedIdem != null) {
                Optional<Notification> concurrent = notificationRepository.findByIdempotencyKey(normalizedIdem);
                if (concurrent.isPresent()) {
                    return notificationMapper.toDto(concurrent.get());
                }
            }
            throw ex;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationDto> getAllNotifications() {
        SecurityUserContext caller = requireAuthenticatedContext();
        requireReadAllPermission(caller);
        return notificationRepository.findAll().stream()
                .map(notificationMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationPageResponseDto getAllNotificationsPaged(int page, int size, StatutNotification statut, String typeEvenement) {
        SecurityUserContext caller = requireAuthenticatedContext();
        requireReadAllPermission(caller);
        Pageable pageable = buildPageable(page, size);
        String normalizedType = normalizeUpperOrNull(typeEvenement);
        Page<Notification> result = notificationRepository.findAllFiltered(statut, normalizedType, pageable);
        return toPageResponse(result, 0L);
    }

    @Override
    @Transactional(readOnly = true)
    public com.uasz.ms_notification.dto.NotificationStatsDto getStatistiques() {
        SecurityUserContext caller = requireAuthenticatedContext();
        requireReadAllPermission(caller);
        List<Notification> all = notificationRepository.findAll();

        long enAttente = 0L;
        long envoyees = 0L;
        long echecsTemp = 0L;
        long echecsDef = 0L;
        long nonLues = 0L;
        java.util.Map<String, Long> parStatut = new java.util.LinkedHashMap<>();
        java.util.Map<String, Long> parCanal = new java.util.LinkedHashMap<>();
        java.util.Map<String, Long> parType = new java.util.LinkedHashMap<>();

        for (Notification n : all) {
            StatutNotification st = n.getStatut() != null ? n.getStatut() : StatutNotification.EN_ATTENTE;
            switch (st) {
                case EN_ATTENTE -> enAttente++;
                case ENVOYEE -> envoyees++;
                case ECHEC_TEMPORAIRE -> echecsTemp++;
                case ECHEC -> echecsDef++;
            }
            if (!n.isLue()) {
                nonLues++;
            }
            parStatut.merge(st.name(), 1L, Long::sum);
            parCanal.merge(n.getCanal() != null ? n.getCanal().name() : "INCONNU", 1L, Long::sum);
            String type = (n.getTypeEvenement() != null && !n.getTypeEvenement().isBlank())
                    ? n.getTypeEvenement()
                    : "GENERAL";
            parType.merge(type, 1L, Long::sum);
        }

        return com.uasz.ms_notification.dto.NotificationStatsDto.builder()
                .total(all.size())
                .enAttente(enAttente)
                .envoyees(envoyees)
                .echecsTemporaires(echecsTemp)
                .echecsDefinitifs(echecsDef)
                .nonLuesTotal(nonLues)
                .parStatut(parStatut)
                .parCanal(parCanal)
                .parTypeEvenement(parType)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationPageResponseDto getMesNotifications(int page, int size, boolean nonLuesOnly, String typeEvenement) {
        SecurityUserContext caller = requireAuthenticatedContext();
        if (!caller.hasPermission("NOTIFICATION:LIRE_PROPRE") && !caller.isAdmin()) {
            throw new ForbiddenException("Accès interdit : permission NOTIFICATION:LIRE_PROPRE requise.");
        }
        if (caller.userId() == null) {
            throw new UnauthorizedException("Identifiant utilisateur requis.");
        }
        Pageable pageable = buildPageable(page, size);
        String normalizedType = normalizeUpperOrNull(typeEvenement);
        String safeEmail = safeEmail(caller.email());
        Page<Notification> result = notificationRepository.findOwnedNotifications(
                caller.userId(), safeEmail, nonLuesOnly, normalizedType, pageable);
        long unreadCount = notificationRepository.countUnreadOwned(caller.userId(), safeEmail);
        return toPageResponse(result, unreadCount);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationCompteurDto getMonCompteurNonLues() {
        SecurityUserContext caller = requireAuthenticatedContext();
        if (caller.userId() == null) {
            throw new UnauthorizedException("Identifiant utilisateur requis.");
        }
        long count = notificationRepository.countUnreadOwned(caller.userId(), safeEmail(caller.email()));
        return NotificationCompteurDto.builder().unreadCount(count).build();
    }

    @Override
    public NotificationDto marquerCommeLue(Long id) {
        SecurityUserContext caller = requireAuthenticatedContext();
        if (!caller.hasPermission("NOTIFICATION:GERER_PROPRE") && !caller.isAdmin()) {
            throw new ForbiddenException("Accès interdit : permission NOTIFICATION:GERER_PROPRE requise.");
        }
        Notification notification = findNotificationOrThrow(id);
        verifyOwnership(caller, notification);

        if (!notification.isLue()) {
            notification.setLue(true);
            notification.setDateLecture(LocalDateTime.now(CASAMANCE_ZONE));
            notification = notificationRepository.save(notification);
        }
        return notificationMapper.toDto(notification);
    }

    @Override
    public Map<String, Object> marquerToutesCommeLues() {
        SecurityUserContext caller = requireAuthenticatedContext();
        if (!caller.hasPermission("NOTIFICATION:GERER_PROPRE") && !caller.isAdmin()) {
            throw new ForbiddenException("Accès interdit : permission NOTIFICATION:GERER_PROPRE requise.");
        }
        if (caller.userId() == null) {
            throw new UnauthorizedException("Identifiant utilisateur requis.");
        }
        List<Notification> unread = notificationRepository.findAllUnreadOwned(caller.userId(), safeEmail(caller.email()));
        LocalDateTime now = LocalDateTime.now(CASAMANCE_ZONE);
        for (Notification n : unread) {
            n.setLue(true);
            n.setDateLecture(now);
        }
        notificationRepository.saveAll(unread);
        return Map.of("marqueesLues", unread.size(), "unreadCount", 0);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationDto getByIdNotification(Long id) {
        SecurityUserContext caller = requireAuthenticatedContext();
        Notification notification = findNotificationOrThrow(id);
        boolean isPrivileged = caller.isAdmin() || caller.hasPermission("NOTIFICATION:LIRE_TOUT");
        if (!isPrivileged) {
            verifyOwnership(caller, notification);
        }
        return notificationMapper.toDto(notification);
    }

    @Override
    public NotificationDto relancerNotification(Long id) {
        SecurityUserContext caller = requireAuthenticatedContext();
        if (!caller.isAdmin() && !caller.hasPermission("NOTIFICATION:RELANCER")) {
            throw new ForbiddenException("Accès interdit : permission NOTIFICATION:RELANCER requise.");
        }
        Notification notification = findNotificationOrThrow(id);
        if (notification.getStatut() == StatutNotification.ENVOYEE) {
            throw new ConflictException("La notification #" + id + " a déjà été livrée avec succès.");
        }
        LocalDateTime now = LocalDateTime.now(CASAMANCE_ZONE);
        notification.setTentatives(notification.getTentatives() + 1);
        tenterDispatch(notification, false, now);
        return notificationMapper.toDto(notificationRepository.save(notification));
    }

    @Override
    @Scheduled(fixedDelay = 15000)
    public int relayerNotificationsEnAttente() {
        LocalDateTime now = LocalDateTime.now(CASAMANCE_ZONE);
        List<Notification> due = notificationRepository.findByStatutInAndProchaineTentativeAtLessThanEqualOrderByDateEnvoiAsc(
                List.of(StatutNotification.EN_ATTENTE, StatutNotification.ECHEC_TEMPORAIRE),
                now
        );
        return executerRepriseBatch(due, now);
    }

    @Override
    public int forcerRepriseEchecs() {
        SecurityUserContext caller = requireAuthenticatedContext();
        if (!caller.isAdmin() && !caller.hasPermission("NOTIFICATION:RELANCER")) {
            throw new ForbiddenException("Accès interdit : permission NOTIFICATION:RELANCER requise.");
        }
        LocalDateTime now = LocalDateTime.now(CASAMANCE_ZONE);
        List<Notification> pending = notificationRepository.findByStatutInOrderByDateEnvoiAsc(
                List.of(StatutNotification.EN_ATTENTE, StatutNotification.ECHEC_TEMPORAIRE)
        );
        return executerRepriseBatch(pending, now);
    }

    @Override
    public void deleteNotification(Long id) {
        SecurityUserContext caller = requireAuthenticatedContext();
        if (!caller.isAdmin() && !caller.hasPermission("NOTIFICATION:LIRE_TOUT")) {
            throw new ForbiddenException("Accès interdit : seul un administrateur peut supprimer une notification.");
        }
        if (!notificationRepository.existsById(id)) {
            throw new ResourceNotFoundException("Notification introuvable avec l'id : " + id);
        }
        notificationRepository.deleteById(id);
    }

    private int executerRepriseBatch(List<Notification> notifications, LocalDateTime now) {
        if (notifications == null || notifications.isEmpty()) {
            return 0;
        }
        int succeeded = 0;
        for (Notification notification : notifications) {
            notification.setTentatives(notification.getTentatives() + 1);
            tenterDispatch(notification, false, now);
            notificationRepository.save(notification);
            if (notification.getStatut() == StatutNotification.ENVOYEE) {
                succeeded++;
            }
        }
        return succeeded;
    }

    private void tenterDispatch(Notification notification, boolean simulateFailure, LocalDateTime now) {
        try {
            deliveryAdapter.dispatch(notification, simulateFailure);
            notification.setStatut(StatutNotification.ENVOYEE);
            notification.setDernierErreur(null);
            notification.setProchaineTentativeAt(null);
        } catch (Exception ex) {
            int max = notification.getMaxTentatives() > 0 ? notification.getMaxTentatives() : DEFAULT_MAX_TENTATIVES;
            String err = ex.getMessage() != null ? ex.getMessage() : "Erreur de livraison inconnue";
            notification.setDernierErreur(err.length() <= 1000 ? err : err.substring(0, 1000));
            if (notification.getTentatives() >= max) {
                notification.setStatut(StatutNotification.ECHEC);
                notification.setProchaineTentativeAt(null);
            } else {
                notification.setStatut(StatutNotification.ECHEC_TEMPORAIRE);
                long delaySeconds = Math.min(300L, 5L * (1L << Math.min(notification.getTentatives(), 5)));
                notification.setProchaineTentativeAt(now.plusSeconds(delaySeconds));
            }
            log.warn("Échec livraison notification (tentative {}/{}, statut={}) : {}",
                    notification.getTentatives(), max, notification.getStatut(), err);
        }
    }

    private SecurityUserContext requireAuthenticatedContext() {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        if (caller == null) {
            throw new UnauthorizedException("Accès refusé (Fail-Closed) : contexte de sécurité absent.");
        }
        return caller;
    }

    private void requireReadAllPermission(SecurityUserContext caller) {
        if (!caller.isAdmin() && !caller.hasPermission("NOTIFICATION:LIRE_TOUT")) {
            throw new ForbiddenException("Accès interdit : permission NOTIFICATION:LIRE_TOUT requise.");
        }
    }

    private void verifyOwnership(SecurityUserContext caller, Notification notification) {
        boolean sameUser = notification.getUtilisateurId() != null
                && caller.userId() != null
                && notification.getUtilisateurId().equals(caller.userId());
        boolean legacyEmailMatch = notification.getUtilisateurId() == null
                && caller.email() != null
                && !caller.email().isBlank()
                && notification.getDestinataire() != null
                && notification.getDestinataire().equalsIgnoreCase(caller.email());
        if (!sameUser && !legacyEmailMatch) {
            throw new ForbiddenException("Accès interdit (BOLA) : cette notification appartient à un autre utilisateur.");
        }
    }

    private Notification findNotificationOrThrow(Long id) {
        return notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification introuvable avec l'id : " + id));
    }

    private Pageable buildPageable(int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new BadRequestException("Paramètres de pagination invalides (page >= 0, 1 <= size <= " + MAX_PAGE_SIZE + ").");
        }
        return PageRequest.of(page, size);
    }

    private NotificationPageResponseDto toPageResponse(Page<Notification> page, long unreadCount) {
        return NotificationPageResponseDto.builder()
                .content(page.getContent().stream().map(notificationMapper::toDto).toList())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .unreadCount(unreadCount)
                .build();
    }

    private String normalizeKey(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        String trimmed = key.trim();
        if (trimmed.length() > 160) {
            throw new BadRequestException("La clé d'idempotence ne doit pas dépasser 160 caractères.");
        }
        return trimmed;
    }

    private String normalizeUpperOrNull(String val) {
        if (val == null || val.isBlank()) {
            return null;
        }
        return val.trim().toUpperCase(Locale.ROOT);
    }

    private static String safeEmail(String email) {
        return email != null ? email.trim() : "";
    }
}
