package com.uasz.ms_circuit.services;

import com.uasz.ms_circuit.clients.NotificationClient;
import com.uasz.ms_circuit.clients.PatrimoineClient;
import com.uasz.ms_circuit.clients.UtilisateurGuideClient;
import com.uasz.ms_circuit.dto.CircuitDto;
import com.uasz.ms_circuit.dto.EtapeDto;
import com.uasz.ms_circuit.dto.GuideVerificationDto;
import com.uasz.ms_circuit.dto.NotificationRequest;
import com.uasz.ms_circuit.dto.PatrimoineDto;
import com.uasz.ms_circuit.entities.Circuit;
import com.uasz.ms_circuit.entities.CircuitNotificationOutbox;
import com.uasz.ms_circuit.entities.Difficulte;
import com.uasz.ms_circuit.entities.StatutCircuit;
import com.uasz.ms_circuit.exceptions.BadRequestException;
import com.uasz.ms_circuit.exceptions.ForbiddenException;
import com.uasz.ms_circuit.mappers.CircuitMapper;
import com.uasz.ms_circuit.repositories.CircuitNotificationOutboxRepository;
import com.uasz.ms_circuit.repositories.CircuitRepository;
import com.uasz.ms_circuit.security.SecurityUserContext;
import com.uasz.ms_circuit.security.SecurityUserContextHolder;
import org.junit.jupiter.api.AfterEach;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CircuitGuideCoherenceTest {

    @Mock
    private CircuitRepository circuitRepository;

    @Mock
    private PatrimoineClient patrimoineClient;

    @Mock
    private UtilisateurGuideClient utilisateurGuideClient;

    @Mock
    private CircuitNotificationOutboxRepository outboxRepository;

    @Mock
    private NotificationClient notificationClient;

    private final CircuitMapper circuitMapper = Mappers.getMapper(CircuitMapper.class);
    private CircuitService circuitService;

    @BeforeEach
    void setUp() {
        CircuitNotificationOutboxRelayService relay =
                new CircuitNotificationOutboxRelayService(outboxRepository, notificationClient, null);
        circuitService = new CircuitService(
                circuitRepository,
                circuitMapper,
                patrimoineClient,
                utilisateurGuideClient,
                outboxRepository,
                relay
        );
    }

    @AfterEach
    void clearContext() {
        SecurityUserContextHolder.clear();
    }

    @Test
    void affecterGuide_profilNonValideOuSuspendu_estRefuse400() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(3L, "GESTIONNAIRE_SITE", "awa@uasz.sn", false, null));
        Circuit c = Circuit.builder().id(1L).nomCircuit("Boucle Kasa").statutCircuit(StatutCircuit.PUBLIE).build();
        when(circuitRepository.findById(1L)).thenReturn(Optional.of(c));
        when(utilisateurGuideClient.verifierGuide(5L)).thenReturn(GuideVerificationDto.builder()
                .utilisateurId(5L)
                .role("GUIDE")
                .compteActif(true)
                .statutValidation("SUSPENDU")
                .profilValide(false)
                .build());

        assertThatThrownBy(() -> circuitService.affecterGuideResponsable(1L, 5L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("profil validé");
    }

    @Test
    void affecterGuide_profilValide_enregistreEtNotifieGuideViaOutbox() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(3L, "GESTIONNAIRE_SITE", "awa@uasz.sn", false, null));
        Circuit c = Circuit.builder().id(1L).nomCircuit("Boucle Kasa").statutCircuit(StatutCircuit.PUBLIE).build();
        when(circuitRepository.findById(1L)).thenReturn(Optional.of(c));
        when(utilisateurGuideClient.verifierGuide(5L)).thenReturn(GuideVerificationDto.builder()
                .utilisateurId(5L)
                .nomComplet("Alassane Badji")
                .email("alassane.badji@zig.univ.sn")
                .role("GUIDE")
                .compteActif(true)
                .statutValidation("VALIDE")
                .profilValide(true)
                .build());
        when(circuitRepository.save(any(Circuit.class))).thenAnswer(inv -> inv.getArgument(0));
        CircuitNotificationOutbox[] stored = new CircuitNotificationOutbox[1];
        when(outboxRepository.save(any(CircuitNotificationOutbox.class))).thenAnswer(inv -> {
            CircuitNotificationOutbox o = inv.getArgument(0);
            if (o.getId() == null) o.setId(55L);
            stored[0] = o;
            return o;
        });
        when(outboxRepository.findByIdForUpdate(55L)).thenAnswer(inv -> Optional.ofNullable(stored[0]));

        CircuitDto updated = circuitService.affecterGuideResponsable(1L, 5L);

        assertThat(updated.getGuideResponsableId()).isEqualTo(5L);
        verify(notificationClient).envoyerNotification(any(NotificationRequest.class));
    }

    @Test
    void modifierCircuitParGuide_siProfilSuspendu_estRefuse403() {
        SecurityUserContextHolder.setContext(new SecurityUserContext(5L, "GUIDE", "alassane.badji@zig.univ.sn", false, null));
        Circuit c = Circuit.builder()
                .id(1L)
                .nomCircuit("Boucle Kasa")
                .guideResponsableId(5L)
                .statutCircuit(StatutCircuit.BROUILLON)
                .build();
        when(circuitRepository.findById(1L)).thenReturn(Optional.of(c));
        when(utilisateurGuideClient.verifierGuide(5L)).thenReturn(GuideVerificationDto.builder()
                .utilisateurId(5L)
                .role("GUIDE")
                .compteActif(true)
                .statutValidation("SUSPENDU")
                .profilValide(false)
                .build());

        CircuitDto dto = CircuitDto.builder()
                .nomCircuit("Boucle Kasa Modifiée")
                .difficulte(Difficulte.MOYEN)
                .placesMax(12)
                .prix(15000.0)
                .guideResponsableId(5L)
                .etapes(List.of(EtapeDto.builder().ordre(1).dureeVisite(60).patrimoineId(1L).build()))
                .build();

        assertThatThrownBy(() -> circuitService.updateCircuit(1L, dto))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("suspendu");
    }
}
