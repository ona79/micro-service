package com.uasz.ms_reservation.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Entity
@Table(name = "reservation_participant")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReservationParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Reservation reservation;

    @Column(name = "nom_complet", nullable = false, length = 150)
    private String nomComplet;

    @Column(name = "email", length = 255)
    private String email;

    @Column(name = "telephone", length = 50)
    private String telephone;

    @Column(name = "categorie", nullable = false, length = 30)
    @Builder.Default
    private String categorie = "ADULTE";
}
