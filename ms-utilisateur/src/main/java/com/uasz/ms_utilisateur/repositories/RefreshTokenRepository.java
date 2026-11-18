package com.uasz.ms_utilisateur.repositories;

import com.uasz.ms_utilisateur.entities.RefreshToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RefreshToken r WHERE r.tokenHash = :tokenHash")
    Optional<RefreshToken> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    List<RefreshToken> findByFamilyId(String familyId);

    List<RefreshToken> findByParentTokenHash(String parentTokenHash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RefreshToken r SET r.revoked = true, r.revokedAt = :now, r.replacedByHash = :newHash " +
           "WHERE r.id = :id AND r.revoked = false")
    int consumeTokenAtomically(@Param("id") Long id,
                               @Param("now") LocalDateTime now,
                               @Param("newHash") String newHash);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RefreshToken r SET r.revoked = true, r.revokedAt = :now WHERE r.familyId = :familyId")
    int revokeEntireFamily(@Param("familyId") String familyId, @Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RefreshToken r SET r.revoked = true, r.revokedAt = :now WHERE r.sessionId = :sessionId")
    int revokeBySessionId(@Param("sessionId") String sessionId, @Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RefreshToken r SET r.revoked = true, r.revokedAt = :now WHERE r.utilisateurId = :utilisateurId")
    int revokeAllByUtilisateurId(@Param("utilisateurId") Long utilisateurId, @Param("now") LocalDateTime now);
}
