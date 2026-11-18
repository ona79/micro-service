-- =============================================================================
-- Migration V5 (P05) : Avis Vérifiés, Modération, Signalements & Notification Outbox
-- =============================================================================

-- 1. Tables P05 : Avis & Évaluations
CREATE TABLE avis (
    id BIGSERIAL PRIMARY KEY,
    auteur_id BIGINT NOT NULL,
    auteur_nom VARCHAR(160) NOT NULL,
    cible_type VARCHAR(30) NOT NULL,
    cible_id BIGINT NOT NULL,
    cible_nom VARCHAR(255),
    reservation_id BIGINT NOT NULL REFERENCES reservation(id),
    note INTEGER NOT NULL CHECK (note >= 1 AND note <= 5),
    commentaire VARCHAR(2000) NOT NULL,
    experience_verifiee BOOLEAN NOT NULL DEFAULT TRUE,
    statut_moderation VARCHAR(30) NOT NULL DEFAULT 'APPROUVE',
    motif_moderation VARCHAR(500),
    modere_par_id BIGINT,
    date_publication TIMESTAMP NOT NULL,
    date_modification TIMESTAMP,
    date_moderation TIMESTAMP,
    CONSTRAINT uq_avis_reservation_cible UNIQUE (reservation_id, cible_type, cible_id)
);

CREATE INDEX idx_avis_cible_statut ON avis(cible_type, cible_id, statut_moderation, date_publication DESC);
CREATE INDEX idx_avis_auteur ON avis(auteur_id, date_publication DESC);

-- 2. Signalements d'avis
CREATE TABLE avis_signalement (
    id BIGSERIAL PRIMARY KEY,
    avis_id BIGINT NOT NULL REFERENCES avis(id) ON DELETE CASCADE,
    signale_par_id BIGINT NOT NULL,
    signale_par_nom VARCHAR(160) NOT NULL,
    categorie VARCHAR(60) NOT NULL DEFAULT 'CONTENU_INAPPROPRIE',
    motif VARCHAR(600) NOT NULL,
    statut VARCHAR(40) NOT NULL DEFAULT 'OUVERT',
    decision_commentaire VARCHAR(600),
    traite_par_id BIGINT,
    date_signalement TIMESTAMP NOT NULL,
    date_resolution TIMESTAMP
);

CREATE INDEX idx_signalement_statut ON avis_signalement(statut, date_signalement DESC);
CREATE INDEX idx_signalement_avis_statut ON avis_signalement(avis_id, statut);

-- 3. Historique immuable de modération
CREATE TABLE avis_moderation_historique (
    id BIGSERIAL PRIMARY KEY,
    avis_id BIGINT NOT NULL REFERENCES avis(id) ON DELETE CASCADE,
    signalement_id BIGINT,
    ancien_statut VARCHAR(30),
    nouveau_statut VARCHAR(30) NOT NULL,
    acteur_id BIGINT NOT NULL,
    acteur_role VARCHAR(40) NOT NULL,
    justification VARCHAR(600) NOT NULL,
    correlation_id VARCHAR(100),
    date_decision TIMESTAMP NOT NULL
);

CREATE INDEX idx_avis_mod_hist_avis ON avis_moderation_historique(avis_id, date_decision DESC);

-- 4. Outbox transactionnelle de notifications métier (ms-reservation -> ms-notification)
CREATE TABLE reservation_notification_outbox (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(80) NOT NULL UNIQUE,
    correlation_id VARCHAR(100) NOT NULL,
    utilisateur_id BIGINT,
    destinataire VARCHAR(255) NOT NULL,
    sujet VARCHAR(255) NOT NULL,
    contenu VARCHAR(2000) NOT NULL,
    reservation_id BIGINT,
    type_evenement VARCHAR(64) NOT NULL,
    cible_type VARCHAR(40) NOT NULL,
    cible_id BIGINT NOT NULL,
    idempotency_key VARCHAR(160) NOT NULL,
    statut VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE',
    tentatives INTEGER NOT NULL DEFAULT 0,
    prochaine_tentative_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP,
    dernier_erreur VARCHAR(1000)
);

