package com.uasz.ms_evenement.services;

import com.uasz.ms_evenement.dto.EvenementDto;
import com.uasz.ms_evenement.dto.PageResponseDto;
import com.uasz.ms_evenement.entities.StatutEvenement;
import com.uasz.ms_evenement.entities.TypeEvenement;

import java.time.LocalDateTime;
import java.util.List;

public interface IEvenementService {

    EvenementDto saveEvenement(EvenementDto evenementDto);

    List<EvenementDto> getAllEvenements();

    List<EvenementDto> getEvenementsAVenir();

    PageResponseDto<EvenementDto> rechercherEvenements(
            String q,
            TypeEvenement type,
            String zone,
            Long patrimoineId,
            StatutEvenement statut,
            LocalDateTime dateMin,
            LocalDateTime dateMax,
            Double prixMax,
            boolean aVenirUniquement,
            boolean inclureNonPublies,
            int page,
            int size,
            String sortBy,
            String sortDir
    );

    EvenementDto getByIdEvenement(Long id);

    EvenementDto updateEvenement(Long id, EvenementDto evenementDto);

    EvenementDto soumettreEvenement(Long id);

    EvenementDto publierEvenement(Long id);

    EvenementDto annulerEvenement(Long id, String motif);

    EvenementDto terminerEvenement(Long id);

    EvenementDto archiverEvenement(Long id, String motif);

    void deleteEvenement(Long id);
}
