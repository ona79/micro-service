package com.uasz.ms_utilisateur.services;

import com.uasz.ms_utilisateur.dto.AuditSecuriteDto;
import com.uasz.ms_utilisateur.dto.PageResponseDto;
import com.uasz.ms_utilisateur.entities.AuditSecurite;
import com.uasz.ms_utilisateur.repositories.AuditSecuriteRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditSecuriteService {

    public record AuditSummary(long totalLogs, long alertes24h, long echecsConnexion24h) {}

    private final AuditSecuriteRepository auditRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logEvent(String eventType, Long userId, String email, String ip, String details, String status) {
        try {
            AuditSecurite audit = AuditSecurite.builder()
                    .timestamp(LocalDateTime.now())
                    .eventType(eventType)
                    .utilisateurId(userId)
                    .email(email)
                    .ipAddress(ip)
                    .details(details)
                    .status(status)
                    .build();
            auditRepository.save(audit);
            log.info("AUDIT_SECURITE [type={}, user={}, email={}, status={}, ip={}]: {}",
                    eventType, userId, email, status, ip, details);
        } catch (Exception ex) {
            log.error("Échec de journalisation d'audit de sécurité", ex);
        }
    }

    public void logLoginSuccess(Long userId, String email, String ip, String sessionId) {
        logEvent("LOGIN_SUCCESS", userId, email, ip, "Connexion réussie - Session: " + sessionId, "SUCCESS");
    }

    public void logLoginFailure(String email, String ip, String reason) {
        logEvent("LOGIN_FAILURE", null, email, ip, "Échec de connexion - Raison: " + reason, "FAILURE");
    }

    public void logLogout(Long userId, String email, String ip, String sessionId) {
        logEvent("LOGOUT", userId, email, ip, "Déconnexion volontaire - Session: " + sessionId, "SUCCESS");
    }

    public void logTokenRefresh(Long userId, String email, String ip, String familyId) {
        logEvent("TOKEN_REFRESH", userId, email, ip, "Rotation Refresh Token réussie - Famille: " + familyId, "SUCCESS");
    }

    public void logTokenReplayAlert(String familyId, Long userId, String ip) {
        logEvent("ALERT_TOKEN_REPLAY", userId, null, ip,
                "ALERTE CRITIQUE : Rejeu de Refresh Token révoqué détecté sur la famille " + familyId, "ALERT");
    }

    public void logRoleChange(Long targetUserId, String oldRole, String newRole, Long adminId, String ip) {
        logEvent("ROLE_CHANGE", targetUserId, null, ip,
                String.format("Changement de rôle de %s à %s par l'administrateur %d", oldRole, newRole, adminId), "SUCCESS");
    }

    public void logAdminAction(String action, Long adminId, String ip, String details) {
        logEvent("ADMIN_ACTION", adminId, null, ip, action + " : " + details, "SUCCESS");
    }

    public void logAccessDenied(Long userId, String email, String ip, String resource) {
        logEvent("ACCESS_DENIED", userId, email, ip, "Accès interdit à la ressource : " + resource, "DENIED");
    }

    @Transactional(readOnly = true)
    public AuditSummary getAuditSummary() {
        LocalDateTime since24h = LocalDateTime.now().minusHours(24);
        long total = auditRepository.count();
        long alerts = auditRepository.countByStatusAndTimestampAfter("ALERT", since24h)
                + auditRepository.countByStatusAndTimestampAfter("DENIED", since24h);
        long failures = auditRepository.countByEventTypeAndTimestampAfter("LOGIN_FAILURE", since24h);
        return new AuditSummary(total, alerts, failures);
    }

    @Transactional(readOnly = true)
    public PageResponseDto<AuditSecuriteDto> rechercherAuditLogs(
            String eventType,
            Long utilisateurId,
            String q,
            int page,
            int size
    ) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(1, size), 100);
        String eventFilter = (eventType != null && !eventType.isBlank()) ? eventType.trim() : null;
        String qLower = (q != null && !q.isBlank()) ? q.trim().toLowerCase(Locale.ROOT) : null;

        Specification<AuditSecurite> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (eventFilter != null) {
                predicates.add(cb.equal(root.get("eventType"), eventFilter));
            }
            if (utilisateurId != null) {
                predicates.add(cb.equal(root.get("utilisateurId"), utilisateurId));
            }
            if (qLower != null) {
                String pattern = "%" + qLower + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(cb.coalesce(root.get("email"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("details"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("ipAddress"), "")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("eventType"), "")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<AuditSecurite> pageResult = auditRepository.findAll(
                spec,
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "timestamp", "id"))
        );

        List<AuditSecuriteDto> content = pageResult.getContent().stream()
                .map(a -> AuditSecuriteDto.builder()
                        .id(a.getId())
                        .timestamp(a.getTimestamp())
                        .eventType(a.getEventType())
                        .utilisateurId(a.getUtilisateurId())
                        .email(a.getEmail())
                        .ipAddress(a.getIpAddress())
                        .details(a.getDetails())
                        .status(a.getStatus())
                        .build())
                .toList();

        return PageResponseDto.<AuditSecuriteDto>builder()
                .content(content)
                .page(pageResult.getNumber())
                .size(pageResult.getSize())
                .totalElements(pageResult.getTotalElements())
                .totalPages(pageResult.getTotalPages())
                .last(pageResult.isLast())
                .build();
    }
}
