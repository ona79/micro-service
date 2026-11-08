package com.uasz.ms_reservation.clients;

import com.uasz.ms_reservation.dto.CircuitDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "ms-circuit", url = "${circuit.url:http://localhost:3002}")
public interface CircuitClient {

    @GetMapping("/api/circuits/{id}")
    CircuitDto getCircuitById(@PathVariable("id") Long id);
}

