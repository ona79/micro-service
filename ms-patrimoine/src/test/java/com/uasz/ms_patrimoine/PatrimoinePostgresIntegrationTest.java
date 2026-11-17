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
        "spring.datasource.url=jdbc:postgresql://172.20.0.2:5432/patrimoine_db",
        "spring.datasource.username=patrimoine_user",
        "spring.datasource.password=patrimoine_pass_2026!",
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
