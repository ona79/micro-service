package com.uasz.ms_paiement.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReservationDto {

    private Long id;
    private String nomClient;
    private String emailClient;
    private String telephoneClient;
    private int nombrePlaces;
    private LocalDateTime dateReservation;
    private String typeReservation;
    private String statut;
    private double montantTotal;
    private Long circuitId;
    private Long evenementId;
}

