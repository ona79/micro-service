package com.uasz.ms_notification.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String destinataire;

    @Column(name = "utilisateur_id")
    private Long utilisateurId;

    @Column(nullable = false)
    private String sujet;

    @Column(length = 2000)
    private String contenu;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CanalNotification canal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatutNotification statut;

    @Column(name = "type_evenement", nullable = false, length = 64)
    @Builder.Default
    private String typeEvenement = "GENERAL";

    @Column(name = "cible_type", length = 40)
    private String cibleType;

    @Column(name = "cible_id")
    private Long cibleId;

    @Column(name = "correlation_id", length = 100)
    private String correlationId;

    @Column(name = "idempotency_key", unique = true, length = 160)
    private String idempotencyKey;

    @Column(nullable = false)
    @Builder.Default
    private boolean lue = false;

    @Column(name = "date_lecture")
    private LocalDateTime dateLecture;

    @Column(nullable = false)
    @Builder.Default
    private int tentatives = 1;

    @Column(name = "max_tentatives", nullable = false)
    @Builder.Default
    private int maxTentatives = 3;

    @Column(name = "dernier_erreur", length = 1000)
    private String dernierErreur;

    @Column(name = "prochaine_tentative_at")
    private LocalDateTime prochaineTentativeAt;

    @Column(name = "date_envoi", nullable = false)
    private LocalDateTime dateEnvoi;

    @Column(name = "reservation_id")
    private Long reservationId;
}
