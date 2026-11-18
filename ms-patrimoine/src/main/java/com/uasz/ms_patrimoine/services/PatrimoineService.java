package com.uasz.ms_patrimoine.services;

import com.uasz.ms_patrimoine.dto.PatrimoineDto;
import com.uasz.ms_patrimoine.entities.Patrimoine;
import com.uasz.ms_patrimoine.exceptions.ForbiddenException;
import com.uasz.ms_patrimoine.exceptions.ResourceNotFoundException;
import com.uasz.ms_patrimoine.exceptions.UnauthorizedException;
import com.uasz.ms_patrimoine.mappers.PatrimoineMapper;
import com.uasz.ms_patrimoine.repositories.PatrimoineRepository;
import com.uasz.ms_patrimoine.security.SecurityUserContext;
import com.uasz.ms_patrimoine.security.SecurityUserContextHolder;
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
        requirePermission("PATRIMOINE:CREER");
        Patrimoine patrimoine = patrimoineMapper.toEntity(patrimoineDto);
        patrimoine.setId(null);
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
        requirePermission("PATRIMOINE:MODIFIER");
        Patrimoine patrimoine = findPatrimoine(id);
        patrimoineMapper.updateEntity(patrimoineDto, patrimoine);
        return patrimoineMapper.toDto(patrimoineRepository.save(patrimoine));
    }

    @Override
    public void deletePatrimoine(Long id) {
        requirePermission("PATRIMOINE:SUPPRIMER");
        if (!patrimoineRepository.existsById(id)) {
            throw new ResourceNotFoundException("Patrimoine introuvable avec l'id : " + id);
        }
        patrimoineRepository.deleteById(id);
    }

    private void requirePermission(String permission) {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        if (caller == null || caller.userId() == null) {
            throw new UnauthorizedException("Authentification requise pour modifier le patrimoine.");
        }
        if (caller.isServiceCall()) {
            throw new ForbiddenException("Accès interdit : un appel de service ne peut pas modifier le patrimoine.");
        }
        if (!caller.hasPermission(permission)) {
            throw new ForbiddenException("Accès interdit : votre rôle (" + caller.role() + ") ne possède pas la permission " + permission + ".");
        }
    }

    private Patrimoine findPatrimoine(Long id) {
        return patrimoineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patrimoine introuvable avec l'id : " + id));
    }
}
