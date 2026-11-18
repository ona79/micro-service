-- =============================================================================
-- Migration V4 (P04) : Workflow complet de réservation, participants, historique
-- des transitions, verrous de disponibilité par prestation/date et idempotence
-- =============================================================================

-- 1. Conversion monétaire vers NUMERIC(12,2) et enrichissement métier de reservation
ALTER TABLE reservation
    ALTER COLUMN montant_total TYPE NUMERIC(12, 2) USING ROUND(COALESCE(montant_total, 0)::numeric, 2),
    ALTER COLUMN montant_total SET DEFAULT 0.00;

ALTER TABLE reservation
    ADD COLUMN IF NOT EXISTS reference_reservation VARCHAR(64),
    ADD COLUMN IF NOT EXISTS prix_unitaire NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS devise VARCHAR(10) NOT NULL DEFAULT 'XOF',
    ADD COLUMN IF NOT EXISTS date_prestation DATE,
    ADD COLUMN IF NOT EXISTS creneau_prestation VARCHAR(120),
    ADD COLUMN IF NOT EXISTS commentaire VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS reference_paiement VARCHAR(100),
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_confirmation TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_annulation TIMESTAMP,
    ADD COLUMN IF NOT EXISTS motif_statut VARCHAR(500),
    ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128),
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

UPDATE reservation
SET reference_reservation = 'RES-2026-' || LPAD(id::text, 6, '0')
WHERE reference_reservation IS NULL;

UPDATE reservation
SET prix_unitaire = CASE
        WHEN nombre_places > 0 THEN ROUND(montant_total / nombre_places, 2)
        ELSE 0.00
    END,
    date_prestation = CASE
        WHEN id = 1 THEN DATE '2026-12-01'
        WHEN id = 2 THEN DATE '2026-12-10'
        ELSE CURRENT_DATE + 7
    END,
    reference_paiement = CASE
        WHEN id = 1 THEN 'PAY-TX-2026-0001'
        WHEN id = 2 THEN 'PAY-TX-2026-0002'
        ELSE reference_paiement
    END,
    date_creation = COALESCE(date_reservation, CURRENT_TIMESTAMP),
    date_modification = COALESCE(date_reservation, CURRENT_TIMESTAMP),
    date_confirmation = CASE
        WHEN statut = 'CONFIRMEE' THEN COALESCE(date_reservation, CURRENT_TIMESTAMP)
        ELSE NULL
    END
WHERE id IN (1, 2) OR date_prestation IS NULL;

