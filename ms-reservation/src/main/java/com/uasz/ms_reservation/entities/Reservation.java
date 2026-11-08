package com.uasz.ms_reservation.entities;

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
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nomClient;

    private String emailClient;

    private String telephoneClient;

    private int nombrePlaces;

    private LocalDateTime dateReservation;

    @Enumerated(EnumType.STRING)
    private TypeReservation typeReservation;

    @Enumerated(EnumType.STRING)
    private StatutReservation statut;

    private double montantTotal;

    /** Renseigné si typeReservation == CIRCUIT */
    private Long circuitId;

    /** Renseigné si typeReservation == EVENEMENT */
    private Long evenementId;
}

