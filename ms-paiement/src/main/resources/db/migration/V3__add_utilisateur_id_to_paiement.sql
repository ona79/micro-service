-- =============================================================================
-- Migration V3 : Ajout de utilisateur_id pour contrôle RBAC et protection IDOR
-- =============================================================================

ALTER TABLE paiement ADD COLUMN utilisateur_id BIGINT;

UPDATE paiement SET utilisateur_id = 2 WHERE id = 1;
UPDATE paiement SET utilisateur_id = 3 WHERE id = 2;

CREATE INDEX idx_paiement_utilisateur_id ON paiement(utilisateur_id);
