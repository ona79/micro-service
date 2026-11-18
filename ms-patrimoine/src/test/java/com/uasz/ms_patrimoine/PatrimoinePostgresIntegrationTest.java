package com.uasz.ms_patrimoine;

import com.uasz.ms_patrimoine.repositories.PatrimoineRepository;
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
        "spring.datasource.url=jdbc:postgresql://${TEST_DB_HOST:localhost}:${TEST_DB_PORT:5432}/patrimoine_db",
        "spring.datasource.username=${PATRIMOINE_DB_USER:patrimoine_user}",
        "spring.datasource.password=${PATRIMOINE_DB_PASSWORD:${DB_PASSWORD:}}",
        "spring.cloud.discovery.enabled=false"
})
class PatrimoinePostgresIntegrationTest {

    @Autowired
    private PatrimoineRepository repository;

    @Test
    void testPostgresConnectionFlywayAndHibernateValidation() {
        assertThat(repository).isNotNull();
        long count = repository.count();
        System.out.println(">>> [POSTGRES 16 TEST] ms-patrimoine connecté avec succès ! Nombre de sites : " + count);
        assertThat(count).isGreaterThanOrEqualTo(6);
    }
}
