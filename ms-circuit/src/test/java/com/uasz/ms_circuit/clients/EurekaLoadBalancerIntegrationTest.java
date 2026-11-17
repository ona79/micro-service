package com.uasz.ms_circuit.clients;

import com.uasz.ms_circuit.dto.PatrimoineDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.cloud.client.DefaultServiceInstance;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.loadbalancer.core.ServiceInstanceListSupplier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@ActiveProfiles("test")
@Import({EurekaLoadBalancerIntegrationTest.MockPatrimoineServer.class, EurekaLoadBalancerIntegrationTest.TestLoadBalancerConfig.class})
@TestPropertySource(properties = {
        "server.port=9993",
        "patrimoine.url=",                 // URL VIDÉE : force la résolution dynamique par LoadBalancer et Discovery
        "spring.cloud.discovery.enabled=true"
})
class EurekaLoadBalancerIntegrationTest {

    @Autowired
    private PatrimoineClient patrimoineClient;

    @RestController
    static class MockPatrimoineServer {
        @GetMapping("/api/patrimoines/{id}")
        public PatrimoineDto getPatrimoineById(@PathVariable("id") Long id) {
            return new PatrimoineDto(
                    id,
                    "Mémorial du Joola",
                    "PAT-ZIG-001",
                    "Lieu de mémoire et de recueillement national",
                    "Érigé sur les berges du fleuve Casamance à Ziguinchor",
                    "Ziguinchor, Casamance",
                    250,
                    12.5833f,
                    -16.2719f
            );
        }
    }

    @TestConfiguration
    static class TestLoadBalancerConfig {
        @Bean
        public ServiceInstanceListSupplier serviceInstanceListSupplier() {
            return new ServiceInstanceListSupplier() {
                @Override
                public String getServiceId() {
                    return "ms-patrimoine";
                }

                @Override
                public Flux<List<ServiceInstance>> get() {
                    ServiceInstance instance = new DefaultServiceInstance(
                            "instance-ms-patrimoine-1",
                            "ms-patrimoine",
                            "localhost",
                            9993,
                            false
                    );
                    return Flux.just(List.of(instance));
                }
            };
        }
    }

    @Test
    @DisplayName("EUREKA-01 : Résolution dynamique OpenFeign via Spring Cloud LoadBalancer sans URL codée en dur")
    void shouldResolvePatrimoineDynamicallyWithoutHardcodedUrl() {
        // L'appel doit réussir car le LoadBalancer résout le serviceId 'ms-patrimoine'
        // vers l'instance découverte (localhost:9993)
        PatrimoineDto result = patrimoineClient.getPatrimoineById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getNomPatrimoine()).isEqualTo("Mémorial du Joola");
        assertThat(result.getCodePatrimoine()).isEqualTo("PAT-ZIG-001");
        assertThat(result.getAdressePatrimoine()).contains("Casamance");
    }
}
