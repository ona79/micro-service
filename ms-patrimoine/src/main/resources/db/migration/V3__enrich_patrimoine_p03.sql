-- =============================================================================
-- Migration V3 (P03) : Enrichissement du domaine Patrimoine Touristique de Casamance
-- Catégories, zones géographiques, informations culturelles et pratiques,
-- médias, workflow de publication/archivage et traçabilité d'audit.
-- =============================================================================

ALTER TABLE patrimoine
    ADD COLUMN IF NOT EXISTS categorie_patrimoine VARCHAR(50) NOT NULL DEFAULT 'CULTUREL',
    ADD COLUMN IF NOT EXISTS type_patrimoine VARCHAR(120),
    ADD COLUMN IF NOT EXISTS zone_geographique VARCHAR(50) NOT NULL DEFAULT 'BASSE_CASAMANCE',
    ADD COLUMN IF NOT EXISTS localite VARCHAR(150),
    ADD COLUMN IF NOT EXISTS informations_culturelles VARCHAR(2000),
    ADD COLUMN IF NOT EXISTS horaires_ouverture VARCHAR(255),
    ADD COLUMN IF NOT EXISTS tarif_entree DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS informations_pratiques VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS galerie_medias VARCHAR(2000),
    ADD COLUMN IF NOT EXISTS statut_publication VARCHAR(30) NOT NULL DEFAULT 'PUBLIE',
    ADD COLUMN IF NOT EXISTS donnee_demonstration BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS cree_par_id BIGINT,
    ADD COLUMN IF NOT EXISTS modifie_par_id BIGINT,
    ADD COLUMN IF NOT EXISTS valide_par_id BIGINT,
    ADD COLUMN IF NOT EXISTS motif_statut VARCHAR(500),
    ADD COLUMN IF NOT EXISTS date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_modification TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_publication TIMESTAMP,
    ADD COLUMN IF NOT EXISTS date_archivage TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_patrimoine_statut ON patrimoine(statut_publication);
CREATE INDEX IF NOT EXISTS idx_patrimoine_categorie ON patrimoine(categorie_patrimoine);
CREATE INDEX IF NOT EXISTS idx_patrimoine_zone ON patrimoine(zone_geographique);
CREATE INDEX IF NOT EXISTS idx_patrimoine_localite ON patrimoine(localite);

-- Enrichissement des 6 fiches de démonstration initiales (donnee_demonstration = TRUE)
UPDATE patrimoine SET
    categorie_patrimoine = 'HISTORIQUE',
    type_patrimoine = 'Monument et sanctuaire mémoriel',
    zone_geographique = 'BASSE_CASAMANCE',
    localite = 'Ziguinchor',
    informations_culturelles = '[Donnée de démonstration pédagogique] Lieu de recueillement civique et mémoriel dédié aux victimes du naufrage du navire Le Joola. Tenue et attitude respectueuses demandées.',
    horaires_ouverture = 'Mardi au Dimanche : 09h00 - 18h00',
    tarif_entree = 1000.0,
    informations_pratiques = 'Accès par l''esplanade portuaire de Boucotte. Visites guidées pédagogiques sur réservation.',
    image_url = '/assets/patrimoines/memorial-joola.jpg',
    statut_publication = 'PUBLIE',
    donnee_demonstration = TRUE,
    date_publication = CURRENT_TIMESTAMP
WHERE code_patrimoine = 'PAT-ZIG-001';

UPDATE patrimoine SET
    categorie_patrimoine = 'HISTORIQUE',
    type_patrimoine = 'Île historique et ancien comptoir colonial',
    zone_geographique = 'BASSE_CASAMANCE',
    localite = 'Carabane (Oussouye)',
    informations_culturelles = '[Donnée de démonstration pédagogique] Île sans voitures à l''embouchure du fleuve Casamance, mêlant mémoire maritime, vestiges missionnaires du XIXe siècle et culture insulaire diola.',
    horaires_ouverture = 'Tous les jours : 08h00 - 18h30 (selon navettes fluviales)',
    tarif_entree = 1500.0,
    informations_pratiques = 'Traversée en pirogue depuis Elinkine (env. 30 min). Prévoir chapeau, eau et espèces en FCFA.',
    image_url = '/assets/patrimoines/ile-carabane.jpg',
    statut_publication = 'PUBLIE',
    donnee_demonstration = TRUE,
    date_publication = CURRENT_TIMESTAMP
