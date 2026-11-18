package com.uasz.ms_paiement.services;

import com.uasz.ms_paiement.clients.NotificationClient;
import com.uasz.ms_paiement.clients.ReservationClient;
import com.uasz.ms_paiement.dto.PaiementDto;
import com.uasz.ms_paiement.dto.ReservationDto;
import com.uasz.ms_paiement.entities.ModePaiement;
import com.uasz.ms_paiement.entities.Paiement;
import com.uasz.ms_paiement.entities.StatutPaiement;
import com.uasz.ms_paiement.exceptions.BadRequestException;
import com.uasz.ms_paiement.mappers.PaiementMapper;
import com.uasz.ms_paiement.repositories.PaiementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaiementServiceTest {

    @Mock
    private PaiementRepository paiementRepository;

    @Mock
    private ReservationClient reservationClient;

    @Mock
    private NotificationClient notificationClient;

    private final PaiementMapper paiementMapper = Mappers.getMapper(PaiementMapper.class);

    private PaiementService paiementService;

    @BeforeEach
    void setUp() {
        paiementService = new PaiementService(
                paiementRepository, paiementMapper, reservationClient, notificationClient
        );
    }

    @Test
    void effectuerPaiement_valideEtDeclencheNotification() {
        ReservationDto res = new ReservationDto(2L, "Moussa Diop", "moussa@uasz.sn",
                "+221771234567", 2, LocalDateTime.now(), "CIRCUIT", "CONFIRMEE", 30000.0, 1L, null);
        when(paiementRepository.existsByReservationIdAndStatut(2L, StatutPaiement.REUSSI)).thenReturn(false);
        when(reservationClient.getReservationById(2L)).thenReturn(res);
        when(paiementRepository.save(any(Paiement.class))).thenAnswer(inv -> {
            Paiement p = inv.getArgument(0);
            p.setId(1L);
            return p;
        });

        PaiementDto input = new PaiementDto(null, null, 2L, 0.0, ModePaiement.WAVE, null, null, null);
        PaiementDto result = paiementService.effectuerPaiement(input);

        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getReferenceTransaction()).startsWith("PAY-");
        assertThat(result.getMontant()).isEqualTo(30000.0);
        assertThat(result.getStatut()).isEqualTo(StatutPaiement.REUSSI);
        verify(notificationClient).envoyerNotification(any());
    }

    @Test
    void effectuerPaiement_reservationAnnulee_leveBadRequest() {
        ReservationDto res = new ReservationDto(2L, "Moussa Diop", "moussa@uasz.sn",
                null, 2, LocalDateTime.now(), "CIRCUIT", "ANNULEE", 30000.0, 1L, null);
        when(paiementRepository.existsByReservationIdAndStatut(2L, StatutPaiement.REUSSI)).thenReturn(false);
        when(reservationClient.getReservationById(2L)).thenReturn(res);

        PaiementDto input = new PaiementDto(null, null, 2L, 0.0, ModePaiement.WAVE, null, null, null);

        assertThatThrownBy(() -> paiementService.effectuerPaiement(input))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("annulée");
    }
}
