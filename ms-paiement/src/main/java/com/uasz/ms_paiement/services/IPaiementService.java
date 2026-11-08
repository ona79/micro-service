package com.uasz.ms_paiement.services;

import com.uasz.ms_paiement.dto.PaiementDto;

import java.util.List;

public interface IPaiementService {

    PaiementDto effectuerPaiement(PaiementDto paiementDto);

    List<PaiementDto> getAllPaiements();

    PaiementDto getByIdPaiement(Long id);
}

