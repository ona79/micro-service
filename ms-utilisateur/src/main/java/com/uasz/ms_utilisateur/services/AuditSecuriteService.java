package com.uasz.ms_utilisateur.services;

import com.uasz.ms_utilisateur.entities.AuditSecurite;
import com.uasz.ms_utilisateur.repositories.AuditSecuriteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditSecuriteService {

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
}
