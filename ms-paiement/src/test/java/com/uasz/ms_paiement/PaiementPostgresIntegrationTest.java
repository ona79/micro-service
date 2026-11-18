package com.uasz.ms_paiement;

import com.uasz.ms_paiement.repositories.PaiementRepository;
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
        "spring.datasource.url=jdbc:postgresql://${TEST_DB_HOST:localhost}:${TEST_DB_PORT:5432}/paiement_db",
        "spring.datasource.username=${PAIEMENT_DB_USER:paiement_user}",
        "spring.datasource.password=${PAIEMENT_DB_PASSWORD:${DB_PASSWORD:}}",
        "spring.cloud.discovery.enabled=false"
})
class PaiementPostgresIntegrationTest {

    @Autowired
    private PaiementRepository paiementRepository;

    @Test
    void testPostgresConnectionFlywayAndHibernateValidation() {
        assertThat(paiementRepository).isNotNull();
        long count = paiementRepository.count();
        System.out.println(">>> [POSTGRES 16 TEST] ms-paiement connecté avec succès ! Nombre de paiements : " + count);
        assertThat(count).isGreaterThanOrEqualTo(2);
    }
}
