package com.uasz.ms_evenement.services;

import com.uasz.ms_evenement.clients.PatrimoineClient;
import com.uasz.ms_evenement.dto.EvenementDto;
import com.uasz.ms_evenement.dto.PageResponseDto;
import com.uasz.ms_evenement.dto.PatrimoineDto;
import com.uasz.ms_evenement.entities.Evenement;
import com.uasz.ms_evenement.entities.StatutEvenement;
import com.uasz.ms_evenement.entities.TypeEvenement;
import com.uasz.ms_evenement.exceptions.BadRequestException;
import com.uasz.ms_evenement.exceptions.ForbiddenException;
import com.uasz.ms_evenement.exceptions.ResourceNotFoundException;
import com.uasz.ms_evenement.mappers.EvenementMapper;
import com.uasz.ms_evenement.repositories.EvenementRepository;
import com.uasz.ms_evenement.security.SecurityUserContext;
import com.uasz.ms_evenement.security.SecurityUserContextHolder;
import feign.FeignException;
import feign.Request;
import feign.RequestTemplate;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

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
        SecurityUserContextHolder.setContext(new SecurityUserContext(3L, "GESTIONNAIRE_SITE", "awa@uasz.sn", false, null));
        patrimoine = new PatrimoineDto(1L, "Mémorial du Joola", "PAT-ZIG-001", "Desc", "Hist",
                "Boucotte, Ziguinchor", 150, 12.5833f, -16.2719f);
    }

    @AfterEach
    void tearDown() {
        SecurityUserContextHolder.clear();
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
        assertThat(saved.getLieu()).isEqualTo("Boucotte, Ziguinchor");
        assertThat(saved.getPatrimoine().getNomPatrimoine()).isEqualTo("Mémorial du Joola");
        assertThat(saved.getFuseauHoraire()).isEqualTo("Africa/Dakar");
    }

    @Test
    void saveEvenement_sansPatrimoineMaisAvecLieu_autoriseCreation() {
        when(evenementRepository.save(any(Evenement.class))).thenAnswer(inv -> {
            Evenement e = inv.getArgument(0);
            e.setId(2L);
            return e;
        });

        EvenementDto dto = new EvenementDto(null, "Foire Artisanale Régionale", "Artisanat de Casamance",
                TypeEvenement.FOIRE_ARTISANALE, LocalDateTime.of(2026, 12, 15, 9, 0),
                LocalDateTime.of(2026, 12, 18, 19, 0), "Place de Gao, Ziguinchor", 250, 0.0, null, null);

        EvenementDto saved = evenementService.saveEvenement(dto);
        assertThat(saved.getId()).isEqualTo(2L);
        assertThat(saved.getPatrimoineId()).isNull();
        assertThat(saved.getLieu()).isEqualTo("Place de Gao, Ziguinchor");
    }

    @Test
    void saveEvenement_sansPatrimoineNiLieu_leveBadRequest() {
        EvenementDto dto = new EvenementDto(null, "Événement Sans Lieu", "Desc",
                TypeEvenement.CONFERENCE, LocalDateTime.of(2026, 12, 15, 9, 0),
                LocalDateTime.of(2026, 12, 15, 18, 0), "   ", 80, 0.0, null, null);

        assertThatThrownBy(() -> evenementService.saveEvenement(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("lieu");
    }

    @Test
    void getEvenementsAVenir_exclutEvenementsAnnulesTerminesEtArchives() {
        LocalDateTime futur = LocalDateTime.now(Evenement.CASAMANCE_ZONE).plusDays(10);
        Evenement eValide = Evenement.builder()
                .id(1L).nomEvenement("Festival Confirmé").typeEvenement(TypeEvenement.FESTIVAL)
                .dateDebut(futur).dateFin(futur.plusDays(2))
                .lieu("Ziguinchor").capaciteMax(200).statutEvenement(StatutEvenement.PUBLIE).build();
        Evenement eAnnule = Evenement.builder()
                .id(2L).nomEvenement("Festival Annulé").typeEvenement(TypeEvenement.FESTIVAL)
                .dateDebut(futur).dateFin(futur.plusDays(2))
                .lieu("Ziguinchor").capaciteMax(200).statutEvenement(StatutEvenement.ANNULE).build();
        Evenement eTermine = Evenement.builder()
                .id(3L).nomEvenement("Atelier Terminé").typeEvenement(TypeEvenement.ATELIER)
                .dateDebut(futur).dateFin(futur.plusDays(1))
                .lieu("Enampore").capaciteMax(40).statutEvenement(StatutEvenement.TERMINE).build();
        Evenement eBrouillon = Evenement.builder()
                .id(4L).nomEvenement("Brouillon").typeEvenement(TypeEvenement.EXPOSITION)
                .dateDebut(futur).dateFin(futur.plusDays(1))
                .lieu("Oussouye").capaciteMax(50).statutEvenement(StatutEvenement.BROUILLON).build();

        when(evenementRepository.findAll()).thenReturn(List.of(eValide, eAnnule, eTermine, eBrouillon));

        List<EvenementDto> aVenir = evenementService.getEvenementsAVenir();
        assertThat(aVenir).hasSize(1);
        assertThat(aVenir.getFirst().getNomEvenement()).isEqualTo("Festival Confirmé");
    }

    @Test
    void workflowEtRecherche_annulerTerminerArchiverEtRechercherEvenements() {
        LocalDateTime futur = LocalDateTime.now(Evenement.CASAMANCE_ZONE).plusDays(5);
        Evenement ev = Evenement.builder()
                .id(1L)
                .nomEvenement("Colloque Patrimoine Casamance")
                .descriptionEvenement("Recherche universitaire UASZ")
                .typeEvenement(TypeEvenement.CONFERENCE)
                .dateDebut(futur)
                .dateFin(futur.plusHours(8))
                .lieu("Amphithéâtre UASZ, Ziguinchor")
                .zoneGeographique("BASSE_CASAMANCE")
                .capaciteMax(120)
                .prix(0.0)
                .statutEvenement(StatutEvenement.PUBLIE)
                .build();

        when(evenementRepository.findById(1L)).thenReturn(Optional.of(ev));
        when(evenementRepository.save(any(Evenement.class))).thenAnswer(inv -> inv.getArgument(0));
        when(evenementRepository.findAll()).thenReturn(List.of(ev));

        PageResponseDto<EvenementDto> page = evenementService.rechercherEvenements(
                "UASZ", TypeEvenement.CONFERENCE, "BASSE_CASAMANCE", null,
                StatutEvenement.PUBLIE, null, null, 5000.0, true, false, 0, 10, "dateDebut", "asc");
        assertThat(page.getTotalElements()).isEqualTo(1);

        EvenementDto annule = evenementService.annulerEvenement(1L, "Report météo");
        assertThat(annule.getStatutEvenement()).isEqualTo(StatutEvenement.ANNULE);
        assertThat(annule.getMotifAnnulation()).isEqualTo("Report météo");

        EvenementDto termine = evenementService.terminerEvenement(1L);
        assertThat(termine.getStatutEvenement()).isEqualTo(StatutEvenement.TERMINE);

        EvenementDto archive = evenementService.archiverEvenement(1L, "Clôture annuelle");
        assertThat(archive.getStatutEvenement()).isEqualTo(StatutEvenement.ARCHIVE);
    }

    @Test
    void rbac_interditCreationOuModificationEvenementPourConservateurGuideEtTouriste() {
        EvenementDto dto = new EvenementDto(null, "Expo", "Desc", TypeEvenement.EXPOSITION,
                LocalDateTime.of(2026, 12, 1, 9, 0), LocalDateTime.of(2026, 12, 1, 17, 0), "Ziguinchor", 50, 1000.0, 1L, null);

        SecurityUserContextHolder.setContext(new SecurityUserContext(4L, "CONSERVATEUR", "c@uasz.sn", false, null));
        assertThatThrownBy(() -> evenementService.saveEvenement(dto)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> evenementService.annulerEvenement(1L, "Motif")).isInstanceOf(ForbiddenException.class);

        SecurityUserContextHolder.setContext(new SecurityUserContext(5L, "GUIDE", "g@uasz.sn", false, null));
        assertThatThrownBy(() -> evenementService.saveEvenement(dto)).isInstanceOf(ForbiddenException.class);

        SecurityUserContextHolder.setContext(new SecurityUserContext(2L, "TOURISTE", "t@uasz.sn", false, null));
        assertThatThrownBy(() -> evenementService.deleteEvenement(1L)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> evenementService.rechercherEvenements(
                null, null, null, null, StatutEvenement.ARCHIVE, null, null, null, false, true, 0, 10, "dateDebut", "asc"))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void saveEvenement_capaciteDepasseSite_leveBadRequest() {
        when(patrimoineClient.getPatrimoineById(1L)).thenReturn(patrimoine);

        EvenementDto dto = new EvenementDto(null, "Grand Festival", "Trop grand",
                TypeEvenement.FESTIVAL, LocalDateTime.of(2026, 12, 1, 9, 0),
                LocalDateTime.of(2026, 12, 1, 17, 0), "Ziguinchor", 300, 2000.0, 1L, null);

        assertThatThrownBy(() -> evenementService.saveEvenement(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("150");
    }

    @Test
    void saveEvenement_dateFinAvantDateDebut_leveBadRequest() {
        EvenementDto dto = new EvenementDto(null, "Atelier", "Dates inversées",
                TypeEvenement.ATELIER, LocalDateTime.of(2026, 12, 2, 10, 0),
                LocalDateTime.of(2026, 12, 1, 10, 0), "Ziguinchor", 50, 1000.0, 1L, null);

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
                LocalDateTime.of(2026, 12, 1, 12, 0), "Ziguinchor", 50, 1000.0, 999L, null);

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
