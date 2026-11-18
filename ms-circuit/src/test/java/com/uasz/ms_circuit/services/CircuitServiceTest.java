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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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

    @Test
    void saveCircuit_calculeDureeEtDistanceOrthodromiqueIndicativeEtEnrichitEtapes() {
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
        assertThat(saved.getDureeEstimee()).isEqualTo(105);
        assertThat(saved.getDistanceTotale()).isGreaterThan(10.0);
        assertThat(saved.getModeCalculDistance()).isEqualTo("ESTIMATION_ORTHODROMIQUE_INDICATIVE");
        assertThat(saved.getEtapes()).hasSize(2);
        assertThat(saved.getEtapes().get(0).getOrdre()).isEqualTo(1);
        assertThat(saved.getEtapes().get(0).getPatrimoine().getNomPatrimoine()).isEqualTo("Mémorial du Joola");
        assertThat(saved.getEtapes().get(1).getOrdre()).isEqualTo(2);
        assertThat(saved.getEtapes().get(1).getPatrimoine().getNomPatrimoine()).isEqualTo("Comptoir de Carabane");
    }

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

    @Test
    void rbacEtBola_verificationPermissionsCinqRolesEtPerimetreGuideSurCircuits() {
        EtapeDto e1 = new EtapeDto(null, 1, 60, 1L, null);
        CircuitDto input = new CircuitDto(null, "Circuit", "Desc", Difficulte.FACILE, 0, 0.0, 20, 3000.0, List.of(e1));

        // 1. CONSERVATEUR ne possède pas CIRCUIT:CREER ni CIRCUIT:MODIFIER -> 403
        SecurityUserContextHolder.setContext(new SecurityUserContext(4L, "CONSERVATEUR", "fatou@uasz.sn", false, null));
        assertThatThrownBy(() -> circuitService.saveCircuit(input)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> circuitService.updateCircuit(1L, input)).isInstanceOf(ForbiddenException.class);

        // 2. GUIDE possède CIRCUIT:MODIFIER mais pas CIRCUIT:CREER, CIRCUIT:PUBLIER ni CIRCUIT:SUPPRIMER
        SecurityUserContextHolder.setContext(new SecurityUserContext(5L, "GUIDE", "guide@uasz.sn", false, null));
        assertThatThrownBy(() -> circuitService.saveCircuit(input)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> circuitService.publierCircuit(1L)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> circuitService.archiverCircuit(1L, "Motif")).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> circuitService.deleteCircuit(1L)).isInstanceOf(ForbiddenException.class);

        // 3. BOLA : GUIDE (id=5) tente de modifier un circuit assigné à un autre guide (guideResponsableId=99) -> 403
        Circuit circuitAutreGuide = Circuit.builder()
                .id(1L)
                .nomCircuit("Circuit Guide 99")
                .guideResponsableId(99L)
                .etapes(new ArrayList<>())
                .build();
        when(circuitRepository.findById(1L)).thenReturn(Optional.of(circuitAutreGuide));
        assertThatThrownBy(() -> circuitService.updateCircuit(1L, input))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("autre guide");
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

        when(circuitRepository.findAll()).thenReturn(List.of(circuit));
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
