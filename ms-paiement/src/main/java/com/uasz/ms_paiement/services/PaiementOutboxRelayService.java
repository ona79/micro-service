package com.uasz.ms_paiement.services;

import com.uasz.ms_paiement.clients.ReservationClient;
import com.uasz.ms_paiement.dto.EvenementPaiementAckDto;
import com.uasz.ms_paiement.dto.EvenementPaiementNotificationRequest;
import com.uasz.ms_paiement.entities.Paiement;
import com.uasz.ms_paiement.entities.PaiementHistorique;
import com.uasz.ms_paiement.entities.PaiementOutbox;
import com.uasz.ms_paiement.entities.StatutOutbox;
import com.uasz.ms_paiement.repositories.PaiementOutboxRepository;
import com.uasz.ms_paiement.repositories.PaiementRepository;
import com.uasz.ms_paiement.security.SecurityUserContext;
import com.uasz.ms_paiement.security.SecurityUserContextHolder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Supplier;

/**
 * Relais de l'Outbox transactionnelle de ms-paiement vers ms-reservation.
 * Garantit qu'un paiement accepté n'est jamais perdu si ms-reservation est temporairement indisponible.
 */
@Slf4j
@Service
public class PaiementOutboxRelayService {

    private static final int MAX_RETRIES_BEFORE_BACKOFF_CAP = 5;

    private final PaiementOutboxRepository outboxRepository;
    private final PaiementRepository paiementRepository;
    private final ReservationClient reservationClient;
    private final PlatformTransactionManager transactionManager;

    public PaiementOutboxRelayService(
            PaiementOutboxRepository outboxRepository,
            PaiementRepository paiementRepository,
            ReservationClient reservationClient
    ) {
        this(outboxRepository, paiementRepository, reservationClient, null);
    }

    @Autowired
    public PaiementOutboxRelayService(
            PaiementOutboxRepository outboxRepository,
            PaiementRepository paiementRepository,
            ReservationClient reservationClient,
            @Autowired(required = false) PlatformTransactionManager transactionManager
    ) {
        this.outboxRepository = outboxRepository;
        this.paiementRepository = paiementRepository;
        this.reservationClient = reservationClient;
        this.transactionManager = transactionManager;
    }

    public boolean tenterLivraison(Long outboxId) {
        return executeInNewTx(() -> doTenterLivraison(outboxId));
    }

