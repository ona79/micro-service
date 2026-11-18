package com.uasz.ms_reservation.entities;

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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reservation {

    public static final ZoneId CASAMANCE_ZONE = ZoneId.of("Africa/Dakar");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reference_reservation", nullable = false, unique = true, length = 64)
    private String referenceReservation;

    private Long utilisateurId;

    private String nomClient;

    private String emailClient;

    private String telephoneClient;

    private int nombrePlaces;

    @Column(name = "date_prestation")
    private LocalDate datePrestation;

    @Column(name = "creneau_prestation", length = 120)
    private String creneauPrestation;

    @Column(name = "commentaire", length = 1000)
    private String commentaire;

    private LocalDateTime dateReservation;

    @Enumerated(EnumType.STRING)
    private TypeReservation typeReservation;

    @Enumerated(EnumType.STRING)
    private StatutReservation statut;

    @Column(name = "prix_unitaire", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal prixUnitaire = BigDecimal.ZERO;

    @Column(name = "montant_total", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal montantTotal = BigDecimal.ZERO;

    @Column(name = "devise", nullable = false, length = 10)
    @Builder.Default
    private String devise = "XOF";

    /** Renseigné si typeReservation == CIRCUIT */
    private Long circuitId;

    /** Guide responsable affecté lors de la réservation (pour circuits) */
    @Column(name = "guide_id")
    private Long guideId;

    /** Renseigné si typeReservation == EVENEMENT */
    private Long evenementId;

    @Column(name = "reference_paiement", length = 100)
    private String referencePaiement;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation;

    @Column(name = "date_modification", nullable = false)
    private LocalDateTime dateModification;

    @Column(name = "date_confirmation")
    private LocalDateTime dateConfirmation;

    @Column(name = "date_annulation")
    private LocalDateTime dateAnnulation;

    @Column(name = "motif_statut", length = 500)
    private String motifStatut;

    @Column(name = "correlation_id", length = 64)
    private String correlationId;

    @Column(name = "idempotency_key", length = 128)
    private String idempotencyKey;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;

    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<ReservationParticipant> participants = new ArrayList<>();

    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("dateTransition ASC, id ASC")
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<ReservationHistorique> historique = new ArrayList<>();

    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("numeroBillet ASC, id ASC")
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Billet> billets = new ArrayList<>();

    @PrePersist
    public void onPrePersist() {
        LocalDateTime now = LocalDateTime.now(CASAMANCE_ZONE);
        if (this.devise == null || this.devise.isBlank()) {
            this.devise = "XOF";
        }
        if (this.prixUnitaire == null) {
            this.prixUnitaire = BigDecimal.ZERO;
        }
        if (this.montantTotal == null) {
            this.montantTotal = BigDecimal.ZERO;
        }
        if (this.dateReservation == null) {
            this.dateReservation = now;
        }
        if (this.dateCreation == null) {
            this.dateCreation = now;
        }
        if (this.dateModification == null) {
            this.dateModification = now;
        }
        if (this.version == null) {
            this.version = 0L;
        }
    }

    @PreUpdate
    public void onPreUpdate() {
        this.dateModification = LocalDateTime.now(CASAMANCE_ZONE);
    }

    public Long resolvePrestationId() {
        return typeReservation == TypeReservation.CIRCUIT ? circuitId : evenementId;
    }
}
