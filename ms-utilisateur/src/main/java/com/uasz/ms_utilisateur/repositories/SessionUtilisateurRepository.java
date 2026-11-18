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

    @Modifying
    @Query("UPDATE SessionUtilisateur s SET s.active = false WHERE s.sessionId = :sessionId")
    int deactivateSession(@Param("sessionId") String sessionId);

    @Modifying
    @Query("UPDATE SessionUtilisateur s SET s.active = false WHERE s.utilisateurId = :utilisateurId")
    int deactivateAllUserSessions(@Param("utilisateurId") Long utilisateurId);

    @Modifying
    @Query("UPDATE SessionUtilisateur s SET s.active = false WHERE s.expiresAt < :now AND s.active = true")
    int deactivateExpiredSessions(@Param("now") LocalDateTime now);
}
