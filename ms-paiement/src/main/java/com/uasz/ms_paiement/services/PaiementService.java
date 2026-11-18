package com.uasz.ms_paiement.services;

import com.uasz.ms_paiement.clients.NotificationClient;
import com.uasz.ms_paiement.clients.ReservationClient;
import com.uasz.ms_paiement.dto.NotificationRequest;
import com.uasz.ms_paiement.dto.PaiementDto;
import com.uasz.ms_paiement.dto.ReservationDto;
import com.uasz.ms_paiement.entities.Paiement;
import com.uasz.ms_paiement.entities.StatutPaiement;
import com.uasz.ms_paiement.exceptions.BadRequestException;
import com.uasz.ms_paiement.exceptions.ForbiddenException;
import com.uasz.ms_paiement.exceptions.ResourceNotFoundException;
import com.uasz.ms_paiement.exceptions.ServiceIndisponibleException;
import com.uasz.ms_paiement.exceptions.UnauthorizedException;
import com.uasz.ms_paiement.mappers.PaiementMapper;
import com.uasz.ms_paiement.repositories.PaiementRepository;
import com.uasz.ms_paiement.security.SecurityUserContext;
import com.uasz.ms_paiement.security.SecurityUserContextHolder;
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
        SecurityUserContext caller = requireAuthenticatedContext();

        if (!caller.hasPermission("PAIEMENT:INITIER")) {
            throw new ForbiddenException("Accès interdit : votre rôle (" + caller.role() + ") ne possède pas la permission PAIEMENT:INITIER.");
        }

        if (paiementRepository.existsByReservationIdAndStatut(dto.getReservationId(), StatutPaiement.REUSSI)) {
            throw new BadRequestException("La réservation " + dto.getReservationId() + " a déjà été payée");
        }
        ReservationDto reservation = recupererReservation(dto.getReservationId());
        if ("ANNULEE".equalsIgnoreCase(reservation.getStatut())) {
            throw new BadRequestException("Impossible de payer une réservation annulée");
        }

        // Contrôle BOLA / IDOR FAIL-CLOSED :
        // Une réservation sans utilisateurId ne peut JAMAIS être considérée comme appartenant à un utilisateur standard.
        if (!caller.hasPermission("PAIEMENT:LIRE_TOUT")) {
            if (reservation.getUtilisateurId() == null) {
                throw new ForbiddenException(
                        "Accès interdit (Fail-Closed) : cette réservation n'a pas de propriétaire vérifié et ne peut pas être payée par un compte non administrateur.");
            }
            if (!caller.userId().equals(reservation.getUtilisateurId())) {
                throw new ForbiddenException(
                        "Accès interdit : vous ne pouvez pas payer la réservation d'un autre utilisateur.");
            }
        }

        Paiement paiement = paiementMapper.toEntity(dto);
        paiement.setId(null);
        paiement.setUtilisateurId(reservation.getUtilisateurId() != null ? reservation.getUtilisateurId() : caller.userId());
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
        SecurityUserContext caller = requireAuthenticatedContext();

        if (caller.hasPermission("PAIEMENT:LIRE_TOUT")) {
            return paiementRepository.findAll().stream()
                    .map(paiementMapper::toDto)
                    .toList();
        }

        if (caller.hasPermission("PAIEMENT:LIRE_PROPRE")) {
            return paiementRepository.findByUtilisateurId(caller.userId()).stream()
                    .map(paiementMapper::toDto)
                    .toList();
        }

        throw new ForbiddenException("Accès interdit : permission de consultation des paiements absente.");
    }

    @Override
    @Transactional(readOnly = true)
    public PaiementDto getByIdPaiement(Long id) {
        SecurityUserContext caller = requireAuthenticatedContext();

        if (!caller.hasPermission("PAIEMENT:LIRE_TOUT") && !caller.hasPermission("PAIEMENT:LIRE_PROPRE")) {
            throw new ForbiddenException("Accès interdit : permission de consultation des reçus de paiement requise.");
        }

        Paiement paiement = paiementRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Paiement introuvable avec l'id : " + id));

        // Contrôle horizontal BOLA / IDOR FAIL-CLOSED
        if (!caller.hasPermission("PAIEMENT:LIRE_TOUT")) {
            if (paiement.getUtilisateurId() == null) {
                throw new ForbiddenException(
                        "Accès interdit (Fail-Closed) : ce reçu de paiement n'a pas de propriétaire vérifié.");
            }
            if (!caller.userId().equals(paiement.getUtilisateurId())) {
                throw new ForbiddenException(
                        "Accès interdit : vous ne pouvez pas consulter le reçu de paiement d'un autre utilisateur.");
            }
        }

        PaiementDto dto = paiementMapper.toDto(paiement);
        try {
            dto.setReservation(reservationClient.getReservationById(paiement.getReservationId()));
        } catch (FeignException ex) {
            log.warn("Impossible d'enrichir le paiement {} : {}", id, ex.getMessage());
        }
        return dto;
    }

    /**
     * Politique FAIL-CLOSED stricte :
     * Aucun accès privé par défaut si SecurityUserContext est absent ou incomplet,
     * et rejet des appels de service non autorisés.
     */
    private SecurityUserContext requireAuthenticatedContext() {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        if (caller == null) {
            throw new UnauthorizedException("Accès refusé (Fail-Closed) : contexte de sécurité utilisateur absent.");
        }
        if (caller.isServiceCall()) {
            throw new ForbiddenException("Accès interdit : aucun service interne n'est autorisé à appeler directement ms-paiement.");
        }
        if (caller.userId() == null) {
            throw new UnauthorizedException("Accès refusé (Fail-Closed) : identifiant utilisateur manquant dans le contexte de sécurité.");
        }
        return caller;
    }

    private ReservationDto recupererReservation(Long reservationId) {
        try {
            return reservationClient.getReservationById(reservationId);
        } catch (FeignException.Forbidden ex) {
            throw new ForbiddenException("Accès interdit : vous ne pouvez pas payer la réservation d'un autre utilisateur.");
        } catch (FeignException.NotFound ex) {
            throw new BadRequestException("La réservation " + reservationId + " n'existe pas dans ms-reservation");
        } catch (FeignException ex) {
            log.error("Erreur lors de l'appel à ms-reservation", ex);
            throw new ServiceIndisponibleException("Le service ms-reservation est indisponible");
        }
    }
}