CREATE INDEX idx_res_outbox_statut_retry
    ON reservation_notification_outbox(statut, prochaine_tentative_at);

-- 5. Données de référence P05 : expériences réalisées pour démo vérifiée
INSERT INTO reservation (
    id, reference_reservation, utilisateur_id, nom_client, email_client, telephone_client,
    nombre_places, date_prestation, date_reservation, type_reservation, statut,
    prix_unitaire, montant_total, devise, circuit_id, evenement_id,
    reference_paiement, date_creation, date_modification, date_confirmation, correlation_id, version
)
SELECT
    3, 'RES-2026-000003', 2, 'Moussa Diop', 'moussa.diop@zig.univ.sn', '+221771234567',
    2, CURRENT_DATE - 5, CURRENT_TIMESTAMP - INTERVAL '7 days', 'CIRCUIT', 'CONFIRMEE',
    20000.00, 40000.00, 'XOF', 1, NULL,
    'PAY-TX-2026-0003', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '6 days',
    CURRENT_TIMESTAMP - INTERVAL '6 days', 'SEED-RES-3', 0
WHERE NOT EXISTS (SELECT 1 FROM reservation WHERE id = 3);

INSERT INTO reservation (
    id, reference_reservation, utilisateur_id, nom_client, email_client, telephone_client,
    nombre_places, date_prestation, date_reservation, type_reservation, statut,
    prix_unitaire, montant_total, devise, circuit_id, evenement_id,
    reference_paiement, date_creation, date_modification, date_confirmation, correlation_id, version
)
SELECT
    4, 'RES-2026-000004', 2, 'Moussa Diop', 'moussa.diop@zig.univ.sn', '+221771234567',
    1, CURRENT_DATE - 2, CURRENT_TIMESTAMP - INTERVAL '4 days', 'EVENEMENT', 'CONFIRMEE',
    5000.00, 5000.00, 'XOF', NULL, 1,
    'PAY-TX-2026-0004', CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP - INTERVAL '3 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days', 'SEED-RES-4', 0
WHERE NOT EXISTS (SELECT 1 FROM reservation WHERE id = 4);

INSERT INTO avis (
    id, auteur_id, auteur_nom, cible_type, cible_id, cible_nom, reservation_id,
    note, commentaire, experience_verifiee, statut_moderation, date_publication
)
SELECT
    1, 2, 'Moussa Diop', 'CIRCUIT', 1, 'Boucle Mémorielle et Culturelle de Casamance', 3,
    5, 'Visite mémorable du Mémorial du Joola et du comptoir colonial de Carabane. Organisation irréprochable et transmission historique authentique.',
    TRUE, 'APPROUVE', CURRENT_TIMESTAMP - INTERVAL '3 days'
WHERE EXISTS (SELECT 1 FROM reservation WHERE id = 3)
  AND NOT EXISTS (SELECT 1 FROM avis WHERE id = 1);

INSERT INTO avis_moderation_historique (
    id, avis_id, ancien_statut, nouveau_statut, acteur_id, acteur_role, justification, correlation_id, date_decision
)
SELECT
    1, 1, NULL, 'APPROUVE', 2, 'SYSTEM',
    'Publication initiale vérifiée sur réservation confirmée RES-2026-000003.',
    'SEED-AVIS-1', CURRENT_TIMESTAMP - INTERVAL '3 days'
WHERE EXISTS (SELECT 1 FROM avis WHERE id = 1)
  AND NOT EXISTS (SELECT 1 FROM avis_moderation_historique WHERE id = 1);

SELECT setval(pg_get_serial_sequence('reservation', 'id'), COALESCE((SELECT MAX(id) FROM reservation), 1));
SELECT setval(pg_get_serial_sequence('avis', 'id'), COALESCE((SELECT MAX(id) FROM avis), 1));
SELECT setval(pg_get_serial_sequence('avis_moderation_historique', 'id'), COALESCE((SELECT MAX(id) FROM avis_moderation_historique), 1));
