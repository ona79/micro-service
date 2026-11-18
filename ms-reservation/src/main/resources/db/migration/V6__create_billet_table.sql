-- =============================================================================
-- Migration V6 (P07.6 - Lot 2) : Billetterie Électronique, Tokens QR & Contrôle d'Accès
-- =============================================================================

CREATE TABLE billet (
    id BIGSERIAL PRIMARY KEY,
    reservation_id BIGINT NOT NULL REFERENCES reservation(id) ON DELETE CASCADE,
    numero_billet VARCHAR(64) NOT NULL UNIQUE,
    token_qr VARCHAR(128) NOT NULL UNIQUE,
    nom_beneficiaire VARCHAR(150),
    statut VARCHAR(30) NOT NULL DEFAULT 'VALIDE', -- VALIDE, CONSOMME, ANNULE, EXPIRE
    date_utilisation TIMESTAMP,
    valide_par VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_billet_reservation ON billet(reservation_id);
CREATE INDEX idx_billet_token ON billet(token_qr);
