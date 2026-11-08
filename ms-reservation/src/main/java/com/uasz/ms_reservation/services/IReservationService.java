package com.uasz.ms_reservation.services;

import com.uasz.ms_reservation.dto.ReservationDto;

import java.util.List;

public interface IReservationService {

    ReservationDto saveReservation(ReservationDto reservationDto);

    List<ReservationDto> getAllReservations();

    ReservationDto getByIdReservation(Long id);

    ReservationDto annulerReservation(Long id);

    void deleteReservation(Long id);
}

