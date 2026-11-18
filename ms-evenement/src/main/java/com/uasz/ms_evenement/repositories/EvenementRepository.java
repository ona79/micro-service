package com.uasz.ms_evenement.repositories;

import com.uasz.ms_evenement.entities.Evenement;
import com.uasz.ms_evenement.entities.StatutEvenement;
import com.uasz.ms_evenement.entities.TypeEvenement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface EvenementRepository extends JpaRepository<Evenement, Long> {

    List<Evenement> findByPatrimoineId(Long patrimoineId);

    List<Evenement> findByStatutEvenement(StatutEvenement statutEvenement);

    List<Evenement> findByTypeEvenementAndStatutEvenement(
            TypeEvenement typeEvenement, StatutEvenement statutEvenement);

    List<Evenement> findByStatutEvenementAndDateFinGreaterThanEqualOrderByDateDebutAsc(
            StatutEvenement statutEvenement, LocalDateTime dateReference);
}
