package com.uasz.ms_patrimoine.controllers;

import com.uasz.ms_patrimoine.dto.PageResponseDto;
import com.uasz.ms_patrimoine.dto.PatrimoineDto;
import com.uasz.ms_patrimoine.entities.StatutPublication;
import com.uasz.ms_patrimoine.exceptions.ResourceNotFoundException;
import com.uasz.ms_patrimoine.services.IPatrimoineService;
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
@TestPropertySource(properties = "security.filter.enabled=false")
class PatrimoineControllerTest {

    private static final String URL = "/api/patrimoines";

    private static final String JSON_VALIDE = """
            {
              "nomPatrimoine": "Mémorial du Joola",
              "codePatrimoine": "PAT-ZIG-001",
              "descriptionPatrimoine": "Monument historique et mémorial",
              "historiquePatrimoine": "Inauguré en 2024",
              "adressePatrimoine": "Boucotte, Ziguinchor, Casamance",
              "capacitePatrimoine": 250,
              "latitudePatrimoine": 12.5833,
              "longitudePatrimoine": -16.2719
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IPatrimoineService patrimoineService;

    private PatrimoineDto dto(Long id, int capacite) {
        return new PatrimoineDto(id, "Mémorial du Joola", "PAT-ZIG-001", "Monument historique et mémorial",
                "Inauguré en 2024", "Boucotte, Ziguinchor, Casamance", capacite, 12.5833f, -16.2719f);
    }

    @Test
    void post_retourne201() throws Exception {
        when(patrimoineService.savePatrimoine(any())).thenReturn(dto(1L, 150));

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(JSON_VALIDE))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.codePatrimoine").value("PAT-ZIG-001"));
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
    void rechercher_retournePage200() throws Exception {
        PageResponseDto<PatrimoineDto> page = PageResponseDto.<PatrimoineDto>builder()
                .content(List.of(dto(1L, 250)))
                .page(0)
                .size(12)
                .totalElements(1)
                .totalPages(1)
                .last(true)
                .build();
        when(patrimoineService.rechercherPatrimoines(
                any(), any(), any(), any(), any(), any(), any(), anyBoolean(), anyInt(), anyInt(), any(), any()))
                .thenReturn(page);

        mockMvc.perform(get(URL + "/recherche")
                        .param("q", "Joola")
                        .param("categorie", "HISTORIQUE")
                        .param("zone", "BASSE_CASAMANCE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].codePatrimoine").value("PAT-ZIG-001"));
    }

    @Test
    void publierEtArchiver_retournent200() throws Exception {
        PatrimoineDto publie = dto(1L, 250);
        publie.setStatutPublication(StatutPublication.PUBLIE);
        when(patrimoineService.publierPatrimoine(1L)).thenReturn(publie);

        mockMvc.perform(put(URL + "/1/publier"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statutPublication").value("PUBLIE"));

        PatrimoineDto archive = dto(1L, 250);
        archive.setStatutPublication(StatutPublication.ARCHIVE);
        when(patrimoineService.archiverPatrimoine(eq(1L), any())).thenReturn(archive);

        mockMvc.perform(put(URL + "/1/archiver")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motif\":\"Travaux\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statutPublication").value("ARCHIVE"));
    }

    @Test
    void getById_retourne200() throws Exception {
        when(patrimoineService.getByIdPatrimoine(1L)).thenReturn(dto(1L, 150));

        mockMvc.perform(get(URL + "/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nomPatrimoine").value("Mémorial du Joola"));
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
    void getProximite_retourne200AvecDistances() throws Exception {
        PatrimoineDto p = dto(1L, 150);
        p.setDistanceKm(12.4);
        when(patrimoineService.getPatrimoinesProximite(eq(12.5), eq(-16.2), eq(30.0), eq(5)))
                .thenReturn(List.of(p));

        mockMvc.perform(get(URL + "/proximite")
                        .param("lat", "12.5")
                        .param("lon", "-16.2")
                        .param("rayonKm", "30.0")
                        .param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].nomPatrimoine").value("Mémorial du Joola"))
                .andExpect(jsonPath("$[0].distanceKm").value(12.4));
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
