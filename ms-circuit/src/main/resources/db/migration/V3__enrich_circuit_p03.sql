-- =============================================================================
-- Migration V3 (P03) : Enrichissement du domaine Circuit Touristique (ms-circuit)
-- Présentation touristique, moyens de déplacement, informations pratiques,
-- statuts (BROUILLON, SOUMIS, PUBLIE, ARCHIVE), mode de calcul des distances
-- et traçabilité d'audit. Aucune clé étrangère inter-bases.
-- =============================================================================

ALTER TABLE circuit
    ADD COLUMN IF NOT EXISTS presentation_touristique VARCHAR(2000),
    ADD COLUMN IF NOT EXISTS moyen_transport VARCHAR(50) NOT NULL DEFAULT 'MIXTE',
    ADD COLUMN IF NOT EXISTS zone_geographique VARCHAR(50) NOT NULL DEFAULT 'BASSE_CASAMANCE',
    ADD COLUMN IF NOT EXISTS point_depart VARCHAR(150),
    ADD COLUMN IF NOT EXISTS point_arrivee VARCHAR(150),
    ADD COLUMN IF NOT EXISTS informations_pratiques VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS mode_calcul_distance VARCHAR(60) NOT NULL DEFAULT 'ESTIMATION_ORTHODROMIQUE_INDICATIVE',
    ADD COLUMN IF NOT EXISTS statut_circuit VARCHAR(30) NOT NULL DEFAULT 'PUBLIE',
    ADD COLUMN IF NOT EXISTS donnee_demonstration BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS cree_par_id BIGINT,
    ADD COLUMN IF NOT EXISTS modifie_par_id BIGINT,
    ADD COLUMN IF NOT EXISTS valide_par_id BIGINT,
    ADD COLUMN IF NOT EXISTS guide_responsable_id BIGINT,
    ADD COLUMN IF NOT EXISTS motif_statut VARCHAR(500),
    ADD COLUMN IF NOT EXISTS date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_publication TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_archivage TIMESTAMP;

ALTER TABLE etape
    ADD COLUMN IF NOT EXISTS description_etape VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS moyen_transport VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_circuit_statut ON circuit(statut_circuit);
CREATE INDEX IF NOT EXISTS idx_circuit_difficulte ON circuit(difficulte);
CREATE INDEX IF NOT EXISTS idx_circuit_zone ON circuit(zone_geographique);

UPDATE circuit SET
    presentation_touristique = '[Donnée de démonstration pédagogique] Parcours mémoriel et culturel permettant de relier l''histoire maritime contemporaine de Ziguinchor à l''architecture vernaculaire du royaume Bandial.',
    moyen_transport = 'MINIBUS',
    zone_geographique = 'BASSE_CASAMANCE',
    point_depart = 'Esplanade du Fleuve, Ziguinchor',
    point_arrivee = 'Enampore, Basse-Casamance',
    informations_pratiques = 'Départ matinal conseillé à 08h00. Prévoir tenue sobre pour le Mémorial du Joola et bouteille d''eau.',
    image_url = '/assets/circuits/boucle-memorielle.jpg',
    mode_calcul_distance = 'ESTIMATION_ORTHODROMIQUE_INDICATIVE',
    statut_circuit = 'PUBLIE',
    donnee_demonstration = TRUE,
    date_publication = CURRENT_TIMESTAMP
WHERE id = 1;

UPDATE circuit SET
    presentation_touristique = '[Donnée de démonstration pédagogique] Découverte douce des paysages fluviaux, de l''héritage colonial de Ziguinchor et des impluviums traditionnels de Basse-Casamance.',
    moyen_transport = 'MIXTE',
    zone_geographique = 'BASSE_CASAMANCE',
    point_depart = 'Centre-ville, Ziguinchor',
    point_arrivee = 'Enampore, Basse-Casamance',
    informations_pratiques = 'Accessible à tous les publics. Accompagnement par un guide local certifié.',
    image_url = '/assets/circuits/tresors-basse-casamance.jpg',
    mode_calcul_distance = 'ESTIMATION_ORTHODROMIQUE_INDICATIVE',
    statut_circuit = 'PUBLIE',
    donnee_demonstration = TRUE,
    date_publication = CURRENT_TIMESTAMP
WHERE id = 2;

UPDATE etape SET
    description_etape = 'Recueillement et visite commentée du sanctuaire mémoriel sur les berges du fleuve Casamance.',
    moyen_transport = 'PIED'
WHERE id = 1;

UPDATE etape SET
    description_etape = 'Découverte de l''architecture soudano-coloniale et de l''histoire urbaine de Ziguinchor.',
    moyen_transport = 'MINIBUS'
WHERE id = 2;

UPDATE etape SET
    description_etape = 'Immersion dans l''habitat traditionnel diola à impluvium et rencontre avec les habitants d''Enampore.',
    moyen_transport = 'MINIBUS'
WHERE id = 3;

UPDATE etape SET
    description_etape = 'Visite guidée du cœur historique de Ziguinchor autour de la Cathédrale Saint-Antoine.',
    moyen_transport = 'PIED'
WHERE id = 4;

UPDATE etape SET
    description_etape = 'Traversée vers le royaume Bandial et découverte des cases à impluvium et fromagers sacrés.',
    moyen_transport = 'VEHICULE_4X4'
WHERE id = 5;
