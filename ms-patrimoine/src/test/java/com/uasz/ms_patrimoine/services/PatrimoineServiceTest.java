package com.uasz.ms_patrimoine.services;

import com.uasz.ms_patrimoine.dto.PageResponseDto;
import com.uasz.ms_patrimoine.dto.PatrimoineDto;
import com.uasz.ms_patrimoine.entities.CategoriePatrimoine;
import com.uasz.ms_patrimoine.entities.Patrimoine;
import com.uasz.ms_patrimoine.entities.StatutPublication;
import com.uasz.ms_patrimoine.entities.ZoneCasamance;
import com.uasz.ms_patrimoine.exceptions.BadRequestException;
import com.uasz.ms_patrimoine.exceptions.ForbiddenException;
import com.uasz.ms_patrimoine.exceptions.ResourceNotFoundException;
import com.uasz.ms_patrimoine.exceptions.UnauthorizedException;
import com.uasz.ms_patrimoine.mappers.PatrimoineMapper;
import com.uasz.ms_patrimoine.repositories.PatrimoineRepository;
import com.uasz.ms_patrimoine.security.SecurityUserContext;
import com.uasz.ms_patrimoine.security.SecurityUserContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PatrimoineServiceTest {

    @Mock
    private PatrimoineRepository patrimoineRepository;

    private final PatrimoineMapper patrimoineMapper = Mappers.getMapper(PatrimoineMapper.class);

    private PatrimoineService patrimoineService;

    private Patrimoine patrimoine;

    @BeforeEach
    void setUp() {
        patrimoineService = new PatrimoineService(patrimoineRepository, patrimoineMapper);
        SecurityUserContextHolder.setContext(new SecurityUserContext(4L, "CONSERVATEUR", "fatou@uasz.sn", false, null));
        patrimoine = Patrimoine.builder()
                .id(1L)
                .nomPatrimoine("Mémorial du Joola")
                .codePatrimoine("PAT-ZIG-001")
                .descriptionPatrimoine("Monument historique et mémorial de Ziguinchor")
                .historiquePatrimoine("Inauguré en 2024")
                .adressePatrimoine("Boucotte, Ziguinchor, Casamance")
                .capacitePatrimoine(250)
                .latitudePatrimoine(12.5833f)
                .longitudePatrimoine(-16.2719f)
                .categoriePatrimoine(CategoriePatrimoine.HISTORIQUE)
                .zoneGeographique(ZoneCasamance.BASSE_CASAMANCE)
                .localite("Ziguinchor")
                .statutPublication(StatutPublication.PUBLIE)
                .donneeDemonstration(true)
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityUserContextHolder.clear();
    }

    @Test
    void savePatrimoine_ignoreIdFourniEtRetourneDtoAvecAudit() {
        PatrimoineDto dto = patrimoineMapper.toDto(patrimoine);
        dto.setId(99L);
        when(patrimoineRepository.save(any(Patrimoine.class))).thenAnswer(inv -> {
            Patrimoine p = inv.getArgument(0);
            assertThat(p.getId()).isNull();
            p.setId(1L);
            return p;
        });

        PatrimoineDto result = patrimoineService.savePatrimoine(dto);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getNomPatrimoine()).isEqualTo("Mémorial du Joola");
        assertThat(result.getCapacitePatrimoine()).isEqualTo(250);
        assertThat(result.getCreeParId()).isEqualTo(4L);
        assertThat(result.getValideParId()).isEqualTo(4L);
        assertThat(result.getDatePublication()).isNotNull();
    }

    @Test
    void savePatrimoine_coordonneesGpsHorsBornes_leveBadRequest() {
        PatrimoineDto dto = patrimoineMapper.toDto(patrimoine);
        dto.setLatitudePatrimoine(95.0f);
        assertThatThrownBy(() -> patrimoineService.savePatrimoine(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("latitude");

        dto.setLatitudePatrimoine(12.58f);
        dto.setLongitudePatrimoine(-190.0f);
        assertThatThrownBy(() -> patrimoineService.savePatrimoine(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("longitude");
    }

    @Test
    void publierPatrimoine_sansInfosObligatoiresOuGpsZero_leveBadRequest() {
        Patrimoine brouillonIncomplet = Patrimoine.builder()
                .id(2L)
                .nomPatrimoine("Site en brouillon")
                .codePatrimoine("PAT-ZIG-099")
                .descriptionPatrimoine("Court")
                .adressePatrimoine("Ziguinchor")
                .latitudePatrimoine(0.0f)
                .longitudePatrimoine(0.0f)
                .statutPublication(StatutPublication.BROUILLON)
                .build();
        when(patrimoineRepository.findById(2L)).thenReturn(Optional.of(brouillonIncomplet));

        assertThatThrownBy(() -> patrimoineService.publierPatrimoine(2L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Publication refusée");
    }

    @Test
    void workflow_soumettrePublierEtArchiverPatrimoine_traceLesDatesEtMasqueDuPublic() {
        Patrimoine fiche = Patrimoine.builder()
                .id(3L)
                .nomPatrimoine("Forêt Sacrée de Tendouck")
                .codePatrimoine("PAT-BIG-010")
                .descriptionPatrimoine("Sanctuaire écologique et culturel du Fogny en Basse-Casamance.")
                .adressePatrimoine("Tendouck, Bignona, Basse-Casamance")
                .latitudePatrimoine(12.6650f)
                .longitudePatrimoine(-16.2310f)
                .categoriePatrimoine(CategoriePatrimoine.NATUREL)
                .zoneGeographique(ZoneCasamance.BASSE_CASAMANCE)
                .statutPublication(StatutPublication.BROUILLON)
                .build();

        when(patrimoineRepository.findById(3L)).thenReturn(Optional.of(fiche));
        when(patrimoineRepository.save(any(Patrimoine.class))).thenAnswer(inv -> inv.getArgument(0));

        PatrimoineDto soumis = patrimoineService.soumettrePatrimoine(3L);
        assertThat(soumis.getStatutPublication()).isEqualTo(StatutPublication.SOUMIS);

        PatrimoineDto publie = patrimoineService.publierPatrimoine(3L);
        assertThat(publie.getStatutPublication()).isEqualTo(StatutPublication.PUBLIE);
        assertThat(publie.getValideParId()).isEqualTo(4L);
        assertThat(publie.getDatePublication()).isNotNull();

        PatrimoineDto archive = patrimoineService.archiverPatrimoine(3L, "Fermeture temporaire pour restauration");
        assertThat(archive.getStatutPublication()).isEqualTo(StatutPublication.ARCHIVE);
        assertThat(archive.getDateArchivage()).isNotNull();
        assertThat(archive.getMotifStatut()).contains("restauration");

        // Un touriste ne peut plus consulter par ID ni lister la fiche archivée
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "t@uasz.sn", false, null));
        when(patrimoineRepository.findAll()).thenReturn(List.of(patrimoine, fiche));
        assertThat(patrimoineService.getAllPatrimoines()).hasSize(1);
        assertThatThrownBy(() -> patrimoineService.getByIdPatrimoine(3L))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void permissionPublier_utilisateurAvecCreerModifierSansPublier_refusePublication() {
        // Utilisateur disposant uniquement de PATRIMOINE:CREER et PATRIMOINE:MODIFIER mais PAS PATRIMOINE:PUBLIER
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                12L, "CONSERVATEUR", List.of("PATRIMOINE:LIRE", "PATRIMOINE:CREER", "PATRIMOINE:MODIFIER"),
                "stagiaire@uasz.sn", false, null));

        assertThatThrownBy(() -> patrimoineService.publierPatrimoine(1L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("PATRIMOINE:PUBLIER");

        PatrimoineDto dtoPublie = patrimoineMapper.toDto(patrimoine);
        dtoPublie.setStatutPublication(StatutPublication.PUBLIE);
        assertThatThrownBy(() -> patrimoineService.savePatrimoine(dtoPublie))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("PATRIMOINE:PUBLIER");
    }

    @Test
    void suppressionPhysique_ressourcePublieeOuSoumise_refusee() {
        when(patrimoineRepository.findById(1L)).thenReturn(Optional.of(patrimoine));

        assertThatThrownBy(() -> patrimoineService.deletePatrimoine(1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Suppression physique refusée");
        verify(patrimoineRepository, never()).deleteById(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void rechercherPatrimoines_filtreTrieEtPagineCorrectement() {
        Patrimoine p2 = Patrimoine.builder()
                .id(2L)
                .nomPatrimoine("Fort Pinet-Laprade")
                .codePatrimoine("PAT-SED-006")
                .descriptionPatrimoine("Fortification historique de Moyenne-Casamance")
                .adressePatrimoine("Sédhiou")
                .localite("Sédhiou")
                .capacitePatrimoine(180)
                .categoriePatrimoine(CategoriePatrimoine.HISTORIQUE)
                .zoneGeographique(ZoneCasamance.MOYENNE_CASAMANCE)
                .statutPublication(StatutPublication.PUBLIE)
                .build();
        when(patrimoineRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenAnswer(inv -> {
                    Pageable pageable = inv.getArgument(1);
                    return new PageImpl<>(List.of(p2), pageable, 1);
                });

        PageResponseDto<PatrimoineDto> pageMoyenne = patrimoineService.rechercherPatrimoines(
                null, CategoriePatrimoine.HISTORIQUE, ZoneCasamance.MOYENNE_CASAMANCE,
                null, null, 100, null, false, 0, 10, "capacite", "desc");

        assertThat(pageMoyenne.getTotalElements()).isEqualTo(1);
        assertThat(pageMoyenne.getContent().getFirst().getCodePatrimoine()).isEqualTo("PAT-SED-006");
    }

    @Test
    void rbac_seulsConservateurEtAdministrateurPeuventModifierPatrimoine() {
        PatrimoineDto dto = patrimoineMapper.toDto(patrimoine);

        // Sans contexte -> 401
        SecurityUserContextHolder.clear();
        assertThatThrownBy(() -> patrimoineService.savePatrimoine(dto)).isInstanceOf(UnauthorizedException.class);

        // TOURISTE -> 403
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "t@uasz.sn", false, null));
        assertThatThrownBy(() -> patrimoineService.savePatrimoine(dto)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> patrimoineService.publierPatrimoine(1L)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> patrimoineService.rechercherPatrimoines(
                null, null, null, null, StatutPublication.ARCHIVE, null, null, true, 0, 10, "nom", "asc"))
                .isInstanceOf(ForbiddenException.class);

        // GUIDE -> 403
        SecurityUserContextHolder.setContext(new SecurityUserContext(5L, "GUIDE", "g@uasz.sn", false, null));
        assertThatThrownBy(() -> patrimoineService.updatePatrimoine(1L, dto)).isInstanceOf(ForbiddenException.class);

        // GESTIONNAIRE_SITE -> 403 (ne possède que PATRIMOINE:LIRE)
        SecurityUserContextHolder.setContext(new SecurityUserContext(3L, "GESTIONNAIRE_SITE", "gs@uasz.sn", false, null));
        assertThatThrownBy(() -> patrimoineService.deletePatrimoine(1L)).isInstanceOf(ForbiddenException.class);
    }

    @Test
    void getAllPatrimoines_retourneListeDeDto() {
        when(patrimoineRepository.findAll()).thenReturn(List.of(patrimoine));

        List<PatrimoineDto> result = patrimoineService.getAllPatrimoines();

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getCodePatrimoine()).isEqualTo("PAT-ZIG-001");
    }

    @Test
    void getByIdPatrimoine_existant() {
        when(patrimoineRepository.findById(1L)).thenReturn(Optional.of(patrimoine));

        assertThat(patrimoineService.getByIdPatrimoine(1L).getLatitudePatrimoine()).isEqualTo(12.5833f);
    }

    @Test
    void getByIdPatrimoine_inexistant_leveResourceNotFound() {
        when(patrimoineRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> patrimoineService.getByIdPatrimoine(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void updatePatrimoine_modifieChampsSansToucherId() {
        when(patrimoineRepository.findById(1L)).thenReturn(Optional.of(patrimoine));
        when(patrimoineRepository.save(any(Patrimoine.class))).thenAnswer(inv -> inv.getArgument(0));
        PatrimoineDto modif = patrimoineMapper.toDto(patrimoine);
        modif.setId(42L);
        modif.setCapacitePatrimoine(200);

        PatrimoineDto result = patrimoineService.updatePatrimoine(1L, modif);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getCapacitePatrimoine()).isEqualTo(200);
    }

    @Test
    void updatePatrimoine_inexistant_leveResourceNotFound() {
        when(patrimoineRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> patrimoineService.updatePatrimoine(999L, new PatrimoineDto()))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(patrimoineRepository, never()).save(any());
    }

    @Test
    void deletePatrimoine_existant() {
        when(patrimoineRepository.existsById(1L)).thenReturn(true);

        patrimoineService.deletePatrimoine(1L);

        verify(patrimoineRepository).deleteById(1L);
    }

    @Test
    void deletePatrimoine_inexistant_leveResourceNotFound() {
        when(patrimoineRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> patrimoineService.deletePatrimoine(999L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(patrimoineRepository, never()).deleteById(any());
    }

    @Test
    void getStatistiques_calculeSelonRoleEtBloqueTouriste() {
        Patrimoine pub = Patrimoine.builder()
                .id(1L).nomPatrimoine("Musée").codePatrimoine("P1").capacitePatrimoine(40).tarifEntree(2000.0)
                .statutPublication(com.uasz.ms_patrimoine.entities.StatutPublication.PUBLIE).build();
        Patrimoine draft = Patrimoine.builder()
                .id(2L).nomPatrimoine("Site Brouillon").codePatrimoine("P2").capacitePatrimoine(20).tarifEntree(0.0)
                .statutPublication(com.uasz.ms_patrimoine.entities.StatutPublication.BROUILLON).build();

        com.uasz.ms_patrimoine.security.SecurityUserContextHolder.setContext(
                new com.uasz.ms_patrimoine.security.SecurityUserContext(2L, "TOURISTE", "t@uasz.sn", false, null));
        assertThatThrownBy(() -> patrimoineService.getStatistiques())
                .isInstanceOf(com.uasz.ms_patrimoine.exceptions.ForbiddenException.class);

        when(patrimoineRepository.findAll()).thenReturn(List.of(pub, draft));
        com.uasz.ms_patrimoine.security.SecurityUserContextHolder.setContext(
                new com.uasz.ms_patrimoine.security.SecurityUserContext(3L, "GESTIONNAIRE_SITE", "g@uasz.sn", false, null));
        var pubOnlyStats = patrimoineService.getStatistiques();
        assertThat(pubOnlyStats.getScope()).isEqualTo("PUBLIE_UNIQUEMENT");
        assertThat(pubOnlyStats.getTotal()).isEqualTo(1L);
        assertThat(pubOnlyStats.getBrouillons()).isEqualTo(0L);

        com.uasz.ms_patrimoine.security.SecurityUserContextHolder.setContext(
                new com.uasz.ms_patrimoine.security.SecurityUserContext(4L, "CONSERVATEUR", "c@uasz.sn", false, null));
        var fullStats = patrimoineService.getStatistiques();
        assertThat(fullStats.getScope()).isEqualTo("GLOBAL");
        assertThat(fullStats.getTotal()).isEqualTo(2L);
        assertThat(fullStats.getBrouillons()).isEqualTo(1L);
        assertThat(fullStats.getPublies()).isEqualTo(1L);
    }

    @Test
    void getPatrimoinesProximite_calculeDistanceHaversineEtFiltreParRayon() {
        Patrimoine ziguinchor = Patrimoine.builder()
                .id(1L)
                .nomPatrimoine("Mémorial du Joola")
                .codePatrimoine("MEM-JOOLA")
                .latitudePatrimoine(12.5833f)
                .longitudePatrimoine(-16.2667f)
                .statutPublication(com.uasz.ms_patrimoine.entities.StatutPublication.PUBLIE)
                .build();
        Patrimoine oussouye = Patrimoine.builder()
                .id(2L)
                .nomPatrimoine("Royaume d'Oussouye")
                .codePatrimoine("ROY-OUSSOUYE")
                .latitudePatrimoine(12.4850f)
                .longitudePatrimoine(-16.5450f)
                .statutPublication(com.uasz.ms_patrimoine.entities.StatutPublication.PUBLIE)
                .build();
        Patrimoine capSkirring = Patrimoine.builder()
                .id(3L)
                .nomPatrimoine("Falaises de Djimbéring")
                .codePatrimoine("FAL-DJIMBERING")
                .latitudePatrimoine(12.4000f)
                .longitudePatrimoine(-16.7600f)
                .statutPublication(com.uasz.ms_patrimoine.entities.StatutPublication.PUBLIE)
                .build();

        when(patrimoineRepository.findByStatutPublication(com.uasz.ms_patrimoine.entities.StatutPublication.PUBLIE))
                .thenReturn(List.of(ziguinchor, oussouye, capSkirring));

        // Depuis Ziguinchor (12.5833, -16.2667) avec rayon de 35 km
        var resultats = patrimoineService.getPatrimoinesProximite(12.5833, -16.2667, 35.0, 10);

        // Ziguinchor est à 0 km, Oussouye à environ 32 km, Cap Skirring est à plus de 50 km (exclu)
        assertThat(resultats).hasSize(2);
        assertThat(resultats.get(0).getNomPatrimoine()).isEqualTo("Mémorial du Joola");
        assertThat(resultats.get(0).getDistanceKm()).isLessThanOrEqualTo(0.5);
        assertThat(resultats.get(1).getNomPatrimoine()).isEqualTo("Royaume d'Oussouye");
        assertThat(resultats.get(1).getDistanceKm()).isBetween(25.0, 35.0);
    }
}
