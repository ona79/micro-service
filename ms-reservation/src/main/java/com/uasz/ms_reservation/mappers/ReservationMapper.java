package com.uasz.ms_reservation.mappers;

import com.uasz.ms_reservation.dto.ReservationDto;
import com.uasz.ms_reservation.entities.Reservation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ReservationMapper {

    Reservation toEntity(ReservationDto dto);

    @Mapping(target = "circuit", ignore = true)
    @Mapping(target = "evenement", ignore = true)
    ReservationDto toDto(Reservation reservation);

    @Mapping(target = "id", ignore = true)
    void updateEntity(ReservationDto dto, @MappingTarget Reservation reservation);
}

