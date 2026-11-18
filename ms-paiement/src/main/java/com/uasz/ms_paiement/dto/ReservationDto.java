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
    private Long utilisateurId;
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

    public ReservationDto(Long id, String nomClient, String emailClient, String telephoneClient,
                          int nombrePlaces, LocalDateTime dateReservation, String typeReservation,
                          String statut, double montantTotal, Long circuitId, Long evenementId) {
        this(id, null, nomClient, emailClient, telephoneClient, nombrePlaces, dateReservation,
                typeReservation, statut, montantTotal, circuitId, evenementId);
    }
}

