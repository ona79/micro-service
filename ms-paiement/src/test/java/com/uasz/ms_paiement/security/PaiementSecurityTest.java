package com.uasz.ms_paiement.security;

import com.uasz.ms_paiement.TestEphemeralSecretsPostProcessor;
import com.uasz.ms_paiement.clients.NotificationClient;
import com.uasz.ms_paiement.clients.ReservationClient;
import com.uasz.ms_paiement.dto.PaiementDto;
import com.uasz.ms_paiement.dto.ReservationDto;
import com.uasz.ms_paiement.dto.SimulationPaiementRequest;
import com.uasz.ms_paiement.entities.DecisionSimulation;
import com.uasz.ms_paiement.entities.ModePaiement;
import com.uasz.ms_paiement.entities.Paiement;
import com.uasz.ms_paiement.entities.StatutPaiement;
import com.uasz.ms_paiement.exceptions.ForbiddenException;
import com.uasz.ms_paiement.exceptions.UnauthorizedException;
import com.uasz.ms_paiement.mappers.PaiementMapper;
import com.uasz.ms_paiement.repositories.PaiementOutboxRepository;
import com.uasz.ms_paiement.repositories.PaiementRepository;
import com.uasz.ms_paiement.services.PaiementOutboxRelayService;
import com.uasz.ms_paiement.services.PaiementService;
import com.uasz.ms_paiement.services.SimulatedMobileMoneyProvider;
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
import java.math.BigDecimal;
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
    private PaiementOutboxRepository outboxRepository;
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
        PaiementOutboxRelayService relay = new PaiementOutboxRelayService(outboxRepository, paiementRepository, reservationClient);
        paiementService = new PaiementService(
                paiementRepository, outboxRepository, paiementMapper,
                reservationClient, notificationClient, new SimulatedMobileMoneyProvider(), relay);
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
        assertThatThrownBy(() -> paiementService.rembourserPaiement(1L, "Test", null)).isInstanceOf(UnauthorizedException.class);
    }

    @Test
    @DisplayName("Section 5 : Utilisateur A ne peut ni consulter, ni simuler, ni payer pour Utilisateur B")
    void bola_touristeNePeutPasLireSimulerOuPayerPourUnAutreUtilisateur() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "touriste.a@uasz.sn", false, null));

        Paiement paiementB = Paiement.builder()
                .id(99L).utilisateurId(4L).referenceTransaction("PAY-TX-B").reservationId(10L)
                .montant(new BigDecimal("25000.00")).modePaiement(ModePaiement.WAVE).statut(StatutPaiement.EN_COURS).build();

        when(paiementRepository.findById(99L)).thenReturn(Optional.of(paiementB));
        when(paiementRepository.findByIdForUpdate(99L)).thenReturn(Optional.of(paiementB));

        assertThatThrownBy(() -> paiementService.getByIdPaiement(99L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("autre utilisateur");

        assertThatThrownBy(() -> paiementService.simulerDecisionPaiement(
                99L, new SimulationPaiementRequest(DecisionSimulation.ACCEPTER, null, null), null))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("autre utilisateur");

        ReservationDto reservationB = new ReservationDto(
                55L, "Touriste B", "touriste.b@uasz.sn", "+221770000000",
                2, LocalDateTime.now(), "CIRCUIT", "EN_ATTENTE_PAIEMENT", 40000.0, 1L, null);
        reservationB.setUtilisateurId(4L);
        when(reservationClient.getReservationById(55L)).thenReturn(reservationB);

        PaiementDto payload = PaiementDto.builder().reservationId(55L).modePaiement(ModePaiement.WAVE).build();

        assertThatThrownBy(() -> paiementService.effectuerPaiement(payload))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("autre utilisateur");
    }

    @Test
    @DisplayName("Section 5 : Une réservation historique sans utilisateurId ne peut JAMAIS être payée par un utilisateur standard")
    void bola_reservationHistoriqueSansUtilisateurId_estRefuseeFailClosed() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "touriste.a@uasz.sn", false, null));

        ReservationDto orphanReservation = new ReservationDto(
                88L, "Ancien Client", "autre@uasz.sn", "+221770000000",
                1, LocalDateTime.now(), "CIRCUIT", "EN_ATTENTE_PAIEMENT", 15000.0, 1L, null);
        orphanReservation.setUtilisateurId(null);
        when(reservationClient.getReservationById(88L)).thenReturn(orphanReservation);

        PaiementDto payload = PaiementDto.builder().reservationId(88L).modePaiement(ModePaiement.WAVE).build();

        assertThatThrownBy(() -> paiementService.effectuerPaiement(payload))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Fail-Closed");
    }

    @Test
    @DisplayName("Section 5 : RBAC paiement — GUIDE, CONSERVATEUR, GESTIONNAIRE et TOURISTE sur remboursement sont rejetés 403")
    void rbac_cloisonnementFinancierParRole() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "a@uasz.sn", false, null));
        assertThatThrownBy(() -> paiementService.rembourserPaiement(1L, "Tentative non autorisée", null))
                .isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> paiementService.getStatistiques())
                .isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> paiementService.effectuerPaiement(
                PaiementDto.builder().reservationId(1L).modePaiement(ModePaiement.WAVE).statut(StatutPaiement.ACCEPTE).build()))
                .isInstanceOf(ForbiddenException.class);

        for (String nonFinancialRole : new String[]{"GUIDE", "CONSERVATEUR", "GESTIONNAIRE_SITE"}) {
            SecurityUserContextHolder.setContext(new SecurityUserContext(9L, nonFinancialRole, "staff@uasz.sn", false, null));
            assertThatThrownBy(() -> paiementService.getAllPaiements()).isInstanceOf(ForbiddenException.class);
            assertThatThrownBy(() -> paiementService.effectuerPaiement(
                    PaiementDto.builder().reservationId(1L).modePaiement(ModePaiement.WAVE).build()))
                    .isInstanceOf(ForbiddenException.class);
            assertThatThrownBy(() -> paiementService.rembourserPaiement(1L, "Test", null))
                    .isInstanceOf(ForbiddenException.class);
        }
    }

    @Test
    @DisplayName("Section 5 : Appel de service interne non autorisé sur ms-paiement est refusé 403 ; réconciliation ms-reservation autorisée")
    void bola_aclInterserviceMsPaiement() throws Exception {
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "a@uasz.sn", true, "ms-reservation"));
        assertThatThrownBy(() -> paiementService.getAllPaiements())
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("service interne");

        long ts = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String emptyBodySha = MicroserviceSecurityFilter.sha256Hex(new byte[0]);
        String canonicalOk = "GET|/api/paiements/internal/reservation/10|ms-paiement|ms-reservation|" + ts + "|" + nonce + "|SYSTEM|SYSTEM|||" + emptyBodySha;
        String sigOk = signHmac(canonicalOk, interserviceSecret);

        MockHttpServletRequest reqOk = new MockHttpServletRequest("GET", "/api/paiements/internal/reservation/10");
        reqOk.addHeader("X-Service-Name", "ms-reservation");
        reqOk.addHeader("X-Service-Audience", "ms-paiement");
        reqOk.addHeader("X-Service-Timestamp", String.valueOf(ts));
        reqOk.addHeader("X-Service-Nonce", nonce);
        reqOk.addHeader("X-Content-SHA256", emptyBodySha);
        reqOk.addHeader("X-User-Id", "SYSTEM");
        reqOk.addHeader("X-User-Roles", "SYSTEM");
        reqOk.addHeader("X-Service-Signature", sigOk);
        MockHttpServletResponse resOk = new MockHttpServletResponse();
        securityFilter.doFilter(reqOk, resOk, new MockFilterChain());
        assertThat(resOk.getStatus()).isEqualTo(200);

        // Un autre service (ms-circuit) ou un POST depuis ms-reservation -> 403 ACL
        String nonceBad = UUID.randomUUID().toString();
        String canonicalBad = "GET|/api/paiements/internal/reservation/10|ms-paiement|ms-circuit|" + ts + "|" + nonceBad + "|SYSTEM|SYSTEM|||" + emptyBodySha;
        MockHttpServletRequest reqBad = new MockHttpServletRequest("GET", "/api/paiements/internal/reservation/10");
        reqBad.addHeader("X-Service-Name", "ms-circuit");
        reqBad.addHeader("X-Service-Audience", "ms-paiement");
        reqBad.addHeader("X-Service-Timestamp", String.valueOf(ts));
        reqBad.addHeader("X-Service-Nonce", nonceBad);
        reqBad.addHeader("X-Content-SHA256", emptyBodySha);
        reqBad.addHeader("X-User-Id", "SYSTEM");
        reqBad.addHeader("X-User-Roles", "SYSTEM");
        reqBad.addHeader("X-Service-Signature", signHmac(canonicalBad, interserviceSecret));
        MockHttpServletResponse resBad = new MockHttpServletResponse();
        securityFilter.doFilter(reqBad, resBad, new MockFilterChain());
        assertThat(resBad.getStatus()).isEqualTo(403);
    }

    @Test
    @DisplayName("Section 5 : Utilisateur A peut consulter son propre reçu de paiement")
    void bola_touristePeutConsulterSonProprePaiement() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "touriste.a@uasz.sn", false, null));

        Paiement paiementA = Paiement.builder()
                .id(1L).utilisateurId(2L).referenceTransaction("PAY-TX-A").reservationId(20L)
                .montant(new BigDecimal("15000.00")).modePaiement(ModePaiement.ORANGE_MONEY)
                .statut(StatutPaiement.ACCEPTE).estSimule(true).build();

        when(paiementRepository.findById(1L)).thenReturn(Optional.of(paiementA));

        PaiementDto dto = paiementService.getByIdPaiement(1L);
        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getReferenceTransaction()).isEqualTo("PAY-TX-A");
        assertThat(dto.isEstSimule()).isTrue();
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
