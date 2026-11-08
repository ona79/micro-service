package com.uasz.ms_notification.repositories;

import com.uasz.ms_notification.entities.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByReservationId(Long reservationId);
}

