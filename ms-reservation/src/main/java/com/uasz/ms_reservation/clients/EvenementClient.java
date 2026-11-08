package com.uasz.ms_reservation.clients;

import com.uasz.ms_reservation.dto.EvenementDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "ms-evenement", url = "${evenement.url:http://localhost:3003}")
public interface EvenementClient {

    @GetMapping("/api/evenements/{id}")
    EvenementDto getEvenementById(@PathVariable("id") Long id);
}

