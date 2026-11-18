package com.uasz.ms_utilisateur.repositories;

import com.uasz.ms_utilisateur.entities.SessionUtilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SessionUtilisateurRepository extends JpaRepository<SessionUtilisateur, Long> {

    Optional<SessionUtilisateur> findBySessionId(String sessionId);

    List<SessionUtilisateur> findByUtilisateurIdAndActiveTrue(Long utilisateurId);

    List<SessionUtilisateur> findByUtilisateurId(Long utilisateurId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE SessionUtilisateur s SET s.active = false, s.revokedAt = CURRENT_TIMESTAMP WHERE s.sessionId = :sessionId")
    int deactivateSession(@Param("sessionId") String sessionId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE SessionUtilisateur s SET s.active = false, s.revokedAt = CURRENT_TIMESTAMP, s.revocationReason = :reason WHERE s.sessionId = :sessionId")
    int deactivateSessionWithReason(@Param("sessionId") String sessionId, @Param("reason") String reason);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE SessionUtilisateur s SET s.active = false, s.revokedAt = CURRENT_TIMESTAMP WHERE s.utilisateurId = :utilisateurId")
    int deactivateAllUserSessions(@Param("utilisateurId") Long utilisateurId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE SessionUtilisateur s SET s.active = false, s.revokedAt = CURRENT_TIMESTAMP, s.revocationReason = :reason WHERE s.utilisateurId = :utilisateurId")
    int deactivateAllUserSessionsWithReason(@Param("utilisateurId") Long utilisateurId, @Param("reason") String reason);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE SessionUtilisateur s SET s.active = false, s.revokedAt = CURRENT_TIMESTAMP WHERE s.expiresAt < :now AND s.active = true")
    int deactivateExpiredSessions(@Param("now") LocalDateTime now);
}
