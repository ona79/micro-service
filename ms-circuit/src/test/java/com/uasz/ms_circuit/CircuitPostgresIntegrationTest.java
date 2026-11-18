package com.uasz.ms_circuit;

import com.uasz.ms_circuit.dto.CircuitDto;
import com.uasz.ms_circuit.dto.PageResponseDto;
import com.uasz.ms_circuit.entities.Circuit;
import com.uasz.ms_circuit.entities.StatutCircuit;
import com.uasz.ms_circuit.repositories.CircuitRepository;
import com.uasz.ms_circuit.services.ICircuitService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("prod")
@Tag("postgres")
@EnabledIfEnvironmentVariable(named = "POSTGRES_INTEGRATION_TEST", matches = "true")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://${TEST_DB_HOST:localhost}:${TEST_DB_PORT:5432}/circuit_db",
        "spring.datasource.username=${CIRCUIT_DB_USER:circuit_user}",
        "spring.datasource.password=${CIRCUIT_DB_PASSWORD:${DB_PASSWORD:}}",
        "spring.cloud.discovery.enabled=false"
})
class CircuitPostgresIntegrationTest {

    @Autowired
    private CircuitRepository circuitRepository;

    @Autowired
    private ICircuitService circuitService;

    @Test
    void testPostgresConnectionFlywayV3AndSearch() {
        assertThat(circuitRepository).isNotNull();
        List<Circuit> all = circuitRepository.findAll();
        long count = all.size();
        System.out.println(">>> [POSTGRES 16 TEST] ms-circuit connecté avec succès ! Nombre de circuits : " + count);
        assertThat(count).isGreaterThanOrEqualTo(2);
        assertThat(all).allSatisfy(c -> {
            assertThat(c.getStatutCircuit()).isNotNull();
            assertThat(c.getMoyenTransport()).isNotNull();
            assertThat(c.getModeCalculDistance()).isEqualTo("ESTIMATION_ORTHODROMIQUE_INDICATIVE");
        });

        PageResponseDto<CircuitDto> page = circuitService.rechercherCircuits(
                "Casamance", null, null, "BASSE_CASAMANCE", StatutCircuit.PUBLIE,
                null, null, null, false, 0, 10, "prix", "asc");
        assertThat(page.getTotalElements()).isGreaterThanOrEqualTo(2);
    }
}
