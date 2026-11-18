package com.uasz.ms_utilisateur;

import com.uasz.ms_utilisateur.repositories.UtilisateurRepository;
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
        "spring.datasource.url=jdbc:postgresql://${TEST_DB_HOST:localhost}:${TEST_DB_PORT:5432}/utilisateur_db",
        "spring.datasource.username=${UTILISATEUR_DB_USER:utilisateur_user}",
        "spring.datasource.password=${UTILISATEUR_DB_PASSWORD:${DB_PASSWORD:}}",
        "spring.cloud.discovery.enabled=false"
})
class UtilisateurPostgresIntegrationTest {

    @Autowired
    private UtilisateurRepository utilisateurRepository;

    @Test
    void testPostgresConnectionFlywayAndHibernateValidation() {
        assertThat(utilisateurRepository).isNotNull();
        long count = utilisateurRepository.count();
        System.out.println(">>> [POSTGRES 16 TEST] ms-utilisateur connecté avec succès ! Nombre d'utilisateurs : " + count);
        assertThat(count).isGreaterThanOrEqualTo(3);
    }
}