    private boolean doTenterLivraison(Long outboxId) {
        PaiementOutbox event = outboxRepository.findByIdForUpdate(outboxId).orElse(null);
        if (event == null || event.getStatut() != StatutOutbox.EN_ATTENTE) {
            return true;
        }

        LocalDateTime now = LocalDateTime.now(Paiement.CASAMANCE_ZONE);
        SecurityUserContext previousContext = SecurityUserContextHolder.getContext();
        try {
            if (previousContext == null && event.getUtilisateurId() != null) {
                SecurityUserContextHolder.setContext(new SecurityUserContext(
                        event.getUtilisateurId(),
                        event.getUtilisateurRole() != null ? event.getUtilisateurRole() : "SYSTEM",
                        event.getUtilisateurEmail(),
                        true,
                        "ms-paiement"
                ));
            }

            EvenementPaiementAckDto ack = reservationClient.notifierEvenementPaiement(
                    event.getReservationId(),
                    EvenementPaiementNotificationRequest.builder()
                            .eventId(event.getEventId())
                            .correlationId(event.getCorrelationId())
                            .paiementId(event.getPaiementId())
                            .referenceTransaction(event.getReferenceTransaction())
                            .typeEvenement(event.getEventType())
                            .montant(event.getMontant())
                            .devise(event.getDevise())
                            .motif(event.getMotif())
                            .build()
            );

            Paiement paiement = paiementRepository.findByIdForUpdate(event.getPaiementId()).orElse(null);
            if (ack != null && ack.isAccepte()) {
                event.setStatut(StatutOutbox.TRAITE);
                event.setProcessedAt(now);
                event.setDernierErreur(null);
                if (paiement != null) {
                    paiement.setSynchroReservationStatut("SYNCHRONISEE");
                    paiementRepository.save(paiement);
                }
                outboxRepository.save(event);
                return true;
            }

            String reason = ack != null ? (ack.getCodeRejet() + " : " + ack.getMessage()) : "Rejet sans détail";
            event.setStatut(StatutOutbox.ECHEC_DEFINITIF);
            event.setProcessedAt(now);
            event.setDernierErreur(reason);
            if (paiement != null) {
                paiement.setSynchroReservationStatut(
                        ack != null && ack.getCodeRejet() != null ? "REJETEE_" + ack.getCodeRejet() : "REJETEE");
                paiement.getHistorique().add(PaiementHistorique.builder()
                        .paiement(paiement)
                        .ancienStatut(paiement.getStatut())
                        .nouveauStatut(paiement.getStatut())
                        .acteurType("SYSTEM")
                        .correlationId(event.getCorrelationId())
                        .motif("Rejet de synchronisation côté ms-reservation : " + reason)
                        .dateTransition(now)
                        .build());
                paiementRepository.save(paiement);
            }
            outboxRepository.save(event);
            return false;
        } catch (Exception ex) {
            int attempt = event.getTentatives() + 1;
            long delaySeconds = Math.min(300L, 10L * (1L << Math.min(attempt, MAX_RETRIES_BEFORE_BACKOFF_CAP)));
            event.setTentatives(attempt);
            event.setProchaineTentativeAt(now.plusSeconds(delaySeconds));
            event.setDernierErreur(truncate(ex.getMessage(), 950));
            outboxRepository.save(event);

            paiementRepository.findByIdForUpdate(event.getPaiementId()).ifPresent(p -> {
                p.setSynchroReservationStatut("EN_ATTENTE_REPRISE");
                paiementRepository.save(p);
            });
            log.warn("Livraison outbox {} (réservation {}) différée (tentative {}) : {}",
                    event.getEventId(), event.getReservationId(), attempt, ex.getMessage());
            return false;
        } finally {
            if (previousContext != null) {
                SecurityUserContextHolder.setContext(previousContext);
            } else {
                SecurityUserContextHolder.clear();
            }
        }
    }

    @Scheduled(fixedDelay = 15000)
    public int relayerEvenementsEnAttente() {
        LocalDateTime now = LocalDateTime.now(Paiement.CASAMANCE_ZONE);
        List<Long> dueIds = executeReadOnly(() -> {
            List<PaiementOutbox> list = outboxRepository
                    .findByStatutAndProchaineTentativeAtLessThanEqualOrderByCreatedAtAsc(StatutOutbox.EN_ATTENTE, now);
            return list == null ? List.of() : list.stream().map(PaiementOutbox::getId).toList();
        });
        int processed = 0;
        for (Long id : dueIds) {
            if (tenterLivraison(id)) {
                processed++;
            }
        }
        return processed;
    }

    public int forcerRejeuToutEnAttente() {
        List<Long> pendingIds = executeReadOnly(() -> {
            List<PaiementOutbox> list = outboxRepository.findByStatutOrderByCreatedAtAsc(StatutOutbox.EN_ATTENTE);
            return list == null ? List.of() : list.stream().map(PaiementOutbox::getId).toList();
        });
        int processed = 0;
        for (Long id : pendingIds) {
            if (tenterLivraison(id)) {
                processed++;
            }
        }
        return processed;
    }

    private boolean executeInNewTx(Supplier<Boolean> work) {
        if (transactionManager == null) {
            return Boolean.TRUE.equals(work.get());
        }
        TransactionTemplate tpl = new TransactionTemplate(transactionManager);
        tpl.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return Boolean.TRUE.equals(tpl.execute(status -> work.get()));
    }

    private <T> T executeReadOnly(Supplier<T> work) {
        if (transactionManager == null) {
            return work.get();
        }
        TransactionTemplate tpl = new TransactionTemplate(transactionManager);
        tpl.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tpl.setReadOnly(true);
        return tpl.execute(status -> work.get());
    }

    private String truncate(String s, int maxLen) {
        if (s == null) return null;
        return s.length() <= maxLen ? s : s.substring(0, maxLen);
    }
}
