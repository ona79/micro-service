package com.uasz.ms_reservation.dto;

import com.uasz.ms_reservation.entities.CibleAvis;
import com.uasz.ms_reservation.entities.StatutModerationAvis;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvisDto {
    private Long id;
    private Long auteurId;
    private String auteurNom;
    private CibleAvis cibleType;
    private Long cibleId;
    private String cibleNom;
    private Long reservationId;
    private int note;
    private String commentaire;
    private boolean experienceVerifiee;
    private StatutModerationAvis statutModeration;
    private String motifModeration;
    private Long modereParId;
    private LocalDateTime datePublication;
    private LocalDateTime dateModification;
    private LocalDateTime dateModeration;
}
