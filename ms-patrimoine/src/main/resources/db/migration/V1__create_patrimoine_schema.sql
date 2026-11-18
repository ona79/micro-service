-- =============================================================================
-- Migration V1 : Création du schéma DDL de ms-patrimoine (PostgreSQL)
-- =============================================================================

CREATE TABLE patrimoine (
    id BIGSERIAL PRIMARY KEY,
    nom_patrimoine VARCHAR(255) NOT NULL,
    code_patrimoine VARCHAR(255) NOT NULL UNIQUE,
    description_patrimoine VARCHAR(2000),
    historique_patrimoine VARCHAR(2000),
    adresse_patrimoine VARCHAR(255),
    capacite_patrimoine INTEGER NOT NULL DEFAULT 0,
    latitude_patrimoine REAL NOT NULL DEFAULT 0.0,
    longitude_patrimoine REAL NOT NULL DEFAULT 0.0
);

CREATE INDEX idx_patrimoine_code ON patrimoine(code_patrimoine);
