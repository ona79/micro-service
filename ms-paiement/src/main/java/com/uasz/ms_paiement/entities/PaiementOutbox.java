package com.uasz.ms_paiement.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "paiement_outbox")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaiementOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true, length = 64)
    private String eventId;

    @Column(name = "correlation_id", length = 64)
    private String correlationId;

    @Column(name = "paiement_id", nullable = false)
    private Long paiementId;

    @Column(name = "reservation_id", nullable = false)
    private Long reservationId;

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Column(name = "reference_transaction", nullable = false, length = 100)
    private String referenceTransaction;

    @Column(name = "montant", nullable = false, precision = 12, scale = 2)
    private BigDecimal montant;

    @Column(name = "devise", nullable = false, length = 10)
    @Builder.Default
    private String devise = "XOF";

    @Column(name = "motif", length = 500)
    private String motif;

    @Column(name = "utilisateur_id")
    private Long utilisateurId;

    @Column(name = "utilisateur_role", length = 50)
    private String utilisateurRole;

    @Column(name = "utilisateur_email", length = 255)
    private String utilisateurEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 30)
    @Builder.Default
    private StatutOutbox statut = StatutOutbox.EN_ATTENTE;

    @Column(name = "tentatives", nullable = false)
    @Builder.Default
    private int tentatives = 0;

    @Column(name = "prochaine_tentative_at", nullable = false)
    private LocalDateTime prochaineTentativeAt;

    @Column(name = "dernier_erreur", length = 1000)
    private String dernierErreur;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;

    @PrePersist
    public void onPrePersist() {
        LocalDateTime now = LocalDateTime.now(Paiement.CASAMANCE_ZONE);
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.prochaineTentativeAt == null) {
            this.prochaineTentativeAt = now;
        }
        if (this.devise == null || this.devise.isBlank()) {
            this.devise = "XOF";
        }
        if (this.version == null) {
            this.version = 0L;
        }
    }
}
