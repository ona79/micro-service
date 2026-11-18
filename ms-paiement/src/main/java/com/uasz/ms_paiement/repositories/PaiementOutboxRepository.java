package com.uasz.ms_paiement.repositories;

import com.uasz.ms_paiement.entities.PaiementOutbox;
import com.uasz.ms_paiement.entities.StatutOutbox;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaiementOutboxRepository extends JpaRepository<PaiementOutbox, Long> {

    List<PaiementOutbox> findByStatutAndProchaineTentativeAtLessThanEqualOrderByCreatedAtAsc(
            StatutOutbox statut, LocalDateTime now);

    List<PaiementOutbox> findByStatutOrderByCreatedAtAsc(StatutOutbox statut);

    long countByStatut(StatutOutbox statut);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM PaiementOutbox o WHERE o.id = :id")
    Optional<PaiementOutbox> findByIdForUpdate(@Param("id") Long id);
}
