package com.uasz.ms_evenement.services;

import com.uasz.ms_evenement.dto.EvenementDto;

import java.util.List;

public interface IEvenementService {

    EvenementDto saveEvenement(EvenementDto evenementDto);

    List<EvenementDto> getAllEvenements();

    EvenementDto getByIdEvenement(Long id);

    EvenementDto updateEvenement(Long id, EvenementDto evenementDto);

    void deleteEvenement(Long id);
}

