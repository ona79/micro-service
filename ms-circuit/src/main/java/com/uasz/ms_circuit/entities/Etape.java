package com.uasz.ms_circuit.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Etape {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Position de l'étape dans le circuit (1, 2, 3...) */
    private int ordre;

    /** Durée de visite de l'étape en minutes */
    private int dureeVisite;

    /** Identifiant du patrimoine dans ms-patrimoine (pas de clé étrangère : autre base) */
    private Long patrimoineId;

    @ManyToOne
    @JoinColumn(name = "circuit_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Circuit circuit;
}

