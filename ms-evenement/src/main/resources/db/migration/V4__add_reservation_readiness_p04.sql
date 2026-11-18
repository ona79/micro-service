-- =============================================================================
-- Migration V4 (P04) : Contrôle explicite de réservabilité et devise sur evenement
-- Un événement publié n'est PAS automatiquement réservable : ouvert_reservation
-- vaut FALSE par défaut et doit être activé explicitement.
-- =============================================================================

ALTER TABLE evenement
    ADD COLUMN IF NOT EXISTS ouvert_reservation BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS devise VARCHAR(10) NOT NULL DEFAULT 'XOF';

CREATE INDEX IF NOT EXISTS idx_evenement_ouvert_reservation ON evenement(ouvert_reservation);

UPDATE evenement SET devise = 'XOF' WHERE devise IS NULL OR TRIM(devise) = '';

-- Les événements #1 (Festival) et #3 (Atelier) sont explicitement ouverts à la réservation ;
-- l'événement #2 (Journées Mémorielles du Joola) reste en accès libre non réservable.
UPDATE evenement SET ouvert_reservation = TRUE WHERE id IN (1, 3);
UPDATE evenement SET ouvert_reservation = FALSE WHERE id = 2;
