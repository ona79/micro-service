package com.uasz.ms_patrimoine.mappers;

import com.uasz.ms_patrimoine.dto.PatrimoineDto;
import com.uasz.ms_patrimoine.entities.Patrimoine;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface PatrimoineMapper {

    Patrimoine toEntity(PatrimoineDto dto);

    PatrimoineDto toDto(Patrimoine patrimoine);

    @Mapping(target = "id", ignore = true)
    void updateEntity(PatrimoineDto dto, @MappingTarget Patrimoine patrimoine);
}

