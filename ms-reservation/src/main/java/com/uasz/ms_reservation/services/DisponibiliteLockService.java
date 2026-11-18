package com.uasz.ms_reservation.services;

import com.uasz.ms_reservation.entities.DisponibilitePrestation;
import com.uasz.ms_reservation.entities.TypeReservation;
import com.uasz.ms_reservation.repositories.DisponibilitePrestationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;

/**
 * Gère le verrouillage pessimiste (SELECT ... FOR UPDATE) des créneaux/capacités.
 * L'initialisation initiale éventuelle d'une ligne absente passe par un TransactionTemplate
 * PROPAGATION_REQUIRES_NEW afin d'éviter toute auto-invocation Spring AOP et toute
 * pollution de la session Hibernate / transaction PostgreSQL externe en cas d'insertion concurrente.
 */
@Slf4j
@Service
public class DisponibiliteLockService {

    private final DisponibilitePrestationRepository disponibiliteRepository;
    private final TransactionTemplate requiresNewTx;

    public DisponibiliteLockService(
            DisponibilitePrestationRepository disponibiliteRepository,
            PlatformTransactionManager transactionManager
    ) {
        this.disponibiliteRepository = disponibiliteRepository;
        this.requiresNewTx = new TransactionTemplate(transactionManager);
        this.requiresNewTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public DisponibilitePrestation acquerirVerrou(TypeReservation type, Long prestationId, LocalDate datePrestation, int capaciteTotale) {
        return disponibiliteRepository.findByKeyForUpdate(type, prestationId, datePrestation)
                .orElseGet(() -> {
                    initialiserLigneSiAbsenteDansTransactionIsolee(type, prestationId, datePrestation, capaciteTotale);
                    return disponibiliteRepository.findByKeyForUpdate(type, prestationId, datePrestation)
                            .orElseThrow(() -> new IllegalStateException("Impossible d'acquérir le verrou de disponibilité."));
                });
    }

    private void initialiserLigneSiAbsenteDansTransactionIsolee(
            TypeReservation type,
            Long prestationId,
            LocalDate datePrestation,
            int capaciteTotale
    ) {
        try {
            requiresNewTx.executeWithoutResult(status -> {
                if (disponibiliteRepository
                        .findByTypePrestationAndPrestationIdAndDatePrestation(type, prestationId, datePrestation)
                        .isPresent()) {
                    return;
                }
                disponibiliteRepository.saveAndFlush(DisponibilitePrestation.builder()
                        .typePrestation(type)
                        .prestationId(prestationId)
                        .datePrestation(datePrestation)
                        .capaciteTotale(Math.max(0, capaciteTotale))
                        .placesReservees(0)
                        .build());
            });
        } catch (DataIntegrityViolationException concurrentInsert) {
            log.debug("Initialisation concurrente déjà réalisée pour ({}, {}, {})", type, prestationId, datePrestation);
        }
    }
}
