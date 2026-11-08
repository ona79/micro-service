package com.uasz.ms_patrimoine.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Patrimoine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nomPatrimoine;

    private String codePatrimoine;

    @Column(length = 2000)
    private String descriptionPatrimoine;

    @Column(length = 2000)
    private String historiquePatrimoine;

    private String adressePatrimoine;

    private int capacitePatrimoine;

    private float latitudePatrimoine;

    private float longitudePatrimoine;
}

