package com.uasz.ms_circuit.clients;

import com.uasz.ms_circuit.dto.PatrimoineDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@ActiveProfiles("test")
@Import(OpenFeignCommunicationIntegrationTest.MockPatrimoineController.class)
@org.springframework.test.context.TestPropertySource(properties = {
        "server.port=9991",
        "patrimoine.url=http://localhost:9991"
})
class OpenFeignCommunicationIntegrationTest {

    @Autowired
    private PatrimoineClient patrimoineClient;

    @RestController
    static class MockPatrimoineController {
        @GetMapping("/api/patrimoines/{id}")
        public PatrimoineDto getPatrimoineById(@PathVariable("id") Long id) {
            return new PatrimoineDto(
                    id,
                    "Maison des Esclaves",
                    "PAT-GOR-001",
                    "Haut lieu d'histoire et de mémoire",
                    "Édifiée en 1776 sur l'île de Gorée",
                    "Île de Gorée, Dakar",
                    150,
                    14.6672f,
                    -17.3990f
            );
        }
    }

    @Test
    void testOpenFeignInterserviceHttpCall() {
        PatrimoineDto dto = patrimoineClient.getPatrimoineById(1L);

        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getNomPatrimoine()).isEqualTo("Maison des Esclaves");
        assertThat(dto.getCodePatrimoine()).isEqualTo("PAT-GOR-001");
        System.out.println(">>> [OPENFEIGN INTERSERVICE TEST] Succès de l'appel HTTP Feign : " + dto.getNomPatrimoine() + " (" + dto.getCodePatrimoine() + ") sur port 9991");
    }
}
