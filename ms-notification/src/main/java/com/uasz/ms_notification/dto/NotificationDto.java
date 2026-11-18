package com.uasz.ms_notification.dto;

import com.uasz.ms_notification.entities.CanalNotification;
import com.uasz.ms_notification.entities.StatutNotification;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDto {

    private Long id;

    @NotBlank(message = "Le destinataire (email ou téléphone) est obligatoire")
    private String destinataire;

    private Long utilisateurId;

    @NotBlank(message = "Le sujet est obligatoire")
    private String sujet;

    @NotBlank(message = "Le contenu du message est obligatoire")
    @Size(max = 2000, message = "Le contenu du message ne doit pas dépasser 2000 caractères")
    private String contenu;

    @NotNull(message = "Le canal (EMAIL, SMS ou IN_APP) est obligatoire")
    private CanalNotification canal;

    private StatutNotification statut;

    private String typeEvenement;

    private String cibleType;

    private Long cibleId;

    private String correlationId;

    @Size(max = 160, message = "La clé d'idempotence ne doit pas dépasser 160 caractères")
    private String idempotencyKey;

    private boolean lue;

    private LocalDateTime dateLecture;

    private int tentatives;

    private int maxTentatives;

    private String dernierErreur;

    private LocalDateTime prochaineTentativeAt;

    private LocalDateTime dateEnvoi;

    private Long reservationId;

    private Boolean simulerEchecTemporaire;

    public NotificationDto(String destinataire, String sujet, String contenu, CanalNotification canal, Long reservationId) {
        this.destinataire = destinataire;
        this.sujet = sujet;
        this.contenu = contenu;
        this.canal = canal;
        this.reservationId = reservationId;
    }
}
