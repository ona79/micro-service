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

    private String destinataire;

    private String sujet;

    @Column(length = 2000)
    private String contenu;

    @Enumerated(EnumType.STRING)
    private CanalNotification canal;

    @Enumerated(EnumType.STRING)
    private StatutNotification statut;

    private LocalDateTime dateEnvoi;

    private Long reservationId;
}

