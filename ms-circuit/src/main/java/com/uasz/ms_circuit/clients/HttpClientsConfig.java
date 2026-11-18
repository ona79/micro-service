package com.uasz.ms_circuit.clients;

import com.uasz.ms_circuit.dto.PatrimoineDto;
import com.uasz.ms_circuit.exceptions.BadRequestException;
import com.uasz.ms_circuit.security.InterserviceFeignSecurityInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * Configuration et démonstration des 3 modes de communication du TP2 :
 * 1) OpenFeign (PatrimoineClient)
 * 2) RestTemplate (avec intercepteur de signature HMAC interservice)
 * 3) WebClient (avec filtre de signature HMAC interservice)
 */
@Configuration
public class HttpClientsConfig {

    @Bean
    public RestTemplate restTemplate(InterserviceFeignSecurityInterceptor signingInterceptor) {
        RestTemplate rt = new RestTemplate();
        rt.getInterceptors().add((request, body, execution) -> {
            String method = request.getMethod() != null ? request.getMethod().name() : "GET";
            String path = request.getURI().getPath();
            Map<String, String> signedHeaders = signingInterceptor.buildSignedHeaders(
                    method, path, "ms-patrimoine", body);
            signedHeaders.forEach((k, v) -> request.getHeaders().set(k, v));
            return execution.execute(request, body);
        });
        return rt;
    }

    @Bean
    public WebClient patrimoineWebClient(
            @Value("${patrimoine.url:http://localhost:3001}") String baseUrl,
            InterserviceFeignSecurityInterceptor signingInterceptor
    ) {
        return WebClient.builder()
                .baseUrl(baseUrl)
                .filter((request, next) -> {
                    String method = request.method().name();
                    String path = request.url().getPath();
                    Map<String, String> signedHeaders = signingInterceptor.buildSignedHeaders(
                            method, path, "ms-patrimoine", new byte[0]);
                    ClientRequest signedRequest = ClientRequest.from(request)
                            .headers(httpHeaders -> signedHeaders.forEach(httpHeaders::set))
                            .build();
                    return next.exchange(signedRequest);
                })
                .build();
    }

    public static PatrimoineDto getViaRestTemplate(RestTemplate restTemplate, String baseUrl, Long id) {
        try {
            return restTemplate.getForObject(baseUrl + "/api/patrimoines/{id}", PatrimoineDto.class, id);
        } catch (HttpClientErrorException.NotFound ex) {
            throw new BadRequestException("Patrimoine " + id + " introuvable (via RestTemplate)");
        }
    }

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
