package com.uasz.ms_circuit;

import com.uasz.ms_circuit.repositories.CircuitRepository;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("prod")
@Tag("postgres")
@EnabledIfEnvironmentVariable(named = "POSTGRES_INTEGRATION_TEST", matches = "true")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:postgresql://172.20.0.2:5432/circuit_db",
        "spring.datasource.username=circuit_user",
        "spring.datasource.password=circuit_pass_2026!",
        "spring.cloud.discovery.enabled=false"
})
class CircuitPostgresIntegrationTest {

    @Autowired
    private CircuitRepository circuitRepository;

    @Test
    void testPostgresConnectionFlywayAndHibernateValidation() {
        assertThat(circuitRepository).isNotNull();
        long count = circuitRepository.count();
        System.out.println(">>> [POSTGRES 16 TEST] ms-circuit connecté avec succès ! Nombre de circuits : " + count);
        assertThat(count).isGreaterThanOrEqualTo(2);
    }
}
