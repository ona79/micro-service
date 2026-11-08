package com.uasz.ms_evenement.mappers;

import com.uasz.ms_evenement.dto.EvenementDto;
import com.uasz.ms_evenement.entities.Evenement;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface EvenementMapper {

    Evenement toEntity(EvenementDto dto);

    @Mapping(target = "patrimoine", ignore = true)
    EvenementDto toDto(Evenement evenement);

    @Mapping(target = "id", ignore = true)
    void updateEntity(EvenementDto dto, @MappingTarget Evenement evenement);
}

