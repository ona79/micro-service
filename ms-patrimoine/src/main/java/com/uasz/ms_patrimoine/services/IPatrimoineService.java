package com.uasz.ms_patrimoine.services;

import com.uasz.ms_patrimoine.dto.PatrimoineDto;

import java.util.List;

public interface IPatrimoineService {

    PatrimoineDto savePatrimoine(PatrimoineDto patrimoineDto);

    List<PatrimoineDto> getAllPatrimoines();

    PatrimoineDto getByIdPatrimoine(Long id);

    PatrimoineDto updatePatrimoine(Long id, PatrimoineDto patrimoineDto);

    void deletePatrimoine(Long id);
}

