package com.uasz.ms_paiement.repositories;

import com.uasz.ms_paiement.entities.Paiement;
import com.uasz.ms_paiement.entities.StatutPaiement;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaiementRepository extends JpaRepository<Paiement, Long>, JpaSpecificationExecutor<Paiement> {

    boolean existsByReservationIdAndStatut(Long reservationId, StatutPaiement statut);

    boolean existsByReservationIdAndStatutIn(Long reservationId, Collection<StatutPaiement> statuts);

    List<Paiement> findByUtilisateurId(Long utilisateurId);

    List<Paiement> findByReservationIdOrderByDateCreationDesc(Long reservationId);

    Optional<Paiement> findByUtilisateurIdAndIdempotencyKey(Long utilisateurId, String idempotencyKey);

    Optional<Paiement> findByReferenceTransaction(String referenceTransaction);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Paiement p WHERE p.id = :id")
    Optional<Paiement> findByIdForUpdate(@Param("id") Long id);
}
