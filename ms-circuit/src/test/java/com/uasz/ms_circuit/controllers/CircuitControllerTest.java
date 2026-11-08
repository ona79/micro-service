package com.uasz.ms_circuit.controllers;

import com.uasz.ms_circuit.dto.CircuitDto;
import com.uasz.ms_circuit.dto.EtapeDto;
import com.uasz.ms_circuit.entities.Difficulte;
import com.uasz.ms_circuit.exceptions.BadRequestException;
import com.uasz.ms_circuit.exceptions.ResourceNotFoundException;
import com.uasz.ms_circuit.services.ICircuitService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CircuitController.class)
class CircuitControllerTest {

    private static final String URL = "/api/circuits";

    private static final String JSON_VALIDE = """
            {
              "nomCircuit": "Circuit Historique Dakar",
              "descriptionCircuit": "Visite de Gorée et Ouakam",
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
        return new CircuitDto(1L, "Circuit Historique Dakar", "Visite de Gorée et Ouakam",
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

