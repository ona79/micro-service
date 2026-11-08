package com.uasz.ms_paiement.mappers;

import com.uasz.ms_paiement.dto.PaiementDto;
import com.uasz.ms_paiement.entities.Paiement;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PaiementMapper {

    Paiement toEntity(PaiementDto dto);

    @Mapping(target = "reservation", ignore = true)
    PaiementDto toDto(Paiement paiement);
}

