-- =============================================================================
-- Migration V7 (P05) : Profils Guides Touristiques, Permissions RBAC & Outbox
-- =============================================================================

-- 1. Permissions P05 (Guides, Avis, Modération, Notifications)
INSERT INTO permission (code, module, description) VALUES
    ('GUIDE:LIRE', 'GUIDE', 'Consultation des profils publics de guides touristiques'),
    ('GUIDE:GERER_PROPRE_PROFIL', 'GUIDE', 'Création, édition et soumission de son propre profil de guide'),
    ('GUIDE:VALIDER', 'GUIDE', 'Validation ou rejet d''un profil de guide touristique'),
    ('GUIDE:SUSPENDRE', 'GUIDE', 'Suspension ou désactivation d''un profil de guide touristique'),
    ('AVIS:LIRE', 'AVIS', 'Consultation des avis et évaluations publiés'),
    ('AVIS:CREER', 'AVIS', 'Dépôt d''un avis vérifié suite à une prestation réalisée'),
    ('AVIS:MODIFIER_PROPRE', 'AVIS', 'Modification de son propre avis'),
    ('AVIS:SUPPRIMER_PROPRE', 'AVIS', 'Suppression de son propre avis'),
    ('AVIS:SIGNALER', 'AVIS', 'Signalement d''un avis ou contenu inapproprié'),
    ('AVIS:MODERER', 'AVIS', 'Examen et décision de modération sur les avis et signalements'),
    ('NOTIFICATION:LIRE_PROPRE', 'NOTIFICATION', 'Consultation de ses propres notifications'),
    ('NOTIFICATION:GERER_PROPRE', 'NOTIFICATION', 'Marquage lu/non-lu de ses propres notifications'),
    ('NOTIFICATION:LIRE_TOUT', 'NOTIFICATION', 'Consultation globale des notifications plateforme'),
    ('NOTIFICATION:RELANCER', 'NOTIFICATION', 'Relance des notifications en échec ou en attente')
ON CONFLICT (code) DO NOTHING;

-- 2. Affectation RBAC des nouvelles permissions P05
INSERT INTO role_permission (role, permission_code)
SELECT v.role, v.code
FROM (VALUES
    ('TOURISTE', 'GUIDE:LIRE'),
    ('TOURISTE', 'AVIS:LIRE'),
    ('TOURISTE', 'AVIS:CREER'),
    ('TOURISTE', 'AVIS:MODIFIER_PROPRE'),
    ('TOURISTE', 'AVIS:SUPPRIMER_PROPRE'),
    ('TOURISTE', 'AVIS:SIGNALER'),
    ('TOURISTE', 'NOTIFICATION:LIRE_PROPRE'),
    ('TOURISTE', 'NOTIFICATION:GERER_PROPRE'),

    ('GUIDE', 'GUIDE:LIRE'),
    ('GUIDE', 'GUIDE:GERER_PROPRE_PROFIL'),
    ('GUIDE', 'AVIS:LIRE'),
    ('GUIDE', 'AVIS:SIGNALER'),
    ('GUIDE', 'NOTIFICATION:LIRE_PROPRE'),
    ('GUIDE', 'NOTIFICATION:GERER_PROPRE'),

    ('CONSERVATEUR', 'GUIDE:LIRE'),
    ('CONSERVATEUR', 'AVIS:LIRE'),
    ('CONSERVATEUR', 'AVIS:SIGNALER'),
    ('CONSERVATEUR', 'NOTIFICATION:LIRE_PROPRE'),
    ('CONSERVATEUR', 'NOTIFICATION:GERER_PROPRE'),

    ('GESTIONNAIRE_SITE', 'GUIDE:LIRE'),
    ('GESTIONNAIRE_SITE', 'GUIDE:VALIDER'),
    ('GESTIONNAIRE_SITE', 'GUIDE:SUSPENDRE'),
    ('GESTIONNAIRE_SITE', 'AVIS:LIRE'),
    ('GESTIONNAIRE_SITE', 'AVIS:SIGNALER'),
    ('GESTIONNAIRE_SITE', 'AVIS:MODERER'),
    ('GESTIONNAIRE_SITE', 'NOTIFICATION:LIRE_PROPRE'),
    ('GESTIONNAIRE_SITE', 'NOTIFICATION:GERER_PROPRE'),

    ('ADMINISTRATEUR', 'GUIDE:LIRE'),
    ('ADMINISTRATEUR', 'GUIDE:VALIDER'),
    ('ADMINISTRATEUR', 'GUIDE:SUSPENDRE'),
    ('ADMINISTRATEUR', 'AVIS:LIRE'),
    ('ADMINISTRATEUR', 'AVIS:CREER'),
    ('ADMINISTRATEUR', 'AVIS:MODIFIER_PROPRE'),
    ('ADMINISTRATEUR', 'AVIS:SUPPRIMER_PROPRE'),
    ('ADMINISTRATEUR', 'AVIS:SIGNALER'),
    ('ADMINISTRATEUR', 'AVIS:MODERER'),
    ('ADMINISTRATEUR', 'NOTIFICATION:LIRE_PROPRE'),
    ('ADMINISTRATEUR', 'NOTIFICATION:GERER_PROPRE'),
    ('ADMINISTRATEUR', 'NOTIFICATION:LIRE_TOUT'),
    ('ADMINISTRATEUR', 'NOTIFICATION:RELANCER')
) AS v(role, code)
WHERE EXISTS (SELECT 1 FROM permission p WHERE p.code = v.code)
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role = v.role AND rp.permission_code = v.code
);

