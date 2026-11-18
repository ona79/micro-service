package com.uasz.ms_utilisateur.services;

import com.uasz.ms_utilisateur.clients.NotificationClient;
import com.uasz.ms_utilisateur.dto.GuideProfilDto;
import com.uasz.ms_utilisateur.dto.GuideSelfUpdateRequest;
import com.uasz.ms_utilisateur.dto.NotificationRequest;
import com.uasz.ms_utilisateur.entities.GuideProfil;
import com.uasz.ms_utilisateur.entities.RoleUtilisateur;
import com.uasz.ms_utilisateur.entities.StatutOutbox;
import com.uasz.ms_utilisateur.entities.StatutValidationGuide;
import com.uasz.ms_utilisateur.entities.Utilisateur;
import com.uasz.ms_utilisateur.entities.UtilisateurNotificationOutbox;
import com.uasz.ms_utilisateur.exceptions.ConflictException;
import com.uasz.ms_utilisateur.exceptions.ForbiddenException;
import com.uasz.ms_utilisateur.exceptions.ResourceNotFoundException;
import com.uasz.ms_utilisateur.repositories.GuideHistoriqueValidationRepository;
import com.uasz.ms_utilisateur.repositories.GuideProfilRepository;
import com.uasz.ms_utilisateur.repositories.UtilisateurNotificationOutboxRepository;
import com.uasz.ms_utilisateur.repositories.UtilisateurRepository;
import com.uasz.ms_utilisateur.security.SecurityUserContext;
import com.uasz.ms_utilisateur.security.SecurityUserContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GuideServiceTest {

    @Mock
    private GuideProfilRepository guideProfilRepository;

    @Mock
    private GuideHistoriqueValidationRepository historiqueRepository;

    @Mock
    private UtilisateurRepository utilisateurRepository;

    @Mock
    private UtilisateurNotificationOutboxRepository outboxRepository;

    @Mock
    private NotificationClient notificationClient;

    @Mock
    private AuditSecuriteService auditSecuriteService;

    private UtilisateurNotificationOutboxRelayService outboxRelayService;
    private GuideService guideService;
    private Utilisateur guideUser;

    @BeforeEach
    void setUp() {
        outboxRelayService = new UtilisateurNotificationOutboxRelayService(outboxRepository, notificationClient, null);
        guideService = new GuideService(
                guideProfilRepository,
                historiqueRepository,
                utilisateurRepository,
                outboxRepository,
                outboxRelayService,
                auditSecuriteService
        );
        guideUser = Utilisateur.builder()
                .id(5L)
                .nom("Badji")
                .prenom("Alassane")
                .email("alassane.badji@zig.univ.sn")
                .telephone("+221773332211")
                .role(RoleUtilisateur.GUIDE)
                .actif(true)
                .build();
    }

    @AfterEach
    void cleanContext() {
        SecurityUserContextHolder.clear();
    }

    @Test
    void upsertMonProfil_tentativeAutoValidation_estRefusee403() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                5L, "GUIDE", "alassane.badji@zig.univ.sn", false, null));

        GuideSelfUpdateRequest tampered = GuideSelfUpdateRequest.builder()
                .presentationCourte("Guide local")
                .biographie("Biographie complète avec plus de vingt caractères pour valider.")
                .languesParlees("Français, Diola")
                .specialites("Écotourisme")
                .zonesIntervention("Oussouye")
                .anneesExperience(5)
                .statutValidation("VALIDE")
                .build();

        assertThatThrownBy(() -> guideService.upsertMonProfil(tampered))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("validation administrative");

        verify(guideProfilRepository, never()).save(any());
    }

    @Test
    void validerProfil_parTouristeOuConservateurOuGuideSoiMeme_estRefusee403() {
        // 1. Touriste refuse
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                2L, "TOURISTE", "moussa@uasz.sn", false, null));
        assertThatThrownBy(() -> guideService.validerProfil(1L, "Ok"))
                .isInstanceOf(ForbiddenException.class);

        // 2. Conservateur refuse
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                4L, "CONSERVATEUR", "fatou@uasz.sn", false, null));
        assertThatThrownBy(() -> guideService.validerProfil(1L, "Ok"))
                .isInstanceOf(ForbiddenException.class);

        // 3. Auto-validation même avec permission GUIDE:VALIDER refusée
        GuideProfil profil = GuideProfil.builder()
                .id(1L)
                .utilisateur(guideUser)
                .statutValidation(StatutValidationGuide.EN_ATTENTE_VALIDATION)
                .build();
        when(guideProfilRepository.findById(1L)).thenReturn(Optional.of(profil));
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                5L, "ADMINISTRATEUR", "alassane.badji@zig.univ.sn", false, null));
        assertThatThrownBy(() -> guideService.validerProfil(1L, "Auto-validation"))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("propre profil");

        verify(outboxRepository, never()).save(any());
    }

    @Test
    void cycleVieGuide_creationSoumissionValidationEtNotificationResiliente() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                5L, "GUIDE", "alassane.badji@zig.univ.sn", false, null));

        when(utilisateurRepository.findById(5L)).thenReturn(Optional.of(guideUser));
        when(guideProfilRepository.findByUtilisateurId(5L)).thenReturn(Optional.empty());
        when(guideProfilRepository.save(any(GuideProfil.class))).thenAnswer(inv -> {
            GuideProfil p = inv.getArgument(0);
            if (p.getId() == null) p.setId(10L);
            return p;
        });

        GuideProfilDto draft = guideService.upsertMonProfil(GuideSelfUpdateRequest.builder()
                .presentationCourte("Guide certifié de Basse-Casamance")
                .biographie("Spécialiste de la culture Diola et des bolongs d'Oussouye depuis huit ans.")
                .languesParlees("Français, Diola, Wolof")
                .specialites("Écotourisme, Cases à impluvium")
                .zonesIntervention("Oussouye, Carabane")
                .anneesExperience(8)
                .tarifJournalierIndicatif(new BigDecimal("25000"))
                .visibilitePublique(true) // doit être ignoré / forcé à false tant que BROUILLON
                .build());

        assertThat(draft.getStatutValidation()).isEqualTo(StatutValidationGuide.BROUILLON);
        assertThat(draft.isVisibilitePublique()).isFalse();

        // Validation par Gestionnaire de site alors que ms-notification est indisponible
        GuideProfil enAttente = GuideProfil.builder()
                .id(10L)
                .utilisateur(guideUser)
                .presentationCourte("Guide certifié")
                .biographie("Spécialiste de la culture Diola.")
                .languesParlees("Français, Diola")
                .specialites("Écotourisme")
                .zonesIntervention("Oussouye")
                .statutValidation(StatutValidationGuide.EN_ATTENTE_VALIDATION)
                .build();
        when(guideProfilRepository.findById(10L)).thenReturn(Optional.of(enAttente));

        AtomicLong outboxSeq = new AtomicLong(100L);
        UtilisateurNotificationOutbox[] storedOutbox = new UtilisateurNotificationOutbox[1];
        when(outboxRepository.save(any(UtilisateurNotificationOutbox.class))).thenAnswer(inv -> {
            UtilisateurNotificationOutbox o = inv.getArgument(0);
            if (o.getId() == null) o.setId(outboxSeq.getAndIncrement());
            storedOutbox[0] = o;
            return o;
        });
        when(outboxRepository.findByIdForUpdate(100L)).thenAnswer(inv -> Optional.ofNullable(storedOutbox[0]));

        // Simule ms-notification temporairement down lors du premier essai
        doThrow(new RuntimeException("Connection refused"))
                .when(notificationClient).envoyerNotification(any(NotificationRequest.class));

        SecurityUserContextHolder.setContext(new SecurityUserContext(
                3L, "GESTIONNAIRE_SITE", "awa.sagna@zig.univ.sn", false, null));

        GuideProfilDto validated = guideService.validerProfil(10L, "Dossier complet vérifié");

        assertThat(validated.getStatutValidation()).isEqualTo(StatutValidationGuide.VALIDE);
        assertThat(validated.isVisibilitePublique()).isTrue();
        assertThat(storedOutbox[0].getStatut()).isEqualTo(StatutOutbox.EN_ATTENTE);
        assertThat(storedOutbox[0].getTentatives()).isEqualTo(1);
    }

    @Test
    void getGuideById_nonValideOuSuspendu_masquePourPublic404EtDisponibiliteBloquee409() {
        GuideProfil suspended = GuideProfil.builder()
                .id(11L)
                .utilisateur(guideUser)
                .presentationCourte("Guide")
                .biographie("Biographie longue.")
                .languesParlees("Français")
                .specialites("Culture")
                .zonesIntervention("Ziguinchor")
                .statutValidation(StatutValidationGuide.SUSPENDU)
                .visibilitePublique(false)
                .disponible(false)
                .build();

        SecurityUserContextHolder.setContext(new SecurityUserContext(
                2L, "TOURISTE", "moussa@uasz.sn", false, null));
        when(guideProfilRepository.findById(11L)).thenReturn(Optional.of(suspended));

        assertThatThrownBy(() -> guideService.getGuideById(11L))
                .isInstanceOf(ResourceNotFoundException.class);

        SecurityUserContextHolder.setContext(new SecurityUserContext(
                5L, "GUIDE", "alassane.badji@zig.univ.sn", false, null));
        when(guideProfilRepository.findByUtilisateurId(5L)).thenReturn(Optional.of(suspended));

        assertThatThrownBy(() -> guideService.changerMaDisponibilite(true, true))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void getGuideById_publicValide_masqueDonneesSensibles() {
        GuideProfil valide = GuideProfil.builder()
                .id(1L)
                .utilisateur(guideUser)
                .presentationCourte("Guide certifié")
                .biographie("Biographie détaillée")
                .languesParlees("Français, Diola")
                .specialites("Bolongs")
                .zonesIntervention("Oussouye")
                .numeroCarteProfessionnelle("CONFIDENTIEL-99")
                .documentsJustificatifs("PIECE-PRIVEE")
                .motifDecision("Note interne admin")
                .valideParId(1L)
                .statutValidation(StatutValidationGuide.VALIDE)
                .visibilitePublique(true)
                .disponible(true)
                .dateValidation(LocalDateTime.now())
                .build();

        when(guideProfilRepository.findById(1L)).thenReturn(Optional.of(valide));
        SecurityUserContextHolder.setContext(new SecurityUserContext(null, "PUBLIC", "", false, null));

        GuideProfilDto publicDto = guideService.getGuideById(1L);
        assertThat(publicDto.getNom()).isEqualTo("Badji");
        assertThat(publicDto.getEmail()).isNull();
        assertThat(publicDto.getNumeroCarteProfessionnelle()).isNull();
        assertThat(publicDto.getDocumentsJustificatifs()).isNull();
        assertThat(publicDto.getMotifDecision()).isNull();
        assertThat(publicDto.getValideParId()).isNull();
    }

    @Test
    void getStatistiques_autoriseGestionnaireEtBloqueGuideEtCalculeRepartitions() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                5L, "GUIDE", "alassane.badji@zig.univ.sn", false, null));
        assertThatThrownBy(() -> guideService.getStatistiques())
                .isInstanceOf(ForbiddenException.class);

        SecurityUserContextHolder.setContext(new SecurityUserContext(
                3L, "GESTIONNAIRE_SITE", "awa.sagna@zig.univ.sn", false, null));
        when(guideProfilRepository.countByStatutValidation(StatutValidationGuide.BROUILLON)).thenReturn(0L);
        when(guideProfilRepository.countByStatutValidation(StatutValidationGuide.EN_ATTENTE_VALIDATION)).thenReturn(1L);
        when(guideProfilRepository.countByStatutValidation(StatutValidationGuide.VALIDE)).thenReturn(2L);
        when(guideProfilRepository.countByStatutValidation(StatutValidationGuide.REJETE)).thenReturn(0L);
        when(guideProfilRepository.countByStatutValidation(StatutValidationGuide.SUSPENDU)).thenReturn(0L);
        when(guideProfilRepository.countByStatutValidation(StatutValidationGuide.DESACTIVE)).thenReturn(0L);
        when(guideProfilRepository.countByStatutValidationAndDisponibleTrue(StatutValidationGuide.VALIDE)).thenReturn(2L);
        when(guideProfilRepository.countByStatutValidationAndVisibilitePubliqueTrue(StatutValidationGuide.VALIDE)).thenReturn(2L);
        when(guideProfilRepository.findAllAdminOrderByUpdatedDesc()).thenReturn(java.util.List.of(
                GuideProfil.builder()
                        .id(1L).utilisateur(guideUser)
                        .zonesIntervention("Ziguinchor, Cap Skirring")
                        .languesParlees("Français, Diola")
                        .statutValidation(StatutValidationGuide.VALIDE)
                        .build()
        ));

        var stats = guideService.getStatistiques();

        assertThat(stats.getValides()).isEqualTo(2L);
        assertThat(stats.getEnAttenteValidation()).isEqualTo(1L);
        assertThat(stats.getParZone()).containsEntry("Ziguinchor", 1L).containsEntry("Cap Skirring", 1L);
        assertThat(stats.getParLangue()).containsEntry("Français", 1L).containsEntry("Diola", 1L);
    }
}
