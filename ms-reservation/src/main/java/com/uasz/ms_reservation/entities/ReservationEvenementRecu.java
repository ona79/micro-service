package com.uasz.ms_reservation.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "reservation_evenement_recu")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReservationEvenementRecu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true, length = 64)
    private String eventId;

    @Column(name = "reservation_id", nullable = false)
    private Long reservationId;

    @Column(name = "type_evenement", nullable = false, length = 50)
    private String typeEvenement;

    @Column(name = "reference_transaction", length = 100)
    private String referenceTransaction;

    @Column(name = "date_reception", nullable = false)
    private LocalDateTime dateReception;

    @PrePersist
    public void onPrePersist() {
        if (this.dateReception == null) {
            this.dateReception = LocalDateTime.now(Reservation.CASAMANCE_ZONE);
        }
    }
}
