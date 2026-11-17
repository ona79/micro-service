-- =============================================================================
-- Migration V2 : Données de référence pour ms-patrimoine (Casamance - UASZ)
-- Purge et ancrage territorial intégral en Casamance (Ziguinchor, Carabane, Oussouye, Enampore, Sédhiou)
-- =============================================================================

INSERT INTO patrimoine (id, nom_patrimoine, code_patrimoine, description_patrimoine, historique_patrimoine, adresse_patrimoine, capacite_patrimoine, latitude_patrimoine, longitude_patrimoine)
VALUES
(
    1,
    'Mémorial de la Tragédie du Joola',
    'PAT-ZIG-001',
    'Monument national et sanctuaire de mémoire érigé sur les berges du fleuve Casamance à Ziguinchor, dédié aux disparus du 26 septembre 2002.',
    'Inauguré en janvier 2024 à Ziguinchor, ce haut lieu de mémoire rassemble les archives, objets mémoriels et récits de la plus grande tragédie maritime sénégalaise reliant la Casamance au reste du pays.',
    'Esplanade du Fleuve Casamance, Boucotte, Ziguinchor',
    250,
    12.5833,
    -16.2719
),
(
    2,
    'Île et Ancien Comptoir de Carabane',
    'PAT-CRB-002',
    'Île historique piétonne à l''embouchure du fleuve Casamance, abritant l''ancienne église de mission de 1885 et le cimetière du Capitaine Protet.',
    'Premier comptoir commercial français en Casamance fondé en 1836, Carabane fut la première capitale administrative de la région avant d''être supplantée par Ziguinchor en 1904.',
    'Île de Carabane, Embouchure du Fleuve Casamance, Oussouye',
    200,
    12.5358,
    -16.6978
),
(
    3,
    'Cathédrale Saint-Antoine de Padoue',
    'PAT-ZIG-003',
    'Édifice religieux et patrimonial majeur de la Casamance, reconnaissable à ses arches ocres et son architecture soudano-coloniale.',
    'Érigée au cœur historique de Ziguinchor à proximité des berges du fleuve Casamance, elle témoigne de l''histoire urbaine et culturelle du sud du Sénégal.',
    'Centre-ville, Ziguinchor',
    300,
    12.5833,
    -16.2719
),
(
    4,
    'Sanctuaire Royal et Bois Sacré d''Oussouye',
    'PAT-OSS-004',
    'Résidence du Roi traditionnel d''Oussouye (Maan Sibilumbaye) et haut lieu des traditions animistes, de la royauté sacrée diola et des fêtes agraires (Humabeul).',
    'Centre spirituel et régulateur de paix de la royauté du Kasa en Basse-Casamance, garant des rites agraires, du culte des ancêtres et de l''harmonie sociale entre les villages.',
    'Quartier Royal, Oussouye, Basse-Casamance',
    350,
    12.4850,
    -16.5460
),
(
    5,
    'Cases à Impluvium et Fromagers Sacrés d''Enampore',
    'PAT-CAS-005',
    'Architecture traditionnelle diola en banco et chaume dotée d''une toiture annulaire recueillant les eaux de pluie au centre de l''habitat communautaire.',
    'Perpétuée depuis plusieurs siècles en Basse-Casamance autour des grands fromagers sacrés, cette ingénierie vernaculaire incarne l''harmonie bioclimatique et communautaire du pays Bandial.',
    'Enampore, Royaume Bandial, Basse-Casamance',
    120,
    12.5014,
    -16.4389
),
(
    6,
    'Fort Pinet-Laprade et Tata Historique de Sédhiou',
    'PAT-SED-006',
    'Fortification historique de Moyenne-Casamance dominant le fleuve, vestige des résistances mandingues et des batailles de Fodé Kaba Doumbouya.',
    'Construit sur les berges du fleuve Casamance au XIXe siècle, Sédhiou fut un carrefour commercial et stratégique majeur du royaume mandingue du Pakao et de la Moyenne-Casamance.',
    'Quartier Escale, Berges du Fleuve, Sédhiou, Moyenne-Casamance',
    180,
    12.7081,
    -15.5569
);

SELECT setval(pg_get_serial_sequence('patrimoine', 'id'), (SELECT MAX(id) FROM patrimoine));
