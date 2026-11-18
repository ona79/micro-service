package com.uasz.ms_circuit.mappers;

import com.uasz.ms_circuit.dto.CircuitDto;
import com.uasz.ms_circuit.dto.EtapeDto;
import com.uasz.ms_circuit.entities.Circuit;
import com.uasz.ms_circuit.entities.Etape;
import org.mapstruct.AfterMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

// disableBuilder : MapStruct utilise les setters, ce qui permet d'exécuter @AfterMapping sur l'entité
@Mapper(
        componentModel = "spring",
        builder = @Builder(disableBuilder = true),
        nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE
)
public interface CircuitMapper {

    CircuitDto toDto(Circuit circuit);

    @Mapping(target = "patrimoine", ignore = true)
    EtapeDto toDto(Etape etape);

    Circuit toEntity(CircuitDto dto);

    @Mapping(target = "circuit", ignore = true)
    Etape toEntity(EtapeDto dto);

    /** Met à jour les champs simples du circuit (les étapes sont gérées par le service) */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "etapes", ignore = true)
    @Mapping(target = "creeParId", ignore = true)
    @Mapping(target = "valideParId", ignore = true)
    @Mapping(target = "dateCreation", ignore = true)
    @Mapping(target = "datePublication", ignore = true)
    @Mapping(target = "dateArchivage", ignore = true)
    void updateEntity(CircuitDto dto, @MappingTarget Circuit circuit);

    /** Renseigne la relation inverse Etape -> Circuit après le mapping */
    @AfterMapping
    default void lierEtapes(@MappingTarget Circuit circuit) {
        if (circuit.getEtapes() != null) {
            circuit.getEtapes().forEach(etape -> etape.setCircuit(circuit));
        }
    }
}
