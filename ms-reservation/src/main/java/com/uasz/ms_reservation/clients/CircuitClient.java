package com.uasz.ms_reservation.clients;

import com.uasz.ms_reservation.dto.CircuitDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "ms-circuit", url = "${circuit.url:}")
public interface CircuitClient {

    @GetMapping("/api/circuits/{id}")
    CircuitDto getCircuitById(@PathVariable("id") Long id);

    @GetMapping("/api/circuits/guide/{guideId}")
    List<CircuitDto> getCircuitsByGuide(@PathVariable("guideId") Long guideId);
}

