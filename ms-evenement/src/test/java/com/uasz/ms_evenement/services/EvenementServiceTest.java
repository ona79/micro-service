package com.uasz.ms_evenement.services;

import com.uasz.ms_evenement.clients.PatrimoineClient;
import com.uasz.ms_evenement.dto.EvenementDto;
import com.uasz.ms_evenement.dto.PatrimoineDto;
import com.uasz.ms_evenement.entities.Evenement;
import com.uasz.ms_evenement.entities.TypeEvenement;
import com.uasz.ms_evenement.exceptions.BadRequestException;
import com.uasz.ms_evenement.exceptions.ResourceNotFoundException;
import com.uasz.ms_evenement.mappers.EvenementMapper;
import com.uasz.ms_evenement.repositories.EvenementRepository;
import feign.FeignException;
import feign.Request;
import feign.RequestTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EvenementServiceTest {

    @Mock
    private EvenementRepository evenementRepository;

    @Mock
    private PatrimoineClient patrimoineClient;

    private final EvenementMapper evenementMapper = Mappers.getMapper(EvenementMapper.class);

    private EvenementService evenementService;

    private PatrimoineDto patrimoine;

    @BeforeEach
    void setUp() {
        evenementService = new EvenementService(evenementRepository, evenementMapper, patrimoineClient);
        patrimoine = new PatrimoineDto(1L, "Maison de l'Esclave", "PAT-001", "Desc", "Hist",
                "Île de Gorée", 150, 14.6672f, -17.3990f);
    }

    @Test
    void saveEvenement_valideEtEnrichitPatrimoine() {
        when(patrimoineClient.getPatrimoineById(1L)).thenReturn(patrimoine);
        when(evenementRepository.save(any(Evenement.class))).thenAnswer(inv -> {
            Evenement e = inv.getArgument(0);
            e.setId(1L);
            return e;
        });

        EvenementDto dto = new EvenementDto(null, "Exposition Mémoire", "Photos d'archives",
                TypeEvenement.EXPOSITION, LocalDateTime.of(2026, 12, 1, 9, 0),
                LocalDateTime.of(2026, 12, 1, 17, 0), null, 100, 2000.0, 1L, null);

        EvenementDto saved = evenementService.saveEvenement(dto);

        assertThat(saved.getId()).isEqualTo(1L);
        assertThat(saved.getLieu()).isEqualTo("Île de Gorée");
        assertThat(saved.getPatrimoine().getNomPatrimoine()).isEqualTo("Maison de l'Esclave");
    }

    @Test
    void saveEvenement_capaciteDepasseSite_leveBadRequest() {
        when(patrimoineClient.getPatrimoineById(1L)).thenReturn(patrimoine);

        EvenementDto dto = new EvenementDto(null, "Grand Festival", "Trop grand",
                TypeEvenement.FESTIVAL, LocalDateTime.of(2026, 12, 1, 9, 0),
                LocalDateTime.of(2026, 12, 1, 17, 0), "Gorée", 300, 2000.0, 1L, null);

        assertThatThrownBy(() -> evenementService.saveEvenement(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("150");
    }

    @Test
    void saveEvenement_dateFinAvantDateDebut_leveBadRequest() {
        EvenementDto dto = new EvenementDto(null, "Atelier", "Dates inversées",
                TypeEvenement.ATELIER, LocalDateTime.of(2026, 12, 2, 10, 0),
                LocalDateTime.of(2026, 12, 1, 10, 0), "Gorée", 50, 1000.0, 1L, null);

        assertThatThrownBy(() -> evenementService.saveEvenement(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("date de fin");
    }

    @Test
    void saveEvenement_patrimoineInexistant_leveBadRequest() {
        Request req = Request.create(Request.HttpMethod.GET, "/api/patrimoines/999", Map.of(), null, new RequestTemplate());
        when(patrimoineClient.getPatrimoineById(999L))
                .thenThrow(new FeignException.NotFound("Not found", req, null, null));

        EvenementDto dto = new EvenementDto(null, "Atelier", "Desc",
                TypeEvenement.ATELIER, LocalDateTime.of(2026, 12, 1, 10, 0),
                LocalDateTime.of(2026, 12, 1, 12, 0), "Gorée", 50, 1000.0, 999L, null);

        assertThatThrownBy(() -> evenementService.saveEvenement(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("999");
    }

    @Test
    void deleteEvenement_inexistant_leveResourceNotFound() {
        when(evenementRepository.existsById(999L)).thenReturn(false);

        assertThatThrownBy(() -> evenementService.deleteEvenement(999L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}

