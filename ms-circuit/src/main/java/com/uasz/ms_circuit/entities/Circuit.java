package com.uasz.ms_circuit.entities;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Circuit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nomCircuit;

    @Column(length = 2000)
    private String descriptionCircuit;

    @Enumerated(EnumType.STRING)
    private Difficulte difficulte;

    /** Durée estimée en minutes (somme des durées de visite des étapes) - calculée */
    private int dureeEstimee;

    /** Distance totale en km entre les étapes successives - calculée */
    private double distanceTotale;

    /** Nombre maximal de participants (utilisé par ms-reservation) */
    private int placesMax;

    private double prix;

    @OneToMany(mappedBy = "circuit", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordre ASC")
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Etape> etapes = new ArrayList<>();
}

