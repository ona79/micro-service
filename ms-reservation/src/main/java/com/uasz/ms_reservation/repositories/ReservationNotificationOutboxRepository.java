package com.uasz.ms_reservation.repositories;

import com.uasz.ms_reservation.entities.ReservationNotificationOutbox;
import com.uasz.ms_reservation.entities.StatutOutbox;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ReservationNotificationOutboxRepository extends JpaRepository<ReservationNotificationOutbox, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM ReservationNotificationOutbox o WHERE o.id = :id")
    Optional<ReservationNotificationOutbox> findByIdForUpdate(@Param("id") Long id);

    List<ReservationNotificationOutbox> findByStatutAndProchaineTentativeAtLessThanEqualOrderByCreatedAtAsc(
            StatutOutbox statut, LocalDateTime now);
}
