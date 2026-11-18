package com.uasz.ms_reservation.dto;

import com.uasz.ms_reservation.entities.StatutBillet;
import com.uasz.ms_reservation.entities.TypeReservation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BilletDto {
    private Long id;
    private Long reservationId;
    private String referenceReservation;
    private String numeroBillet;
    private String tokenQr;
    private String nomBeneficiaire;
    private StatutBillet statut;
    private LocalDateTime dateUtilisation;
    private String validePar;
    private LocalDateTime createdAt;

    // Contexte prestation et client pour affichage et scan
    private TypeReservation typeReservation;
    private Long prestationId;
    private String nomPrestation;
    private LocalDate datePrestation;
    private String creneauPrestation;
    private BigDecimal prixUnitaire;
    private String devise;
    private String nomClient;
    private String emailClient;
    private String telephoneClient;
}
