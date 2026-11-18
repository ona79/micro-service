package com.uasz.ms_notification.services;

import com.uasz.ms_notification.entities.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class NotificationDeliveryAdapter {

    public void dispatch(Notification notification, boolean simulateTransientFailure) {
        if (simulateTransientFailure) {
            throw new IllegalStateException("Canal de livraison temporairement indisponible (" + notification.getCanal() + ").");
        }
        log.info("[NOTIFICATION {}] -> user={} destinataire={} event={} corr={} sujet={}",
                notification.getCanal(),
                notification.getUtilisateurId(),
                notification.getDestinataire(),
                notification.getTypeEvenement(),
                notification.getCorrelationId(),
                notification.getSujet());
    }
}
