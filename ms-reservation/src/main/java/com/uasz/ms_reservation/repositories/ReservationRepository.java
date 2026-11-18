package com.uasz.ms_reservation.repositories;

import com.uasz.ms_reservation.entities.Reservation;
import com.uasz.ms_reservation.entities.StatutReservation;
import com.uasz.ms_reservation.entities.TypeReservation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReservationRepository extends JpaRepository<Reservation, Long>, JpaSpecificationExecutor<Reservation> {

    @Query("SELECT COALESCE(SUM(r.nombrePlaces), 0) FROM Reservation r WHERE r.circuitId = :circuitId AND r.statut IN :statuts AND (:datePrestation IS NULL OR r.datePrestation = :datePrestation)")
    int sumPlacesByCircuitIdAndDateAndStatutIn(@Param("circuitId") Long circuitId,
                                               @Param("datePrestation") LocalDate datePrestation,
                                               @Param("statuts") Collection<StatutReservation> statuts);

    @Query("SELECT COALESCE(SUM(r.nombrePlaces), 0) FROM Reservation r WHERE r.evenementId = :evenementId AND r.statut IN :statuts")
    int sumPlacesByEvenementIdAndStatutIn(@Param("evenementId") Long evenementId,
                                          @Param("statuts") Collection<StatutReservation> statuts);

    @Query("SELECT COALESCE(SUM(r.nombrePlaces), 0) FROM Reservation r WHERE r.circuitId = :circuitId AND r.statut <> :statutExclu")
    int sumPlacesByCircuitIdAndStatutNot(@Param("circuitId") Long circuitId,
                                         @Param("statutExclu") StatutReservation statutExclu);

    @Query("SELECT COALESCE(SUM(r.nombrePlaces), 0) FROM Reservation r WHERE r.evenementId = :evenementId AND r.statut <> :statutExclu")
    int sumPlacesByEvenementIdAndStatutNot(@Param("evenementId") Long evenementId,
                                           @Param("statutExclu") StatutReservation statutExclu);

    List<Reservation> findByUtilisateurId(Long utilisateurId);

    List<Reservation> findByUtilisateurIdOrEmailClient(Long utilisateurId, String emailClient);

    List<Reservation> findByCircuitIdAndStatutInOrderByDatePrestationAsc(Long circuitId, Collection<StatutReservation> statuts);

    List<Reservation> findByGuideIdAndStatutInOrderByDatePrestationAscCreneauPrestationAsc(
            Long guideId, Collection<StatutReservation> statuts);

    List<Reservation> findByGuideIdAndDatePrestationAndStatutIn(
            Long guideId, LocalDate datePrestation, Collection<StatutReservation> statuts);

    @Query("""
            SELECT r FROM Reservation r
            WHERE r.guideId = :guideId
              AND r.statut IN :statuts
              AND (:dateDebut IS NULL OR r.datePrestation >= :dateDebut)
              AND (:dateFin IS NULL OR r.datePrestation <= :dateFin)
            ORDER BY r.datePrestation ASC, r.creneauPrestation ASC
            """)
    List<Reservation> findGuideReservationsBetweenDates(
            @Param("guideId") Long guideId,
            @Param("statuts") Collection<StatutReservation> statuts,
            @Param("dateDebut") LocalDate dateDebut,
            @Param("dateFin") LocalDate dateFin);

    Optional<Reservation> findByUtilisateurIdAndIdempotencyKey(Long utilisateurId, String idempotencyKey);

    Optional<Reservation> findByReferenceReservation(String referenceReservation);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Reservation r WHERE r.id = :id")
    Optional<Reservation> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT r FROM Reservation r
            WHERE r.utilisateurId = :utilisateurId
              AND r.typeReservation = :typeReservation
              AND ((:typeReservation = com.uasz.ms_reservation.entities.TypeReservation.CIRCUIT AND r.circuitId = :prestationId)
                   OR (:typeReservation = com.uasz.ms_reservation.entities.TypeReservation.EVENEMENT AND r.evenementId = :prestationId))
              AND r.datePrestation = :datePrestation
              AND r.statut IN :statuts
            """)
    List<Reservation> findActiveDuplicateReservations(@Param("utilisateurId") Long utilisateurId,
                                                      @Param("typeReservation") TypeReservation typeReservation,
                                                      @Param("prestationId") Long prestationId,
                                                      @Param("datePrestation") LocalDate datePrestation,
                                                      @Param("statuts") Collection<StatutReservation> statuts);

    @Query("SELECT r FROM Reservation r WHERE r.statut = :statut AND r.expiresAt IS NOT NULL AND r.expiresAt < :now")
    List<Reservation> findExpiredReservations(@Param("statut") StatutReservation statut,
                                            @Param("now") LocalDateTime now);

    @Query("""
            SELECT r FROM Reservation r
            WHERE r.typeReservation = :type
              AND ((:type = com.uasz.ms_reservation.entities.TypeReservation.CIRCUIT AND r.circuitId = :prestationId)
                   OR (:type = com.uasz.ms_reservation.entities.TypeReservation.EVENEMENT AND r.evenementId = :prestationId))
              AND r.statut = com.uasz.ms_reservation.entities.StatutReservation.EN_ATTENTE_PAIEMENT
              AND r.expiresAt IS NOT NULL
              AND r.expiresAt < :now
            """)
    List<Reservation> findExpiredPendingForPrestation(@Param("type") TypeReservation type,
                                                      @Param("prestationId") Long prestationId,
                                                      @Param("now") LocalDateTime now);
}