WHERE code_patrimoine = 'PAT-CRB-002';

UPDATE patrimoine SET
    categorie_patrimoine = 'ARCHITECTURAL',
    type_patrimoine = 'Édifice religieux soudano-colonial',
    zone_geographique = 'BASSE_CASAMANCE',
    localite = 'Ziguinchor',
    informations_culturelles = '[Donnée de démonstration pédagogique] Haut lieu architectural et spirituel du centre historique de Ziguinchor, illustrant le dialogue interreligieux et la paix sociale en Casamance.',
    horaires_ouverture = 'Tous les jours : 08h30 - 19h00 (hors offices liturgiques)',
    tarif_entree = 0.0,
    informations_pratiques = 'Accès libre en dehors des célébrations. Respect du calme requis à l''intérieur.',
    image_url = '/assets/patrimoines/cathedrale-ziguinchor.jpg',
    statut_publication = 'PUBLIE',
    donnee_demonstration = TRUE,
    date_publication = CURRENT_TIMESTAMP
WHERE code_patrimoine = 'PAT-ZIG-003';

UPDATE patrimoine SET
    categorie_patrimoine = 'CULTUREL',
    type_patrimoine = 'Sanctuaire royal et forêt sacrée',
    zone_geographique = 'BASSE_CASAMANCE',
    localite = 'Oussouye',
    informations_culturelles = '[Donnée de démonstration pédagogique] Siège de la royauté sacrée du Kasa (Huluf). Les rites agraires (Humabeul) et la médiation coutumière y structurent la cohésion communautaire.',
    horaires_ouverture = 'Sur audience et accompagnement par un guide local agréé',
    tarif_entree = 2000.0,
    informations_pratiques = 'Interdiction formelle de pénétrer dans les bois sacrés sans autorisation coutumière. Photographie soumise à accord préalable.',
    image_url = '/assets/patrimoines/oullouye-bois-sacre.jpg',
    statut_publication = 'PUBLIE',
    donnee_demonstration = TRUE,
    date_publication = CURRENT_TIMESTAMP
WHERE code_patrimoine = 'PAT-OSS-004';

UPDATE patrimoine SET
    categorie_patrimoine = 'ARCHITECTURAL',
    type_patrimoine = 'Habitat vernaculaire diola à impluvium',
    zone_geographique = 'BASSE_CASAMANCE',
    localite = 'Enampore',
    informations_culturelles = '[Donnée de démonstration pédagogique] Chef-d''œuvre d''architecture bioclimatique en terre crue (banco), bois de rônier et paille tressée, organisé autour d''un impluvium central.',
    horaires_ouverture = 'Tous les jours : 08h30 - 17h30',
    tarif_entree = 1500.0,
    informations_pratiques = 'Situé à 22 km à l''ouest de Ziguinchor. Redevance communautaire reversée à l''entretien du campement villageois.',
    image_url = '/assets/patrimoines/case-impluvium-enampore.jpg',
    statut_publication = 'PUBLIE',
    donnee_demonstration = TRUE,
    date_publication = CURRENT_TIMESTAMP
WHERE code_patrimoine = 'PAT-CAS-005';

UPDATE patrimoine SET
    categorie_patrimoine = 'HISTORIQUE',
    type_patrimoine = 'Fortification historique et berge fluviale',
    zone_geographique = 'MOYENNE_CASAMANCE',
    localite = 'Sédhiou',
    informations_culturelles = '[Donnée de démonstration pédagogique] Témoin historique des échanges fluviaux et des résistances en Moyenne-Casamance (Pakao et Balantacounda).',
    horaires_ouverture = 'Lundi au Dimanche : 08h00 - 18h00',
    tarif_entree = 1000.0,
    informations_pratiques = 'Accessible par la route nationale ou les berges du fleuve Casamance à Sédhiou.',
    image_url = '/assets/patrimoines/fort-sedhiou.jpg',
    statut_publication = 'PUBLIE',
    donnee_demonstration = TRUE,
    date_publication = CURRENT_TIMESTAMP
