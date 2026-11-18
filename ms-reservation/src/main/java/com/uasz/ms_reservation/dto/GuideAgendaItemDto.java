package com.uasz.ms_reservation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuideAgendaItemDto {

    private LocalDate date;
    private String creneau;
    private Long circuitId;
    private String nomCircuit;
    private int placesOccupees;
    private int placesMax;
    private int nombreReservations;
    private boolean conflit;

    @Builder.Default
    private List<ReservationDto> reservations = new ArrayList<>();
}
