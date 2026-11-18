package com.uasz.ms_circuit.services;

import com.uasz.ms_circuit.clients.PatrimoineClient;
import com.uasz.ms_circuit.dto.CircuitDto;
import com.uasz.ms_circuit.dto.EtapeDto;
import com.uasz.ms_circuit.dto.PageResponseDto;
import com.uasz.ms_circuit.dto.PatrimoineDto;
import com.uasz.ms_circuit.entities.Circuit;
import com.uasz.ms_circuit.entities.Difficulte;
import com.uasz.ms_circuit.entities.Etape;
import com.uasz.ms_circuit.entities.MoyenTransport;
import com.uasz.ms_circuit.entities.StatutCircuit;
import com.uasz.ms_circuit.exceptions.BadRequestException;
import com.uasz.ms_circuit.exceptions.ForbiddenException;
import com.uasz.ms_circuit.exceptions.ResourceNotFoundException;
import com.uasz.ms_circuit.exceptions.ServiceIndisponibleException;
import com.uasz.ms_circuit.mappers.CircuitMapper;
import com.uasz.ms_circuit.repositories.CircuitRepository;
import com.uasz.ms_circuit.security.SecurityUserContext;
import com.uasz.ms_circuit.security.SecurityUserContextHolder;
import feign.FeignException;
import feign.Request;
import feign.RequestTemplate;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CircuitServiceTest {

    @Mock
    private CircuitRepository circuitRepository;

    @Mock
    private PatrimoineClient patrimoineClient;

    private final CircuitMapper circuitMapper = Mappers.getMapper(CircuitMapper.class);

    private CircuitService circuitService;

    private PatrimoineDto p1;
    private PatrimoineDto p2;

    @BeforeEach
    void setUp() {
        circuitService = new CircuitService(circuitRepository, circuitMapper, patrimoineClient);
        SecurityUserContextHolder.setContext(new SecurityUserContext(3L, "GESTIONNAIRE_SITE", "awa@uasz.sn", false, null));
        p1 = new PatrimoineDto(1L, "Mémorial du Joola", "PAT-ZIG-001", "Desc 1", "Hist 1",
                "Ziguinchor", 250, 12.5833f, -16.2719f);
        p2 = new PatrimoineDto(2L, "Comptoir de Carabane", "PAT-CRB-002", "Desc 2", "Hist 2",
                "Carabane", 200, 12.5358f, -16.6978f);
    }

    @AfterEach
    void tearDown() {
        SecurityUserContextHolder.clear();
    }

    // =========================================================================
    // Test 1 : Circuit publié + patrimoine publié : accepté
    // =========================================================================
    @Test
    void saveCircuit_circuitPublieAvecPatrimoinePublie_accepteEtCalculeDureeEtDistance() {
        when(patrimoineClient.getPatrimoineById(1L)).thenReturn(p1);
        when(patrimoineClient.getPatrimoineById(2L)).thenReturn(p2);
        when(circuitRepository.save(any(Circuit.class))).thenAnswer(inv -> {
            Circuit c = inv.getArgument(0);
            c.setId(10L);
            return c;
        });

        EtapeDto e1 = new EtapeDto(null, 2, 45, 2L, null);
        EtapeDto e2 = new EtapeDto(null, 1, 60, 1L, null);
        CircuitDto input = new CircuitDto(null, "Tour de Casamance", "Découverte", Difficulte.FACILE,
                0, 0.0, 30, 5000.0, List.of(e1, e2));

        CircuitDto saved = circuitService.saveCircuit(input);

        assertThat(saved.getId()).isEqualTo(10L);
        assertThat(saved.getStatutCircuit()).isEqualTo(StatutCircuit.PUBLIE);
        assertThat(saved.getDureeEstimee()).isEqualTo(105);
        assertThat(saved.getDistanceTotale()).isGreaterThan(10.0);
        assertThat(saved.getModeCalculDistance()).isEqualTo("ESTIMATION_ORTHODROMIQUE_INDICATIVE");
        assertThat(saved.getEtapes()).hasSize(2);
        assertThat(saved.getEtapes().get(0).getOrdre()).isEqualTo(1);
        assertThat(saved.getEtapes().get(0).getPatrimoine().getNomPatrimoine()).isEqualTo("Mémorial du Joola");
        assertThat(saved.getEtapes().get(1).getOrdre()).isEqualTo(2);
        assertThat(saved.getEtapes().get(1).getPatrimoine().getNomPatrimoine()).isEqualTo("Comptoir de Carabane");
    }

    // =========================================================================
    // Test 2 : Circuit publié + patrimoine brouillon : refusé
    // =========================================================================
    @Test
    void saveCircuit_circuitPublieAvecPatrimoineBrouillon_refuse() {
        PatrimoineDto pBrouillon = new PatrimoineDto(3L, "Site Brouillon", "PAT-BR-003", "Desc", "Hist",
                "Ziguinchor", 100, 12.58f, -16.27f);
        pBrouillon.setStatutPublication("BROUILLON");
        when(patrimoineClient.getPatrimoineById(3L)).thenReturn(pBrouillon);

        EtapeDto e1 = new EtapeDto(null, 1, 60, 3L, null);
        CircuitDto input = new CircuitDto(null, "Circuit Public", "Desc", Difficulte.FACILE,
                0, 0.0, 20, 3000.0, List.of(e1));
        input.setStatutCircuit(StatutCircuit.PUBLIE);

        assertThatThrownBy(() -> circuitService.saveCircuit(input))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("BROUILLON");
    }

    // =========================================================================
    // Test 3 : Circuit publié + patrimoine soumis : refusé
    // =========================================================================
    @Test
    void publierCircuit_avecPatrimoineSoumis_refuse() {
        PatrimoineDto pSoumis = new PatrimoineDto(4L, "Site Soumis", "PAT-SM-004", "Desc", "Hist",
                "Oussouye", 100, 12.48f, -16.54f);
        pSoumis.setStatutPublication("SOUMIS");
        when(patrimoineClient.getPatrimoineById(4L)).thenReturn(pSoumis);

        Etape etape = Etape.builder().id(1L).ordre(1).dureeVisite(60).patrimoineId(4L).build();
        Circuit circuit = Circuit.builder()
                .id(1L).nomCircuit("Circuit En Attente").statutCircuit(StatutCircuit.BROUILLON)
                .etapes(new ArrayList<>(List.of(etape))).build();
        etape.setCircuit(circuit);
        when(circuitRepository.findById(1L)).thenReturn(Optional.of(circuit));

        assertThatThrownBy(() -> circuitService.publierCircuit(1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("SOUMIS");
    }

    // =========================================================================
    // Test 4 : Circuit publié + patrimoine archivé : refusé
    // =========================================================================
    @Test
    void saveCircuit_patrimoineArchive_leveBadRequest() {
        PatrimoineDto pArchive = new PatrimoineDto(5L, "Site Archivé", "PAT-ARC-005", "Desc", "Hist",
                "Oussouye", 100, 12.48f, -16.54f);
        pArchive.setStatutPublication("ARCHIVE");
        when(patrimoineClient.getPatrimoineById(5L)).thenReturn(pArchive);

        EtapeDto e1 = new EtapeDto(null, 1, 60, 5L, null);
        CircuitDto input = new CircuitDto(null, "Circuit", "Desc", Difficulte.FACILE,
                0, 0.0, 20, 3000.0, List.of(e1));

        assertThatThrownBy(() -> circuitService.saveCircuit(input))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("archivé");
    }

    @Test
    void saveCircuit_ordreDupliqueOuInvalide_leveBadRequest() {
        EtapeDto e1 = new EtapeDto(null, 1, 60, 1L, null);
        EtapeDto e2 = new EtapeDto(null, 1, 45, 2L, null);
        CircuitDto input = new CircuitDto(null, "Circuit", "Desc", Difficulte.FACILE,
                0, 0.0, 20, 3000.0, List.of(e1, e2));

        assertThatThrownBy(() -> circuitService.saveCircuit(input))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ordre 1");
    }

    // =========================================================================
    // Tests 7, 8, 9, 10 : BOLA strict des Guides sur les circuits
    // =========================================================================
    @Test
    void bolaGuide_propreCircuitAccepte_autreGuideRefuse_sansResponsableRefuse_changementResponsableRefuse() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(5L, "GUIDE", "guide5@uasz.sn", false, null));
        EtapeDto e1 = new EtapeDto(null, 1, 60, 1L, null);
        CircuitDto updateDto = new CircuitDto(1L, "Circuit Mis à Jour", "Desc", Difficulte.FACILE,
                0, 0.0, 20, 3000.0, List.of(e1));
        updateDto.setStatutCircuit(StatutCircuit.BROUILLON);

        // Test 7 : Guide (id=5) modifiant son propre circuit (guideResponsableId=5) -> ACCEPTÉ
        Circuit circuitDuGuide5 = Circuit.builder()
                .id(1L)
                .nomCircuit("Circuit Guide 5")
                .guideResponsableId(5L)
                .statutCircuit(StatutCircuit.BROUILLON)
                .etapes(new ArrayList<>())
                .build();
        when(circuitRepository.findById(1L)).thenReturn(Optional.of(circuitDuGuide5));
        when(patrimoineClient.getPatrimoineById(1L)).thenReturn(p1);
        when(circuitRepository.save(any(Circuit.class))).thenAnswer(inv -> inv.getArgument(0));

        CircuitDto updatedOwn = circuitService.updateCircuit(1L, updateDto);
        assertThat(updatedOwn.getGuideResponsableId()).isEqualTo(5L);
        assertThat(updatedOwn.getNomCircuit()).isEqualTo("Circuit Mis à Jour");

        // Test 8 : Guide (id=5) modifiant le circuit d'un autre guide (guideResponsableId=99) -> REFUSÉ (403)
        Circuit circuitAutreGuide = Circuit.builder()
                .id(2L)
                .nomCircuit("Circuit Guide 99")
                .guideResponsableId(99L)
                .statutCircuit(StatutCircuit.BROUILLON)
                .etapes(new ArrayList<>())
                .build();
        when(circuitRepository.findById(2L)).thenReturn(Optional.of(circuitAutreGuide));
        assertThatThrownBy(() -> circuitService.updateCircuit(2L, updateDto))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("autre guide");

        // Test 9 : Guide (id=5) modifiant ou soumettant un circuit sans responsable (guideResponsableId=null) -> REFUSÉ (403)
        Circuit circuitSansResponsable = Circuit.builder()
                .id(3L)
                .nomCircuit("Circuit Sans Guide")
                .guideResponsableId(null)
                .statutCircuit(StatutCircuit.BROUILLON)
                .etapes(new ArrayList<>())
                .build();
        when(circuitRepository.findById(3L)).thenReturn(Optional.of(circuitSansResponsable));
        assertThatThrownBy(() -> circuitService.updateCircuit(3L, updateDto))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("sans guide responsable");
        assertThatThrownBy(() -> circuitService.soumettreCircuit(3L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("sans guide responsable");

        // Test 10 : Guide (id=5) tentant de changer le responsable de son circuit (guideResponsableId=5 -> 99) -> REFUSÉ (403)
        CircuitDto tentativeChangementGuide = new CircuitDto(1L, "Circuit", "Desc", Difficulte.FACILE,
                0, 0.0, 20, 3000.0, List.of(e1));
        tentativeChangementGuide.setGuideResponsableId(99L);
        assertThatThrownBy(() -> circuitService.updateCircuit(1L, tentativeChangementGuide))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("réaffecter");
    }

    // =========================================================================
    // Test 11 & Test 12 : Suppression ressource publiée refusée & Permission PUBLIER
    // =========================================================================
    @Test
    void suppressionCircuitPublieRefusee_etUtilisateurSansPermissionPublierRefuse() {
        Circuit circuitPublie = Circuit.builder()
                .id(1L).nomCircuit("Circuit Publié").statutCircuit(StatutCircuit.PUBLIE).build();
        when(circuitRepository.findById(1L)).thenReturn(Optional.of(circuitPublie));

        // Test 11 : Suppression physique d'un circuit publié -> refusée (400)
        assertThatThrownBy(() -> circuitService.deleteCircuit(1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Suppression physique refusée");
        verify(circuitRepository, never()).deleteById(any());

        // Test 12 : Utilisateur avec CIRCUIT:CREER et CIRCUIT:MODIFIER mais sans CIRCUIT:PUBLIER -> publication refusée (403)
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                30L, "GESTIONNAIRE_SITE", List.of("CIRCUIT:LIRE", "CIRCUIT:CREER", "CIRCUIT:MODIFIER"),
                "junior@uasz.sn", false, null));
        assertThatThrownBy(() -> circuitService.publierCircuit(1L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("CIRCUIT:PUBLIER");

        EtapeDto e1 = new EtapeDto(null, 1, 60, 1L, null);
        CircuitDto dtoPublie = new CircuitDto(null, "Nouveau", "Desc", Difficulte.FACILE, 0, 0.0, 20, 3000.0, List.of(e1));
        dtoPublie.setStatutCircuit(StatutCircuit.PUBLIE);
        assertThatThrownBy(() -> circuitService.saveCircuit(dtoPublie))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("CIRCUIT:PUBLIER");
    }

    @Test
    void workflowEtRecherche_soumettrePublierArchiverEtRechercherCircuits() {
        Etape etape = Etape.builder().id(1L).ordre(1).dureeVisite(90).patrimoineId(1L).build();
        Circuit circuit = Circuit.builder()
                .id(1L)
                .nomCircuit("Circuit Pirogue et Mangrove")
                .descriptionCircuit("Traversée des bolongs")
                .difficulte(Difficulte.MOYEN)
                .moyenTransport(MoyenTransport.PIROGUE)
                .zoneGeographique("BASSE_CASAMANCE")
                .dureeEstimee(90)
                .distanceTotale(18.5)
                .placesMax(15)
                .prix(12000.0)
                .statutCircuit(StatutCircuit.BROUILLON)
                .etapes(new ArrayList<>(List.of(etape)))
                .build();
        etape.setCircuit(circuit);

        when(circuitRepository.findById(1L)).thenReturn(Optional.of(circuit));
        when(circuitRepository.save(any(Circuit.class))).thenAnswer(inv -> inv.getArgument(0));
        when(patrimoineClient.getPatrimoineById(1L)).thenReturn(p1);

        CircuitDto soumis = circuitService.soumettreCircuit(1L);
        assertThat(soumis.getStatutCircuit()).isEqualTo(StatutCircuit.SOUMIS);

        CircuitDto publie = circuitService.publierCircuit(1L);
        assertThat(publie.getStatutCircuit()).isEqualTo(StatutCircuit.PUBLIE);

        when(circuitRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenAnswer(inv -> new PageImpl<>(List.of(circuit), inv.getArgument(1), 1));
        PageResponseDto<CircuitDto> page = circuitService.rechercherCircuits(
                "Pirogue", Difficulte.MOYEN, MoyenTransport.PIROGUE, "BASSE_CASAMANCE",
                StatutCircuit.PUBLIE, 120, 25.0, 15000.0, false, 0, 10, "prix", "asc");
        assertThat(page.getTotalElements()).isEqualTo(1);

        CircuitDto archive = circuitService.archiverCircuit(1L, "Fin de saison");
        assertThat(archive.getStatutCircuit()).isEqualTo(StatutCircuit.ARCHIVE);
    }

    @Test
    void saveCircuit_patrimoineInexistant_leveBadRequest() {
        Request req = Request.create(Request.HttpMethod.GET, "/api/patrimoines/999", Map.of(), null, new RequestTemplate());
        when(patrimoineClient.getPatrimoineById(999L))
                .thenThrow(new FeignException.NotFound("Not found", req, null, null));

        EtapeDto e1 = new EtapeDto(null, 1, 60, 999L, null);
        CircuitDto input = new CircuitDto(null, "Circuit", "Desc", Difficulte.MOYEN,
                0, 0.0, 20, 3000.0, List.of(e1));

        assertThatThrownBy(() -> circuitService.saveCircuit(input))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("999");
    }

    @Test
    void saveCircuit_servicePatrimoineDown_leveServiceIndisponible() {
        Request req = Request.create(Request.HttpMethod.GET, "/api/patrimoines/1", Map.of(), null, new RequestTemplate());
        when(patrimoineClient.getPatrimoineById(1L))
                .thenThrow(new FeignException.InternalServerError("Down", req, null, null));

        EtapeDto e1 = new EtapeDto(null, 1, 60, 1L, null);
        CircuitDto input = new CircuitDto(null, "Circuit", "Desc", Difficulte.MOYEN,
                0, 0.0, 20, 3000.0, List.of(e1));

        assertThatThrownBy(() -> circuitService.saveCircuit(input))
                .isInstanceOf(ServiceIndisponibleException.class);
    }

    @Test
    void getByIdCircuit_enrichitDepuisFeign() {
        Etape etape = Etape.builder().id(1L).ordre(1).dureeVisite(60).patrimoineId(1L).build();
        Circuit circuit = Circuit.builder().id(1L).nomCircuit("Circuit Casamance")
                .difficulte(Difficulte.FACILE).dureeEstimee(60).distanceTotale(0.0)
                .placesMax(25).prix(2500.0).etapes(List.of(etape)).build();
        etape.setCircuit(circuit);

        when(circuitRepository.findById(1L)).thenReturn(Optional.of(circuit));
        when(patrimoineClient.getPatrimoineById(1L)).thenReturn(p1);

        CircuitDto dto = circuitService.getByIdCircuit(1L);

        assertThat(dto.getNomCircuit()).isEqualTo("Circuit Casamance");
        assertThat(dto.getEtapes().getFirst().getPatrimoine().getCodePatrimoine()).isEqualTo("PAT-ZIG-001");
    }

    @Test
    void deleteCircuit_inexistant_leveResourceNotFound() {
        when(circuitRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> circuitService.deleteCircuit(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
