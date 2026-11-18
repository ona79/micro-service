package com.uasz.ms_utilisateur.repositories;

import com.uasz.ms_utilisateur.entities.StatutOutbox;
import com.uasz.ms_utilisateur.entities.UtilisateurNotificationOutbox;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UtilisateurNotificationOutboxRepository extends JpaRepository<UtilisateurNotificationOutbox, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM UtilisateurNotificationOutbox o WHERE o.id = :id")
    Optional<UtilisateurNotificationOutbox> findByIdForUpdate(@Param("id") Long id);

    List<UtilisateurNotificationOutbox> findByStatutAndProchaineTentativeAtLessThanEqualOrderByCreatedAtAsc(
            StatutOutbox statut, LocalDateTime now);

    List<UtilisateurNotificationOutbox> findByStatutOrderByCreatedAtAsc(StatutOutbox statut);
}
