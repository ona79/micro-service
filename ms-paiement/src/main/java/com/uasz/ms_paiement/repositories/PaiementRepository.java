package com.uasz.ms_paiement.repositories;

import com.uasz.ms_paiement.entities.Paiement;
import com.uasz.ms_paiement.entities.StatutPaiement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaiementRepository extends JpaRepository<Paiement, Long> {

    boolean existsByReservationIdAndStatut(Long reservationId, StatutPaiement statut);
}

