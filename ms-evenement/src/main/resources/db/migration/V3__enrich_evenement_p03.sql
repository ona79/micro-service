-- =============================================================================
-- Migration V3 (P03) : Enrichissement du domaine Événement Culturel & Touristique
-- Horaires, localisation, organisateur, conditions d'accès, médias,
-- statuts (BROUILLON, SOUMIS, PUBLIE, TERMINE, ANNULE, ARCHIVE),
-- association optionnelle au patrimoine et traçabilité d'audit.
-- =============================================================================

ALTER TABLE evenement
    ALTER COLUMN patrimoine_id DROP NOT NULL;

ALTER TABLE evenement
    ADD COLUMN IF NOT EXISTS horaires VARCHAR(255),
    ADD COLUMN IF NOT EXISTS zone_geographique VARCHAR(50) NOT NULL DEFAULT 'BASSE_CASAMANCE',
    ADD COLUMN IF NOT EXISTS localite VARCHAR(150),
    ADD COLUMN IF NOT EXISTS organisateur VARCHAR(255),
    ADD COLUMN IF NOT EXISTS contact_organisateur VARCHAR(255),
    ADD COLUMN IF NOT EXISTS conditions_acces VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS support_communication VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS statut_evenement VARCHAR(30) NOT NULL DEFAULT 'PUBLIE',
    ADD COLUMN IF NOT EXISTS motif_annulation VARCHAR(500),
    ADD COLUMN IF NOT EXISTS fuseau_horaire VARCHAR(50) NOT NULL DEFAULT 'Africa/Dakar',
    ADD COLUMN IF NOT EXISTS donnee_demonstration BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS cree_par_id BIGINT,
    ADD COLUMN IF NOT EXISTS modifie_par_id BIGINT,
    ADD COLUMN IF NOT EXISTS valide_par_id BIGINT,
    ADD COLUMN IF NOT EXISTS date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_publication TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_evenement_statut ON evenement(statut_evenement);
CREATE INDEX IF NOT EXISTS idx_evenement_type ON evenement(type_evenement);
CREATE INDEX IF NOT EXISTS idx_evenement_zone ON evenement(zone_geographique);
CREATE INDEX IF NOT EXISTS idx_evenement_date_fin ON evenement(date_fin);

UPDATE evenement SET
    horaires = '16h00 - 23h00',
    zone_geographique = 'BASSE_CASAMANCE',
    localite = 'Ziguinchor',
    organisateur = 'Direction Régionale de la Culture de Ziguinchor [Démo Pédagogique]',
    contact_organisateur = 'culture.ziguinchor@demo-uasz.sn',
    conditions_acces = 'Billet d''entrée requis pour la tribune centrale ; parvis extérieur en accès libre.',
    image_url = '/assets/evenements/festival-danses-casamance.jpg',
    support_communication = 'Affiche officielle et programme bilingue Français / Diola / Mandingue',
    statut_evenement = 'PUBLIE',
    fuseau_horaire = 'Africa/Dakar',
    donnee_demonstration = TRUE,
    date_publication = CURRENT_TIMESTAMP
WHERE id = 1;

UPDATE evenement SET
    horaires = '09h00 - 18h00',
    zone_geographique = 'BASSE_CASAMANCE',
    localite = 'Ziguinchor',
    organisateur = 'Collectif Mémoriel & Département d''Histoire UASZ [Démo Pédagogique]',
    contact_organisateur = 'memoire.joola@demo-uasz.sn',
    conditions_acces = 'Inscription préalable recommandée. Tenue sobre et respect du recueillement exigés.',
    image_url = '/assets/evenements/journees-memorielles-joola.jpg',
    support_communication = 'Livret pédagogique et catalogue des archives exposées',
    statut_evenement = 'PUBLIE',
    fuseau_horaire = 'Africa/Dakar',
    donnee_demonstration = TRUE,
    date_publication = CURRENT_TIMESTAMP
WHERE id = 2;

UPDATE evenement SET
    horaires = '08h30 - 17h00',
    zone_geographique = 'BASSE_CASAMANCE',
    localite = 'Enampore',
    organisateur = 'Coopérative Patrimoniale du Royaume Bandial [Démo Pédagogique]',
    contact_organisateur = 'impluvium.enampore@demo-uasz.sn',
    conditions_acces = 'Limité à 40 participants pour préserver l''intégrité de la case à impluvium.',
    image_url = '/assets/evenements/atelier-impluvium.jpg',
    support_communication = 'Fiche technique sur l''architecture bioclimatique en banco et rônier',
    statut_evenement = 'PUBLIE',
    fuseau_horaire = 'Africa/Dakar',
    donnee_demonstration = TRUE,
    date_publication = CURRENT_TIMESTAMP
WHERE id = 3;
