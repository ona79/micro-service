package com.uasz.ms_notification.controllers;

import com.uasz.ms_notification.dto.NotificationCompteurDto;
import com.uasz.ms_notification.dto.NotificationDto;
import com.uasz.ms_notification.dto.NotificationPageResponseDto;
import com.uasz.ms_notification.entities.StatutNotification;
import com.uasz.ms_notification.services.INotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final INotificationService notificationService;

    @PostMapping
    public ResponseEntity<NotificationDto> envoyer(@Valid @RequestBody NotificationDto notificationDto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(notificationService.envoyerNotification(notificationDto));
    }

    @GetMapping
    public ResponseEntity<List<NotificationDto>> getAll() {
        return ResponseEntity.ok(notificationService.getAllNotifications());
    }

    @GetMapping("/toutes")
    public ResponseEntity<NotificationPageResponseDto> getAllPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) StatutNotification statut,
            @RequestParam(required = false) String typeEvenement
    ) {
        return ResponseEntity.ok(notificationService.getAllNotificationsPaged(page, size, statut, typeEvenement));
    }

    @GetMapping("/statistiques")
    public ResponseEntity<com.uasz.ms_notification.dto.NotificationStatsDto> getStatistiques() {
        return ResponseEntity.ok(notificationService.getStatistiques());
    }

    @GetMapping("/mes-notifications")
    public ResponseEntity<NotificationPageResponseDto> getMesNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "false") boolean nonLuesOnly,
            @RequestParam(required = false) String typeEvenement
    ) {
        return ResponseEntity.ok(notificationService.getMesNotifications(page, size, nonLuesOnly, typeEvenement));
    }

    @GetMapping("/mes-notifications/compteur")
    public ResponseEntity<NotificationCompteurDto> getMonCompteurNonLues() {
        return ResponseEntity.ok(notificationService.getMonCompteurNonLues());
    }

    @PatchMapping("/{id}/lire")
    public ResponseEntity<NotificationDto> marquerCommeLue(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.marquerCommeLue(id));
    }

    @PatchMapping("/tout-lire")
    public ResponseEntity<Map<String, Object>> marquerToutesCommeLues() {
        return ResponseEntity.ok(notificationService.marquerToutesCommeLues());
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificationDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.getByIdNotification(id));
    }

    @PostMapping("/{id}/relancer")
    public ResponseEntity<NotificationDto> relancer(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.relancerNotification(id));
    }

    @PostMapping("/relancer-echecs")
    public ResponseEntity<Map<String, Object>> relancerEchecs() {
        int delivered = notificationService.forcerRepriseEchecs();
        return ResponseEntity.ok(Map.of("notificationsLivrees", delivered));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.noContent().build();
    }
}
