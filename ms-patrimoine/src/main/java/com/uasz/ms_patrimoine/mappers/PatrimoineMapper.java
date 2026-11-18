package com.uasz.ms_patrimoine.mappers;

import com.uasz.ms_patrimoine.dto.PatrimoineDto;
import com.uasz.ms_patrimoine.entities.Patrimoine;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring", nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface PatrimoineMapper {

    Patrimoine toEntity(PatrimoineDto dto);

    PatrimoineDto toDto(Patrimoine patrimoine);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "creeParId", ignore = true)
    @Mapping(target = "valideParId", ignore = true)
    @Mapping(target = "dateCreation", ignore = true)
    @Mapping(target = "datePublication", ignore = true)
    @Mapping(target = "dateArchivage", ignore = true)
    void updateEntity(PatrimoineDto dto, @MappingTarget Patrimoine patrimoine);
}
