-- =============================================================================
-- Migration V2 : Données de référence pour ms-patrimoine (Casamance & Sénégal)
-- =============================================================================

INSERT INTO patrimoine (nom_patrimoine, code_patrimoine, description_patrimoine, historique_patrimoine, adresse_patrimoine, capacite_patrimoine, latitude_patrimoine, longitude_patrimoine)
VALUES
(
    'Maison des Esclaves de Gorée',
    'PAT-DKR-001',
    'Monument historique emblématique situé sur l''île de Gorée, dédié à la mémoire de la traite atlantique et célèbre pour sa Porte du voyage sans retour.',
    'Édifiée vers 1776 sur l''île de Gorée et sauvegardée sous l''impulsion du conservateur Boubacar Joseph Ndiaye, elle figure au patrimoine mondial de l''UNESCO depuis 1978.',
    'Île de Gorée, Dakar',
    150,
    14.6672,
    -17.3990
),
(
    'Monument de la Renaissance Africaine',
    'PAT-DKR-002',
    'Statue monumentale en bronze de 52 mètres dominant la presqu''île du Cap-Vert depuis les collines jumelles des Mamelles à Ouakam.',
    'Inauguré le 3 avril 2010 lors du cinquantenaire de l''indépendance du Sénégal, il abrite un musée panoramique retraçant l''histoire des arts et civilisations d''Afrique.',
    'Collines des Mamelles, Ouakam, Dakar',
    500,
    14.7222,
    -17.4950
),
(
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
    'Pont Faidherbe et Île de Saint-Louis',
    'PAT-SLN-004',
    'Ouvrage d''art métallique de 507 mètres franchissant le fleuve Sénégal pour relier l''île historique de Ndar au continent.',
    'Inauguré en 1897 et restauré à l''identique en 2011, le pont Faidherbe est la porte d''entrée de l''île de Saint-Louis, classée au patrimoine mondial de l''UNESCO en l''an 2000.',
    'Île de Ndar, Saint-Louis',
    400,
    16.0278,
    -16.5031
),
(
    'Cases à Impluvium et Fromager d''Enampore',
    'PAT-CAS-005',
    'Architecture traditionnelle diola en banco et chaume dotée d''une toiture annulaire recueillant les eaux de pluie au centre de l''habitat.',
    'Perpétuée depuis plusieurs siècles en Basse-Casamance autour des grands fromagers sacrés, cette ingénierie vernaculaire incarne l''harmonie bioclimatique et communautaire du pays diola.',
    'Enampore, Basse-Casamance, Ziguinchor',
    120,
    12.5014,
    -16.4389
),
(
    'Musée Théodore-Monod d''Art Africain (IFAN)',
    'PAT-DKR-006',
    'L''un des plus anciens musées d''art et d''ethnographie d''Afrique de l''Ouest, conservant plus de 9 000 pièces patrimoniales.',
    'Fondé en 1936 au sein de l''Institut Fondamental d''Afrique Noire (UCAD) sur la place Soweto à Dakar, il est un lieu phare de la Biennale de l''Art Africain Contemporain (Dak''Art).',
    'Place Soweto, Plateau, Dakar',
    250,
    14.6653,
    -17.4367
);
