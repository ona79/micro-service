package com.uasz.ms_paiement.clients;

import com.uasz.ms_paiement.dto.EvenementPaiementAckDto;
import com.uasz.ms_paiement.dto.EvenementPaiementNotificationRequest;
import com.uasz.ms_paiement.dto.ReservationDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "ms-reservation", url = "${reservation.url:}")
public interface ReservationClient {

    @GetMapping("/api/reservations/{id}")
    ReservationDto getReservationById(@PathVariable("id") Long id);

    @PostMapping("/api/reservations/internal/{id}/evenement-paiement")
    EvenementPaiementAckDto notifierEvenementPaiement(
            @PathVariable("id") Long id,
            @RequestBody EvenementPaiementNotificationRequest request
    );
}
