package com.uasz.ms_circuit.repositories;

import com.uasz.ms_circuit.entities.CircuitNotificationOutbox;
import com.uasz.ms_circuit.entities.StatutOutbox;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CircuitNotificationOutboxRepository extends JpaRepository<CircuitNotificationOutbox, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM CircuitNotificationOutbox o WHERE o.id = :id")
    Optional<CircuitNotificationOutbox> findByIdForUpdate(@Param("id") Long id);

    List<CircuitNotificationOutbox> findByStatutAndProchaineTentativeAtLessThanEqualOrderByCreatedAtAsc(
            StatutOutbox statut, LocalDateTime now);
}
