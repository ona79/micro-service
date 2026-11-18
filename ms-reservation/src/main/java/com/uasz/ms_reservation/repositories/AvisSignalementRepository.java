package com.uasz.ms_reservation.repositories;

import com.uasz.ms_reservation.entities.AvisSignalement;
import com.uasz.ms_reservation.entities.StatutSignalement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AvisSignalementRepository extends JpaRepository<AvisSignalement, Long> {

    boolean existsByAvisIdAndSignaleParIdAndStatut(Long avisId, Long signaleParId, StatutSignalement statut);

    List<AvisSignalement> findByAvisIdAndStatut(Long avisId, StatutSignalement statut);

    List<AvisSignalement> findByStatutOrderByDateSignalementDescIdDesc(StatutSignalement statut);

    List<AvisSignalement> findAllByOrderByDateSignalementDescIdDesc();
}
