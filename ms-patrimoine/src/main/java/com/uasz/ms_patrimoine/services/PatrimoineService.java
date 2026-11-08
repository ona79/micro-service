package com.uasz.ms_patrimoine.services;

import com.uasz.ms_patrimoine.dto.PatrimoineDto;
import com.uasz.ms_patrimoine.entities.Patrimoine;
import com.uasz.ms_patrimoine.exceptions.ResourceNotFoundException;
import com.uasz.ms_patrimoine.mappers.PatrimoineMapper;
import com.uasz.ms_patrimoine.repositories.PatrimoineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PatrimoineService implements IPatrimoineService {

    private final PatrimoineRepository patrimoineRepository;
    private final PatrimoineMapper patrimoineMapper;

    @Override
    public PatrimoineDto savePatrimoine(PatrimoineDto patrimoineDto) {
        Patrimoine patrimoine = patrimoineMapper.toEntity(patrimoineDto);
        patrimoine.setId(null); // l'id est généré par la base
        return patrimoineMapper.toDto(patrimoineRepository.save(patrimoine));
    }

    @Override
    public List<PatrimoineDto> getAllPatrimoines() {
        return patrimoineRepository.findAll()
                .stream()
                .map(patrimoineMapper::toDto)
                .toList();
    }

    @Override
    public PatrimoineDto getByIdPatrimoine(Long id) {
        return patrimoineMapper.toDto(findPatrimoine(id));
    }

    @Override
    public PatrimoineDto updatePatrimoine(Long id, PatrimoineDto patrimoineDto) {
        Patrimoine patrimoine = findPatrimoine(id);
        patrimoineMapper.updateEntity(patrimoineDto, patrimoine);
        return patrimoineMapper.toDto(patrimoineRepository.save(patrimoine));
    }

    @Override
    public void deletePatrimoine(Long id) {
        if (!patrimoineRepository.existsById(id)) {
            throw new ResourceNotFoundException("Patrimoine introuvable avec l'id : " + id);
        }
        patrimoineRepository.deleteById(id);
    }

    private Patrimoine findPatrimoine(Long id) {
        return patrimoineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patrimoine introuvable avec l'id : " + id));
    }
}

