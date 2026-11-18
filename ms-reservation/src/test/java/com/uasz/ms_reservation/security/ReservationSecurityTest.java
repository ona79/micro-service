package com.uasz.ms_reservation.security;

import com.uasz.ms_reservation.clients.CircuitClient;
import com.uasz.ms_reservation.clients.EvenementClient;
import com.uasz.ms_reservation.dto.CircuitDto;
import com.uasz.ms_reservation.dto.ReservationDto;
import com.uasz.ms_reservation.entities.Reservation;
import com.uasz.ms_reservation.entities.StatutReservation;
import com.uasz.ms_reservation.entities.TypeReservation;
import com.uasz.ms_reservation.exceptions.ForbiddenException;
import com.uasz.ms_reservation.mappers.ReservationMapper;
import com.uasz.ms_reservation.repositories.ReservationRepository;
import com.uasz.ms_reservation.services.ReservationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationSecurityTest {

    private static final String GATEWAY_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    private static final String INTERSERVICE_SECRET = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private CircuitClient circuitClient;

    @Mock
    private EvenementClient evenementClient;

    private final ReservationMapper reservationMapper = Mappers.getMapper(ReservationMapper.class);
    private ReservationService reservationService;
    private MicroserviceSecurityFilter securityFilter;

    @BeforeEach
    void setUp() {
        reservationService = new ReservationService(reservationRepository, reservationMapper, circuitClient, evenementClient);
        securityFilter = new MicroserviceSecurityFilter(GATEWAY_SECRET, INTERSERVICE_SECRET);
    }

    @AfterEach
    void tearDown() {
        SecurityUserContextHolder.clear();
    }

    @Test
    void bola_touristeNePeutPasLireLaReservationDUnAutreUtilisateur() {
        // Utilisateur connecté : Touriste A (ID: 2)
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "touriste.a@uasz.sn", false, null));

        // Réservation appartenant à Touriste B (ID: 4)
        Reservation reservationB = Reservation.builder()
                .id(100L)
                .utilisateurId(4L)
                .nomClient("Touriste B")
                .emailClient("touriste.b@uasz.sn")
                .statut(StatutReservation.CONFIRMEE)
                .typeReservation(TypeReservation.CIRCUIT)
                .circuitId(1L)
                .build();

        when(reservationRepository.findById(100L)).thenReturn(Optional.of(reservationB));

        assertThatThrownBy(() -> reservationService.getByIdReservation(100L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Accès interdit : vous ne pouvez pas consulter la réservation d'un autre utilisateur.");
    }

    @Test
    void bola_touristeNePeutPasAnnulerLaReservationDUnAutreUtilisateur() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "touriste.a@uasz.sn", false, null));

        Reservation reservationB = Reservation.builder()
                .id(101L)
                .utilisateurId(4L)
                .nomClient("Touriste B")
                .emailClient("touriste.b@uasz.sn")
                .statut(StatutReservation.CONFIRMEE)
                .build();

        when(reservationRepository.findById(101L)).thenReturn(Optional.of(reservationB));

        assertThatThrownBy(() -> reservationService.annulerReservation(101L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Accès interdit : vous ne pouvez pas annuler la réservation d'un autre utilisateur.");
    }

    @Test
    void bola_touristePeutConsulterSaPropreReservation() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "touriste.a@uasz.sn", false, null));

        Reservation reservationA = Reservation.builder()
                .id(50L)
                .utilisateurId(2L)
                .nomClient("Touriste A")
                .emailClient("touriste.a@uasz.sn")
                .statut(StatutReservation.CONFIRMEE)
                .typeReservation(TypeReservation.CIRCUIT)
                .circuitId(1L)
                .build();

        when(reservationRepository.findById(50L)).thenReturn(Optional.of(reservationA));
        when(circuitClient.getCircuitById(1L)).thenReturn(new CircuitDto(1L, "Boucle Carabane", "Descr", "FACILE", 3, 10.0, 10, 25000.0));

        ReservationDto dto = reservationService.getByIdReservation(50L);

        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(50L);
        assertThat(dto.getNomClient()).isEqualTo("Touriste A");
    }

    @Test
    void bola_administrateurPeutConsulterNImporteQuelleReservation() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(1L, "ADMINISTRATEUR", "admin@uasz.sn", false, null));

        Reservation reservationB = Reservation.builder()
                .id(102L)
                .utilisateurId(4L)
                .nomClient("Touriste B")
                .emailClient("touriste.b@uasz.sn")
                .statut(StatutReservation.CONFIRMEE)
                .typeReservation(TypeReservation.CIRCUIT)
                .circuitId(1L)
                .build();

        when(reservationRepository.findById(102L)).thenReturn(Optional.of(reservationB));

        ReservationDto dto = reservationService.getByIdReservation(102L);
        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(102L);
    }

    @Test
    void bola_creationReservationForceUtilisateurIdALIdentiteDuToken() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "touriste.a@uasz.sn", false, null));

        // Touriste A tente de créer une réservation avec utilisateurId=99
        ReservationDto input = ReservationDto.builder()
                .utilisateurId(99L)
                .nomClient("Touriste A")
                .emailClient("touriste.a@uasz.sn")
                .nombrePlaces(2)
                .typeReservation(TypeReservation.CIRCUIT)
                .circuitId(1L)
                .build();

        when(circuitClient.getCircuitById(1L)).thenReturn(new CircuitDto(1L, "Circuit", "Desc", "FACILE", 2, 5.0, 10, 20000.0));
        when(reservationRepository.sumPlacesByCircuitIdAndStatutNot(1L, StatutReservation.ANNULEE)).thenReturn(0);
        when(reservationRepository.save(any(Reservation.class))).thenAnswer(inv -> {
            Reservation r = inv.getArgument(0);
            assertThat(r.getUtilisateurId()).isEqualTo(2L); // Écrasé avec succès !
            r.setId(77L);
            return r;
        });

        ReservationDto saved = reservationService.saveReservation(input);
        assertThat(saved.getId()).isEqualTo(77L);
        assertThat(saved.getUtilisateurId()).isEqualTo(2L);
    }

    @Test
    void filter_accesDirectSansJetonEstRefuse401() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/reservations");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        securityFilter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("Accès direct non autorisé");
        assertThat(chain.getRequest()).isNull();
    }

    @Test
    void filter_avecJetonGatewayValide_estAccepte200() throws Exception {
        long ts = Instant.now().getEpochSecond();
        String sig = signHmac("2:TOURISTE:" + ts, GATEWAY_SECRET);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/reservations");
        request.addHeader("X-Internal-Gateway-Token", ts + "." + sig);
        request.addHeader("X-User-Id", "2");
        request.addHeader("X-User-Roles", "TOURISTE");

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        securityFilter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void filter_rejeuDeNonceInterservice_estRefuse403() throws Exception {
        long ts = Instant.now().getEpochSecond();
        String nonce = "replay-nonce-uuid-12345";
        String canonical = "GET|/api/reservations/1|ms-paiement|" + ts + "|" + nonce;
        String sig = signHmac(canonical, INTERSERVICE_SECRET);

        MockHttpServletRequest req1 = new MockHttpServletRequest("GET", "/api/reservations/1");
        req1.addHeader("X-Service-Name", "ms-paiement");
        req1.addHeader("X-Service-Timestamp", String.valueOf(ts));
        req1.addHeader("X-Service-Nonce", nonce);
        req1.addHeader("X-Service-Signature", sig);

        MockHttpServletResponse res1 = new MockHttpServletResponse();
        securityFilter.doFilter(req1, res1, new MockFilterChain());
        assertThat(res1.getStatus()).isEqualTo(200);

        // Deuxième requête avec le même nonce (REJEU)
        MockHttpServletRequest req2 = new MockHttpServletRequest("GET", "/api/reservations/1");
        req2.addHeader("X-Service-Name", "ms-paiement");
        req2.addHeader("X-Service-Timestamp", String.valueOf(ts));
        req2.addHeader("X-Service-Nonce", nonce);
        req2.addHeader("X-Service-Signature", sig);

        MockHttpServletResponse res2 = new MockHttpServletResponse();
        securityFilter.doFilter(req2, res2, new MockFilterChain());

        assertThat(res2.getStatus()).isEqualTo(403);
        assertThat(res2.getContentAsString()).contains("Attaque par rejeu détectée");
    }

    private String signHmac(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding()
                    .encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }
}
