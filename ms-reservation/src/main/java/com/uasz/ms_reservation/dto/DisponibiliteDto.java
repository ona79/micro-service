package com.uasz.ms_reservation.dto;

import com.uasz.ms_reservation.entities.TypeReservation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DisponibiliteDto {
    private TypeReservation typePrestation;
    private Long prestationId;
    private String nomPrestation;
    private LocalDate datePrestation;
    private String statutPrestation;
    private boolean ouvertReservation;
    private boolean reservable;
    private boolean capaciteLimitee;
    private int capaciteTotale;
    private int placesReservees;
    private Integer placesDisponibles;
    private BigDecimal prixUnitaire;
    private String devise;
    private String motifIndisponibilite;
}
