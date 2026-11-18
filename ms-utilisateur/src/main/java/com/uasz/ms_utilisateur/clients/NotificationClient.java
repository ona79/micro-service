package com.uasz.ms_utilisateur.clients;

import com.uasz.ms_utilisateur.dto.NotificationRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "ms-notification", url = "${notification.url:}")
public interface NotificationClient {

    @PostMapping("/api/notifications")
    void envoyerNotification(@RequestBody NotificationRequest request);
}
