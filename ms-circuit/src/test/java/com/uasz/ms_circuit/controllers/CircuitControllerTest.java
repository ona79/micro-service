package com.uasz.ms_circuit.controllers;

import com.uasz.ms_circuit.dto.CircuitDto;
import com.uasz.ms_circuit.dto.EtapeDto;
import com.uasz.ms_circuit.dto.PageResponseDto;
import com.uasz.ms_circuit.entities.Difficulte;
import com.uasz.ms_circuit.entities.StatutCircuit;
import com.uasz.ms_circuit.exceptions.BadRequestException;
import com.uasz.ms_circuit.exceptions.ResourceNotFoundException;
import com.uasz.ms_circuit.services.ICircuitService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CircuitController.class)
@TestPropertySource(properties = "security.filter.enabled=false")
class CircuitControllerTest {

    private static final String URL = "/api/circuits";

    private static final String JSON_VALIDE = """
            {
              "nomCircuit": "Circuit Historique de Ziguinchor",
              "descriptionCircuit": "Visite du Mémorial du Joola et de Carabane",
              "difficulte": "FACILE",
              "placesMax": 30,
              "prix": 5000.0,
              "etapes": [
                { "ordre": 1, "dureeVisite": 60, "patrimoineId": 1 },
                { "ordre": 2, "dureeVisite": 45, "patrimoineId": 2 }
              ]
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ICircuitService circuitService;

    private CircuitDto sampleDto() {
        return new CircuitDto(1L, "Circuit Historique de Ziguinchor", "Visite du Mémorial du Joola et de Carabane",
                Difficulte.FACILE, 105, 12.01, 30, 5000.0,
                List.of(new EtapeDto(1L, 1, 60, 1L, null), new EtapeDto(2L, 2, 45, 2L, null)));
    }

    @Test
    void post_retourne201() throws Exception {
        when(circuitService.saveCircuit(any())).thenReturn(sampleDto());

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(JSON_VALIDE))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.dureeEstimee").value(105));
    }

    @Test
    void rechercher_retournePage200() throws Exception {
        PageResponseDto<CircuitDto> page = PageResponseDto.<CircuitDto>builder()
                .content(List.of(sampleDto()))
                .page(0)
                .size(12)
                .totalElements(1)
                .totalPages(1)
                .last(true)
                .build();
        when(circuitService.rechercherCircuits(
                any(), any(), any(), any(), any(), any(), any(), any(), anyBoolean(), anyInt(), anyInt(), any(), any()))
                .thenReturn(page);

        mockMvc.perform(get(URL + "/recherche")
                        .param("q", "Ziguinchor")
                        .param("difficulte", "FACILE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].nomCircuit").value("Circuit Historique de Ziguinchor"));
    }

    @Test
    void publierEtArchiver_retournent200() throws Exception {
        CircuitDto publie = sampleDto();
        publie.setStatutCircuit(StatutCircuit.PUBLIE);
        when(circuitService.publierCircuit(1L)).thenReturn(publie);

        mockMvc.perform(put(URL + "/1/publier"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statutCircuit").value("PUBLIE"));

        CircuitDto archive = sampleDto();
        archive.setStatutCircuit(StatutCircuit.ARCHIVE);
        when(circuitService.archiverCircuit(eq(1L), any())).thenReturn(archive);

        mockMvc.perform(put(URL + "/1/archiver")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motif\":\"Archivage\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statutCircuit").value("ARCHIVE"));
    }

    @Test
    void post_sansEtapes_retourne400() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nomCircuit\": \"Vide\", \"etapes\": []}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erreur").exists());
    }

    @Test
    void post_patrimoineInexistant_retourne400() throws Exception {
        when(circuitService.saveCircuit(any()))
                .thenThrow(new BadRequestException("Le patrimoine 999 n'existe pas dans ms-patrimoine"));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(JSON_VALIDE))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erreur").value("Le patrimoine 999 n'existe pas dans ms-patrimoine"));
    }

    @Test
    void getById_inexistant_retourne404() throws Exception {
        when(circuitService.getByIdCircuit(999L))
                .thenThrow(new ResourceNotFoundException("Circuit introuvable avec l'id : 999"));

        mockMvc.perform(get(URL + "/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erreur").value("Circuit introuvable avec l'id : 999"));
    }

    @Test
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete(URL + "/1"))
                .andExpect(status().isNoContent());
    }
}
