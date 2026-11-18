package com.uasz.ms_reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Miroir de EvenementDto exposé par ms-evenement (port 3003) */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EvenementDto {

    private Long id;
    private String nomEvenement;
    private String descriptionEvenement;
    private String typeEvenement;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private String horaires;
    private String lieu;
    private int capaciteMax;
    private BigDecimal prix;
    private String devise;
    private boolean ouvertReservation;
    private String statutEvenement;
    private Long patrimoineId;

    public EvenementDto(Long id, String nomEvenement, String descriptionEvenement, String typeEvenement,
                        LocalDateTime dateDebut, LocalDateTime dateFin, String lieu,
                        int capaciteMax, double prix, Long patrimoineId) {
        this(id, nomEvenement, descriptionEvenement, typeEvenement, dateDebut, dateFin, null, lieu,
                capaciteMax, BigDecimal.valueOf(prix), "XOF", true, "PUBLIE", patrimoineId);
    }
}
