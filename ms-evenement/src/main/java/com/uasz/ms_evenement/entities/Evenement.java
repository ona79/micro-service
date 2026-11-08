package com.uasz.ms_evenement.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Evenement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nomEvenement;

    @Column(length = 2000)
    private String descriptionEvenement;

    @Enumerated(EnumType.STRING)
    private TypeEvenement typeEvenement;

    private LocalDateTime dateDebut;

    private LocalDateTime dateFin;

    private String lieu;

    private int capaciteMax;

    private double prix;

    /** Identifiant du patrimoine hébergeant l'événement (dans ms-patrimoine) */
    private Long patrimoineId;
}

