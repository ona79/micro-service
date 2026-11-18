package com.uasz.ms_reservation.repositories;

import com.uasz.ms_reservation.entities.Billet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BilletRepository extends JpaRepository<Billet, Long> {

    Optional<Billet> findByTokenQr(String tokenQr);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Billet b WHERE b.tokenQr = :tokenQr")
    Optional<Billet> findByTokenQrForUpdate(@Param("tokenQr") String tokenQr);

    Optional<Billet> findByNumeroBillet(String numeroBillet);

    List<Billet> findByReservationIdOrderByNumeroBilletAsc(Long reservationId);

    boolean existsByTokenQr(String tokenQr);

    boolean existsByNumeroBillet(String numeroBillet);
}
