-- =============================================================================
-- Migration V3 : Ajout de la colonne utilisateur_id pour contrôle d'accès BOLA/IDOR
-- =============================================================================

ALTER TABLE reservation ADD COLUMN utilisateur_id BIGINT;

-- Mise à jour des données de démonstration avec les IDs d'utilisateurs correspondants
UPDATE reservation SET utilisateur_id = 2 WHERE email_client = 'moussa.diop@zig.univ.sn';
UPDATE reservation SET utilisateur_id = 3 WHERE email_client = 'awa.sagna@zig.univ.sn';

CREATE INDEX idx_reservation_utilisateur_id ON reservation(utilisateur_id);
