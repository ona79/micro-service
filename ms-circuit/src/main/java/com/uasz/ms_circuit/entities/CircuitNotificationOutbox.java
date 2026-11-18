package com.uasz.ms_circuit.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "circuit_notification_outbox")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CircuitNotificationOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true, length = 80)
    private String eventId;

    @Column(name = "correlation_id", nullable = false, length = 100)
    private String correlationId;

    @Column(name = "utilisateur_id", nullable = false)
    private Long utilisateurId;

    @Column(nullable = false, length = 255)
    private String destinataire;

    @Column(nullable = false, length = 255)
    private String sujet;

    @Column(nullable = false, length = 2000)
    private String contenu;

    @Column(name = "type_evenement", nullable = false, length = 64)
    private String typeEvenement;

    @Column(name = "cible_type", nullable = false, length = 40)
    private String cibleType;

    @Column(name = "cible_id", nullable = false)
    private Long cibleId;

    @Column(name = "idempotency_key", nullable = false, length = 160)
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private StatutOutbox statut = StatutOutbox.EN_ATTENTE;

    @Column(nullable = false)
    @Builder.Default
    private int tentatives = 0;

    @Column(name = "prochaine_tentative_at", nullable = false)
    private LocalDateTime prochaineTentativeAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "dernier_erreur", length = 1000)
    private String dernierErreur;
}
