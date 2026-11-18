package com.uasz.ms_evenement.repositories;

import com.uasz.ms_evenement.entities.Evenement;
import com.uasz.ms_evenement.entities.StatutEvenement;
import com.uasz.ms_evenement.entities.TypeEvenement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;

public interface EvenementRepository extends JpaRepository<Evenement, Long>, JpaSpecificationExecutor<Evenement> {

    List<Evenement> findByPatrimoineId(Long patrimoineId);

    List<Evenement> findByStatutEvenement(StatutEvenement statutEvenement);

    List<Evenement> findByTypeEvenementAndStatutEvenement(
            TypeEvenement typeEvenement, StatutEvenement statutEvenement);

    List<Evenement> findByStatutEvenementAndDateFinGreaterThanEqualOrderByDateDebutAsc(
            StatutEvenement statutEvenement, LocalDateTime dateReference);

    List<Evenement> findByStatutEvenementAndOuvertReservationTrueAndDateFinGreaterThanEqualOrderByDateDebutAsc(
            StatutEvenement statutEvenement, LocalDateTime dateReference);
}
