package com.uasz.ms_paiement.security;

import com.uasz.ms_paiement.clients.NotificationClient;
import com.uasz.ms_paiement.clients.ReservationClient;
import com.uasz.ms_paiement.dto.PaiementDto;
import com.uasz.ms_paiement.dto.ReservationDto;
import com.uasz.ms_paiement.entities.ModePaiement;
import com.uasz.ms_paiement.entities.Paiement;
import com.uasz.ms_paiement.entities.StatutPaiement;
import com.uasz.ms_paiement.exceptions.ForbiddenException;
import com.uasz.ms_paiement.mappers.PaiementMapper;
import com.uasz.ms_paiement.repositories.PaiementRepository;
import com.uasz.ms_paiement.services.PaiementService;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaiementSecurityTest {

    private static final String GATEWAY_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    private static final String INTERSERVICE_SECRET = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

    @Mock
    private PaiementRepository paiementRepository;

    @Mock
    private ReservationClient reservationClient;

    @Mock
    private NotificationClient notificationClient;

    private final PaiementMapper paiementMapper = Mappers.getMapper(PaiementMapper.class);
    private PaiementService paiementService;
    private MicroserviceSecurityFilter securityFilter;

    @BeforeEach
    void setUp() {
        paiementService = new PaiementService(paiementRepository, paiementMapper, reservationClient, notificationClient);
        securityFilter = new MicroserviceSecurityFilter(GATEWAY_SECRET, INTERSERVICE_SECRET);
    }

    @AfterEach
    void tearDown() {
        SecurityUserContextHolder.clear();
    }

    @Test
    void bola_touristeNePeutPasLireLePaiementDUnAutreUtilisateur() {
        // Utilisateur connecté : Touriste A (ID: 2)
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "touriste.a@uasz.sn", false, null));

        // Paiement appartenant à Touriste B (ID: 4)
        Paiement paiementB = Paiement.builder()
                .id(99L)
                .utilisateurId(4L)
                .referenceTransaction("PAY-TX-B")
                .reservationId(10L)
                .montant(25000.0)
                .modePaiement(ModePaiement.WAVE)
                .statut(StatutPaiement.REUSSI)
                .build();

        when(paiementRepository.findById(99L)).thenReturn(Optional.of(paiementB));

        assertThatThrownBy(() -> paiementService.getByIdPaiement(99L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Accès interdit : vous ne pouvez pas consulter le reçu de paiement d'un autre utilisateur.");
    }

    @Test
    void bola_touristeNePeutPasPayerLaReservationDUnAutreUtilisateur() {
        // Utilisateur connecté : Touriste A (ID: 2)
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "touriste.a@uasz.sn", false, null));

        // Réservation appartenant à Touriste B (ID: 4)
        ReservationDto reservationB = new ReservationDto(
                55L, "Touriste B", "touriste.b@uasz.sn", "+221770000000",
                2, LocalDateTime.now(), "CIRCUIT", "CONFIRMEE", 40000.0, 1L, null
        );
        reservationB.setUtilisateurId(4L);

        when(paiementRepository.existsByReservationIdAndStatut(55L, StatutPaiement.REUSSI)).thenReturn(false);
        when(reservationClient.getReservationById(55L)).thenReturn(reservationB);

        PaiementDto payload = PaiementDto.builder()
                .reservationId(55L)
                .modePaiement(ModePaiement.WAVE)
                .build();

        assertThatThrownBy(() -> paiementService.effectuerPaiement(payload))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Accès interdit : vous ne pouvez pas payer la réservation d'un autre utilisateur.");
    }

    @Test
    void bola_touristePeutConsulterSonProprePaiement() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "touriste.a@uasz.sn", false, null));

        Paiement paiementA = Paiement.builder()
                .id(1L)
                .utilisateurId(2L)
                .referenceTransaction("PAY-TX-A")
                .reservationId(20L)
                .montant(15000.0)
                .modePaiement(ModePaiement.ORANGE_MONEY)
                .statut(StatutPaiement.REUSSI)
                .build();

        when(paiementRepository.findById(1L)).thenReturn(Optional.of(paiementA));

        PaiementDto dto = paiementService.getByIdPaiement(1L);

        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getReferenceTransaction()).isEqualTo("PAY-TX-A");
    }

    @Test
    void filter_accesDirectSansSignatureEstRefuse401() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/paiements");
        MockHttpServletResponse response = new MockHttpServletResponse();

        securityFilter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("Accès direct non autorisé");
    }

    @Test
    void filter_avecJetonGatewayValide_estAccepte() throws Exception {
        long ts = Instant.now().getEpochSecond();
        String sig = signHmac("2:TOURISTE:" + ts, GATEWAY_SECRET);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/paiements");
        request.addHeader("X-Internal-Gateway-Token", ts + "." + sig);
        request.addHeader("X-User-Id", "2");
        request.addHeader("X-User-Roles", "TOURISTE");

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        securityFilter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).isNotNull();
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
