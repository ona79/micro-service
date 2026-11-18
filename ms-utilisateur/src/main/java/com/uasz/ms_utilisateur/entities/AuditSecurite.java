package com.uasz.ms_utilisateur.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "audit_securite")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditSecurite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "utilisateur_id")
    private Long utilisateurId;

    @Column(length = 255)
    private String email;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(nullable = false, length = 20)
    private String status;
}
