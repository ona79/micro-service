package com.uasz.ms_circuit.services;

import com.uasz.ms_circuit.clients.NotificationClient;
import com.uasz.ms_circuit.dto.NotificationRequest;
import com.uasz.ms_circuit.entities.CircuitNotificationOutbox;
import com.uasz.ms_circuit.entities.StatutOutbox;
import com.uasz.ms_circuit.repositories.CircuitNotificationOutboxRepository;
import com.uasz.ms_circuit.security.SecurityUserContext;
import com.uasz.ms_circuit.security.SecurityUserContextHolder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.function.Supplier;

@Slf4j
@Service
public class CircuitNotificationOutboxRelayService {

    public static final ZoneId CASAMANCE_ZONE = ZoneId.of("Africa/Dakar");
    private static final int MAX_ATTEMPTS_CAP = 5;

    private final CircuitNotificationOutboxRepository outboxRepository;
    private final NotificationClient notificationClient;
    private final PlatformTransactionManager transactionManager;

    @Autowired
    public CircuitNotificationOutboxRelayService(
            CircuitNotificationOutboxRepository outboxRepository,
            @Autowired(required = false) NotificationClient notificationClient,
            @Autowired(required = false) PlatformTransactionManager transactionManager
    ) {
        this.outboxRepository = outboxRepository;
        this.notificationClient = notificationClient;
        this.transactionManager = transactionManager;
    }

    public boolean tenterLivraison(Long outboxId) {
        return Boolean.TRUE.equals(executeInNewTx(() -> doTenterLivraison(outboxId)));
    }

    private boolean doTenterLivraison(Long outboxId) {
        if (notificationClient == null) {
            return false;
        }
        CircuitNotificationOutbox event = outboxRepository.findByIdForUpdate(outboxId).orElse(null);
        if (event == null || event.getStatut() != StatutOutbox.EN_ATTENTE) {
            return true;
        }

        LocalDateTime now = LocalDateTime.now(CASAMANCE_ZONE);
        SecurityUserContext prev = SecurityUserContextHolder.getContext();
        try {
            if (prev == null) {
                SecurityUserContextHolder.setContext(new SecurityUserContext(
                        event.getUtilisateurId(), "SYSTEM", event.getDestinataire(), true, "ms-circuit"));
            }

            notificationClient.envoyerNotification(NotificationRequest.builder()
                    .destinataire(event.getDestinataire())
                    .utilisateurId(event.getUtilisateurId())
                    .sujet(event.getSujet())
                    .contenu(event.getContenu())
                    .canal("EMAIL")
                    .typeEvenement(event.getTypeEvenement())
                    .cibleType(event.getCibleType())
                    .cibleId(event.getCibleId())
                    .correlationId(event.getCorrelationId())
                    .idempotencyKey(event.getIdempotencyKey())
                    .build());

            event.setStatut(StatutOutbox.TRAITE);
            event.setProcessedAt(now);
            event.setDernierErreur(null);
            outboxRepository.save(event);
            return true;
        } catch (Exception ex) {
            int attempt = event.getTentatives() + 1;
            long delaySeconds = Math.min(300L, 10L * (1L << Math.min(attempt, MAX_ATTEMPTS_CAP)));
            event.setTentatives(attempt);
            event.setProchaineTentativeAt(now.plusSeconds(delaySeconds));
            String msg = ex.getMessage() != null ? ex.getMessage() : "ms-notification indisponible";
            event.setDernierErreur(msg.length() <= 1000 ? msg : msg.substring(0, 1000));
            outboxRepository.save(event);
            log.warn("Notification circuit différée (outbox={}, tentative={}) : {}",
                    event.getEventId(), attempt, msg);
            return false;
        } finally {
            if (prev != null) {
                SecurityUserContextHolder.setContext(prev);
            } else {
                SecurityUserContextHolder.clear();
            }
        }
    }

    @Scheduled(fixedDelay = 15000)
    public int relayerEnAttente() {
        LocalDateTime now = LocalDateTime.now(CASAMANCE_ZONE);
        List<Long> dueIds = executeReadOnly(() -> {
            List<CircuitNotificationOutbox> list = outboxRepository
                    .findByStatutAndProchaineTentativeAtLessThanEqualOrderByCreatedAtAsc(StatutOutbox.EN_ATTENTE, now);
            return list == null ? List.of() : list.stream().map(CircuitNotificationOutbox::getId).toList();
        });
        int delivered = 0;
        for (Long id : dueIds) {
            if (tenterLivraison(id)) {
                delivered++;
            }
        }
        return delivered;
    }

    private <T> T executeInNewTx(Supplier<T> work) {
        if (transactionManager == null) {
            return work.get();
        }
        TransactionTemplate tpl = new TransactionTemplate(transactionManager);
        tpl.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return tpl.execute(status -> work.get());
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
}
