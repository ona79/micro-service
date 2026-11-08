package com.uasz.ms_reservation.repositories;

import com.uasz.ms_reservation.entities.Reservation;
import com.uasz.ms_reservation.entities.StatutReservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {

    @Query("SELECT COALESCE(SUM(r.nombrePlaces), 0) FROM Reservation r WHERE r.circuitId = :circuitId AND r.statut <> :statutExclu")
    int sumPlacesByCircuitIdAndStatutNot(@Param("circuitId") Long circuitId,
                                         @Param("statutExclu") StatutReservation statutExclu);

    @Query("SELECT COALESCE(SUM(r.nombrePlaces), 0) FROM Reservation r WHERE r.evenementId = :evenementId AND r.statut <> :statutExclu")
    int sumPlacesByEvenementIdAndStatutNot(@Param("evenementId") Long evenementId,
                                           @Param("statutExclu") StatutReservation statutExclu);
}

