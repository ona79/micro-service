-- =============================================================================
-- Migration V5 (P05) : Outbox notifications affectation guide sur ms-circuit
-- =============================================================================

CREATE TABLE circuit_notification_outbox (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(80) NOT NULL UNIQUE,
    correlation_id VARCHAR(100) NOT NULL,
    utilisateur_id BIGINT NOT NULL,
    destinataire VARCHAR(255) NOT NULL,
    sujet VARCHAR(255) NOT NULL,
    contenu VARCHAR(2000) NOT NULL,
    type_evenement VARCHAR(64) NOT NULL,
    cible_type VARCHAR(40) NOT NULL,
    cible_id BIGINT NOT NULL,
    idempotency_key VARCHAR(160) NOT NULL,
    statut VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
    tentatives INTEGER NOT NULL DEFAULT 0,
    prochaine_tentative_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP,
    dernier_erreur VARCHAR(1000)
);

CREATE INDEX idx_circuit_outbox_statut_retry
    ON circuit_notification_outbox(statut, prochaine_tentative_at);
