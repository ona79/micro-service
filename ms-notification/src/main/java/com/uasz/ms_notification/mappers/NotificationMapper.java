package com.uasz.ms_notification.mappers;

import com.uasz.ms_notification.dto.NotificationDto;
import com.uasz.ms_notification.entities.Notification;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface NotificationMapper {

    Notification toEntity(NotificationDto dto);

    NotificationDto toDto(Notification notification);
}

