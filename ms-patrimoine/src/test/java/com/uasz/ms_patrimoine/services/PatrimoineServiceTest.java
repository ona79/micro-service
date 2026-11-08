package com.uasz.ms_patrimoine.services;

import com.uasz.ms_patrimoine.dto.PatrimoineDto;
import com.uasz.ms_patrimoine.entities.Patrimoine;
import com.uasz.ms_patrimoine.exceptions.ResourceNotFoundException;
import com.uasz.ms_patrimoine.mappers.PatrimoineMapper;
import com.uasz.ms_patrimoine.repositories.PatrimoineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PatrimoineServiceTest {

    @Mock
    private PatrimoineRepository patrimoineRepository;

    // Vrai mapper généré par MapStruct (PatrimoineMapperImpl)
    private final PatrimoineMapper patrimoineMapper = Mappers.getMapper(PatrimoineMapper.class);

    private PatrimoineService patrimoineService;

    private Patrimoine patrimoine;

    @BeforeEach
    void setUp() {
        patrimoineService = new PatrimoineService(patrimoineRepository, patrimoineMapper);
        patrimoine = Patrimoine.builder()
                .id(1L)
                .nomPatrimoine("Maison de l'Esclave")
                .codePatrimoine("PAT-001")
                .descriptionPatrimoine("Monument historique")
                .historiquePatrimoine("Construite vers 1776")
                .adressePatrimoine("Île de Gorée, Dakar")
                .capacitePatrimoine(150)
                .latitudePatrimoine(14.6672f)
                .longitudePatrimoine(-17.399f)
                .build();
    }

    @Test
    void savePatrimoine_ignoreIdFourniEtRetourneDto() {
        PatrimoineDto dto = patrimoineMapper.toDto(patrimoine);
        dto.setId(99L);
        when(patrimoineRepository.save(any(Patrimoine.class))).thenAnswer(inv -> {
            Patrimoine p = inv.getArgument(0);
            assertThat(p.getId()).isNull();
            p.setId(1L);
            return p;
        });

        PatrimoineDto result = patrimoineService.savePatrimoine(dto);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getNomPatrimoine()).isEqualTo("Maison de l'Esclave");
        assertThat(result.getCapacitePatrimoine()).isEqualTo(150);
    }

    @Test
    void getAllPatrimoines_retourneListeDeDto() {
        when(patrimoineRepository.findAll()).thenReturn(List.of(patrimoine));

        List<PatrimoineDto> result = patrimoineService.getAllPatrimoines();

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().getCodePatrimoine()).isEqualTo("PAT-001");
    }

    @Test
    void getByIdPatrimoine_existant() {
        when(patrimoineRepository.findById(1L)).thenReturn(Optional.of(patrimoine));

        assertThat(patrimoineService.getByIdPatrimoine(1L).getLatitudePatrimoine()).isEqualTo(14.6672f);
    }

    @Test
    void getByIdPatrimoine_inexistant_leveResourceNotFound() {
        when(patrimoineRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> patrimoineService.getByIdPatrimoine(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void updatePatrimoine_modifieChampsSansToucherId() {
        when(patrimoineRepository.findById(1L)).thenReturn(Optional.of(patrimoine));
        when(patrimoineRepository.save(any(Patrimoine.class))).thenAnswer(inv -> inv.getArgument(0));
        PatrimoineDto modif = patrimoineMapper.toDto(patrimoine);
        modif.setId(42L);
        modif.setCapacitePatrimoine(200);

        PatrimoineDto result = patrimoineService.updatePatrimoine(1L, modif);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getCapacitePatrimoine()).isEqualTo(200);
    }

    @Test
    void updatePatrimoine_inexistant_leveResourceNotFound() {
        when(patrimoineRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> patrimoineService.updatePatrimoine(999L, new PatrimoineDto()))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(patrimoineRepository, never()).save(any());
    }

    @Test
    void deletePatrimoine_existant() {
        when(patrimoineRepository.existsById(1L)).thenReturn(true);

        patrimoineService.deletePatrimoine(1L);

        verify(patrimoineRepository).deleteById(1L);
    }

    @Test
    void deletePatrimoine_inexistant_leveResourceNotFound() {
        when(patrimoineRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> patrimoineService.deletePatrimoine(999L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(patrimoineRepository, never()).deleteById(any());
    }
}

