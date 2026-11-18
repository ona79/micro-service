package com.uasz.ms_evenement.mappers;

import com.uasz.ms_evenement.dto.EvenementDto;
import com.uasz.ms_evenement.entities.Evenement;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface EvenementMapper {

    Evenement toEntity(EvenementDto dto);

    @Mapping(target = "patrimoine", ignore = true)
    EvenementDto toDto(Evenement evenement);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "creeParId", ignore = true)
    @Mapping(target = "valideParId", ignore = true)
    @Mapping(target = "dateCreation", ignore = true)
    @Mapping(target = "datePublication", ignore = true)
    void updateEntity(EvenementDto dto, @MappingTarget Evenement evenement);
}