WHERE code_patrimoine = 'PAT-SED-006';

-- Ajout de 2 fiches complémentaires couvrant les catégories NATUREL et IMMATERIEL ainsi que la Haute-Casamance
INSERT INTO patrimoine (
    id, nom_patrimoine, code_patrimoine, description_patrimoine, historique_patrimoine,
    adresse_patrimoine, capacite_patrimoine, latitude_patrimoine, longitude_patrimoine,
    categorie_patrimoine, type_patrimoine, zone_geographique, localite,
    informations_culturelles, horaires_ouverture, tarif_entree, informations_pratiques,
    image_url, statut_publication, donnee_demonstration, date_publication
)
VALUES
(
    7,
    'Mangroves et Bolongs d''Elinkine - Pointe Saint-Georges',
    'PAT-OSS-007',
    'Réseau écologique de bolongs bordés de palétuviers, zone d''observation des lamantins, dauphins à bosse et oiseaux migrateurs de l''estuaire de la Casamance.',
    'Écosystème lagunaire et estuarien majeur d''Afrique de l''Ouest, intimement lié aux pratiques traditionnelles de riziculture inondée et de collecte d''huîtres de mangrove.',
    'Pointe Saint-Georges / Elinkine, Département d''Oussouye, Basse-Casamance',
    150,
    12.6167,
    -16.5833,
    'NATUREL',
    'Écosystème de mangrove et estuaire fluvial',
    'BASSE_CASAMANCE',
    'Pointe Saint-Georges (Oussouye)',
    '[Donnée de démonstration pédagogique] Les bolongs constituent un patrimoine bioculturel vivant où la préservation des palétuviers accompagne les savoir-faire halieutiques locaux.',
    'Tous les jours : 07h00 - 18h00 (selon marées)',
    2500.0,
    'Excursion en pirogue avec gilet de sauvetage obligatoire. Respect strict de la faune aquatique.',
    '/assets/patrimoines/mangroves-casamance.jpg',
    'PUBLIE',
    TRUE,
    CURRENT_TIMESTAMP
),
(
    8,
    'Tradition du Kankurang et Musiques du Fouladou',
    'PAT-KOL-008',
    'Patrimoine culturel immatériel associant les rites initiatiques mandingues du Kankurang et les traditions musicales peules (riiti, flûte tambin) de Moyenne et Haute-Casamance.',
    'Transmis de génération en génération dans les communautés du Pakao et du Fouladou (Sédhiou, Kolda, Vélingara), cet héritage immatériel garantit l''éducation civique et l''entraide sociale.',
    'Espace Culturel Régional du Fouladou, Kolda, Haute-Casamance',
    220,
    12.8833,
    -14.9500,
    'IMMATERIEL',
    'Rite initiatique, tradition orale et musique traditionnelle',
    'HAUTE_CASAMANCE',
    'Kolda',
    '[Donnée de démonstration pédagogique] Le Kankurang est inscrit sur la Liste représentative du patrimoine culturel immatériel de l''humanité (UNESCO). Les sorties rituelles obéissent à des règles coutumières strictes.',
    'Exposition permanente : Lundi au Samedi 09h00 - 17h30',
    1000.0,
    'Renseignements auprès du centre culturel régional de Kolda et des associations patrimoniales locales.',
    '/assets/patrimoines/kankurang-fouladou.jpg',
    'PUBLIE',
    TRUE,
    CURRENT_TIMESTAMP
)
ON CONFLICT (code_patrimoine) DO NOTHING;

SELECT setval(pg_get_serial_sequence('patrimoine', 'id'), (SELECT MAX(id) FROM patrimoine));
