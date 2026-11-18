package com.uasz.ms_circuit.clients;

import com.uasz.ms_circuit.dto.PatrimoineDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Preuve EUREKA-01 RÉELLE :
 * Test d'intégration de découverte et communication interservices réelle :
 * - Serveur Eureka RÉEL en cours d'exécution sur le port 8761 (discovery-server).
 * - Instance ms-patrimoine RÉELLE en cours d'exécution et enregistrée sur Eureka.
 * - Contexte Spring Boot ms-circuit réel utilisant OpenFeign & Spring Cloud LoadBalancer.
 * - AUCUN MockPatrimoineServer, AUCUN mock ServiceInstanceListSupplier.
 * - Résolution dynamique pure du serviceId 'ms-patrimoine' sans URL codée en dur.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@ActiveProfiles("test")
@EnabledIfSystemProperty(named = "eureka.real.test", matches = "true")
@TestPropertySource(properties = {
        "patrimoine.url=",                     // URL OBLIGATOIREMENT VIDE : résolution dynamique pure par Eureka
        "spring.cloud.discovery.enabled=true",
        "eureka.client.enabled=true",
        "eureka.client.register-with-eureka=false",
        "eureka.client.fetch-registry=true",
        "eureka.client.registry-fetch-interval-seconds=1",
        "eureka.client.service-url.defaultZone=http://localhost:8761/eureka/"
})
class EurekaRealDiscoveryIntegrationTest {

    @Autowired
    private PatrimoineClient patrimoineClient;

    @Autowired
    private DiscoveryClient discoveryClient;

    @Test
    @DisplayName("EUREKA-01-REAL : Découverte dynamique réelle via serveur Eureka et appel OpenFeign interservices")
    void shouldDiscoverAndInvokeRealPatrimoineViaEureka() throws InterruptedException {
        // 1. Découverte dynamique via le client Eureka (attente explicite de la synchronisation du registre)
        List<ServiceInstance> instances = List.of();
        for (int i = 0; i < 15; i++) {
            instances = discoveryClient.getInstances("ms-patrimoine");
            if (!instances.isEmpty()) {
                break;
            }
            Thread.sleep(1000);
        }

        assertThat(instances)
                .as("Le client Eureka doit découvrir au moins une instance réelle de ms-patrimoine enregistrée dans Eureka")
                .isNotEmpty();

        ServiceInstance registeredInstance = instances.get(0);
        System.out.println("==================================================================");
        System.out.println(">>> [PREUVE EUREKA RÉELLE] Instance découverte depuis Eureka :");
        System.out.println("    - Service ID  : " + registeredInstance.getServiceId());
        System.out.println("    - Instance ID : " + registeredInstance.getInstanceId());
        System.out.println("    - Hôte / Port : " + registeredInstance.getHost() + ":" + registeredInstance.getPort());
        System.out.println("    - URI cible   : " + registeredInstance.getUri());
        System.out.println("==================================================================");

        assertThat(registeredInstance.getServiceId()).isEqualToIgnoringCase("ms-patrimoine");

        // 2. Appel interservices via OpenFeign (nom logique "ms-patrimoine", URL vide)
        // Spring Cloud LoadBalancer résout le serviceId via Eureka, choisit l'instance et effectue l'appel HTTP réel
        PatrimoineDto patrimoine = patrimoineClient.getPatrimoineById(1L);

        // 3. Validation des données réelles du patrimoine casamançais retournées par ms-patrimoine
        assertThat(patrimoine).isNotNull();
        assertThat(patrimoine.getId()).isEqualTo(1L);
        assertThat(patrimoine.getNomPatrimoine()).isEqualTo("Mémorial de la Tragédie du Joola");
        assertThat(patrimoine.getCodePatrimoine()).isEqualTo("PAT-ZIG-001");
        assertThat(patrimoine.getAdressePatrimoine()).contains("Ziguinchor");

        System.out.println(">>> [PREUVE EUREKA RÉELLE] Données patrimoniales reçues avec succès :");
        System.out.println("    - ID          : " + patrimoine.getId());
        System.out.println("    - Nom         : " + patrimoine.getNomPatrimoine());
        System.out.println("    - Code        : " + patrimoine.getCodePatrimoine());
        System.out.println("    - Adresse     : " + patrimoine.getAdressePatrimoine());
        System.out.println("==================================================================");
    }
}
