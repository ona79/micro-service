package com.uasz.ms_utilisateur.security;

import com.uasz.ms_utilisateur.repositories.RefreshTokenRepository;
import com.uasz.ms_utilisateur.repositories.SessionUtilisateurRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Service transactionnel indépendant (REQUIRES_NEW) garantissant la persistance immédiate
 * des révocations de familles de Refresh Tokens et de sessions utilisateur, même lorsque
 * la transaction appelante lève une exception HTTP 401/403.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SessionRevocationService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final SessionUtilisateurRepository sessionRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeFamilyAndSessionOnReplay(String familyId, String sessionId, LocalDateTime now) {
        int revokedTokens = refreshTokenRepository.revokeEntireFamily(familyId, now);
        int deactivatedSessions = sessionRepository.deactivateSessionWithReason(
                sessionId, "REPLAY_ATTACK_FAMILY_REVOKED");
        log.warn("Révocation persistée [REQUIRES_NEW] suite à un rejeu : famille={}, session={}, tokensRévoqués={}, sessionsDésactivées={}",
                familyId, sessionId, revokedTokens, deactivatedSessions);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeFamilyAndSession(String familyId, String sessionId, String reason, LocalDateTime now) {
        refreshTokenRepository.revokeEntireFamily(familyId, now);
        if (sessionId != null && !sessionId.isBlank()) {
            sessionRepository.deactivateSessionWithReason(sessionId, reason);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeSessionOnly(String sessionId, String reason, LocalDateTime now) {
        if (sessionId != null && !sessionId.isBlank()) {
            sessionRepository.deactivateSessionWithReason(sessionId, reason);
            refreshTokenRepository.revokeBySessionId(sessionId, now);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void revokeAllSessionsAndTokensForUser(Long userId, String reason, LocalDateTime now) {
        if (userId != null) {
            int sessions = sessionRepository.deactivateAllUserSessionsWithReason(userId, reason);
            int tokens = refreshTokenRepository.revokeAllByUtilisateurId(userId, now);
            log.info("Révocation globale persistée pour utilisateurId={} (raison={}) : {} session(s), {} refresh token(s)",
                    userId, reason, sessions, tokens);
        }
    }
}
