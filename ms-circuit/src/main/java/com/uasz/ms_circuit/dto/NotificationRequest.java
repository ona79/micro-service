package com.uasz.ms_circuit.dto;

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
    private String typeEvenement;
    private String cibleType;
    private Long cibleId;
    private String correlationId;
    private String idempotencyKey;
}
