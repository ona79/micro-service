package com.uasz.ms_circuit.services;

import com.uasz.ms_circuit.clients.PatrimoineClient;
import com.uasz.ms_circuit.dto.CircuitDto;
import com.uasz.ms_circuit.dto.EtapeDto;
import com.uasz.ms_circuit.dto.PatrimoineDto;
import com.uasz.ms_circuit.entities.Circuit;
import com.uasz.ms_circuit.entities.Difficulte;
import com.uasz.ms_circuit.entities.Etape;
import com.uasz.ms_circuit.exceptions.BadRequestException;
import com.uasz.ms_circuit.exceptions.ResourceNotFoundException;
import com.uasz.ms_circuit.exceptions.ServiceIndisponibleException;
import com.uasz.ms_circuit.mappers.CircuitMapper;
import com.uasz.ms_circuit.repositories.CircuitRepository;
import feign.FeignException;
import feign.Request;
import feign.RequestTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
        p1 = new PatrimoineDto(1L, "Maison de l'Esclave", "PAT-001", "Desc 1", "Hist 1",
                "Gorée", 150, 14.6672f, -17.3990f);
        p2 = new PatrimoineDto(2L, "Monument de la Renaissance", "PAT-002", "Desc 2", "Hist 2",
                "Ouakam", 500, 14.7222f, -17.4950f);
    }

    @Test
    void saveCircuit_calculeDureeEtDistanceEtEnrichitEtapes() {
        when(patrimoineClient.getPatrimoineById(1L)).thenReturn(p1);
        when(patrimoineClient.getPatrimoineById(2L)).thenReturn(p2);
        when(circuitRepository.save(any(Circuit.class))).thenAnswer(inv -> {
            Circuit c = inv.getArgument(0);
            c.setId(10L);
            return c;
        });

        EtapeDto e1 = new EtapeDto(null, 2, 45, 2L, null);
        EtapeDto e2 = new EtapeDto(null, 1, 60, 1L, null);
        CircuitDto input = new CircuitDto(null, "Tour de Dakar", "Découverte", Difficulte.FACILE,
                0, 0.0, 30, 5000.0, List.of(e1, e2));

        CircuitDto saved = circuitService.saveCircuit(input);

        assertThat(saved.getId()).isEqualTo(10L);
        assertThat(saved.getDureeEstimee()).isEqualTo(105);
        assertThat(saved.getDistanceTotale()).isGreaterThan(10.0);
        assertThat(saved.getEtapes()).hasSize(2);
        assertThat(saved.getEtapes().get(0).getOrdre()).isEqualTo(1);
        assertThat(saved.getEtapes().get(0).getPatrimoine().getNomPatrimoine()).isEqualTo("Maison de l'Esclave");
        assertThat(saved.getEtapes().get(1).getOrdre()).isEqualTo(2);
        assertThat(saved.getEtapes().get(1).getPatrimoine().getNomPatrimoine()).isEqualTo("Monument de la Renaissance");
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
        Circuit circuit = Circuit.builder().id(1L).nomCircuit("Circuit Gorée")
                .difficulte(Difficulte.FACILE).dureeEstimee(60).distanceTotale(0.0)
                .placesMax(25).prix(2500.0).etapes(List.of(etape)).build();
        etape.setCircuit(circuit);

        when(circuitRepository.findById(1L)).thenReturn(Optional.of(circuit));
        when(patrimoineClient.getPatrimoineById(1L)).thenReturn(p1);

        CircuitDto dto = circuitService.getByIdCircuit(1L);

        assertThat(dto.getNomCircuit()).isEqualTo("Circuit Gorée");
        assertThat(dto.getEtapes().getFirst().getPatrimoine().getCodePatrimoine()).isEqualTo("PAT-001");
    }

    @Test
    void deleteCircuit_inexistant_leveResourceNotFound() {
        when(circuitRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> circuitService.deleteCircuit(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}

