package com.uasz.ms_reservation.dto;

import com.uasz.ms_reservation.entities.StatutReservation;
import com.uasz.ms_reservation.entities.TypeReservation;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReservationDto {

    private Long id;

    private String referenceReservation;

    private Long utilisateurId;

    @NotBlank(message = "Le nom du client est obligatoire")
    private String nomClient;

    @NotBlank(message = "L'email du client est obligatoire")
    @Email(message = "Le format de l'email est invalide")
    private String emailClient;

    private String telephoneClient;

    @Positive(message = "Le nombre de places réservées doit être strictement positif")
    private int nombrePlaces;

    private LocalDate datePrestation;

    @Size(max = 120)
    private String creneauPrestation;

    @Size(max = 1000)
    private String commentaire;

    private LocalDateTime dateReservation;

    @NotNull(message = "Le type de réservation (CIRCUIT ou EVENEMENT) est obligatoire")
    private TypeReservation typeReservation;

    private StatutReservation statut;

    private BigDecimal prixUnitaire;

    private BigDecimal montantTotal;

    @Builder.Default
    private String devise = "XOF";

    private Long circuitId;

    private Long guideId;

    private Long evenementId;

    private String referencePaiement;

    private LocalDateTime expiresAt;

    private LocalDateTime dateCreation;

    private LocalDateTime dateModification;

    private LocalDateTime dateConfirmation;

    private LocalDateTime dateAnnulation;

    private String motifStatut;

    private String correlationId;

    private String idempotencyKey;

    @Builder.Default
    private boolean soumettrePourPaiement = true;

    private boolean rejoueeIdempotence;

    @Builder.Default
    private List<@Valid ParticipantDto> participants = new ArrayList<>();

    @Builder.Default
    private List<ReservationHistoriqueDto> historique = new ArrayList<>();

    /** Détails du circuit récupérés via OpenFeign (si typeReservation == CIRCUIT) */
    private CircuitDto circuit;

    /** Détails de l'événement récupérés via OpenFeign (si typeReservation == EVENEMENT) */
    private EvenementDto evenement;

    public ReservationDto(Long id, String nomClient, String emailClient, String telephoneClient,
                          int nombrePlaces, LocalDateTime dateReservation, TypeReservation typeReservation,
                          StatutReservation statut, double montantTotal, Long circuitId, Long evenementId,
                          CircuitDto circuit, EvenementDto evenement) {
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
        this.circuit = circuit;
        this.evenement = evenement;
        this.soumettrePourPaiement = true;
    }
}
