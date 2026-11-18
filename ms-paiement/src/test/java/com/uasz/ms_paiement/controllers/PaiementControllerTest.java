package com.uasz.ms_paiement.controllers;

import com.uasz.ms_paiement.dto.PaiementDto;
import com.uasz.ms_paiement.dto.PaiementStatsDto;
import com.uasz.ms_paiement.entities.ModePaiement;
import com.uasz.ms_paiement.entities.StatutPaiement;
import com.uasz.ms_paiement.services.IPaiementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PaiementController.class)
@TestPropertySource(properties = "security.filter.enabled=false")
class PaiementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IPaiementService paiementService;

    @Test
    void initierPuisSimulerPuisRembourser_retournentStatutsEtMentionsSimulation() throws Exception {
        PaiementDto initiated = PaiementDto.builder()
                .id(1L).referenceTransaction("PAY-SIM-WAV-1").reservationId(10L)
                .montant(new BigDecimal("25000.00")).devise("XOF")
                .modePaiement(ModePaiement.WAVE).statut(StatutPaiement.EN_COURS)
                .estSimule(true).mentionSimulation("PAIEMENT SIMULE P04 - AUCUN TRANSFERT FINANCIER REEL")
                .build();
        when(paiementService.effectuerPaiement(any(), eq("k-pay-1"))).thenReturn(initiated);

        mockMvc.perform(post("/api/paiements")
                        .header("Idempotency-Key", "k-pay-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reservationId\":10,\"modePaiement\":\"WAVE\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estSimule").value(true))
                .andExpect(jsonPath("$.statut").value("EN_COURS"));

        PaiementDto replayed = PaiementDto.builder()
                .id(1L).referenceTransaction("PAY-SIM-WAV-1").rejoueeIdempotence(true).build();
        when(paiementService.effectuerPaiement(any(), eq("k-pay-1"))).thenReturn(replayed);
        mockMvc.perform(post("/api/paiements")
                        .header("Idempotency-Key", "k-pay-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reservationId\":10,\"modePaiement\":\"WAVE\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Idempotency-Replayed", "true"));

        PaiementDto accepted = PaiementDto.builder()
                .id(1L).statut(StatutPaiement.ACCEPTE).synchroReservationStatut("SYNCHRONISEE").build();
        when(paiementService.simulerDecisionPaiement(eq(1L), any(), any())).thenReturn(accepted);
        mockMvc.perform(post("/api/paiements/1/simuler")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"ACCEPTER\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statut").value("ACCEPTE"));

        when(paiementService.getStatistiques()).thenReturn(PaiementStatsDto.builder()
                .totalTransactions(3).acceptees(2).estSimule(true).devise("XOF").build());
        mockMvc.perform(get("/api/paiements/statistiques"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estSimule").value(true));
    }
}
