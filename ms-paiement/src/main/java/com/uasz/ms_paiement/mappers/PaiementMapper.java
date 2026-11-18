package com.uasz.ms_paiement.mappers;

import com.uasz.ms_paiement.dto.PaiementDto;
import com.uasz.ms_paiement.dto.PaiementHistoriqueDto;
import com.uasz.ms_paiement.entities.Paiement;
import com.uasz.ms_paiement.entities.PaiementHistorique;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface PaiementMapper {

    @Mapping(target = "historique", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "numeroTelephoneMasque", ignore = true)
    Paiement toEntity(PaiementDto dto);

    @Mapping(target = "reservation", ignore = true)
    @Mapping(target = "numeroTelephoneSimule", ignore = true)
    @Mapping(target = "rejoueeIdempotence", ignore = true)
    PaiementDto toDto(Paiement paiement);

    PaiementHistoriqueDto toHistoriqueDto(PaiementHistorique historique);

    List<PaiementHistoriqueDto> toHistoriqueDtos(List<PaiementHistorique> historique);
}
