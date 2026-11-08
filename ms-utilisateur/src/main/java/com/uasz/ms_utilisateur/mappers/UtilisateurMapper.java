package com.uasz.ms_utilisateur.mappers;

import com.uasz.ms_utilisateur.dto.UtilisateurDto;
import com.uasz.ms_utilisateur.entities.Utilisateur;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface UtilisateurMapper {

    Utilisateur toEntity(UtilisateurDto dto);

    @Mapping(target = "motDePasse", ignore = true)
    UtilisateurDto toDto(Utilisateur utilisateur);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "dateInscription", ignore = true)
    @Mapping(target = "motDePasse", ignore = true)
    void updateEntity(UtilisateurDto dto, @MappingTarget Utilisateur utilisateur);
}

