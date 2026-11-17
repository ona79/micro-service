-- =============================================================================
-- Migration V1 : Création du schéma DDL de ms-evenement (PostgreSQL)
-- =============================================================================

CREATE TABLE evenement (
    id BIGSERIAL PRIMARY KEY,
    nom_evenement VARCHAR(255) NOT NULL,
    description_evenement VARCHAR(2000),
    type_evenement VARCHAR(50),
    date_debut TIMESTAMP NOT NULL,
    date_fin TIMESTAMP NOT NULL,
    lieu VARCHAR(255),
    capacite_max INTEGER NOT NULL DEFAULT 0,
    prix DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    patrimoine_id BIGINT NOT NULL
);

CREATE INDEX idx_evenement_patrimoine_id ON evenement(patrimoine_id);
CREATE INDEX idx_evenement_date_debut ON evenement(date_debut);
