package com.uasz.ms_notification.services;

import com.uasz.ms_notification.dto.NotificationCompteurDto;
import com.uasz.ms_notification.dto.NotificationDto;
import com.uasz.ms_notification.dto.NotificationPageResponseDto;
import com.uasz.ms_notification.entities.CanalNotification;
import com.uasz.ms_notification.entities.Notification;
import com.uasz.ms_notification.entities.StatutNotification;
import com.uasz.ms_notification.exceptions.ForbiddenException;
import com.uasz.ms_notification.mappers.NotificationMapper;
import com.uasz.ms_notification.mappers.NotificationMapperImpl;
import com.uasz.ms_notification.repositories.NotificationRepository;
import com.uasz.ms_notification.security.SecurityUserContext;
import com.uasz.ms_notification.security.SecurityUserContextHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    private final NotificationMapper mapper = new NotificationMapperImpl();

    @AfterEach
    void clearCtx() {
        SecurityUserContextHolder.clear();
    }

    @Test
    void envoyerNotification_avecCleIdempotenceExistante_retourneExistanteSansDoublon() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                2L, "TOURISTE", "moussa@uasz.sn", true, "ms-reservation"));

        NotificationService service = new NotificationService(notificationRepository, mapper);
        Notification existing = Notification.builder()
                .id(42L)
                .utilisateurId(2L)
                .destinataire("moussa@uasz.sn")
                .sujet("Confirmation")
                .contenu("Confirmée")
                .canal(CanalNotification.EMAIL)
                .statut(StatutNotification.ENVOYEE)
                .typeEvenement("RESERVATION_CONFIRMEE")
                .idempotencyKey("RES-42-CONFIRMEE")
                .correlationId("CORR-1")
                .dateEnvoi(LocalDateTime.now())
                .build();

        when(notificationRepository.findByIdempotencyKey("RES-42-CONFIRMEE")).thenReturn(Optional.of(existing));

        NotificationDto dto = NotificationDto.builder()
                .destinataire("moussa@uasz.sn")
                .utilisateurId(2L)
                .sujet("Confirmation")
                .contenu("Confirmée")
                .canal(CanalNotification.EMAIL)
                .idempotencyKey("RES-42-CONFIRMEE")
                .build();

        NotificationDto result = service.envoyerNotification(dto);

        assertThat(result.getId()).isEqualTo(42L);
        verify(notificationRepository, never()).saveAndFlush(any());
    }

    @Test
    void envoyerNotification_parTouristeDirect_estRefusee403() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                2L, "TOURISTE", "moussa@uasz.sn", false, null));

        NotificationService service = new NotificationService(notificationRepository, mapper);
        NotificationDto dto = NotificationDto.builder()
                .destinataire("autre@uasz.sn")
                .sujet("Spam")
                .contenu("Message")
                .canal(CanalNotification.EMAIL)
                .build();

        assertThatThrownBy(() -> service.envoyerNotification(dto))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("seul un service métier autorisé");
    }

    @Test
    void marquerCommeLue_autreUtilisateur_estRefuseeBOLA403() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                2L, "TOURISTE", "moussa@uasz.sn", false, null));

        NotificationService service = new NotificationService(notificationRepository, mapper);
        Notification notifAutre = Notification.builder()
                .id(77L)
                .utilisateurId(5L)
                .destinataire("guide@uasz.sn")
                .sujet("Validation guide")
                .contenu("Validé")
                .canal(CanalNotification.IN_APP)
                .statut(StatutNotification.ENVOYEE)
                .dateEnvoi(LocalDateTime.now())
                .build();
        when(notificationRepository.findById(77L)).thenReturn(Optional.of(notifAutre));

        assertThatThrownBy(() -> service.marquerCommeLue(77L))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("BOLA");
    }

    @Test
    void envoyerNotification_echecTemporairePuisReprise_passeAEnvoyee() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                5L, "GUIDE", "guide@uasz.sn", true, "ms-utilisateur"));

        NotificationService service = new NotificationService(notificationRepository, mapper);
        when(notificationRepository.saveAndFlush(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setId(101L);
            return n;
        });

        NotificationDto dto = NotificationDto.builder()
                .utilisateurId(5L)
                .destinataire("guide@uasz.sn")
                .sujet("Profil guide validé")
                .contenu("Félicitations")
                .canal(CanalNotification.EMAIL)
                .typeEvenement("GUIDE_PROFILE_VALIDE")
                .correlationId("CORR-GUIDE-5")
                .simulerEchecTemporaire(true)
                .build();

        NotificationDto failedFirst = service.envoyerNotification(dto);
        assertThat(failedFirst.getStatut()).isEqualTo(StatutNotification.ECHEC_TEMPORAIRE);
        assertThat(failedFirst.getTentatives()).isEqualTo(1);
        assertThat(failedFirst.getProchaineTentativeAt()).isNotNull();

        // Bascule admin pour relancer
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                1L, "ADMINISTRATEUR", "admin@uasz.sn", false, null));
        Notification persisted = Notification.builder()
                .id(101L)
                .utilisateurId(5L)
                .destinataire("guide@uasz.sn")
                .sujet("Profil guide validé")
                .contenu("Félicitations")
                .canal(CanalNotification.EMAIL)
                .statut(StatutNotification.ECHEC_TEMPORAIRE)
                .typeEvenement("GUIDE_PROFILE_VALIDE")
                .correlationId("CORR-GUIDE-5")
                .tentatives(1)
                .maxTentatives(3)
                .dateEnvoi(LocalDateTime.now())
                .build();
        when(notificationRepository.findById(101L)).thenReturn(Optional.of(persisted));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> inv.getArgument(0));

        NotificationDto recovered = service.relancerNotification(101L);
        assertThat(recovered.getStatut()).isEqualTo(StatutNotification.ENVOYEE);
        assertThat(recovered.getTentatives()).isEqualTo(2);
        assertThat(recovered.getDernierErreur()).isNull();
    }

    @Test
    void getMesNotificationsEtCompteur_retournePaginationEtNonLues() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(
                2L, "TOURISTE", "moussa@uasz.sn", false, null));

        NotificationService service = new NotificationService(notificationRepository, mapper);
        Notification n = Notification.builder()
                .id(1L)
                .utilisateurId(2L)
                .destinataire("moussa@uasz.sn")
                .sujet("Sujet")
                .contenu("Contenu")
                .canal(CanalNotification.EMAIL)
                .statut(StatutNotification.ENVOYEE)
                .lue(false)
                .dateEnvoi(LocalDateTime.now())
                .build();
        when(notificationRepository.findOwnedNotifications(eq(2L), eq("moussa@uasz.sn"), eq(false), eq(null), any()))
                .thenReturn(new PageImpl<>(List.of(n), PageRequest.of(0, 10), 1));
        when(notificationRepository.countUnreadOwned(2L, "moussa@uasz.sn")).thenReturn(1L);

        NotificationPageResponseDto page = service.getMesNotifications(0, 10, false, null);
        NotificationCompteurDto compteur = service.getMonCompteurNonLues();

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getUnreadCount()).isEqualTo(1);
        assertThat(compteur.getUnreadCount()).isEqualTo(1);
    }
}
