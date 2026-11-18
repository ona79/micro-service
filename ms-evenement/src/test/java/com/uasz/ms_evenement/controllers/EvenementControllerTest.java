package com.uasz.ms_evenement.controllers;

import com.uasz.ms_evenement.dto.EvenementDto;
import com.uasz.ms_evenement.dto.PageResponseDto;
import com.uasz.ms_evenement.entities.StatutEvenement;
import com.uasz.ms_evenement.entities.TypeEvenement;
import com.uasz.ms_evenement.services.IEvenementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EvenementController.class)
@TestPropertySource(properties = "security.filter.enabled=false")
class EvenementControllerTest {

    private static final String URL = "/api/evenements";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IEvenementService evenementService;

    private EvenementDto sampleDto() {
        return new EvenementDto(
                1L,
                "Festival International de Danses de Casamance",
                "Festival culturel à Ziguinchor",
                TypeEvenement.FESTIVAL,
                LocalDateTime.of(2026, 12, 10, 16, 0),
                LocalDateTime.of(2026, 12, 12, 23, 0),
                "Esplanade Saint-Antoine, Ziguinchor",
                300,
                5000.0,
                3L,
                null
        );
    }

    @Test
    void post_retourne201() throws Exception {
        when(evenementService.saveEvenement(any())).thenReturn(sampleDto());

        String body = """
                {
                  "nomEvenement": "Festival International de Danses de Casamance",
                  "descriptionEvenement": "Festival culturel à Ziguinchor",
                  "typeEvenement": "FESTIVAL",
                  "dateDebut": "2026-12-10T16:00:00",
                  "dateFin": "2026-12-12T23:00:00",
                  "lieu": "Esplanade Saint-Antoine, Ziguinchor",
                  "capaciteMax": 300,
                  "prix": 5000.0,
                  "patrimoineId": 3
                }
                """;

        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.typeEvenement").value("FESTIVAL"));
    }

    @Test
    void getAVenir_retourneListe200() throws Exception {
        when(evenementService.getEvenementsAVenir()).thenReturn(List.of(sampleDto()));

        mockMvc.perform(get(URL + "/a-venir"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].nomEvenement").value("Festival International de Danses de Casamance"));
    }

    @Test
    void rechercher_retournePage200() throws Exception {
        PageResponseDto<EvenementDto> page = PageResponseDto.<EvenementDto>builder()
                .content(List.of(sampleDto()))
                .page(0)
                .size(12)
                .totalElements(1)
                .totalPages(1)
                .last(true)
                .build();
        when(evenementService.rechercherEvenements(
                any(), any(), any(), any(), any(), any(), any(), any(), anyBoolean(), anyBoolean(), anyInt(), anyInt(), any(), any()))
                .thenReturn(page);

        mockMvc.perform(get(URL + "/recherche")
                        .param("q", "Casamance")
                        .param("type", "FESTIVAL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void annulerEtTerminer_retournent200() throws Exception {
        EvenementDto annule = sampleDto();
        annule.setStatutEvenement(StatutEvenement.ANNULE);
        when(evenementService.annulerEvenement(eq(1L), any())).thenReturn(annule);

        mockMvc.perform(put(URL + "/1/annuler")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"motif\":\"Report\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statutEvenement").value("ANNULE"));

        EvenementDto termine = sampleDto();
        termine.setStatutEvenement(StatutEvenement.TERMINE);
        when(evenementService.terminerEvenement(1L)).thenReturn(termine);

        mockMvc.perform(put(URL + "/1/terminer"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statutEvenement").value("TERMINE"));
    }
}
