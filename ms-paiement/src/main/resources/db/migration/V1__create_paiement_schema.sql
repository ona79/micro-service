-- =============================================================================
-- Migration V1 : Création du schéma de ms-paiement (PostgreSQL)
-- =============================================================================

CREATE TABLE IF NOT EXISTS paiement (
    id BIGSERIAL PRIMARY KEY,
    reference_transaction VARCHAR(255) NOT NULL UNIQUE,
    reservation_id BIGINT NOT NULL,
    montant DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    mode_paiement VARCHAR(50) NOT NULL,
    statut VARCHAR(50) NOT NULL,
    date_paiement TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_paiement_reference ON paiement(reference_transaction);
CREATE INDEX IF NOT EXISTS idx_paiement_reservation_id ON paiement(reservation_id);
