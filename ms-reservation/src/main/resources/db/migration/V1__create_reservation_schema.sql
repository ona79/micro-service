-- =============================================================================
-- Migration V1 : Création du schéma DDL de ms-reservation (PostgreSQL)
-- =============================================================================

CREATE TABLE reservation (
    id BIGSERIAL PRIMARY KEY,
    nom_client VARCHAR(255) NOT NULL,
    email_client VARCHAR(255) NOT NULL,
    telephone_client VARCHAR(255),
    nombre_places INTEGER NOT NULL,
    date_reservation TIMESTAMP NOT NULL,
    type_reservation VARCHAR(50) NOT NULL,
    statut VARCHAR(50) NOT NULL,
    montant_total DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    circuit_id BIGINT,
    evenement_id BIGINT
);

CREATE INDEX idx_reservation_circuit_id ON reservation(circuit_id);
CREATE INDEX idx_reservation_evenement_id ON reservation(evenement_id);
CREATE INDEX idx_reservation_email ON reservation(email_client);
