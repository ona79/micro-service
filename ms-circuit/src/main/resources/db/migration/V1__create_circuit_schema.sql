-- =============================================================================
-- Migration V1 : Création du schéma de ms-circuit (PostgreSQL)
-- =============================================================================

CREATE TABLE IF NOT EXISTS circuit (
    id BIGSERIAL PRIMARY KEY,
    nom_circuit VARCHAR(255) NOT NULL,
    description_circuit VARCHAR(2000),
    difficulte VARCHAR(50),
    duree_estimee INT NOT NULL DEFAULT 0,
    distance_totale DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    places_max INT NOT NULL DEFAULT 0,
    prix DOUBLE PRECISION NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS etape (
    id BIGSERIAL PRIMARY KEY,
    ordre INT NOT NULL,
    duree_visite INT NOT NULL,
    patrimoine_id BIGINT NOT NULL,
    circuit_id BIGINT,
    CONSTRAINT fk_etape_circuit FOREIGN KEY (circuit_id) REFERENCES circuit(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_etape_circuit_id ON etape(circuit_id);
CREATE INDEX IF NOT EXISTS idx_etape_patrimoine_id ON etape(patrimoine_id);
