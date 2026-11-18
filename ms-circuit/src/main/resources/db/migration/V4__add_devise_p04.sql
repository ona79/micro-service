-- =============================================================================
-- Migration V4 (P04) : Devise explicite et contraintes tarifaires sur circuit
-- =============================================================================

ALTER TABLE circuit
    ADD COLUMN IF NOT EXISTS devise VARCHAR(10) NOT NULL DEFAULT 'XOF';

UPDATE circuit SET devise = 'XOF' WHERE devise IS NULL OR TRIM(devise) = '';
