package com.uasz.ms_paiement.clients;

import com.uasz.ms_paiement.dto.ReservationDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "ms-reservation", url = "${reservation.url:http://localhost:3004}")
public interface ReservationClient {

    @GetMapping("/api/reservations/{id}")
    ReservationDto getReservationById(@PathVariable("id") Long id);
}

