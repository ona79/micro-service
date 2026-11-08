package com.uasz.ms_paiement.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequest {

    private String destinataire;
    private String sujet;
    private String contenu;
    private String canal;
    private Long reservationId;
}

