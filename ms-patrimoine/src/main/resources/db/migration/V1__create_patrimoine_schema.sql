-- =============================================================================
-- Migration V1 : Création du schéma de ms-patrimoine (PostgreSQL)
-- =============================================================================

CREATE TABLE IF NOT EXISTS patrimoine (
    id BIGSERIAL PRIMARY KEY,
    nom_patrimoine VARCHAR(255) NOT NULL,
    code_patrimoine VARCHAR(255) NOT NULL UNIQUE,
    description_patrimoine VARCHAR(2000),
    historique_patrimoine VARCHAR(2000),
    adresse_patrimoine VARCHAR(255),
    capacite_patrimoine INT NOT NULL DEFAULT 0,
    latitude_patrimoine REAL NOT NULL DEFAULT 0.0,
    longitude_patrimoine REAL NOT NULL DEFAULT 0.0
);

CREATE INDEX IF NOT EXISTS idx_patrimoine_code ON patrimoine(code_patrimoine);
