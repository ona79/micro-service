package com.uasz.ms_paiement.dto;

import com.uasz.ms_paiement.entities.ModePaiement;
import com.uasz.ms_paiement.entities.StatutPaiement;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaiementDto {

    private Long id;

    private String referenceTransaction;

    @NotNull(message = "L'identifiant de la réservation est obligatoire")
    private Long reservationId;

    private double montant;

    @NotNull(message = "Le mode de paiement (CARTE_BANCAIRE, ORANGE_MONEY, WAVE, ESPECES) est obligatoire")
    private ModePaiement modePaiement;

    private StatutPaiement statut;

    private LocalDateTime datePaiement;

    private ReservationDto reservation;
}

