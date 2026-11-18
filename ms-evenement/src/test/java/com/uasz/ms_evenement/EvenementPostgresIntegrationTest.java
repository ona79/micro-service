package com.uasz.ms_evenement;

import com.uasz.ms_evenement.dto.EvenementDto;
import com.uasz.ms_evenement.dto.PageResponseDto;
import com.uasz.ms_evenement.entities.Evenement;
import com.uasz.ms_evenement.entities.StatutEvenement;
import com.uasz.ms_evenement.repositories.EvenementRepository;
import com.uasz.ms_evenement.services.IEvenementService;
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
        "spring.datasource.url=jdbc:postgresql://${TEST_DB_HOST:localhost}:${TEST_DB_PORT:5432}/evenement_db",
        "spring.datasource.username=${EVENEMENT_DB_USER:evenement_user}",
        "spring.datasource.password=${EVENEMENT_DB_PASSWORD:${DB_PASSWORD:}}",
        "spring.cloud.discovery.enabled=false"
})
class EvenementPostgresIntegrationTest {

    @Autowired
    private EvenementRepository evenementRepository;

    @Autowired
    private IEvenementService evenementService;

    @Test
    void testPostgresConnectionFlywayV3AndUpcomingEvents() {
        assertThat(evenementRepository).isNotNull();
        List<Evenement> all = evenementRepository.findAll();
        long count = all.size();
        System.out.println(">>> [POSTGRES 16 TEST] ms-evenement connecté avec succès ! Nombre d'événements : " + count);
        assertThat(count).isGreaterThanOrEqualTo(3);
        assertThat(all).allSatisfy(e -> {
            assertThat(e.getStatutEvenement()).isNotNull();
            assertThat(e.getFuseauHoraire()).isEqualTo("Africa/Dakar");
        });

        List<EvenementDto> aVenir = evenementService.getEvenementsAVenir();
        assertThat(aVenir).isNotEmpty();
        assertThat(aVenir).allSatisfy(e -> assertThat(e.getStatutEvenement()).isEqualTo(StatutEvenement.PUBLIE));

        PageResponseDto<EvenementDto> page = evenementService.rechercherEvenements(
                "Casamance", null, "BASSE_CASAMANCE", null, StatutEvenement.PUBLIE,
                null, null, null, false, false, 0, 10, "dateDebut", "asc");
        assertThat(page.getTotalElements()).isGreaterThanOrEqualTo(1);
    }
}
