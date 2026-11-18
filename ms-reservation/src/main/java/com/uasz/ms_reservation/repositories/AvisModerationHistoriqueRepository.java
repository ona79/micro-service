package com.uasz.ms_reservation.repositories;

import com.uasz.ms_reservation.entities.AvisModerationHistorique;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AvisModerationHistoriqueRepository extends JpaRepository<AvisModerationHistorique, Long> {

    List<AvisModerationHistorique> findByAvisIdOrderByDateDecisionDescIdDesc(Long avisId);
}
