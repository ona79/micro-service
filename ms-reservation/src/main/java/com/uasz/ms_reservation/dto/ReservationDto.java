package com.uasz.ms_reservation.dto;

import com.uasz.ms_reservation.entities.StatutReservation;
import com.uasz.ms_reservation.entities.TypeReservation;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReservationDto {

    private Long id;

    @NotBlank(message = "Le nom du client est obligatoire")
    private String nomClient;

    @NotBlank(message = "L'email du client est obligatoire")
    @Email(message = "Le format de l'email est invalide")
    private String emailClient;

    private String telephoneClient;

    @Positive(message = "Le nombre de places réservées doit être strictement positif")
    private int nombrePlaces;

    private LocalDateTime dateReservation;

    @NotNull(message = "Le type de réservation (CIRCUIT ou EVENEMENT) est obligatoire")
    private TypeReservation typeReservation;

    private StatutReservation statut;

    private double montantTotal;

    private Long circuitId;

    private Long evenementId;

    /** Détails du circuit récupérés via OpenFeign (si typeReservation == CIRCUIT) */
    private CircuitDto circuit;

    /** Détails de l'événement récupérés via OpenFeign (si typeReservation == EVENEMENT) */
    private EvenementDto evenement;
}

