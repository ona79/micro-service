package com.uasz.ms_evenement.clients;

import com.uasz.ms_evenement.dto.PatrimoineDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "ms-patrimoine", url = "${patrimoine.url:http://localhost:3001}")
public interface PatrimoineClient {

    @GetMapping("/api/patrimoines/{id}")
    PatrimoineDto getPatrimoineById(@PathVariable("id") Long id);
}

