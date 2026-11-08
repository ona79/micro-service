package com.uasz.ms_notification.services;

import com.uasz.ms_notification.dto.NotificationDto;

import java.util.List;

public interface INotificationService {

    NotificationDto envoyerNotification(NotificationDto notificationDto);

    List<NotificationDto> getAllNotifications();

    NotificationDto getByIdNotification(Long id);

    void deleteNotification(Long id);
}

