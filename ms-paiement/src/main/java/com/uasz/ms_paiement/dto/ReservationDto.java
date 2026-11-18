package com.uasz.ms_paiement.dto;

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
public class ReservationDto {

    private Long id;
    private String referenceReservation;
    private Long utilisateurId;
    private String nomClient;
    private String emailClient;
    private String telephoneClient;
    private int nombrePlaces;
    private LocalDate datePrestation;
    private String creneauPrestation;
    private LocalDateTime dateReservation;
    private String typeReservation;
    private String statut;
    private BigDecimal montantTotal;
    private String devise;
    private LocalDateTime expiresAt;
    private Long circuitId;
    private Long evenementId;
    private String referencePaiement;

    public ReservationDto(Long id, String nomClient, String emailClient, String telephoneClient,
                          int nombrePlaces, LocalDateTime dateReservation, String typeReservation,
                          String statut, double montantTotal, Long circuitId, Long evenementId) {
        this.id = id;
        this.nomClient = nomClient;
        this.emailClient = emailClient;
        this.telephoneClient = telephoneClient;
        this.nombrePlaces = nombrePlaces;
        this.dateReservation = dateReservation;
        this.typeReservation = typeReservation;
        this.statut = statut;
        this.montantTotal = BigDecimal.valueOf(montantTotal);
        this.devise = "XOF";
        this.circuitId = circuitId;
        this.evenementId = evenementId;
    }
}
