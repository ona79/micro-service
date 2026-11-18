package com.uasz.ms_notification.repositories;

import com.uasz.ms_notification.entities.Notification;
import com.uasz.ms_notification.entities.StatutNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByReservationId(Long reservationId);

    Optional<Notification> findByIdempotencyKey(String idempotencyKey);

    @Query("""
            SELECT n FROM Notification n
            WHERE (n.utilisateurId = :userId
                   OR (n.utilisateurId IS NULL AND :email IS NOT NULL AND :email <> '' AND LOWER(n.destinataire) = LOWER(:email)))
              AND (:nonLuesOnly = false OR n.lue = false)
              AND (:typeEvenement IS NULL OR n.typeEvenement = :typeEvenement)
            ORDER BY n.dateEnvoi DESC, n.id DESC
            """)
    Page<Notification> findOwnedNotifications(
            @Param("userId") Long userId,
            @Param("email") String email,
            @Param("nonLuesOnly") boolean nonLuesOnly,
            @Param("typeEvenement") String typeEvenement,
            Pageable pageable
    );

    @Query("""
            SELECT n FROM Notification n
            WHERE (n.utilisateurId = :userId
                   OR (n.utilisateurId IS NULL AND :email IS NOT NULL AND :email <> '' AND LOWER(n.destinataire) = LOWER(:email)))
              AND n.lue = false
            """)
    List<Notification> findAllUnreadOwned(
            @Param("userId") Long userId,
            @Param("email") String email
    );

    @Query("""
            SELECT COUNT(n) FROM Notification n
            WHERE (n.utilisateurId = :userId
                   OR (n.utilisateurId IS NULL AND :email IS NOT NULL AND :email <> '' AND LOWER(n.destinataire) = LOWER(:email)))
              AND n.lue = false
            """)
    long countUnreadOwned(
            @Param("userId") Long userId,
            @Param("email") String email
    );

    @Query("""
            SELECT n FROM Notification n
            WHERE (:statut IS NULL OR n.statut = :statut)
              AND (:typeEvenement IS NULL OR n.typeEvenement = :typeEvenement)
            ORDER BY n.dateEnvoi DESC, n.id DESC
            """)
    Page<Notification> findAllFiltered(
            @Param("statut") StatutNotification statut,
            @Param("typeEvenement") String typeEvenement,
            Pageable pageable
    );

    List<Notification> findByStatutInAndProchaineTentativeAtLessThanEqualOrderByDateEnvoiAsc(
            Collection<StatutNotification> statuts,
            LocalDateTime now
    );

    List<Notification> findByStatutInOrderByDateEnvoiAsc(Collection<StatutNotification> statuts);
}
