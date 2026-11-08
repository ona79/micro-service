package com.uasz.ms_notification.services;

import com.uasz.ms_notification.dto.NotificationDto;
import com.uasz.ms_notification.entities.Notification;
import com.uasz.ms_notification.entities.StatutNotification;
import com.uasz.ms_notification.exceptions.ResourceNotFoundException;
import com.uasz.ms_notification.mappers.NotificationMapper;
import com.uasz.ms_notification.repositories.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService implements INotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationMapper notificationMapper;

    @Override
    public NotificationDto envoyerNotification(NotificationDto dto) {
        Notification notification = notificationMapper.toEntity(dto);
        notification.setId(null);
        notification.setDateEnvoi(LocalDateTime.now());
        notification.setStatut(StatutNotification.ENVOYEE);
        log.info("[NOTIFICATION {}] -> {} | Sujet : {}", notification.getCanal(),
                notification.getDestinataire(), notification.getSujet());
        return notificationMapper.toDto(notificationRepository.save(notification));
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationDto> getAllNotifications() {
        return notificationRepository.findAll().stream()
                .map(notificationMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationDto getByIdNotification(Long id) {
        return notificationMapper.toDto(notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification introuvable avec l'id : " + id)));
    }

    @Override
    public void deleteNotification(Long id) {
        if (!notificationRepository.existsById(id)) {
            throw new ResourceNotFoundException("Notification introuvable avec l'id : " + id);
        }
        notificationRepository.deleteById(id);
    }
}

