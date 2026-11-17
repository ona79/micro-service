-- =============================================================================
-- Migration V1 : Création du schéma de ms-notification (PostgreSQL)
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification (
    id BIGSERIAL PRIMARY KEY,
    destinataire VARCHAR(255) NOT NULL,
    sujet VARCHAR(255) NOT NULL,
    contenu VARCHAR(2000),
    canal VARCHAR(50) NOT NULL,
    statut VARCHAR(50) NOT NULL,
    date_envoi TIMESTAMP NOT NULL,
    reservation_id BIGINT
);

CREATE INDEX IF NOT EXISTS idx_notification_reservation_id ON notification(reservation_id);
CREATE INDEX IF NOT EXISTS idx_notification_destinataire ON notification(destinataire);
