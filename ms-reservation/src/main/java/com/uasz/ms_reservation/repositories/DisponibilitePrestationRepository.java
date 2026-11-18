package com.uasz.ms_reservation.repositories;

import com.uasz.ms_reservation.entities.DisponibilitePrestation;
import com.uasz.ms_reservation.entities.TypeReservation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;

public interface DisponibilitePrestationRepository extends JpaRepository<DisponibilitePrestation, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM DisponibilitePrestation d WHERE d.typePrestation = :type AND d.prestationId = :prestationId AND d.datePrestation = :datePrestation")
    Optional<DisponibilitePrestation> findByKeyForUpdate(@Param("type") TypeReservation type,
                                                         @Param("prestationId") Long prestationId,
                                                         @Param("datePrestation") LocalDate datePrestation);

    Optional<DisponibilitePrestation> findByTypePrestationAndPrestationIdAndDatePrestation(
            TypeReservation type, Long prestationId, LocalDate datePrestation);
}
