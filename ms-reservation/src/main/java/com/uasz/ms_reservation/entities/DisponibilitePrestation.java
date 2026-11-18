package com.uasz.ms_reservation.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "disponibilite_prestation",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_dispo_prestation",
                columnNames = {"type_prestation", "prestation_id", "date_prestation"}
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisponibilitePrestation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_prestation", nullable = false, length = 30)
    private TypeReservation typePrestation;

    @Column(name = "prestation_id", nullable = false)
    private Long prestationId;

    @Column(name = "date_prestation", nullable = false)
    private LocalDate datePrestation;

    @Column(name = "capacite_totale", nullable = false)
    private int capaciteTotale;

    @Column(name = "places_reservees", nullable = false)
    @Builder.Default
    private int placesReservees = 0;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void touch() {
        this.updatedAt = LocalDateTime.now(Reservation.CASAMANCE_ZONE);
        if (this.version == null) {
            this.version = 0L;
        }
    }
}
