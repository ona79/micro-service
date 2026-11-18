-- =============================================================================
-- Migration V3 (P05) : Fiabilisation, Idempotence, Lecture & Reprise Notifications
-- =============================================================================

-- Correction critique de l'incohérence d'énumération issue de V2 ('ENVOYE' -> 'ENVOYEE')
UPDATE notification
SET statut = 'ENVOYEE'
WHERE statut = 'ENVOYE';

ALTER TABLE notification
    ADD COLUMN IF NOT EXISTS utilisateur_id BIGINT,
    ADD COLUMN IF NOT EXISTS type_evenement VARCHAR(64) NOT NULL DEFAULT 'GENERAL',
    ADD COLUMN IF NOT EXISTS cible_type VARCHAR(40),
    ADD COLUMN IF NOT EXISTS cible_id BIGINT,
    ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(160),
    ADD COLUMN IF NOT EXISTS lue BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS date_lecture TIMESTAMP,
    ADD COLUMN IF NOT EXISTS tentatives INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS max_tentatives INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS dernier_erreur VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS prochaine_tentative_at TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_notification_idempotency_key'
    ) THEN
        ALTER TABLE notification
            ADD CONSTRAINT uq_notification_idempotency_key UNIQUE (idempotency_key);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_utilisateur_lue_date
    ON notification(utilisateur_id, lue, date_envoi DESC);

CREATE INDEX IF NOT EXISTS idx_notification_statut_retry
    ON notification(statut, prochaine_tentative_at);

CREATE INDEX IF NOT EXISTS idx_notification_correlation
    ON notification(correlation_id);

UPDATE notification
SET utilisateur_id = 2,
    type_evenement = 'RESERVATION_CONFIRMEE',
    cible_type = 'RESERVATION',
    cible_id = reservation_id,
    idempotency_key = 'SEED:NOTIF:1'
WHERE id = 1 AND idempotency_key IS NULL;

UPDATE notification
SET utilisateur_id = 3,
    type_evenement = 'RESERVATION_CONFIRMEE',
    cible_type = 'RESERVATION',
    cible_id = reservation_id,
    idempotency_key = 'SEED:NOTIF:2'
WHERE id = 2 AND idempotency_key IS NULL;
