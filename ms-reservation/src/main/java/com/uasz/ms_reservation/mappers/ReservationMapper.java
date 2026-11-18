package com.uasz.ms_reservation.mappers;

import com.uasz.ms_reservation.dto.ParticipantDto;
import com.uasz.ms_reservation.dto.ReservationDto;
import com.uasz.ms_reservation.dto.ReservationHistoriqueDto;
import com.uasz.ms_reservation.entities.Reservation;
import com.uasz.ms_reservation.entities.ReservationHistorique;
import com.uasz.ms_reservation.entities.ReservationParticipant;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ReservationMapper {

    @Mapping(target = "participants", ignore = true)
    @Mapping(target = "historique", ignore = true)
    @Mapping(target = "version", ignore = true)
    Reservation toEntity(ReservationDto dto);

    @Mapping(target = "circuit", ignore = true)
    @Mapping(target = "evenement", ignore = true)
    @Mapping(target = "soumettrePourPaiement", constant = "true")
    @Mapping(target = "rejoueeIdempotence", ignore = true)
    ReservationDto toDto(Reservation reservation);

    ParticipantDto toParticipantDto(ReservationParticipant participant);

    List<ParticipantDto> toParticipantDtos(List<ReservationParticipant> participants);

    ReservationHistoriqueDto toHistoriqueDto(ReservationHistorique historique);

    List<ReservationHistoriqueDto> toHistoriqueDtos(List<ReservationHistorique> historique);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "participants", ignore = true)
    @Mapping(target = "historique", ignore = true)
    @Mapping(target = "version", ignore = true)
    void updateEntity(ReservationDto dto, @MappingTarget Reservation reservation);
}
