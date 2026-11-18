package com.uasz.ms_reservation.controllers;

import com.uasz.ms_reservation.dto.BilletDto;
import com.uasz.ms_reservation.dto.ValidationBilletResponse;
import com.uasz.ms_reservation.entities.StatutBillet;
import com.uasz.ms_reservation.services.IReservationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(VisiteControleController.class)
@TestPropertySource(properties = "security.filter.enabled=false")
class VisiteControleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IReservationService reservationService;

    @Test
    void validerBillet_retourne200AvecDetailsValidation() throws Exception {
        BilletDto billetDto = BilletDto.builder()
                .id(1L)
                .numeroBillet("BIL-RES-2026-000001-01")
                .nomBeneficiaire("Awa Sagna")
                .tokenQr("qr-sample-abc")
                .statut(StatutBillet.CONSOMME)
                .validePar("agent@casamance.sn")
                .build();

        ValidationBilletResponse response = ValidationBilletResponse.builder()
                .valide(true)
                .message("Accès autorisé. Billet validé avec succès pour Awa Sagna.")
                .billet(billetDto)
                .build();

        when(reservationService.validerBillet("qr-sample-abc")).thenReturn(response);

        mockMvc.perform(post("/api/visites/valider")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tokenQr\":\"qr-sample-abc\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valide").value(true))
                .andExpect(jsonPath("$.message").value("Accès autorisé. Billet validé avec succès pour Awa Sagna."))
                .andExpect(jsonPath("$.billet.numeroBillet").value("BIL-RES-2026-000001-01"))
                .andExpect(jsonPath("$.billet.statut").value("CONSOMME"));
    }

    @Test
    void verifierBillet_retourne200AvecApercu() throws Exception {
        BilletDto billetDto = BilletDto.builder()
                .id(1L)
                .numeroBillet("BIL-RES-2026-000001-01")
                .nomBeneficiaire("Awa Sagna")
                .tokenQr("qr-sample-abc")
                .statut(StatutBillet.VALIDE)
                .build();

        when(reservationService.verifierBillet("qr-sample-abc")).thenReturn(billetDto);

        mockMvc.perform(get("/api/visites/verifier").param("tokenQr", "qr-sample-abc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.numeroBillet").value("BIL-RES-2026-000001-01"))
                .andExpect(jsonPath("$.statut").value("VALIDE"));
    }
}
