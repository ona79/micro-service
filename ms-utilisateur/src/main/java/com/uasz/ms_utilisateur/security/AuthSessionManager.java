package com.uasz.ms_utilisateur.security;

import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.RefreshToken;
import com.uasz.ms_utilisateur.entities.SessionUtilisateur;
import com.uasz.ms_utilisateur.entities.Utilisateur;
import com.uasz.ms_utilisateur.exceptions.ForbiddenException;
import com.uasz.ms_utilisateur.exceptions.UnauthorizedException;
import com.uasz.ms_utilisateur.mappers.UtilisateurMapper;
import com.uasz.ms_utilisateur.repositories.RefreshTokenRepository;
import com.uasz.ms_utilisateur.repositories.RolePermissionRepository;
import com.uasz.ms_utilisateur.repositories.SessionUtilisateurRepository;
import com.uasz.ms_utilisateur.repositories.UtilisateurRepository;
import com.uasz.ms_utilisateur.services.AuditSecuriteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthSessionManager {

    private final SessionTokenService sessionTokenService;
    private final SessionUtilisateurRepository sessionRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final UtilisateurMapper utilisateurMapper;
    private final AuditSecuriteService auditSecuriteService;

    public record SessionAuthResult(
            UtilisateurDto userDto,
            String accessToken,
            String refreshToken,
            String sessionId
    ) {}

    @Transactional
    public SessionAuthResult createSession(UtilisateurDto userDto, String ip, String userAgent) {
        String sessionId = UUID.randomUUID().toString();
        String familyId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime sessionExpiresAt = now.plusSeconds(SessionTokenService.REFRESH_TOKEN_TTL_SECONDS);

        // 1. Persister la session utilisateur
        SessionUtilisateur session = SessionUtilisateur.builder()
                .sessionId(sessionId)
                .utilisateurId(userDto.getId())
                .ipAddress(ip)
                .userAgent(userAgent != null && userAgent.length() > 255 ? userAgent.substring(0, 255) : userAgent)
                .active(true)
                .createdAt(now)
                .expiresAt(sessionExpiresAt)
                .lastActivityAt(now)
                .build();
        sessionRepository.save(session);

        // 2. Générer et persister le Refresh Token sous forme de hash SHA-256
        String rawRefreshToken = sessionTokenService.generateOpaqueRefreshToken();
        String tokenHash = sessionTokenService.hashToken(rawRefreshToken);

        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .tokenHash(tokenHash)
                .familyId(familyId)
                .sessionId(sessionId)
                .utilisateurId(userDto.getId())
                .revoked(false)
                .createdAt(now)
                .expiresAt(sessionExpiresAt)
                .build();
        refreshTokenRepository.save(refreshTokenEntity);

        // 3. Charger les permissions du rôle
        List<String> permissions = rolePermissionRepository.findPermissionCodesByRole(userDto.getRole());

        // 4. Générer l'Access Token JWT (15 minutes)
        String accessToken = sessionTokenService.createToken(userDto, sessionId, permissions);

        return new SessionAuthResult(userDto, accessToken, rawRefreshToken, sessionId);
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public SessionAuthResult refreshSession(String rawRefreshToken, String ip, String userAgent) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new UnauthorizedException("Jeton de renouvellement absent. Veuillez vous reconnecter.");
        }

        String tokenHash = sessionTokenService.hashToken(rawRefreshToken.trim());
        RefreshToken token = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Jeton de renouvellement invalide ou introuvable."));

        LocalDateTime now = LocalDateTime.now();

        // 1. Détection d'expiration
        if (token.getExpiresAt().isBefore(now)) {
            token.setRevoked(true);
            token.setRevokedAt(now);
            refreshTokenRepository.save(token);
            throw new UnauthorizedException("Session de renouvellement expirée. Veuillez vous reconnecter.");
        }

        // 2. Détection de réutilisation (REPLAY ATTACK)
        if (token.isRevoked()) {
            log.warn("ALERTE CRITIQUE : Détection de réutilisation de Refresh Token déjà révoqué ! Famille: {}", token.getFamilyId());
            refreshTokenRepository.revokeEntireFamily(token.getFamilyId(), now);
            sessionRepository.deactivateSession(token.getSessionId());
            auditSecuriteService.logTokenReplayAlert(token.getFamilyId(), token.getUtilisateurId(), ip);
            throw new UnauthorizedException("Alerte de sécurité : réutilisation de jeton révoqué détectée. Toutes les sessions associées ont été invalidées.");
        }

        // 3. Vérification de l'utilisateur
        Utilisateur user = utilisateurRepository.findById(token.getUtilisateurId())
                .orElseThrow(() -> new UnauthorizedException("Utilisateur associé à la session introuvable."));

        if (!user.isActif()) {
            refreshTokenRepository.revokeEntireFamily(token.getFamilyId(), now);
            sessionRepository.deactivateSession(token.getSessionId());
            throw new ForbiddenException("Ce compte utilisateur est désactivé.");
        }

        // 4. Vérification de la session
        SessionUtilisateur session = sessionRepository.findBySessionId(token.getSessionId())
                .orElseThrow(() -> new UnauthorizedException("Session active introuvable."));

        if (!session.isActive() || session.getExpiresAt().isBefore(now)) {
            refreshTokenRepository.revokeEntireFamily(token.getFamilyId(), now);
            throw new UnauthorizedException("Cette session a été révoquée ou a expiré. Veuillez vous reconnecter.");
        }

        // 5. Rotation atomique du Refresh Token
        String newRawRefreshToken = sessionTokenService.generateOpaqueRefreshToken();
        String newTokenHash = sessionTokenService.hashToken(newRawRefreshToken);

        token.setRevoked(true);
        token.setRevokedAt(now);
        token.setReplacedByHash(newTokenHash);
        refreshTokenRepository.save(token);

        RefreshToken newTokenEntity = RefreshToken.builder()
                .tokenHash(newTokenHash)
                .familyId(token.getFamilyId())
                .sessionId(token.getSessionId())
                .utilisateurId(user.getId())
                .revoked(false)
                .createdAt(now)
                .expiresAt(session.getExpiresAt())
                .build();
        refreshTokenRepository.save(newTokenEntity);

        // Mettre à jour l'activité de la session
        session.setLastActivityAt(now);
        sessionRepository.save(session);

        // 6. Générer le nouvel Access Token JWT (15 minutes)
        UtilisateurDto userDto = utilisateurMapper.toDto(user);
        List<String> permissions = rolePermissionRepository.findPermissionCodesByRole(user.getRole());
        String accessToken = sessionTokenService.createToken(userDto, session.getSessionId(), permissions);

        auditSecuriteService.logTokenRefresh(user.getId(), user.getEmail(), ip, token.getFamilyId());

        return new SessionAuthResult(userDto, accessToken, newRawRefreshToken, session.getSessionId());
    }

    @Transactional
    public void logoutSession(String sessionId, Long userId, String ip) {
        LocalDateTime now = LocalDateTime.now();
        if (sessionId != null && !sessionId.isBlank()) {
            sessionRepository.deactivateSession(sessionId);
            refreshTokenRepository.revokeBySessionId(sessionId, now);
        }
        if (userId != null) {
            auditSecuriteService.logLogout(userId, null, ip, sessionId);
        }
    }

    @Transactional(readOnly = true)
    public boolean isSessionActive(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) return false;
        return sessionRepository.findBySessionId(sessionId)
                .map(s -> s.isActive() && s.getExpiresAt().isAfter(LocalDateTime.now()))
                .orElse(false);
    }
}
