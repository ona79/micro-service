package com.uasz.ms_reservation.services;

import com.uasz.ms_reservation.clients.CircuitClient;
import com.uasz.ms_reservation.clients.EvenementClient;
import com.uasz.ms_reservation.dto.CircuitDto;
import com.uasz.ms_reservation.dto.EvenementDto;
import com.uasz.ms_reservation.dto.ReservationDto;
import com.uasz.ms_reservation.entities.Reservation;
import com.uasz.ms_reservation.entities.StatutReservation;
import com.uasz.ms_reservation.entities.TypeReservation;
import com.uasz.ms_reservation.exceptions.BadRequestException;
import com.uasz.ms_reservation.exceptions.ForbiddenException;
import com.uasz.ms_reservation.exceptions.ResourceNotFoundException;
import com.uasz.ms_reservation.exceptions.ServiceIndisponibleException;
import com.uasz.ms_reservation.exceptions.UnauthorizedException;
import com.uasz.ms_reservation.mappers.ReservationMapper;
import com.uasz.ms_reservation.repositories.ReservationRepository;
import com.uasz.ms_reservation.security.SecurityUserContext;
import com.uasz.ms_reservation.security.SecurityUserContextHolder;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ReservationService implements IReservationService {

    private final ReservationRepository reservationRepository;
    private final ReservationMapper reservationMapper;
    private final CircuitClient circuitClient;
    private final EvenementClient evenementClient;

    @Override
    public ReservationDto saveReservation(ReservationDto dto) {
        SecurityUserContext caller = requireAuthenticatedContext(false);

        if (!caller.hasPermission("RESERVATION:CREER") && !caller.hasPermission("RESERVATION:GERER")) {
            throw new ForbiddenException("Accès interdit : votre rôle (" + caller.role() + ") ne possède pas la permission RESERVATION:CREER.");
        }

        Reservation reservation = reservationMapper.toEntity(dto);
        reservation.setId(null);
        reservation.setDateReservation(LocalDateTime.now());
        reservation.setStatut(StatutReservation.CONFIRMEE);

        // Protection BOLA / IDOR : force l'utilisateurId à l'identité du token authentifié (sauf si staff gérant pour un tiers explicite)
        if (!caller.hasPermission("RESERVATION:GERER") || reservation.getUtilisateurId() == null) {
            reservation.setUtilisateurId(caller.userId());
        }
        if (!caller.hasPermission("RESERVATION:GERER") && caller.email() != null && !caller.email().isBlank()) {
            reservation.setEmailClient(caller.email());
        }

        if (dto.getTypeReservation() == TypeReservation.CIRCUIT) {
            if (dto.getCircuitId() == null) {
                throw new BadRequestException("L'identifiant du circuit (circuitId) est obligatoire pour une réservation de type CIRCUIT");
            }
            CircuitDto circuit = recupererCircuit(dto.getCircuitId());
            int dejaReservees = reservationRepository.sumPlacesByCircuitIdAndStatutNot(dto.getCircuitId(), StatutReservation.ANNULEE);
            int restantes = circuit.getPlacesMax() - dejaReservees;
            if (dto.getNombrePlaces() > restantes) {
                throw new BadRequestException("Capacité insuffisante pour le circuit " + dto.getCircuitId()
                        + " : " + restantes + " place(s) disponible(s), " + dto.getNombrePlaces() + " demandée(s)");
            }
            reservation.setEvenementId(null);
            reservation.setMontantTotal(dto.getNombrePlaces() * circuit.getPrix());

            ReservationDto saved = reservationMapper.toDto(reservationRepository.save(reservation));
            saved.setCircuit(circuit);
            return saved;
        } else {
            if (dto.getEvenementId() == null) {
                throw new BadRequestException("L'identifiant de l'événement (evenementId) est obligatoire pour une réservation de type EVENEMENT");
            }
            EvenementDto evenement = recupererEvenement(dto.getEvenementId());
            int dejaReservees = reservationRepository.sumPlacesByEvenementIdAndStatutNot(dto.getEvenementId(), StatutReservation.ANNULEE);
            int restantes = evenement.getCapaciteMax() - dejaReservees;
            if (dto.getNombrePlaces() > restantes) {
                throw new BadRequestException("Capacité insuffisante pour l'événement " + dto.getEvenementId()
                        + " : " + restantes + " place(s) disponible(s), " + dto.getNombrePlaces() + " demandée(s)");
            }
            reservation.setCircuitId(null);
            reservation.setMontantTotal(dto.getNombrePlaces() * evenement.getPrix());

            ReservationDto saved = reservationMapper.toDto(reservationRepository.save(reservation));
            saved.setEvenement(evenement);
            return saved;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReservationDto> getAllReservations() {
        SecurityUserContext caller = requireAuthenticatedContext(false);

        if (caller.hasPermission("RESERVATION:LIRE_TOUT")) {
            return reservationRepository.findAll().stream()
                    .map(reservationMapper::toDto)
                    .toList();
        }

        if (caller.hasPermission("RESERVATION:LIRE_PROPRE")) {
            return reservationRepository.findByUtilisateurId(caller.userId()).stream()
                    .map(reservationMapper::toDto)
                    .toList();
        }

        throw new ForbiddenException("Accès interdit : permission de consultation des réservations absente.");
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationDto getByIdReservation(Long id) {
        SecurityUserContext caller = requireAuthenticatedContext(true);
        Reservation reservation = findReservation(id);

        if (!caller.hasPermission("RESERVATION:LIRE_TOUT") && !caller.hasPermission("RESERVATION:LIRE_PROPRE")) {
            throw new ForbiddenException("Accès interdit : permission de lecture de réservation requise.");
        }

        if (!caller.hasPermission("RESERVATION:LIRE_TOUT")) {
            verifyStrictOwnership(caller, reservation, "consulter");
        }

        ReservationDto dto = reservationMapper.toDto(reservation);
        try {
            if (reservation.getTypeReservation() == TypeReservation.CIRCUIT && reservation.getCircuitId() != null) {
                dto.setCircuit(circuitClient.getCircuitById(reservation.getCircuitId()));
            } else if (reservation.getTypeReservation() == TypeReservation.EVENEMENT && reservation.getEvenementId() != null) {
                dto.setEvenement(evenementClient.getEvenementById(reservation.getEvenementId()));
            }
        } catch (FeignException ex) {
            log.warn("Impossible d'enrichir la réservation {} : {}", id, ex.getMessage());
        }
        return dto;
    }

    @Override
    public ReservationDto annulerReservation(Long id) {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        Reservation reservation = findReservation(id);

        if (!caller.hasPermission("RESERVATION:GERER") && !caller.hasPermission("RESERVATION:ANNULER_PROPRE")) {
            throw new ForbiddenException("Accès interdit : permission d'annulation de réservation requise.");
        }

        if (!caller.hasPermission("RESERVATION:GERER")) {
            verifyStrictOwnership(caller, reservation, "annuler");
        }

        reservation.setStatut(StatutReservation.ANNULEE);
        return reservationMapper.toDto(reservationRepository.save(reservation));
    }

    @Override
    public void deleteReservation(Long id) {
        SecurityUserContext caller = requireAuthenticatedContext(false);
        Reservation reservation = findReservation(id);

        if (!caller.hasPermission("RESERVATION:GERER") && !caller.hasPermission("RESERVATION:ANNULER_PROPRE")) {
            throw new ForbiddenException("Accès interdit : permission de suppression de réservation requise.");
        }

        if (!caller.hasPermission("RESERVATION:GERER")) {
            verifyStrictOwnership(caller, reservation, "supprimer");
        }

        reservationRepository.deleteById(id);
    }

    /**
     * Politique FAIL-CLOSED stricte :
     * 1) Si SecurityUserContext est absent ou sans userId valide -> 401 Unauthorized.
     * 2) Si c'est un appel de service, seul ms-paiement est autorisé et uniquement sur la lecture unitaire,
     *    tout en exigeant une identité utilisateur propagée valide.
     */
    private SecurityUserContext requireAuthenticatedContext(boolean allowPaiementServiceCall) {
        SecurityUserContext caller = SecurityUserContextHolder.getContext();
        if (caller == null) {
            throw new UnauthorizedException("Accès refusé (Fail-Closed) : contexte de sécurité utilisateur absent.");
        }
        if (caller.isServiceCall()) {
            if (!allowPaiementServiceCall || !"ms-paiement".equals(caller.serviceName())) {
                throw new ForbiddenException("Accès interdit : le service '" + caller.serviceName() + "' n'est pas autorisé à exécuter cette opération sur ms-reservation.");
            }
        }
        if (caller.userId() == null) {
            throw new UnauthorizedException("Accès refusé (Fail-Closed) : identifiant utilisateur manquant dans le contexte de sécurité.");
        }
        return caller;
    }

    /**
     * Contrôle de propriété BOLA/IDOR fail-closed :
     * Une réservation sans utilisateurId (historique/orpheline) ne peut PAS être consultée ou modifiée
     * par un utilisateur standard. L'identifiant utilisateurId doit être non-null et égal à caller.userId().
     */
    private void verifyStrictOwnership(SecurityUserContext caller, Reservation reservation, String action) {
        if (reservation.getUtilisateurId() == null) {
            throw new ForbiddenException(
                    "Accès interdit (Fail-Closed) : cette réservation n'a pas de propriétaire vérifié et ne peut pas être accédée par un compte non administrateur.");
        }
        if (!caller.userId().equals(reservation.getUtilisateurId())) {
            throw new ForbiddenException(
                    "Accès interdit : vous ne pouvez pas " + action + " la réservation d'un autre utilisateur.");
        }
    }

    private Reservation findReservation(Long id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Réservation introuvable avec l'id : " + id));
    }

    private CircuitDto recupererCircuit(Long circuitId) {
        try {
            return circuitClient.getCircuitById(circuitId);
        } catch (FeignException.NotFound ex) {
            throw new BadRequestException("Le circuit " + circuitId + " n'existe pas dans ms-circuit");
        } catch (FeignException ex) {
            log.error("Erreur lors de l'appel à ms-circuit", ex);
            throw new ServiceIndisponibleException("Le service ms-circuit est indisponible");
        }
    }

    private EvenementDto recupererEvenement(Long evenementId) {
        try {
            return evenementClient.getEvenementById(evenementId);
        } catch (FeignException.NotFound ex) {
            throw new BadRequestException("L'événement " + evenementId + " n'existe pas dans ms-evenement");
        } catch (FeignException ex) {
            log.error("Erreur lors de l'appel à ms-evenement", ex);
            throw new ServiceIndisponibleException("Le service ms-evenement est indisponible");
        }
    }
}
