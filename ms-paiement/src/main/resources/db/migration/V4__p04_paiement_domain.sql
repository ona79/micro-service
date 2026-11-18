-- =============================================================================
-- Migration V4 (P04) : Paiements simulés Wave & Orange Money, cycle de vie complet,
-- NUMERIC(12,2), historique des transitions, idempotence et Outbox transactionnelle
-- =============================================================================

-- 1. Normalisation des statuts seedés hérités de V2 ('VALIDE'/'REUSSI' -> 'ACCEPTE')
UPDATE paiement SET statut = 'ACCEPTE' WHERE statut IN ('VALIDE', 'REUSSI');
UPDATE paiement SET statut = 'REFUSE' WHERE statut = 'ECHEC';

-- 2. Conversion monétaire vers NUMERIC(12,2) et ajout des colonnes P04
ALTER TABLE paiement
    ALTER COLUMN montant TYPE NUMERIC(12, 2) USING ROUND(COALESCE(montant, 0)::numeric, 2),
    ALTER COLUMN montant SET DEFAULT 0.00;

ALTER TABLE paiement
    ADD COLUMN IF NOT EXISTS devise VARCHAR(10) NOT NULL DEFAULT 'XOF',
    ADD COLUMN IF NOT EXISTS est_simule BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS mention_simulation VARCHAR(255) NOT NULL DEFAULT 'PAIEMENT SIMULE P04 - AUCUN TRANSFERT FINANCIER REEL',
    ADD COLUMN IF NOT EXISTS numero_telephone_masque VARCHAR(40),
    ADD COLUMN IF NOT EXISTS jeton_simulation VARCHAR(64),
    ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128),
    ADD COLUMN IF NOT EXISTS motif_decision VARCHAR(500),
    ADD COLUMN IF NOT EXISTS date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_expiration TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_confirmation TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_remboursement TIMESTAMP,
    ADD COLUMN IF NOT EXISTS synchro_reservation_statut VARCHAR(40) NOT NULL DEFAULT 'NON_REQUISE',
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

UPDATE paiement
SET date_creation = COALESCE(date_paiement, CURRENT_TIMESTAMP),
    date_modification = COALESCE(date_paiement, CURRENT_TIMESTAMP),
    date_confirmation = CASE WHEN statut = 'ACCEPTE' THEN COALESCE(date_paiement, CURRENT_TIMESTAMP) ELSE NULL END,
    synchro_reservation_statut = CASE WHEN statut = 'ACCEPTE' THEN 'SYNCHRONISEE' ELSE 'NON_REQUISE' END
WHERE id IN (1, 2) OR synchro_reservation_statut = 'NON_REQUISE';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_paiement_montant_nonneg') THEN
        ALTER TABLE paiement ADD CONSTRAINT chk_paiement_montant_nonneg CHECK (montant >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_paiement_devise') THEN
        ALTER TABLE paiement ADD CONSTRAINT chk_paiement_devise CHECK (devise = 'XOF');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_paiement_simule') THEN
        ALTER TABLE paiement ADD CONSTRAINT chk_paiement_simule CHECK (est_simule = TRUE);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_paiement_statut ON paiement(statut);
CREATE INDEX IF NOT EXISTS idx_paiement_mode ON paiement(mode_paiement);
CREATE INDEX IF NOT EXISTS idx_paiement_correlation ON paiement(correlation_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_paiement_user_idempotency
    ON paiement(utilisateur_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- 3. Table immuable d'historique des transitions de paiement
CREATE TABLE IF NOT EXISTS paiement_historique (
    id BIGSERIAL PRIMARY KEY,
    paiement_id BIGINT NOT NULL REFERENCES paiement(id) ON DELETE CASCADE,
    ancien_statut VARCHAR(40),
    nouveau_statut VARCHAR(40) NOT NULL,
    acteur_id BIGINT,
    acteur_role VARCHAR(50),
    acteur_type VARCHAR(30) NOT NULL,
    correlation_id VARCHAR(64),
    motif VARCHAR(500),
    date_transition TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pay_historique_pay_id ON paiement_historique(paiement_id);

INSERT INTO paiement_historique (paiement_id, ancien_statut, nouveau_statut, acteur_id, acteur_role, acteur_type, motif)
SELECT id, 'EN_COURS', statut, utilisateur_id, 'TOURISTE', 'SYSTEM', 'Historique initialisé (données V2)'
FROM paiement p
WHERE id IN (1, 2)
  AND NOT EXISTS (SELECT 1 FROM paiement_historique ph WHERE ph.paiement_id = p.id);

-- 4. Table Outbox transactionnelle pour cohérence distribuée ms-paiement -> ms-reservation
CREATE TABLE IF NOT EXISTS paiement_outbox (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL UNIQUE,
    correlation_id VARCHAR(64),
    paiement_id BIGINT NOT NULL REFERENCES paiement(id) ON DELETE CASCADE,
    reservation_id BIGINT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    reference_transaction VARCHAR(100) NOT NULL,
    montant NUMERIC(12, 2) NOT NULL,
    devise VARCHAR(10) NOT NULL DEFAULT 'XOF',
    motif VARCHAR(500),
    utilisateur_id BIGINT,
    utilisateur_role VARCHAR(50),
    utilisateur_email VARCHAR(255),
    statut VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
    tentatives INTEGER NOT NULL DEFAULT 0,
    prochaine_tentative_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dernier_erreur VARCHAR(1000),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_pay_outbox_statut_retry ON paiement_outbox(statut, prochaine_tentative_at);
CREATE INDEX IF NOT EXISTS idx_pay_outbox_reservation_id ON paiement_outbox(reservation_id);
