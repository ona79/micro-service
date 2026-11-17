package com.uasz.ms_evenement;

import com.uasz.ms_evenement.repositories.EvenementRepository;
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
        "spring.datasource.url=jdbc:postgresql://${TEST_DB_HOST:localhost}:${TEST_DB_PORT:5432}/evenement_db",
        "spring.datasource.username=${EVENEMENT_DB_USER:evenement_user}",
        "spring.datasource.password=${EVENEMENT_DB_PASSWORD:${DB_PASSWORD:}}",
        "spring.cloud.discovery.enabled=false"
})
class EvenementPostgresIntegrationTest {

    @Autowired
    private EvenementRepository evenementRepository;

    @Test
    void testPostgresConnectionFlywayAndHibernateValidation() {
        assertThat(evenementRepository).isNotNull();
        long count = evenementRepository.count();
        System.out.println(">>> [POSTGRES 16 TEST] ms-evenement connecté avec succès ! Nombre d'événements : " + count);
        assertThat(count).isGreaterThanOrEqualTo(3);
    }
}
