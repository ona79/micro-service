package com.uasz.ms_paiement.security;

import com.uasz.ms_paiement.TestEphemeralSecretsPostProcessor;
import com.uasz.ms_paiement.clients.NotificationClient;
import com.uasz.ms_paiement.clients.ReservationClient;
import com.uasz.ms_paiement.dto.PaiementDto;
import com.uasz.ms_paiement.dto.ReservationDto;
import com.uasz.ms_paiement.entities.ModePaiement;
import com.uasz.ms_paiement.entities.Paiement;
import com.uasz.ms_paiement.entities.StatutPaiement;
import com.uasz.ms_paiement.exceptions.ForbiddenException;
import com.uasz.ms_paiement.exceptions.UnauthorizedException;
import com.uasz.ms_paiement.mappers.PaiementMapper;
import com.uasz.ms_paiement.repositories.PaiementRepository;
import com.uasz.ms_paiement.services.PaiementService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaiementSecurityTest {

    private String gatewaySecret;
    private String interserviceSecret;

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
        gatewaySecret = TestEphemeralSecretsPostProcessor.generateRandomSecret();
        interserviceSecret = TestEphemeralSecretsPostProcessor.generateRandomSecret();
        paiementService = new PaiementService(paiementRepository, paiementMapper, reservationClient, notificationClient);
        securityFilter = new MicroserviceSecurityFilter(gatewaySecret, interserviceSecret);
    }

    @AfterEach
    void tearDown() {
        SecurityUserContextHolder.clear();
    }

    @Test
    @DisplayName("Section 5 : Contexte d'identité absent -> rejet Fail-Closed 401")
    void failClosed_contexteAbsentOuIncomplet_leveUnauthorized() {
        SecurityUserContextHolder.clear();
        assertThatThrownBy(() -> paiementService.getAllPaiements()).isInstanceOf(UnauthorizedException.class);
        assertThatThrownBy(() -> paiementService.getByIdPaiement(1L)).isInstanceOf(UnauthorizedException.class);
        assertThatThrownBy(() -> paiementService.effectuerPaiement(new PaiementDto())).isInstanceOf(UnauthorizedException.class);
    }

    @Test
    @DisplayName("Section 5 : Utilisateur A ne peut ni consulter le paiement ni payer la réservation d'Utilisateur B")
    void bola_touristeNePeutPasLireOuPayerPourUnAutreUtilisateur() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "touriste.a@uasz.sn", false, null));

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
                .hasMessageContaining("autre utilisateur");

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
                .hasMessageContaining("autre utilisateur");
    }

    @Test
    @DisplayName("Section 5 : Une réservation historique sans utilisateurId ne peut JAMAIS être payée par un utilisateur standard (Fail-Closed)")
    void bola_reservationHistoriqueSansUtilisateurId_estRefuseeFailClosed() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "touriste.a@uasz.sn", false, null));

        // Réservation historique sans utilisateurId (null), même avec un email différent
        ReservationDto orphanReservation = new ReservationDto(
                88L, "Ancien Client", "autre@uasz.sn", "+221770000000",
                1, LocalDateTime.now(), "CIRCUIT", "CONFIRMEE", 15000.0, 1L, null
        );
        orphanReservation.setUtilisateurId(null);

        when(paiementRepository.existsByReservationIdAndStatut(88L, StatutPaiement.REUSSI)).thenReturn(false);
        when(reservationClient.getReservationById(88L)).thenReturn(orphanReservation);

        PaiementDto payload = PaiementDto.builder()
                .reservationId(88L)
                .modePaiement(ModePaiement.WAVE)
                .build();

        assertThatThrownBy(() -> paiementService.effectuerPaiement(payload))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Fail-Closed");
    }

    @Test
    @DisplayName("Section 5 : Appel de service interne vers ms-paiement est systématiquement refusé 403")
    void bola_appelDeServiceEstRefuse403() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "a@uasz.sn", true, "ms-reservation"));
        assertThatThrownBy(() -> paiementService.getAllPaiements())
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("service interne");
    }

    @Test
    @DisplayName("Section 5 : Utilisateur A peut consulter son propre reçu de paiement")
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
    void filter_avecJetonGatewayValideLieALaRequete_estAccepte() throws Exception {
        long ts = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String emptyBodySha = MicroserviceSecurityFilter.sha256Hex(new byte[0]);
        String canonical = "GET|/api/paiements|2|TOURISTE|PAIEMENT:LIRE_PROPRE|a@uasz.sn|sess-1|" + ts + "|" + nonce + "|" + emptyBodySha;
        String sig = signHmac(canonical, gatewaySecret);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/paiements");
        request.addHeader("X-User-Id", "2");
        request.addHeader("X-User-Roles", "TOURISTE");
        request.addHeader("X-User-Permissions", "PAIEMENT:LIRE_PROPRE");
        request.addHeader("X-User-Email", "a@uasz.sn");
        request.addHeader("X-User-Session-Id", "sess-1");
        request.addHeader("X-Content-SHA256", emptyBodySha);
        request.addHeader("X-Internal-Gateway-Token", ts + "." + nonce + "." + sig);

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
