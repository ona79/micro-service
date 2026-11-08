package com.uasz.ms_reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Miroir de EvenementDto exposé par ms-evenement (port 3003) */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EvenementDto {

    private Long id;
    private String nomEvenement;
    private String descriptionEvenement;
    private String typeEvenement;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private String lieu;
    private int capaciteMax;
    private double prix;
    private Long patrimoineId;
}

