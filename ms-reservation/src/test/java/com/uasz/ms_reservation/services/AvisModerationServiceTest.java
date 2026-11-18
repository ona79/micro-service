package com.uasz.ms_reservation.services;

import com.uasz.ms_reservation.clients.CircuitClient;
import com.uasz.ms_reservation.clients.EvenementClient;
import com.uasz.ms_reservation.clients.NotificationClient;
import com.uasz.ms_reservation.clients.PatrimoineClient;
import com.uasz.ms_reservation.clients.UtilisateurGuideClient;
import com.uasz.ms_reservation.dto.AvisCreateRequest;
import com.uasz.ms_reservation.dto.AvisDto;
import com.uasz.ms_reservation.dto.AvisResumeDto;
import com.uasz.ms_reservation.dto.AvisUpdateRequest;
import com.uasz.ms_reservation.dto.CircuitDto;
import com.uasz.ms_reservation.dto.ModerationDecisionRequest;
import com.uasz.ms_reservation.dto.NotificationRequest;
import com.uasz.ms_reservation.dto.SignalementCreateRequest;
import com.uasz.ms_reservation.dto.SignalementDecisionRequest;
import com.uasz.ms_reservation.dto.SignalementDto;
import com.uasz.ms_reservation.entities.Avis;
import com.uasz.ms_reservation.entities.AvisSignalement;
import com.uasz.ms_reservation.entities.CategorieSignalement;
import com.uasz.ms_reservation.entities.CibleAvis;
import com.uasz.ms_reservation.entities.Reservation;
import com.uasz.ms_reservation.entities.ReservationNotificationOutbox;
import com.uasz.ms_reservation.entities.StatutModerationAvis;
import com.uasz.ms_reservation.entities.StatutOutbox;
import com.uasz.ms_reservation.entities.StatutReservation;
import com.uasz.ms_reservation.entities.StatutSignalement;
import com.uasz.ms_reservation.entities.TypeReservation;
import com.uasz.ms_reservation.exceptions.BadRequestException;
import com.uasz.ms_reservation.exceptions.ConflictException;
import com.uasz.ms_reservation.exceptions.ForbiddenException;
import com.uasz.ms_reservation.repositories.AvisModerationHistoriqueRepository;
import com.uasz.ms_reservation.repositories.AvisRepository;
import com.uasz.ms_reservation.repositories.AvisSignalementRepository;
import com.uasz.ms_reservation.repositories.ReservationNotificationOutboxRepository;
import com.uasz.ms_reservation.repositories.ReservationRepository;
import com.uasz.ms_reservation.security.SecurityUserContext;
import com.uasz.ms_reservation.security.SecurityUserContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AvisModerationServiceTest {

    @Mock private AvisRepository avisRepository;
    @Mock private AvisSignalementRepository signalementRepository;
    @Mock private AvisModerationHistoriqueRepository historiqueRepository;
    @Mock private ReservationRepository reservationRepository;
    @Mock private CircuitClient circuitClient;
    @Mock private EvenementClient evenementClient;
    @Mock private PatrimoineClient patrimoineClient;
    @Mock private UtilisateurGuideClient utilisateurGuideClient;
    @Mock private ReservationNotificationOutboxRepository outboxRepository;
    @Mock private NotificationClient notificationClient;

    private AvisModerationService service;

    @BeforeEach
    void setUp() {
        ReservationNotificationOutboxRelayService relay =
                new ReservationNotificationOutboxRelayService(outboxRepository, notificationClient, null);
        service = new AvisModerationService(
                avisRepository, signalementRepository, historiqueRepository, reservationRepository,
                circuitClient, evenementClient, patrimoineClient, utilisateurGuideClient,
                outboxRepository, relay
        );
    }

    @AfterEach
    void clearContext() {
        SecurityUserContextHolder.clear();
    }

    @Test
    void creerAvis_avecReservationConfirmeeRealisee_creeAvisVerifieEtEmpecheDoublon() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "moussa@uasz.sn", false, null));
        when(circuitClient.getCircuitById(1L)).thenReturn(new CircuitDto(1L, "Boucle Kasa", "Desc", "MOYEN", 120, 12.0, 10, BigDecimal.valueOf(20000)));
        Reservation realised = Reservation.builder()
                .id(3L)
                .utilisateurId(2L)
                .nomClient("Moussa Diop")
                .emailClient("moussa@uasz.sn")
                .typeReservation(TypeReservation.CIRCUIT)
                .circuitId(1L)
                .statut(StatutReservation.CONFIRMEE)
                .datePrestation(LocalDate.now(Reservation.CASAMANCE_ZONE).minusDays(2))
                .build();
        when(reservationRepository.findByUtilisateurId(2L)).thenReturn(List.of(realised));
        when(avisRepository.existsByReservationIdAndCibleTypeAndCibleId(3L, CibleAvis.CIRCUIT, 1L))
                .thenReturn(false)
                .thenReturn(true);
        when(avisRepository.saveAndFlush(any(Avis.class))).thenAnswer(inv -> {
            Avis a = inv.getArgument(0);
            a.setId(15L);
            return a;
        });

        AvisCreateRequest req = AvisCreateRequest.builder()
                .cibleType(CibleAvis.CIRCUIT)
                .cibleId(1L)
                .note(5)
                .commentaire("Excellente visite guidée dans le Kasa avec une logistique fluide.")
                .build();

        AvisDto created = service.creerAvis(req);
        assertThat(created.getId()).isEqualTo(15L);
        assertThat(created.isExperienceVerifiee()).isTrue();
        assertThat(created.getStatutModeration()).isEqualTo(StatutModerationAvis.APPROUVE);

        assertThatThrownBy(() -> service.creerAvis(req))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void creerAvis_sansReservationRealiseeOuHorsLimitesOuBOLA_estRefuse() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "moussa@uasz.sn", false, null));
        when(circuitClient.getCircuitById(1L)).thenReturn(new CircuitDto(1L, "Boucle Kasa", "Desc", "MOYEN", 120, 12.0, 10, BigDecimal.valueOf(20000)));

        // Note hors bornes
        assertThatThrownBy(() -> service.creerAvis(AvisCreateRequest.builder()
                .cibleType(CibleAvis.CIRCUIT).cibleId(1L).note(6).commentaire("Note hors limite invalide.").build()))
                .isInstanceOf(BadRequestException.class);

        // Réservation future : refusée
        Reservation future = Reservation.builder()
                .id(10L)
                .utilisateurId(2L)
                .typeReservation(TypeReservation.CIRCUIT)
                .circuitId(1L)
                .statut(StatutReservation.CONFIRMEE)
                .datePrestation(LocalDate.now(Reservation.CASAMANCE_ZONE).plusDays(3))
                .build();
        when(reservationRepository.findById(10L)).thenReturn(Optional.of(future));
        assertThatThrownBy(() -> service.creerAvis(AvisCreateRequest.builder()
                .cibleType(CibleAvis.CIRCUIT).cibleId(1L).reservationId(10L).note(4)
                .commentaire("Tentative avant la prestation.").build()))
                .isInstanceOf(ForbiddenException.class);

        // Réservation appartenant à un autre utilisateur (BOLA)
        Reservation autrui = Reservation.builder()
                .id(11L)
                .utilisateurId(99L)
                .typeReservation(TypeReservation.CIRCUIT)
                .circuitId(1L)
                .statut(StatutReservation.CONFIRMEE)
                .datePrestation(LocalDate.now(Reservation.CASAMANCE_ZONE).minusDays(1))
                .build();
        when(reservationRepository.findById(11L)).thenReturn(Optional.of(autrui));
        assertThatThrownBy(() -> service.creerAvis(AvisCreateRequest.builder()
                .cibleType(CibleAvis.CIRCUIT).cibleId(1L).reservationId(11L).note(5)
                .commentaire("Tentative BOLA sur la réservation d'autrui.").build()))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("BOLA");

        // Falsification de experienceVerifiee
        assertThatThrownBy(() -> service.creerAvis(AvisCreateRequest.builder()
                .cibleType(CibleAvis.CIRCUIT).cibleId(1L).note(5).experienceVerifiee(true)
                .commentaire("Tentative de forçage.").build()))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void moderationEtSignalement_rolesIncoherencesEtRecalculNote() {
        Avis avis = Avis.builder()
                .id(20L)
                .auteurId(2L)
                .auteurNom("Moussa Diop")
                .cibleType(CibleAvis.CIRCUIT)
                .cibleId(1L)
                .reservationId(3L)
                .note(4)
                .commentaire("Très bonne visite.")
                .experienceVerifiee(true)
                .statutModeration(StatutModerationAvis.APPROUVE)
                .datePublication(LocalDateTime.now())
                .build();

        // 1. Signalement par un conservateur (autorisé AVIS:SIGNALER)
        SecurityUserContextHolder.setContext(new SecurityUserContext(4L, "CONSERVATEUR", "fatou@uasz.sn", false, null));
        when(avisRepository.findById(20L)).thenReturn(Optional.of(avis));
        when(signalementRepository.existsByAvisIdAndSignaleParIdAndStatut(20L, 4L, StatutSignalement.OUVERT)).thenReturn(false);
        when(signalementRepository.save(any(AvisSignalement.class))).thenAnswer(inv -> {
            AvisSignalement s = inv.getArgument(0);
            if (s.getId() == null) s.setId(50L);
            return s;
        });

        SignalementDto flag = service.signalerAvis(20L, SignalementCreateRequest.builder()
                .categorie(CategorieSignalement.FAUSSE_INFORMATION)
                .motif("Précision inexacte sur les horaires du monument.")
                .build());
        assertThat(flag.getStatut()).isEqualTo(StatutSignalement.OUVERT);

        // 2. Tentative de modération par CONSERVATEUR ou TOURISTE : 403 Forbidden
        assertThatThrownBy(() -> service.deciderModerationAvis(20L,
                new ModerationDecisionRequest(StatutModerationAvis.MASQUE, "Non autorisé")))
                .isInstanceOf(ForbiddenException.class);

        // 3. Modération par GESTIONNAIRE_SITE pendant indisponibilité ms-notification : transition + outbox résilient
        SecurityUserContextHolder.setContext(new SecurityUserContext(3L, "GESTIONNAIRE_SITE", "awa@uasz.sn", false, null));
        AvisSignalement openFlag = AvisSignalement.builder()
                .id(50L).avisId(20L).signaleParId(4L).signaleParNom("fatou@uasz.sn")
                .statut(StatutSignalement.OUVERT).dateSignalement(LocalDateTime.now()).build();
        when(signalementRepository.findById(50L)).thenReturn(Optional.of(openFlag));
        when(avisRepository.save(any(Avis.class))).thenAnswer(inv -> inv.getArgument(0));
        when(reservationRepository.findById(3L)).thenReturn(Optional.of(
                Reservation.builder().id(3L).emailClient("moussa@uasz.sn").build()));

        AtomicLong outboxId = new AtomicLong(200L);
        ReservationNotificationOutbox[] stored = new ReservationNotificationOutbox[1];
        when(outboxRepository.save(any(ReservationNotificationOutbox.class))).thenAnswer(inv -> {
            ReservationNotificationOutbox o = inv.getArgument(0);
            if (o.getId() == null) o.setId(outboxId.getAndIncrement());
            stored[0] = o;
            return o;
        });
        when(outboxRepository.findByIdForUpdate(any())).thenAnswer(inv -> Optional.ofNullable(stored[0]));
        doThrow(new RuntimeException("Notification down")).when(notificationClient).envoyerNotification(any(NotificationRequest.class));

        SignalementDto resolved = service.traiterSignalement(50L, SignalementDecisionRequest.builder()
                .decisionSignalement(StatutSignalement.VALIDE_CONTENU_RETIRE)
                .statutAvisCible(StatutModerationAvis.REJETE)
                .commentaire("Contenu trompeur confirmé après vérification.")
                .build());
        assertThat(resolved.getStatut()).isEqualTo(StatutSignalement.VALIDE_CONTENU_RETIRE);
        assertThat(avis.getStatutModeration()).isEqualTo(StatutModerationAvis.REJETE);
        assertThat(stored[0].getStatut()).isEqualTo(StatutOutbox.EN_ATTENTE);

        // 4. Décision incohérente / répétée sur signalement déjà clôturé ou avis REJETE -> 409 Conflict
        assertThatThrownBy(() -> service.traiterSignalement(50L, SignalementDecisionRequest.builder()
                .decisionSignalement(StatutSignalement.REJETE_ABUSIF)
                .commentaire("Double décision interdite")
                .build()))
                .isInstanceOf(ConflictException.class);

        assertThatThrownBy(() -> service.deciderModerationAvis(20L,
                new ModerationDecisionRequest(StatutModerationAvis.APPROUVE, "Tenter de réapprouver un rejeté")))
                .isInstanceOf(ConflictException.class);

        // 5. Calcul des agrégats : n'inclut que APPROUVE
        when(avisRepository.findByCibleTypeAndCibleIdAndStatutModerationOrderByDatePublicationDescIdDesc(
                CibleAvis.CIRCUIT, 1L, StatutModerationAvis.APPROUVE))
                .thenReturn(List.of(
                        Avis.builder().note(5).statutModeration(StatutModerationAvis.APPROUVE).build(),
                        Avis.builder().note(4).statutModeration(StatutModerationAvis.APPROUVE).build()
                ));
        AvisResumeDto resume = service.getResumeEvaluations(CibleAvis.CIRCUIT, 1L);
        assertThat(resume.getTotalAvis()).isEqualTo(2);
        assertThat(resume.getNoteMoyenne()).isEqualTo(4.5);
    }

    @Test
    void modifierAvis_autreUtilisateur_estRefuseeBOLA403() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(9L, "TOURISTE", "intruder@uasz.sn", false, null));
        when(avisRepository.findById(20L)).thenReturn(Optional.of(
                Avis.builder().id(20L).auteurId(2L).statutModeration(StatutModerationAvis.APPROUVE).build()));

        assertThatThrownBy(() -> service.modifierAvis(20L, new AvisUpdateRequest(1, "Tentative BOLA de sabotage")))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("BOLA");
    }

    @Test
    void getStatistiques_agregeAvisEtSignalementsPourModerateur() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(3L, "GESTIONNAIRE_SITE", "awa@uasz.sn", false, null));
        when(avisRepository.findAll()).thenReturn(List.of(
                Avis.builder().id(1L).note(5).cibleType(CibleAvis.CIRCUIT).statutModeration(StatutModerationAvis.APPROUVE).build(),
                Avis.builder().id(2L).note(1).cibleType(CibleAvis.GUIDE).statutModeration(StatutModerationAvis.MASQUE).build()
        ));
        when(signalementRepository.findAll()).thenReturn(List.of(
                AvisSignalement.builder().id(10L).statut(StatutSignalement.OUVERT).build(),
                AvisSignalement.builder().id(11L).statut(StatutSignalement.VALIDE_CONTENU_RETIRE).build()
        ));

        var stats = service.getStatistiques();

        assertThat(stats.getTotalAvis()).isEqualTo(2L);
        assertThat(stats.getApprouves()).isEqualTo(1L);
        assertThat(stats.getMasques()).isEqualTo(1L);
        assertThat(stats.getNoteMoyenneApprouves()).isEqualTo(5.0);
        assertThat(stats.getSignalementsOuverts()).isEqualTo(1L);
        assertThat(stats.getSignalementsFondes()).isEqualTo(1L);
    }

    @Test
    void repondreAvis_guideResponsable_enregistreReponseAvecSucces() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(5L, "GUIDE", "moussa.guide@casamance.sn", false, null));
        Avis avis = Avis.builder()
                .id(15L)
                .auteurId(10L)
                .cibleType(CibleAvis.CIRCUIT)
                .cibleId(100L)
                .note(4)
                .commentaire("Superbe balade en pirogue")
                .statutModeration(StatutModerationAvis.APPROUVE)
                .datePublication(LocalDateTime.now())
                .build();

        when(avisRepository.findById(15L)).thenReturn(Optional.of(avis));
        when(circuitClient.getCircuitById(100L)).thenReturn(
                CircuitDto.builder().id(100L).nomCircuit("Carabane Express").guideResponsableId(5L).build());
        when(avisRepository.save(any(Avis.class))).thenAnswer(inv -> inv.getArgument(0));

        AvisDto result = service.repondreAvis(15L, new com.uasz.ms_reservation.dto.AvisReponseGuideRequest(
                "Merci pour votre confiance, ravi que la visite vous ait plu !"));

        assertThat(result.getReponseGuide()).isEqualTo("Merci pour votre confiance, ravi que la visite vous ait plu !");
        assertThat(result.getGuideRepondeurId()).isEqualTo(5L);
        assertThat(result.getGuideRepondeurNom()).isEqualTo("moussa.guide@casamance.sn");
        assertThat(result.getDateReponseGuide()).isNotNull();
    }

    @Test
    void repondreAvis_guideNonResponsable_rejeteAvecBOLA403() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(8L, "GUIDE", "autre.guide@casamance.sn", false, null));
        Avis avis = Avis.builder()
                .id(15L)
                .auteurId(10L)
                .cibleType(CibleAvis.CIRCUIT)
                .cibleId(100L)
                .statutModeration(StatutModerationAvis.APPROUVE)
                .build();

        when(avisRepository.findById(15L)).thenReturn(Optional.of(avis));
        when(circuitClient.getCircuitById(100L)).thenReturn(
                CircuitDto.builder().id(100L).nomCircuit("Carabane Express").guideResponsableId(5L).build());

        assertThatThrownBy(() -> service.repondreAvis(15L, new com.uasz.ms_reservation.dto.AvisReponseGuideRequest("Réponse non autorisée")))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("BOLA");
    }
}
