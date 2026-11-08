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
import com.uasz.ms_reservation.exceptions.ResourceNotFoundException;
import com.uasz.ms_reservation.exceptions.ServiceIndisponibleException;
import com.uasz.ms_reservation.mappers.ReservationMapper;
import com.uasz.ms_reservation.repositories.ReservationRepository;
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
        Reservation reservation = reservationMapper.toEntity(dto);
        reservation.setId(null);
        reservation.setDateReservation(LocalDateTime.now());
        reservation.setStatut(StatutReservation.CONFIRMEE);

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
        return reservationRepository.findAll().stream()
                .map(reservationMapper::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationDto getByIdReservation(Long id) {
        Reservation reservation = findReservation(id);
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
        Reservation reservation = findReservation(id);
        reservation.setStatut(StatutReservation.ANNULEE);
        return reservationMapper.toDto(reservationRepository.save(reservation));
    }

    @Override
    public void deleteReservation(Long id) {
        if (!reservationRepository.existsById(id)) {
            throw new ResourceNotFoundException("Réservation introuvable avec l'id : " + id);
        }
        reservationRepository.deleteById(id);
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

