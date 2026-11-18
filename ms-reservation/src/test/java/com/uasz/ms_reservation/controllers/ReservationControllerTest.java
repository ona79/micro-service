package com.uasz.ms_reservation.controllers;

import com.uasz.ms_reservation.dto.DisponibiliteDto;
import com.uasz.ms_reservation.dto.PageResponseDto;
import com.uasz.ms_reservation.dto.ReservationDto;
import com.uasz.ms_reservation.dto.ReservationStatsDto;
import com.uasz.ms_reservation.entities.StatutReservation;
import com.uasz.ms_reservation.entities.TypeReservation;
import com.uasz.ms_reservation.services.IReservationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReservationController.class)
@TestPropertySource(properties = "security.filter.enabled=false")
class ReservationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IReservationService reservationService;

    @Test
    void disponibilite_retourne200() throws Exception {
        DisponibiliteDto dto = DisponibiliteDto.builder()
                .typePrestation(TypeReservation.EVENEMENT)
                .prestationId(1L)
                .nomPrestation("Festival Casamance")
                .datePrestation(LocalDate.of(2026, 12, 10))
                .statutPrestation("PUBLIE")
                .ouvertReservation(true)
                .reservable(true)
                .capaciteLimitee(true)
                .capaciteTotale(300)
                .placesReservees(10)
                .placesDisponibles(290)
                .prixUnitaire(new BigDecimal("5000.00"))
                .devise("XOF")
                .build();
        when(reservationService.verifierDisponibilite(eq(TypeReservation.EVENEMENT), eq(1L), any())).thenReturn(dto);

        mockMvc.perform(get("/api/reservations/disponibilite")
                        .param("type", "EVENEMENT")
                        .param("prestationId", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reservable").value(true))
                .andExpect(jsonPath("$.placesDisponibles").value(290))
                .andExpect(jsonPath("$.devise").value("XOF"));
    }

    @Test
    void postReservation_idempotentReplayRetourneHeaderEt200() throws Exception {
        ReservationDto created = ReservationDto.builder()
                .id(12L)
                .referenceReservation("RES-20261118-ABC123")
                .nomClient("Moussa Diop")
                .emailClient("moussa@zig.univ.sn")
                .nombrePlaces(2)
                .typeReservation(TypeReservation.CIRCUIT)
                .statut(StatutReservation.EN_ATTENTE_PAIEMENT)
                .montantTotal(new BigDecimal("50000.00"))
                .devise("XOF")
                .rejoueeIdempotence(false)
                .build();
        when(reservationService.saveReservation(any(), eq("k-1"))).thenReturn(created);

        String body = """
                {
                  "nomClient": "Moussa Diop",
                  "emailClient": "moussa@zig.univ.sn",
                  "nombrePlaces": 2,
                  "typeReservation": "CIRCUIT",
                  "circuitId": 1
                }
                """;
        mockMvc.perform(post("/api/reservations")
                        .header("Idempotency-Key", "k-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.referenceReservation").value("RES-20261118-ABC123"));

        ReservationDto replayed = ReservationDto.builder()
                .id(12L).referenceReservation("RES-20261118-ABC123").rejoueeIdempotence(true).build();
        when(reservationService.saveReservation(any(), eq("k-1"))).thenReturn(replayed);

        mockMvc.perform(post("/api/reservations")
                        .header("Idempotency-Key", "k-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Idempotency-Replayed", "true"));
    }

    @Test
    void rechercheEtStatistiques_retournent200() throws Exception {
        PageResponseDto<ReservationDto> page = PageResponseDto.<ReservationDto>builder()
                .content(List.of()).page(0).size(12).totalElements(0).totalPages(0).last(true).build();
        when(reservationService.rechercherReservations(any(), any(), any(), any(), any(), any(), anyInt(), anyInt(), any(), any()))
                .thenReturn(page);

        mockMvc.perform(get("/api/reservations/recherche").param("page", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0));

        when(reservationService.getStatistiques()).thenReturn(ReservationStatsDto.builder()
                .totalReservations(5).confirmees(2).devise("XOF").montantTotalConfirme(new BigDecimal("65000.00")).build());

        mockMvc.perform(get("/api/reservations/statistiques"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalReservations").value(5))
                .andExpect(jsonPath("$.devise").value("XOF"));
    }
}
