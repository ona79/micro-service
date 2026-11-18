package com.uasz.ms_reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuideDisponibiliteDto {

    private Long guideId;
    private LocalDate date;
    private String creneau;
    private boolean disponible;
    private String motif;
}
