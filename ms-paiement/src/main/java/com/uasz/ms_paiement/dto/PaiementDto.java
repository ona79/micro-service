package com.uasz.ms_paiement.dto;

import com.uasz.ms_paiement.entities.ModePaiement;
import com.uasz.ms_paiement.entities.StatutPaiement;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaiementDto {

    private Long id;

    private Long utilisateurId;

    private String referenceTransaction;

    @NotNull(message = "L'identifiant de la réservation est obligatoire")
    private Long reservationId;

    private double montant;

    @NotNull(message = "Le mode de paiement (CARTE_BANCAIRE, ORANGE_MONEY, WAVE, ESPECES) est obligatoire")
    private ModePaiement modePaiement;

    private StatutPaiement statut;

    private LocalDateTime datePaiement;

    private ReservationDto reservation;

    public PaiementDto(Long id, String referenceTransaction, Long reservationId, double montant,
                       ModePaiement modePaiement, StatutPaiement statut, LocalDateTime datePaiement,
                       ReservationDto reservation) {
        this(id, null, referenceTransaction, reservationId, montant, modePaiement, statut, datePaiement, reservation);
    }
}

