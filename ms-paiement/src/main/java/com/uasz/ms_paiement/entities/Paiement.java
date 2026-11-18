package com.uasz.ms_paiement.entities;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Paiement {

    public static final ZoneId CASAMANCE_ZONE = ZoneId.of("Africa/Dakar");
    public static final String MENTION_SIMULATION_DEFAUT = "PAIEMENT SIMULE P04 - AUCUN TRANSFERT FINANCIER REEL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long utilisateurId;

    @Column(name = "reference_transaction", nullable = false, unique = true)
    private String referenceTransaction;

    private Long reservationId;

    @Column(name = "montant", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal montant = BigDecimal.ZERO;

    @Column(name = "devise", nullable = false, length = 10)
    @Builder.Default
    private String devise = "XOF";

    @Enumerated(EnumType.STRING)
    private ModePaiement modePaiement;

    @Enumerated(EnumType.STRING)
    private StatutPaiement statut;

    private LocalDateTime datePaiement;

    @Column(name = "est_simule", nullable = false)
    @Builder.Default
    private boolean estSimule = true;

    @Column(name = "mention_simulation", nullable = false, length = 255)
    @Builder.Default
    private String mentionSimulation = MENTION_SIMULATION_DEFAUT;

    @Column(name = "numero_telephone_masque", length = 40)
    private String numeroTelephoneMasque;

    @Column(name = "jeton_simulation", length = 64)
    private String jetonSimulation;

    @Column(name = "correlation_id", length = 64)
    private String correlationId;

    @Column(name = "idempotency_key", length = 128)
    private String idempotencyKey;

    @Column(name = "motif_decision", length = 500)
    private String motifDecision;

    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_modification", nullable = false)
    private LocalDateTime dateModification;

    @Column(name = "date_expiration")
    private LocalDateTime dateExpiration;

    @Column(name = "date_confirmation")
    private LocalDateTime dateConfirmation;

    @Column(name = "date_remboursement")
    private LocalDateTime dateRemboursement;

    @Column(name = "synchro_reservation_statut", nullable = false, length = 40)
    @Builder.Default
    private String synchroReservationStatut = "NON_REQUISE";

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;

    @OneToMany(mappedBy = "paiement", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("dateTransition ASC, id ASC")
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<PaiementHistorique> historique = new ArrayList<>();

    @PrePersist
    public void onPrePersist() {
        LocalDateTime now = LocalDateTime.now(CASAMANCE_ZONE);
        this.estSimule = true;
        if (this.mentionSimulation == null || this.mentionSimulation.isBlank()) {
            this.mentionSimulation = MENTION_SIMULATION_DEFAUT;
        }
        if (this.devise == null || this.devise.isBlank()) {
            this.devise = "XOF";
        }
        if (this.montant == null) {
            this.montant = BigDecimal.ZERO;
        }
        if (this.datePaiement == null) {
            this.datePaiement = now;
        }
        if (this.dateCreation == null) {
            this.dateCreation = now;
        }
        if (this.dateModification == null) {
            this.dateModification = now;
        }
        if (this.synchroReservationStatut == null || this.synchroReservationStatut.isBlank()) {
            this.synchroReservationStatut = "NON_REQUISE";
        }
        if (this.version == null) {
            this.version = 0L;
        }
    }

    @PreUpdate
    public void onPreUpdate() {
        this.dateModification = LocalDateTime.now(CASAMANCE_ZONE);
    }
}
