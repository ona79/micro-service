package com.uasz.ms_patrimoine.controllers;

import com.uasz.ms_patrimoine.dto.PatrimoineDto;
import com.uasz.ms_patrimoine.exceptions.ResourceNotFoundException;
import com.uasz.ms_patrimoine.services.IPatrimoineService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PatrimoineController.class)
class PatrimoineControllerTest {

    private static final String URL = "/api/patrimoines";

    private static final String JSON_VALIDE = """
            {
              "nomPatrimoine": "Maison de l'Esclave",
              "codePatrimoine": "PAT-001",
              "descriptionPatrimoine": "Monument historique",
              "historiquePatrimoine": "Construite vers 1776",
              "adressePatrimoine": "Île de Gorée, Dakar",
              "capacitePatrimoine": 150,
              "latitudePatrimoine": 14.6672,
              "longitudePatrimoine": -17.399
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IPatrimoineService patrimoineService;

    private PatrimoineDto dto(Long id, int capacite) {
        return new PatrimoineDto(id, "Maison de l'Esclave", "PAT-001", "Monument historique",
                "Construite vers 1776", "Île de Gorée, Dakar", capacite, 14.6672f, -17.399f);
    }

    @Test
    void post_retourne201() throws Exception {
        when(patrimoineService.savePatrimoine(any())).thenReturn(dto(1L, 150));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(JSON_VALIDE))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.codePatrimoine").value("PAT-001"));
    }

    @Test
    void post_invalide_retourne400AvecErreur() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nomPatrimoine\": \"\", \"capacitePatrimoine\": -5}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erreur").exists());
        verifyNoInteractions(patrimoineService);
    }

    @Test
    void post_jsonMalForme_retourne400() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("{pas du json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erreur").value("Corps de la requête JSON absent ou invalide"));
    }

    @Test
    void getAll_retourne200() throws Exception {
        when(patrimoineService.getAllPatrimoines()).thenReturn(List.of(dto(1L, 150)));

        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void getById_retourne200() throws Exception {
        when(patrimoineService.getByIdPatrimoine(1L)).thenReturn(dto(1L, 150));

        mockMvc.perform(get(URL + "/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomPatrimoine").value("Maison de l'Esclave"));
    }

    @Test
    void getById_inexistant_retourne404() throws Exception {
        when(patrimoineService.getByIdPatrimoine(999L))
                .thenThrow(new ResourceNotFoundException("Patrimoine introuvable avec l'id : 999"));

        mockMvc.perform(get(URL + "/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erreur").value("Patrimoine introuvable avec l'id : 999"));
    }

    @Test
    void getById_idNonNumerique_retourne400() throws Exception {
        mockMvc.perform(get(URL + "/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erreur").exists());
    }

    @Test
    void put_retourne200() throws Exception {
        when(patrimoineService.updatePatrimoine(eq(1L), any())).thenReturn(dto(1L, 200));

        mockMvc.perform(put(URL + "/1").contentType(MediaType.APPLICATION_JSON).content(JSON_VALIDE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.capacitePatrimoine").value(200));
    }

    @Test
    void put_inexistant_retourne404() throws Exception {
        when(patrimoineService.updatePatrimoine(eq(999L), any()))
                .thenThrow(new ResourceNotFoundException("Patrimoine introuvable avec l'id : 999"));

        mockMvc.perform(put(URL + "/999").contentType(MediaType.APPLICATION_JSON).content(JSON_VALIDE))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_retourne204() throws Exception {
        mockMvc.perform(delete(URL + "/1"))
                .andExpect(status().isNoContent());
    }

    @Test
    void delete_inexistant_retourne404() throws Exception {
        doThrow(new ResourceNotFoundException("Patrimoine introuvable avec l'id : 999"))
                .when(patrimoineService).deletePatrimoine(999L);

        mockMvc.perform(delete(URL + "/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.erreur").exists());
    }
}