-- 3. Table des profils guides professionnels
CREATE TABLE guide_profil (
    id BIGSERIAL PRIMARY KEY,
    utilisateur_id BIGINT NOT NULL UNIQUE REFERENCES utilisateur(id) ON DELETE CASCADE,
    presentation_courte VARCHAR(500) NOT NULL,
    biographie TEXT NOT NULL,
    langues_parlees VARCHAR(300) NOT NULL,
    specialites VARCHAR(500) NOT NULL,
    zones_intervention VARCHAR(400) NOT NULL,
    annees_experience INTEGER NOT NULL DEFAULT 0,
    numero_carte_professionnelle VARCHAR(100),
    documents_justificatifs VARCHAR(1000),
    tarif_journalier_indicatif NUMERIC(12, 2),
    devise VARCHAR(10) NOT NULL DEFAULT 'XOF',
    disponible BOOLEAN NOT NULL DEFAULT TRUE,
    visibilite_publique BOOLEAN NOT NULL DEFAULT FALSE,
    statut_validation VARCHAR(40) NOT NULL DEFAULT 'BROUILLON',
    motif_decision VARCHAR(500),
    valide_par_id BIGINT,
    date_soumission TIMESTAMP,
    date_validation TIMESTAMP,
    date_suspension TIMESTAMP,
    date_desactivation TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_guide_profil_statut_visibilite
    ON guide_profil(statut_validation, visibilite_publique);

-- 4. Historique immuable des décisions de validation des guides
CREATE TABLE guide_validation_historique (
    id BIGSERIAL PRIMARY KEY,
    guide_profil_id BIGINT NOT NULL REFERENCES guide_profil(id) ON DELETE CASCADE,
    ancien_statut VARCHAR(40),
    nouveau_statut VARCHAR(40) NOT NULL,
    acteur_id BIGINT,
    acteur_role VARCHAR(40),
    motif VARCHAR(500),
    correlation_id VARCHAR(100),
    date_transition TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_guide_hist_profil ON guide_validation_historique(guide_profil_id, date_transition DESC);

-- 5. Outbox transactionnelle de notifications métier (ms-utilisateur -> ms-notification)
CREATE TABLE utilisateur_notification_outbox (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(80) NOT NULL UNIQUE,
    correlation_id VARCHAR(100) NOT NULL,
    utilisateur_id BIGINT NOT NULL,
    destinataire VARCHAR(255) NOT NULL,
    sujet VARCHAR(255) NOT NULL,
    contenu VARCHAR(2000) NOT NULL,
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

CREATE INDEX idx_user_outbox_statut_retry
    ON utilisateur_notification_outbox(statut, prochaine_tentative_at);

-- 6. Données de référence : profil validé du guide Alassane Badji (utilisateur_id = 5)
INSERT INTO guide_profil (
    id, utilisateur_id, presentation_courte, biographie, langues_parlees, specialites,
    zones_intervention, annees_experience, numero_carte_professionnelle, documents_justificatifs,
    tarif_journalier_indicatif, devise, disponible, visibilite_publique, statut_validation,
    motif_decision, valide_par_id, date_soumission, date_validation, created_at, updated_at
)
SELECT
    1,
    5,
    'Guide certifié du royaume du Kasa, spécialiste de l''écotourisme en pirogue et de l''architecture à impluvium.',
    'Originaire d''Oussouye, Alassane Badji accompagne les visiteurs depuis plus de huit ans à travers les bolongs de Basse-Casamance, les cases à impluvium d''Enampore et l''île historique de Carabane, avec une approche respectueuse des traditions locales.',
    'Français, Diola, Wolof, Anglais',
    'Écotourisme en pirogue, Architecture Diola à impluvium, Histoire de Carabane',
    'Basse-Casamance, Oussouye, Carabane, Ziguinchor',
    8,
    'GUIDE-CAS-2026-005',
    'Agrément régional du tourisme de Ziguinchor n° 2024-CAS-05',
    25000.00,
    'XOF',
    TRUE,
    TRUE,
    'VALIDE',
    'Profil vérifié et agréé pour la valorisation du patrimoine de Basse-Casamance.',
    1,
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    CURRENT_TIMESTAMP - INTERVAL '14 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    CURRENT_TIMESTAMP - INTERVAL '14 days'
WHERE EXISTS (SELECT 1 FROM utilisateur WHERE id = 5)
  AND NOT EXISTS (SELECT 1 FROM guide_profil WHERE utilisateur_id = 5);

INSERT INTO guide_validation_historique (
    guide_profil_id, ancien_statut, nouveau_statut, acteur_id, acteur_role, motif, correlation_id, date_transition
)
SELECT
    gp.id, 'EN_ATTENTE_VALIDATION', 'VALIDE', 1, 'ADMINISTRATEUR',
    'Validation initiale du profil de guide de référence.', 'SEED-GUIDE-1',
    CURRENT_TIMESTAMP - INTERVAL '14 days'
FROM guide_profil gp
WHERE gp.utilisateur_id = 5
  AND NOT EXISTS (SELECT 1 FROM guide_validation_historique WHERE guide_profil_id = gp.id);

SELECT setval(pg_get_serial_sequence('guide_profil', 'id'), COALESCE((SELECT MAX(id) FROM guide_profil), 1));
SELECT setval(pg_get_serial_sequence('guide_validation_historique', 'id'), COALESCE((SELECT MAX(id) FROM guide_validation_historique), 1));
