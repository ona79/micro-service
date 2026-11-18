package com.uasz.ms_reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {
    private String destinataire;
    private Long utilisateurId;
    private String sujet;
    private String contenu;
    private String canal;
    private Long reservationId;
    private String typeEvenement;
    private String cibleType;
    private Long cibleId;
    private String correlationId;
    private String idempotencyKey;

    public NotificationRequest(String destinataire, String sujet, String contenu, String canal, Long reservationId) {
        this.destinataire = destinataire;
        this.sujet = sujet;
        this.contenu = contenu;
        this.canal = canal;
        this.reservationId = reservationId;
    }
}
