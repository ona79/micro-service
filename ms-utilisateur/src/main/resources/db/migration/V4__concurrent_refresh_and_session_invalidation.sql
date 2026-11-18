-- =============================================================================
-- Migration V4 : Unicité du prédécesseur de Refresh Token (anti-concurrence)
-- et traçabilité de révocation des sessions - Phase P02-CORRECTION
-- =============================================================================

ALTER TABLE refresh_token
    ADD COLUMN IF NOT EXISTS parent_token_hash VARCHAR(64);

ALTER TABLE refresh_token
    ADD CONSTRAINT uk_refresh_token_parent_hash UNIQUE (parent_token_hash);

ALTER TABLE session_utilisateur
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS revocation_reason VARCHAR(255);
