package com.uasz.ms_evenement.services;

import com.uasz.ms_evenement.clients.PatrimoineClient;
import com.uasz.ms_evenement.dto.EvenementDto;
import com.uasz.ms_evenement.dto.PatrimoineDto;
import com.uasz.ms_evenement.entities.Evenement;
import com.uasz.ms_evenement.exceptions.BadRequestException;
import com.uasz.ms_evenement.exceptions.ResourceNotFoundException;
import com.uasz.ms_evenement.exceptions.ServiceIndisponibleException;
import com.uasz.ms_evenement.mappers.EvenementMapper;
import com.uasz.ms_evenement.repositories.EvenementRepository;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class EvenementService implements IEvenementService {

    private final EvenementRepository evenementRepository;
    private final EvenementMapper evenementMapper;
    private final PatrimoineClient patrimoineClient;

    @Override
    public EvenementDto saveEvenement(EvenementDto evenementDto) {
        PatrimoineDto patrimoine = validerEvenementEtRecupererPatrimoine(evenementDto);
        Evenement evenement = evenementMapper.toEntity(evenementDto);
        evenement.setId(null);
        if (evenement.getLieu() == null || evenement.getLieu().isBlank()) {
            evenement.setLieu(patrimoine.getAdressePatrimoine());
        }
        EvenementDto saved = evenementMapper.toDto(evenementRepository.save(evenement));
        saved.setPatrimoine(patrimoine);
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public List<EvenementDto> getAllEvenements() {
        return evenementRepository.findAll().stream()
                .map(evenementMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public EvenementDto getByIdEvenement(Long id) {
        Evenement evenement = findEvenement(id);
        EvenementDto dto = evenementMapper.toDto(evenement);
        try {
            dto.setPatrimoine(patrimoineClient.getPatrimoineById(evenement.getPatrimoineId()));
        } catch (FeignException ex) {
            log.warn("Impossible d'enrichir l'événement {} avec le patrimoine {} : {}",
                    id, evenement.getPatrimoineId(), ex.getMessage());
        }
        return dto;
    }

    @Override
    public EvenementDto updateEvenement(Long id, EvenementDto evenementDto) {
        Evenement evenement = findEvenement(id);
        PatrimoineDto patrimoine = validerEvenementEtRecupererPatrimoine(evenementDto);
        evenementMapper.updateEntity(evenementDto, evenement);
        if (evenement.getLieu() == null || evenement.getLieu().isBlank()) {
            evenement.setLieu(patrimoine.getAdressePatrimoine());
        }
        EvenementDto updated = evenementMapper.toDto(evenementRepository.save(evenement));
        updated.setPatrimoine(patrimoine);
        return updated;
    }

    @Override
    public void deleteEvenement(Long id) {
        if (!evenementRepository.existsById(id)) {
            throw new ResourceNotFoundException("Événement introuvable avec l'id : " + id);
        }
        evenementRepository.deleteById(id);
    }

    private Evenement findEvenement(Long id) {
        return evenementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Événement introuvable avec l'id : " + id));
    }

    private PatrimoineDto validerEvenementEtRecupererPatrimoine(EvenementDto dto) {
        if (dto.getDateFin().isBefore(dto.getDateDebut())) {
            throw new BadRequestException("La date de fin doit être postérieure ou égale à la date de début");
        }
        PatrimoineDto patrimoine;
        try {
            patrimoine = patrimoineClient.getPatrimoineById(dto.getPatrimoineId());
        } catch (FeignException.NotFound ex) {
            throw new BadRequestException("Le patrimoine " + dto.getPatrimoineId() + " n'existe pas dans ms-patrimoine");
        } catch (FeignException ex) {
            log.error("Erreur lors de l'appel à ms-patrimoine", ex);
            throw new ServiceIndisponibleException("Le service ms-patrimoine est indisponible");
        }
        if (patrimoine.getCapacitePatrimoine() > 0 && dto.getCapaciteMax() > patrimoine.getCapacitePatrimoine()) {
            throw new BadRequestException("La capacité de l'événement (" + dto.getCapaciteMax()
                    + ") dépasse la capacité maximale du site patrimonial (" + patrimoine.getCapacitePatrimoine() + ")");
        }
        return patrimoine;
    }
}

