package com.uasz.ms_notification.dto;

import com.uasz.ms_notification.entities.CanalNotification;
import com.uasz.ms_notification.entities.StatutNotification;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDto {

    private Long id;

    @NotBlank(message = "Le destinataire (email ou téléphone) est obligatoire")
    private String destinataire;

    @NotBlank(message = "Le sujet est obligatoire")
    private String sujet;

    @NotBlank(message = "Le contenu du message est obligatoire")
    private String contenu;

    @NotNull(message = "Le canal (EMAIL ou SMS) est obligatoire")
    private CanalNotification canal;

    private StatutNotification statut;

    private LocalDateTime dateEnvoi;

    private Long reservationId;
}

