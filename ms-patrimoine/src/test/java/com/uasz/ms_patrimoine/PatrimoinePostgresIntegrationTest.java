package com.uasz.ms_patrimoine;

import com.uasz.ms_patrimoine.dto.PageResponseDto;
import com.uasz.ms_patrimoine.dto.PatrimoineDto;
import com.uasz.ms_patrimoine.entities.CategoriePatrimoine;
import com.uasz.ms_patrimoine.entities.Patrimoine;
import com.uasz.ms_patrimoine.entities.StatutPublication;
import com.uasz.ms_patrimoine.entities.ZoneCasamance;
import com.uasz.ms_patrimoine.repositories.PatrimoineRepository;
import com.uasz.ms_patrimoine.services.IPatrimoineService;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

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

    @Autowired
    private IPatrimoineService patrimoineService;

    @Test
    void testPostgresConnectionFlywayV3AndCasamanceDiversity() {
        assertThat(repository).isNotNull();
        List<Patrimoine> all = repository.findAll();
        long count = all.size();
        System.out.println(">>> [POSTGRES 16 TEST] ms-patrimoine connecté avec succès ! Nombre de sites : " + count);
        assertThat(count).isGreaterThanOrEqualTo(8);

        Set<CategoriePatrimoine> categories = all.stream()
                .map(Patrimoine::getCategoriePatrimoine)
                .collect(Collectors.toSet());
        assertThat(categories).contains(
                CategoriePatrimoine.NATUREL,
                CategoriePatrimoine.CULTUREL,
                CategoriePatrimoine.HISTORIQUE,
                CategoriePatrimoine.ARCHITECTURAL,
                CategoriePatrimoine.IMMATERIEL
        );

        Set<ZoneCasamance> zones = all.stream()
                .map(Patrimoine::getZoneGeographique)
                .collect(Collectors.toSet());
        assertThat(zones).contains(
                ZoneCasamance.BASSE_CASAMANCE,
                ZoneCasamance.MOYENNE_CASAMANCE,
                ZoneCasamance.HAUTE_CASAMANCE
        );

        PageResponseDto<PatrimoineDto> page = patrimoineService.rechercherPatrimoines(
                "Ziguinchor", null, ZoneCasamance.BASSE_CASAMANCE, null,
                StatutPublication.PUBLIE, null, null, false, 0, 5, "nom", "asc");
        assertThat(page.getTotalElements()).isGreaterThanOrEqualTo(2);
    }
}