ALTER TABLE reservation
    ALTER COLUMN reference_reservation SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_reservation_reference') THEN
        ALTER TABLE reservation ADD CONSTRAINT uq_reservation_reference UNIQUE (reference_reservation);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reservation_places_pos') THEN
        ALTER TABLE reservation ADD CONSTRAINT chk_reservation_places_pos CHECK (nombre_places > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reservation_montant_nonneg') THEN
        ALTER TABLE reservation ADD CONSTRAINT chk_reservation_montant_nonneg CHECK (montant_total >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reservation_devise') THEN
        ALTER TABLE reservation ADD CONSTRAINT chk_reservation_devise CHECK (devise = 'XOF');
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_reservation_statut ON reservation(statut);
CREATE INDEX IF NOT EXISTS idx_reservation_date_prestation ON reservation(date_prestation);
CREATE INDEX IF NOT EXISTS idx_reservation_expires_at ON reservation(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reservation_user_idempotency
    ON reservation(utilisateur_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- 2. Table des participants associés à une réservation
CREATE TABLE IF NOT EXISTS reservation_participant (
    id BIGSERIAL PRIMARY KEY,
    reservation_id BIGINT NOT NULL REFERENCES reservation(id) ON DELETE CASCADE,
    nom_complet VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    telephone VARCHAR(50),
    categorie VARCHAR(30) NOT NULL DEFAULT 'ADULTE'
);

CREATE INDEX IF NOT EXISTS idx_res_participant_res_id ON reservation_participant(reservation_id);

-- 3. Table d'audit immuable des transitions de statut
CREATE TABLE IF NOT EXISTS reservation_historique (
    id BIGSERIAL PRIMARY KEY,
    reservation_id BIGINT NOT NULL REFERENCES reservation(id) ON DELETE CASCADE,
    ancien_statut VARCHAR(40),
    nouveau_statut VARCHAR(40) NOT NULL,
    acteur_id BIGINT,
    acteur_role VARCHAR(50),
    acteur_type VARCHAR(30) NOT NULL,
    correlation_id VARCHAR(64),
    reference_paiement VARCHAR(100),
    motif VARCHAR(500),
    date_transition TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_res_historique_res_id ON reservation_historique(reservation_id);
CREATE INDEX IF NOT EXISTS idx_res_historique_date ON reservation_historique(date_transition);

-- 4. Table transactionnelle de contrôle de capacité & verrouillage pessimiste par prestation et date
CREATE TABLE IF NOT EXISTS disponibilite_prestation (
    id BIGSERIAL PRIMARY KEY,
    type_prestation VARCHAR(30) NOT NULL,
    prestation_id BIGINT NOT NULL,
    date_prestation DATE NOT NULL,
    capacite_totale INTEGER NOT NULL DEFAULT 0,
    places_reservees INTEGER NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dispo_prestation UNIQUE (type_prestation, prestation_id, date_prestation),
    CONSTRAINT chk_dispo_nonneg CHECK (places_reservees >= 0)
);

CREATE INDEX IF NOT EXISTS idx_dispo_lookup ON disponibilite_prestation(type_prestation, prestation_id, date_prestation);

-- Initialisation des compteurs pour les réservations seedées
INSERT INTO disponibilite_prestation (type_prestation, prestation_id, date_prestation, capacite_totale, places_reservees)
VALUES
    ('CIRCUIT', 1, DATE '2026-12-01', 20, 2),
    ('EVENEMENT', 1, DATE '2026-12-10', 300, 3)
ON CONFLICT (type_prestation, prestation_id, date_prestation) DO NOTHING;

-- 5. Table d'idempotence des événements reçus depuis ms-paiement (Outbox consumer)
CREATE TABLE IF NOT EXISTS reservation_evenement_recu (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL UNIQUE,
    reservation_id BIGINT NOT NULL REFERENCES reservation(id) ON DELETE CASCADE,
    type_evenement VARCHAR(50) NOT NULL,
    reference_transaction VARCHAR(100),
    date_reception TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_res_evt_recu_res_id ON reservation_evenement_recu(reservation_id);

-- Journal initial pour les réservations de démonstration V2
INSERT INTO reservation_historique (reservation_id, ancien_statut, nouveau_statut, acteur_id, acteur_role, acteur_type, reference_paiement, motif)
SELECT 1, 'EN_ATTENTE_PAIEMENT', 'CONFIRMEE', 2, 'TOURISTE', 'SYSTEM', 'PAY-TX-2026-0001', 'Données de démonstration initiales'
WHERE EXISTS (SELECT 1 FROM reservation WHERE id = 1)
  AND NOT EXISTS (SELECT 1 FROM reservation_historique WHERE reservation_id = 1);

INSERT INTO reservation_historique (reservation_id, ancien_statut, nouveau_statut, acteur_id, acteur_role, acteur_type, reference_paiement, motif)
SELECT 2, 'EN_ATTENTE_PAIEMENT', 'CONFIRMEE', 3, 'GESTIONNAIRE_SITE', 'SYSTEM', 'PAY-TX-2026-0002', 'Données de démonstration initiales'
WHERE EXISTS (SELECT 1 FROM reservation WHERE id = 2)
  AND NOT EXISTS (SELECT 1 FROM reservation_historique WHERE reservation_id = 2);
