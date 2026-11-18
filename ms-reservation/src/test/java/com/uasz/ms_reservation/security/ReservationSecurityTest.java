package com.uasz.ms_reservation.security;

import com.uasz.ms_reservation.TestEphemeralSecretsPostProcessor;
import com.uasz.ms_reservation.clients.CircuitClient;
import com.uasz.ms_reservation.clients.EvenementClient;
import com.uasz.ms_reservation.clients.NotificationClient;
import com.uasz.ms_reservation.clients.PaiementClient;
import com.uasz.ms_reservation.dto.CircuitDto;
import com.uasz.ms_reservation.dto.EvenementPaiementNotificationRequest;
import com.uasz.ms_reservation.dto.ReservationDto;
import com.uasz.ms_reservation.entities.Reservation;
import com.uasz.ms_reservation.entities.StatutReservation;
import com.uasz.ms_reservation.entities.TypeReservation;
import com.uasz.ms_reservation.exceptions.ForbiddenException;
import com.uasz.ms_reservation.exceptions.UnauthorizedException;
import com.uasz.ms_reservation.mappers.ReservationMapper;
import com.uasz.ms_reservation.repositories.DisponibilitePrestationRepository;
import com.uasz.ms_reservation.repositories.ReservationEvenementRecuRepository;
import com.uasz.ms_reservation.repositories.ReservationRepository;
import com.uasz.ms_reservation.services.DisponibiliteLockService;
import com.uasz.ms_reservation.services.ReservationService;
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
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationSecurityTest {

    private String gatewaySecret;
    private String interserviceSecret;

    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private DisponibilitePrestationRepository disponibiliteRepository;
    @Mock
    private ReservationEvenementRecuRepository evenementRecuRepository;
    @Mock
    private DisponibiliteLockService disponibiliteLockService;
    @Mock
    private CircuitClient circuitClient;
    @Mock
    private EvenementClient evenementClient;
    @Mock
    private PaiementClient paiementClient;
    @Mock
    private NotificationClient notificationClient;

    private final ReservationMapper reservationMapper = Mappers.getMapper(ReservationMapper.class);
    private ReservationService reservationService;
    private MicroserviceSecurityFilter securityFilter;

    @BeforeEach
    void setUp() {
        gatewaySecret = TestEphemeralSecretsPostProcessor.generateRandomSecret();
        interserviceSecret = TestEphemeralSecretsPostProcessor.generateRandomSecret();
        reservationService = new ReservationService(
                reservationRepository, disponibiliteRepository, evenementRecuRepository,
                disponibiliteLockService, reservationMapper, circuitClient, evenementClient,
                paiementClient, notificationClient);
        securityFilter = new MicroserviceSecurityFilter(gatewaySecret, interserviceSecret);
    }

    @AfterEach
    void tearDown() {
        SecurityUserContextHolder.clear();
    }

    @Test
    @DisplayName("Section 5 : Contexte d'identité absent -> rejet Fail-Closed 401 sur toutes les opérations")
    void failClosed_contexteAbsentOuIncomplet_leveUnauthorized() {
        SecurityUserContextHolder.clear();
        assertThatThrownBy(() -> reservationService.getAllReservations()).isInstanceOf(UnauthorizedException.class);
        assertThatThrownBy(() -> reservationService.getByIdReservation(1L)).isInstanceOf(UnauthorizedException.class);
        assertThatThrownBy(() -> reservationService.annulerReservation(1L)).isInstanceOf(UnauthorizedException.class);
        assertThatThrownBy(() -> reservationService.deleteReservation(1L)).isInstanceOf(UnauthorizedException.class);

        SecurityUserContextHolder.setContext(new SecurityUserContext(null, "TOURISTE", "anon@uasz.sn", false, null));
        assertThatThrownBy(() -> reservationService.getByIdReservation(1L)).isInstanceOf(UnauthorizedException.class);
    }

    @Test
    @DisplayName("Section 5 : Utilisateur A vs Utilisateur B -> B ne peut ni consulter, ni annuler, ni supprimer la réservation de A")
    void bola_utilisateurBNePeutPasAccederALaReservationDUtilisateurA() {
        Reservation reservationA = Reservation.builder()
                .id(10L)
                .referenceReservation("RES-A-10")
                .utilisateurId(2L)
                .nomClient("Utilisateur A")
                .emailClient("user.a@uasz.sn")
                .nombrePlaces(2)
                .typeReservation(TypeReservation.CIRCUIT)
                .statut(StatutReservation.CONFIRMEE)
                .montantTotal(new BigDecimal("10000.00"))
                .build();

        when(reservationRepository.findById(10L)).thenReturn(Optional.of(reservationA));
        when(reservationRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(reservationA));

        SecurityUserContextHolder.setContext(new SecurityUserContext(4L, "TOURISTE", "user.b@uasz.sn", false, null));

        assertThatThrownBy(() -> reservationService.getByIdReservation(10L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("autre utilisateur");

        assertThatThrownBy(() -> reservationService.annulerReservation(10L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("autre utilisateur");

        assertThatThrownBy(() -> reservationService.deleteReservation(10L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("autre utilisateur");
    }

    @Test
    @DisplayName("Section 5 : Réservation historique sans utilisateurId -> rejet Fail-Closed 403 pour tout non-admin")
    void bola_reservationHistoriqueSansUtilisateurId_estRefuseeFailClosed() {
        Reservation orphanReservation = Reservation.builder()
                .id(77L)
                .referenceReservation("RES-ORPH-77")
                .utilisateurId(null)
                .nomClient("Client Historique")
                .emailClient("user.a@uasz.sn")
                .nombrePlaces(1)
                .typeReservation(TypeReservation.CIRCUIT)
                .statut(StatutReservation.EN_ATTENTE_PAIEMENT)
                .build();

        when(reservationRepository.findById(77L)).thenReturn(Optional.of(orphanReservation));
        when(reservationRepository.findByIdForUpdate(77L)).thenReturn(Optional.of(orphanReservation));

        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "user.a@uasz.sn", false, null));

        assertThatThrownBy(() -> reservationService.getByIdReservation(77L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Fail-Closed");

        assertThatThrownBy(() -> reservationService.annulerReservation(77L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("Fail-Closed");
    }

    @Test
    @DisplayName("Section 5 : Appel de service non autorisé ou falsification statut/propriété -> rejet 403")
    void bola_appelServiceNonAutoriseOuFalsificationStatut_estRefuse403() {
        Reservation reservationA = Reservation.builder()
                .id(10L)
                .referenceReservation("RES-A-10")
                .utilisateurId(2L)
                .nomClient("Utilisateur A")
                .emailClient("user.a@uasz.sn")
                .typeReservation(TypeReservation.CIRCUIT)
                .statut(StatutReservation.CONFIRMEE)
                .build();

        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "user.a@uasz.sn", true, "ms-circuit"));
        assertThatThrownBy(() -> reservationService.getByIdReservation(10L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("ms-circuit");

        when(reservationRepository.findById(10L)).thenReturn(Optional.of(reservationA));
        SecurityUserContextHolder.setContext(new SecurityUserContext(4L, "TOURISTE", "user.b@uasz.sn", true, "ms-paiement"));
        assertThatThrownBy(() -> reservationService.getByIdReservation(10L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("autre utilisateur");

        // ms-paiement authentifié pour le propriétaire même sans permission RESERVATION:LIRE_PROPRE (ou en tâche SYSTEM) est autorisé
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                2L, "TOURISTE", List.of("PAIEMENT:INITIER"), "user.a@uasz.sn", true, "ms-paiement"));
        assertThat(reservationService.getByIdReservation(10L).getId()).isEqualTo(10L);
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                null, "SYSTEM", List.of(), "", true, "ms-paiement"));
        assertThat(reservationService.getByIdReservation(10L).getId()).isEqualTo(10L);

        // Un touriste ne peut jamais forcer statut=CONFIRMEE ou appeler l'endpoint interne événement-paiement
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "user.a@uasz.sn", false, null));
        ReservationDto forged = ReservationDto.builder()
                .nomClient("A").emailClient("user.a@uasz.sn").nombrePlaces(1)
                .typeReservation(TypeReservation.CIRCUIT).circuitId(1L)
                .statut(StatutReservation.CONFIRMEE).build();
        assertThatThrownBy(() -> reservationService.saveReservation(forged))
                .isInstanceOf(ForbiddenException.class);

        assertThatThrownBy(() -> reservationService.traiterEvenementPaiement(10L,
                EvenementPaiementNotificationRequest.builder()
                        .eventId("e1").paiementId(1L).referenceTransaction("TX").typeEvenement("PAIEMENT_ACCEPTE")
                        .montant(BigDecimal.TEN).build()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    @DisplayName("Section 6 : Vérification des permissions des 5 rôles et cloisonnement du guide sur ms-reservation")
    void rbac_verificationPermissionsCinqRoles() {
        Reservation reservationA = Reservation.builder()
                .id(10L).referenceReservation("RES-10").utilisateurId(2L).nomClient("A").emailClient("a@uasz.sn")
                .typeReservation(TypeReservation.CIRCUIT).statut(StatutReservation.CONFIRMEE).build();
        when(reservationRepository.findById(10L)).thenReturn(Optional.of(reservationA));

        SecurityUserContextHolder.setContext(new SecurityUserContext(5L, "CONSERVATEUR", "cons@uasz.sn", false, null));
        assertThatThrownBy(() -> reservationService.getAllReservations()).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> reservationService.getByIdReservation(10L)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> reservationService.getStatistiques()).isInstanceOf(ForbiddenException.class);

        // GUIDE : pas de création, pas d'annulation, et pas d'accès au manifeste d'un autre guide
        SecurityUserContextHolder.setContext(new SecurityUserContext(6L, "GUIDE", "guide@uasz.sn", false, null));
        assertThatThrownBy(() -> reservationService.saveReservation(new ReservationDto())).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> reservationService.annulerReservation(10L)).isInstanceOf(ForbiddenException.class);
        CircuitDto autreGuideCircuit = new CircuitDto(1L, "Circuit", "Desc", "FACILE", 90, 5.0, 20, 5000.0);
        autreGuideCircuit.setGuideResponsableId(99L);
        when(circuitClient.getCircuitById(1L)).thenReturn(autreGuideCircuit);
        assertThatThrownBy(() -> reservationService.getManifesteGuidePourCircuit(1L)).isInstanceOf(ForbiddenException.class);

        // GESTIONNAIRE_SITE : accès consultation et gestion
        SecurityUserContextHolder.setContext(new SecurityUserContext(3L, "GESTIONNAIRE_SITE", "gest@uasz.sn", false, null));
        ReservationDto dto = reservationService.getByIdReservation(10L);
        assertThat(dto.getId()).isEqualTo(10L);
    }

    @Test
    @DisplayName("Section 4 : Accès direct sans signature est rejeté 401")
    void filter_accesDirectSansSignatureEstRefuse401() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/reservations");
        MockHttpServletResponse response = new MockHttpServletResponse();

        securityFilter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("Accès direct non autorisé");
    }

    @Test
    @DisplayName("Section 4 : Enveloppe Gateway valide liée à la requête + détection de rejeu et de modification du corps")
    void filter_enveloppeGatewayIntegriteEtAntiRejeu() throws Exception {
        byte[] body = "{\"nombrePlaces\":2}".getBytes(StandardCharsets.UTF_8);
        String bodySha256 = MicroserviceSecurityFilter.sha256Hex(body);
        long ts = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String canonical = "POST|/api/reservations|2|TOURISTE|RESERVATION:CREER|a@uasz.sn|sess-1|" + ts + "|" + nonce + "|" + bodySha256;
        String sig = signHmac(canonical, gatewaySecret);

        MockHttpServletRequest req1 = new MockHttpServletRequest("POST", "/api/reservations");
        req1.setContent(body);
        req1.addHeader("X-User-Id", "2");
        req1.addHeader("X-User-Roles", "TOURISTE");
        req1.addHeader("X-User-Permissions", "RESERVATION:CREER");
        req1.addHeader("X-User-Email", "a@uasz.sn");
        req1.addHeader("X-User-Session-Id", "sess-1");
        req1.addHeader("X-Content-SHA256", bodySha256);
        req1.addHeader("X-Internal-Gateway-Token", ts + "." + nonce + "." + sig);
        MockHttpServletResponse res1 = new MockHttpServletResponse();
        MockFilterChain chain1 = new MockFilterChain();
        securityFilter.doFilter(req1, res1, chain1);
        assertThat(res1.getStatus()).isEqualTo(200);
        assertThat(chain1.getRequest()).isNotNull();

        MockHttpServletRequest reqReplay = new MockHttpServletRequest("POST", "/api/reservations");
        reqReplay.setContent(body);
        reqReplay.addHeader("X-User-Id", "2");
        reqReplay.addHeader("X-User-Roles", "TOURISTE");
        reqReplay.addHeader("X-User-Permissions", "RESERVATION:CREER");
        reqReplay.addHeader("X-User-Email", "a@uasz.sn");
        reqReplay.addHeader("X-User-Session-Id", "sess-1");
        reqReplay.addHeader("X-Content-SHA256", bodySha256);
        reqReplay.addHeader("X-Internal-Gateway-Token", ts + "." + nonce + "." + sig);
        MockHttpServletResponse resReplay = new MockHttpServletResponse();
        securityFilter.doFilter(reqReplay, resReplay, new MockFilterChain());
        assertThat(resReplay.getStatus()).isEqualTo(403);
        assertThat(resReplay.getContentAsString()).contains("rejeu");

        String nonce2 = UUID.randomUUID().toString();
        String sig2 = signHmac("POST|/api/reservations|2|TOURISTE|RESERVATION:CREER|a@uasz.sn|sess-1|" + ts + "|" + nonce2 + "|" + bodySha256, gatewaySecret);
        MockHttpServletRequest reqTamperedBody = new MockHttpServletRequest("POST", "/api/reservations");
        reqTamperedBody.setContent("{\"nombrePlaces\":999}".getBytes(StandardCharsets.UTF_8));
        reqTamperedBody.addHeader("X-User-Id", "2");
        reqTamperedBody.addHeader("X-User-Roles", "TOURISTE");
        reqTamperedBody.addHeader("X-User-Permissions", "RESERVATION:CREER");
        reqTamperedBody.addHeader("X-User-Email", "a@uasz.sn");
        reqTamperedBody.addHeader("X-User-Session-Id", "sess-1");
        reqTamperedBody.addHeader("X-Internal-Gateway-Token", ts + "." + nonce2 + "." + sig2);
        MockHttpServletResponse resTamperedBody = new MockHttpServletResponse();
        securityFilter.doFilter(reqTamperedBody, resTamperedBody, new MockFilterChain());
        assertThat(resTamperedBody.getStatus()).isEqualTo(403);
    }

    @Test
    @DisplayName("Section 4 : Appel Interservice -> vérification d'audience, ACL (lecture + événement paiement), anti-rejeu")
    void filter_interserviceSignatureAudienceAclEtFalsificationIdentite() throws Exception {
        long ts = Instant.now().getEpochSecond();
        String nonce = UUID.randomUUID().toString();
        String emptyBodySha = MicroserviceSecurityFilter.sha256Hex(new byte[0]);
        String canonical = "GET|/api/reservations/10|ms-reservation|ms-paiement|" + ts + "|" + nonce + "|2|TOURISTE|PAIEMENT:INITIER|a@uasz.sn|" + emptyBodySha;
        String sig = signHmac(canonical, interserviceSecret);

        MockHttpServletRequest reqValid = new MockHttpServletRequest("GET", "/api/reservations/10");
        reqValid.addHeader("X-Service-Name", "ms-paiement");
        reqValid.addHeader("X-Service-Audience", "ms-reservation");
        reqValid.addHeader("X-Service-Timestamp", String.valueOf(ts));
        reqValid.addHeader("X-Service-Nonce", nonce);
        reqValid.addHeader("X-Content-SHA256", emptyBodySha);
        reqValid.addHeader("X-User-Id", "2");
        reqValid.addHeader("X-User-Roles", "TOURISTE");
        reqValid.addHeader("X-User-Permissions", "PAIEMENT:INITIER");
        reqValid.addHeader("X-User-Email", "a@uasz.sn");
        reqValid.addHeader("X-Service-Signature", sig);
        MockHttpServletResponse resValid = new MockHttpServletResponse();
        securityFilter.doFilter(reqValid, resValid, new MockFilterChain());
        assertThat(resValid.getStatus()).isEqualTo(200);

        String nonceCallback = UUID.randomUUID().toString();
        String cbCanonical = "POST|/api/reservations/internal/10/evenement-paiement|ms-reservation|ms-paiement|"
                + ts + "|" + nonceCallback + "|SYSTEM|SYSTEM|||" + emptyBodySha;
        String cbSig = signHmac(cbCanonical, interserviceSecret);
        MockHttpServletRequest reqCallback = new MockHttpServletRequest("POST", "/api/reservations/internal/10/evenement-paiement");
        reqCallback.addHeader("X-Service-Name", "ms-paiement");
        reqCallback.addHeader("X-Service-Audience", "ms-reservation");
        reqCallback.addHeader("X-Service-Timestamp", String.valueOf(ts));
        reqCallback.addHeader("X-Service-Nonce", nonceCallback);
        reqCallback.addHeader("X-Content-SHA256", emptyBodySha);
        reqCallback.addHeader("X-User-Id", "SYSTEM");
        reqCallback.addHeader("X-User-Roles", "SYSTEM");
        reqCallback.addHeader("X-Service-Signature", cbSig);
        MockHttpServletResponse resCallback = new MockHttpServletResponse();
        securityFilter.doFilter(reqCallback, resCallback, new MockFilterChain());
        assertThat(resCallback.getStatus()).isEqualTo(200);

        String nonce2 = UUID.randomUUID().toString();
        String sig2 = signHmac("GET|/api/reservations/10|ms-reservation|ms-paiement|" + ts + "|" + nonce2 + "|2|TOURISTE|PAIEMENT:INITIER|a@uasz.sn|" + emptyBodySha, interserviceSecret);
        MockHttpServletRequest reqForgedUser = new MockHttpServletRequest("GET", "/api/reservations/10");
        reqForgedUser.addHeader("X-Service-Name", "ms-paiement");
        reqForgedUser.addHeader("X-Service-Audience", "ms-reservation");
        reqForgedUser.addHeader("X-Service-Timestamp", String.valueOf(ts));
        reqForgedUser.addHeader("X-Service-Nonce", nonce2);
        reqForgedUser.addHeader("X-Content-SHA256", emptyBodySha);
        reqForgedUser.addHeader("X-User-Id", "1");
        reqForgedUser.addHeader("X-User-Roles", "ADMINISTRATEUR");
        reqForgedUser.addHeader("X-User-Permissions", "PAIEMENT:INITIER");
        reqForgedUser.addHeader("X-User-Email", "a@uasz.sn");
        reqForgedUser.addHeader("X-Service-Signature", sig2);
        MockHttpServletResponse resForgedUser = new MockHttpServletResponse();
        securityFilter.doFilter(reqForgedUser, resForgedUser, new MockFilterChain());
        assertThat(resForgedUser.getStatus()).isEqualTo(403);
        assertThat(resForgedUser.getContentAsString()).contains("falsification");

        String nonce3 = UUID.randomUUID().toString();
        String sig3 = signHmac("GET|/api/reservations/10|ms-reservation|ms-circuit|" + ts + "|" + nonce3 + "|2|TOURISTE||a@uasz.sn|" + emptyBodySha, interserviceSecret);
        MockHttpServletRequest reqUnauthorizedService = new MockHttpServletRequest("GET", "/api/reservations/10");
        reqUnauthorizedService.addHeader("X-Service-Name", "ms-circuit");
        reqUnauthorizedService.addHeader("X-Service-Audience", "ms-reservation");
        reqUnauthorizedService.addHeader("X-Service-Timestamp", String.valueOf(ts));
        reqUnauthorizedService.addHeader("X-Service-Nonce", nonce3);
        reqUnauthorizedService.addHeader("X-Content-SHA256", emptyBodySha);
        reqUnauthorizedService.addHeader("X-User-Id", "2");
        reqUnauthorizedService.addHeader("X-User-Roles", "TOURISTE");
        reqUnauthorizedService.addHeader("X-User-Email", "a@uasz.sn");
        reqUnauthorizedService.addHeader("X-Service-Signature", sig3);
        MockHttpServletResponse resUnauthorizedService = new MockHttpServletResponse();
        securityFilter.doFilter(reqUnauthorizedService, resUnauthorizedService, new MockFilterChain());
        assertThat(resUnauthorizedService.getStatus()).isEqualTo(403);
        assertThat(resUnauthorizedService.getContentAsString()).contains("matrice ACL");
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
