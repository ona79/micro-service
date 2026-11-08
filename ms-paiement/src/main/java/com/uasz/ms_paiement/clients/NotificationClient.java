package com.uasz.ms_paiement.clients;

import com.uasz.ms_paiement.dto.NotificationRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "ms-notification", url = "${notification.url:http://localhost:3007}")
public interface NotificationClient {

    @PostMapping("/api/notifications")
    void envoyerNotification(@RequestBody NotificationRequest request);
}

