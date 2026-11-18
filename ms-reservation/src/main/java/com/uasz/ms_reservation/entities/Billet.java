package com.uasz.ms_reservation.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;

@Entity
@Table(name = "billet")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Billet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Reservation reservation;

    @Column(name = "numero_billet", nullable = false, unique = true, length = 64)
    private String numeroBillet;

    @Column(name = "token_qr", nullable = false, unique = true, length = 128)
    private String tokenQr;

    @Column(name = "nom_beneficiaire", length = 150)
    private String nomBeneficiaire;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false, length = 30)
    @Builder.Default
    private StatutBillet statut = StatutBillet.VALIDE;

    @Column(name = "date_utilisation")
    private LocalDateTime dateUtilisation;

    @Column(name = "valide_par", length = 100)
    private String validePar;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onPrePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now(Reservation.CASAMANCE_ZONE);
        }
        if (this.statut == null) {
            this.statut = StatutBillet.VALIDE;
        }
    }
}
