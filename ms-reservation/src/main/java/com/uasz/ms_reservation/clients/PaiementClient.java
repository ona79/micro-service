package com.uasz.ms_reservation.clients;

import com.uasz.ms_reservation.dto.PaiementResumeDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "ms-paiement", url = "${paiement.url:}")
public interface PaiementClient {

    @GetMapping("/api/paiements/internal/reservation/{reservationId}")
    List<PaiementResumeDto> getPaiementsByReservationId(@PathVariable("reservationId") Long reservationId);
}
