package com.uasz.ms_patrimoine.services;

import com.uasz.ms_patrimoine.dto.PageResponseDto;
import com.uasz.ms_patrimoine.dto.PatrimoineDto;
import com.uasz.ms_patrimoine.entities.CategoriePatrimoine;
import com.uasz.ms_patrimoine.entities.StatutPublication;
import com.uasz.ms_patrimoine.entities.ZoneCasamance;

import java.util.List;

public interface IPatrimoineService {

    PatrimoineDto savePatrimoine(PatrimoineDto patrimoineDto);

    List<PatrimoineDto> getAllPatrimoines();

    PageResponseDto<PatrimoineDto> rechercherPatrimoines(
            String q,
            CategoriePatrimoine categorie,
            ZoneCasamance zone,
            String localite,
            StatutPublication statut,
            Integer capaciteMin,
            Double tarifMax,
            boolean inclureNonPublies,
            int page,
            int size,
            String sortBy,
            String sortDir
    );

    PatrimoineDto getByIdPatrimoine(Long id);

    PatrimoineDto updatePatrimoine(Long id, PatrimoineDto patrimoineDto);

    PatrimoineDto soumettrePatrimoine(Long id);

    PatrimoineDto publierPatrimoine(Long id);

    PatrimoineDto archiverPatrimoine(Long id, String motif);

    void deletePatrimoine(Long id);
}
