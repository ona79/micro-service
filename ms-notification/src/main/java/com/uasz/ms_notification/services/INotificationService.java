package com.uasz.ms_notification.services;

import com.uasz.ms_notification.dto.NotificationCompteurDto;
import com.uasz.ms_notification.dto.NotificationDto;
import com.uasz.ms_notification.dto.NotificationPageResponseDto;
import com.uasz.ms_notification.dto.NotificationStatsDto;
import com.uasz.ms_notification.entities.StatutNotification;

import java.util.List;
import java.util.Map;

public interface INotificationService {

    NotificationDto envoyerNotification(NotificationDto dto);

    List<NotificationDto> getAllNotifications();

    NotificationPageResponseDto getAllNotificationsPaged(int page, int size, StatutNotification statut, String typeEvenement);

    NotificationStatsDto getStatistiques();

    NotificationPageResponseDto getMesNotifications(int page, int size, boolean nonLuesOnly, String typeEvenement);

    NotificationCompteurDto getMonCompteurNonLues();

    NotificationDto marquerCommeLue(Long id);

    Map<String, Object> marquerToutesCommeLues();

    NotificationDto getByIdNotification(Long id);

    NotificationDto relancerNotification(Long id);

    int relayerNotificationsEnAttente();

    int forcerRepriseEchecs();

    void deleteNotification(Long id);
}
