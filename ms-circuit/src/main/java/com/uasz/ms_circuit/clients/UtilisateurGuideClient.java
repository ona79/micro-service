package com.uasz.ms_circuit.clients;

import com.uasz.ms_circuit.dto.GuideVerificationDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "ms-utilisateur", url = "${utilisateur.url:}")
public interface UtilisateurGuideClient {

    @GetMapping("/api/guides/internal/utilisateur/{utilisateurId}")
    GuideVerificationDto verifierGuide(@PathVariable("utilisateurId") Long utilisateurId);
}
