package com.uasz.ms_reservation.repositories;

import com.uasz.ms_reservation.entities.Avis;
import com.uasz.ms_reservation.entities.CibleAvis;
import com.uasz.ms_reservation.entities.StatutModerationAvis;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AvisRepository extends JpaRepository<Avis, Long> {

    boolean existsByReservationIdAndCibleTypeAndCibleId(Long reservationId, CibleAvis cibleType, Long cibleId);

    List<Avis> findByCibleTypeAndCibleIdAndStatutModerationOrderByDatePublicationDescIdDesc(
            CibleAvis cibleType, Long cibleId, StatutModerationAvis statutModeration);

    Page<Avis> findByCibleTypeAndCibleIdAndStatutModerationOrderByDatePublicationDescIdDesc(
            CibleAvis cibleType, Long cibleId, StatutModerationAvis statutModeration, Pageable pageable);

    List<Avis> findByAuteurIdOrderByDatePublicationDescIdDesc(Long auteurId);

    List<Avis> findByStatutModerationOrderByDatePublicationDescIdDesc(StatutModerationAvis statut);

    @Query("""
            SELECT a FROM Avis a
            WHERE (:cibleType IS NULL OR a.cibleType = :cibleType)
              AND (:statut IS NULL OR a.statutModeration = :statut)
            ORDER BY a.datePublication DESC, a.id DESC
            """)
    List<Avis> findAllAdminFiltered(
            @Param("cibleType") CibleAvis cibleType,
            @Param("statut") StatutModerationAvis statut
    );
}
