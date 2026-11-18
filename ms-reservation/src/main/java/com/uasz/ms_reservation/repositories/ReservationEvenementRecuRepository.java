package com.uasz.ms_reservation.repositories;

import com.uasz.ms_reservation.entities.ReservationEvenementRecu;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReservationEvenementRecuRepository extends JpaRepository<ReservationEvenementRecu, Long> {
    Optional<ReservationEvenementRecu> findByEventId(String eventId);
    boolean existsByEventId(String eventId);
}
