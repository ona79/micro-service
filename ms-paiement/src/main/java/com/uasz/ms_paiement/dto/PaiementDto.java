package com.uasz.ms_paiement.dto;

import com.uasz.ms_paiement.entities.ModePaiement;
import com.uasz.ms_paiement.entities.StatutPaiement;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

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

    private BigDecimal montant;

    @Size(max = 10, message = "La devise ne doit pas dépasser 10 caractères")
    @Builder.Default
    private String devise = "XOF";

    @NotNull(message = "Le mode de paiement simulé (WAVE ou ORANGE_MONEY) est obligatoire")
    private ModePaiement modePaiement;

    private StatutPaiement statut;

    private LocalDateTime datePaiement;

    @Builder.Default
    private boolean estSimule = true;

    private String mentionSimulation;

    @Size(max = 30, message = "Le numéro de téléphone simulé est invalide")
    private String numeroTelephoneSimule;

    private String numeroTelephoneMasque;

    private String jetonSimulation;

    private String correlationId;

    private String idempotencyKey;

    private String motifDecision;

    private LocalDateTime dateCreation;

    private LocalDateTime dateModification;

    private LocalDateTime dateExpiration;

    private LocalDateTime dateConfirmation;

    private LocalDateTime dateRemboursement;

    private String synchroReservationStatut;

    private boolean rejoueeIdempotence;

    @Builder.Default
    private List<PaiementHistoriqueDto> historique = new ArrayList<>();

    private ReservationDto reservation;

    public PaiementDto(Long id, String referenceTransaction, Long reservationId, double montant,
                       ModePaiement modePaiement, StatutPaiement statut, LocalDateTime datePaiement,
                       ReservationDto reservation) {
        this.id = id;
        this.referenceTransaction = referenceTransaction;
        this.reservationId = reservationId;
        this.montant = BigDecimal.valueOf(montant);
        this.devise = "XOF";
        this.modePaiement = modePaiement;
        this.statut = statut;
        this.datePaiement = datePaiement;
        this.estSimule = true;
        this.reservation = reservation;
    }
}
