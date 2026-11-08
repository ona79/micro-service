package com.uasz.ms_circuit.clients;

import com.uasz.ms_circuit.dto.PatrimoineDto;
import com.uasz.ms_circuit.exceptions.BadRequestException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * Configuration et démonstration des 3 modes de communication du TP2 :
 * 1) OpenFeign (PatrimoineClient)
 * 2) RestTemplate
 * 3) WebClient
 */
@Configuration
public class HttpClientsConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Bean
    public WebClient patrimoineWebClient(@Value("${patrimoine.url:http://localhost:3001}") String baseUrl) {
        return WebClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    /** Appel synchrone via RestTemplate */
    public static PatrimoineDto getViaRestTemplate(RestTemplate restTemplate, String baseUrl, Long id) {
        try {
            return restTemplate.getForObject(baseUrl + "/api/patrimoines/{id}", PatrimoineDto.class, id);
        } catch (HttpClientErrorException.NotFound ex) {
            throw new BadRequestException("Patrimoine " + id + " introuvable (via RestTemplate)");
        }
    }

    /** Appel réactif/non-bloquant (bloqué au retour MVC) via WebClient */
    public static PatrimoineDto getViaWebClient(WebClient webClient, Long id) {
        return webClient.get()
                .uri("/api/patrimoines/{id}", id)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError,
                        resp -> Mono.error(new BadRequestException("Patrimoine " + id + " introuvable (via WebClient)")))
                .bodyToMono(PatrimoineDto.class)
                .block();
    }
}

