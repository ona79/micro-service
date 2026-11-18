package com.uasz.ms_utilisateur.repositories;

import com.uasz.ms_utilisateur.entities.GuideHistoriqueValidation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GuideHistoriqueValidationRepository extends JpaRepository<GuideHistoriqueValidation, Long> {

    List<GuideHistoriqueValidation> findByGuideProfilIdOrderByDateTransitionDescIdDesc(Long guideProfilId);
}
