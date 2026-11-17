-- =============================================================================
-- Migration V1 : Création du schéma DDL de ms-circuit (PostgreSQL)
-- =============================================================================

CREATE TABLE circuit (
    id BIGSERIAL PRIMARY KEY,
    nom_circuit VARCHAR(255) NOT NULL,
    description_circuit VARCHAR(2000),
    difficulte VARCHAR(50),
    duree_estimee INTEGER NOT NULL DEFAULT 0,
    distance_totale DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    places_max INTEGER NOT NULL DEFAULT 0,
    prix DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

CREATE TABLE etape (
    id BIGSERIAL PRIMARY KEY,
    ordre INTEGER NOT NULL,
    duree_visite INTEGER NOT NULL,
    patrimoine_id BIGINT NOT NULL,
    circuit_id BIGINT NOT NULL,
    CONSTRAINT fk_etape_circuit FOREIGN KEY (circuit_id) REFERENCES circuit(id) ON DELETE CASCADE
);

CREATE INDEX idx_etape_circuit_id ON etape(circuit_id);
CREATE INDEX idx_etape_patrimoine_id ON etape(patrimoine_id);
