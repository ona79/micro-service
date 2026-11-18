-- Migration V7: Ajout des champs pour l'agenda guide, conflits et droit de réponse aux avis

-- 1. Association directe du guide responsable sur la réservation
ALTER TABLE reservation ADD COLUMN IF NOT EXISTS guide_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_reservation_guide_id ON reservation(guide_id);

-- 2. Droit de réponse du guide aux avis touristiques (ANOM-P1-03)
ALTER TABLE avis ADD COLUMN IF NOT EXISTS reponse_guide VARCHAR(2000);
ALTER TABLE avis ADD COLUMN IF NOT EXISTS date_reponse_guide TIMESTAMP;
ALTER TABLE avis ADD COLUMN IF NOT EXISTS guide_repondeur_id BIGINT;
ALTER TABLE avis ADD COLUMN IF NOT EXISTS guide_repondeur_nom VARCHAR(160);
