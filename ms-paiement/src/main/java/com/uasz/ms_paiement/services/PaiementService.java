package com.uasz.ms_paiement.services;

import com.uasz.ms_paiement.clients.NotificationClient;
import com.uasz.ms_paiement.clients.ReservationClient;
import com.uasz.ms_paiement.dto.NotificationRequest;
import com.uasz.ms_paiement.dto.PaiementDto;
import com.uasz.ms_paiement.dto.ReservationDto;
import com.uasz.ms_paiement.entities.Paiement;
import com.uasz.ms_paiement.entities.StatutPaiement;
import com.uasz.ms_paiement.exceptions.BadRequestException;
import com.uasz.ms_paiement.exceptions.ResourceNotFoundException;
import com.uasz.ms_paiement.exceptions.ServiceIndisponibleException;
import com.uasz.ms_paiement.mappers.PaiementMapper;
import com.uasz.ms_paiement.repositories.PaiementRepository;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PaiementService implements IPaiementService {

    private final PaiementRepository paiementRepository;
    private final PaiementMapper paiementMapper;
    private final ReservationClient reservationClient;
    private final NotificationClient notificationClient;

    @Override
    public PaiementDto effectuerPaiement(PaiementDto dto) {
        if (paiementRepository.existsByReservationIdAndStatut(dto.getReservationId(), StatutPaiement.REUSSI)) {
            throw new BadRequestException("La réservation " + dto.getReservationId() + " a déjà été payée");
        }
        ReservationDto reservation = recupererReservation(dto.getReservationId());
        if ("ANNULEE".equalsIgnoreCase(reservation.getStatut())) {
            throw new BadRequestException("Impossible de payer une réservation annulée");
        }

        Paiement paiement = paiementMapper.toEntity(dto);
        paiement.setId(null);
        paiement.setReferenceTransaction("PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        paiement.setMontant(reservation.getMontantTotal());
        paiement.setStatut(StatutPaiement.REUSSI);
        paiement.setDatePaiement(LocalDateTime.now());

        Paiement saved = paiementRepository.save(paiement);

        try {
            notificationClient.envoyerNotification(new NotificationRequest(
                    reservation.getEmailClient(),
                    "Confirmation de paiement " + saved.getReferenceTransaction(),
                    "Bonjour " + reservation.getNomClient() + ", votre paiement de " + saved.getMontant()
                            + " FCFA via " + saved.getModePaiement() + " pour la réservation #"
                            + reservation.getId() + " a bien été reçu.",
                    "EMAIL",
                    reservation.getId()
            ));
        } catch (Exception ex) {
            log.warn("Impossible d'envoyer la notification de paiement : {}", ex.getMessage());
        }

        PaiementDto result = paiementMapper.toDto(saved);
        result.setReservation(reservation);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaiementDto> getAllPaiements() {
        return paiementRepository.findAll().stream()
                .map(paiementMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PaiementDto getByIdPaiement(Long id) {
        Paiement paiement = paiementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement introuvable avec l'id : " + id));
        PaiementDto dto = paiementMapper.toDto(paiement);
        try {
            dto.setReservation(reservationClient.getReservationById(paiement.getReservationId()));
        } catch (FeignException ex) {
            log.warn("Impossible d'enrichir le paiement {} : {}", id, ex.getMessage());
        }
        return dto;
    }

    private ReservationDto recupererReservation(Long reservationId) {
        try {
            return reservationClient.getReservationById(reservationId);
        } catch (FeignException.NotFound ex) {
            throw new BadRequestException("La réservation " + reservationId + " n'existe pas dans ms-reservation");
        } catch (FeignException ex) {
            log.error("Erreur lors de l'appel à ms-reservation", ex);
            throw new ServiceIndisponibleException("Le service ms-reservation est indisponible");
        }
    }
}

