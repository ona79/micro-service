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

/**
 * Test unitaire et isolé de Spring Cloud LoadBalancer avec fournisseur simulé.
 * 
 * ATTENTION (Conformité P01-EUREKA-01) :
 * Ce test valide le comportement du LoadBalancer avec un ServiceInstanceListSupplier bouchonné en mémoire.
 * Il NE constitue PAS la preuve de découverte Eureka réelle.
 * Pour la preuve de découverte réelle via un serveur Eureka en cours d'exécution,
 * se référer à {@link EurekaRealDiscoveryIntegrationTest} et au script ./verify-eureka-real.sh.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@ActiveProfiles("test")
@Import({EurekaLoadBalancerMockTest.MockPatrimoineServer.class, EurekaLoadBalancerMockTest.TestLoadBalancerConfig.class})
@TestPropertySource(properties = {
        "server.port=9993",
        "patrimoine.url=",                 // URL VIDÉE : force la résolution dynamique par LoadBalancer
        "spring.cloud.discovery.enabled=true"
})
class EurekaLoadBalancerMockTest {

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
                            "instance-ms-patrimoine-mock-1",
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
    @DisplayName("EUREKA-MOCK : Validation unitaire de Spring Cloud LoadBalancer avec Mock ServiceInstanceListSupplier")
    void shouldResolvePatrimoineWithMockLoadBalancerSupplier() {
        PatrimoineDto result = patrimoineClient.getPatrimoineById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getNomPatrimoine()).isEqualTo("Mémorial du Joola");
        assertThat(result.getCodePatrimoine()).isEqualTo("PAT-ZIG-001");
        assertThat(result.getAdressePatrimoine()).contains("Casamance");
    }
}
