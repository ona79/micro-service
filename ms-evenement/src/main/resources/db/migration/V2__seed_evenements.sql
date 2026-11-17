-- =============================================================================
-- Migration V2 : Données de référence pour ms-evenement
-- =============================================================================

INSERT INTO evenement (id, nom_evenement, description_evenement, type_evenement, date_debut, date_fin, lieu, capacite_max, prix, patrimoine_id)
VALUES
(
    1,
    'Festival International de Danses Traditionnelles de Casamance',
    'Célébration des danses et rythmes rituels de Casamance au pied de la Cathédrale Saint-Antoine.',
    'FESTIVAL',
    '2026-12-10 16:00:00',
    '2026-12-12 23:00:00',
    'Esplanade Saint-Antoine, Ziguinchor',
    300,
    5000.0,
    3
),
(
    2,
    'Journées Mémorielles et Colloque de Gorée',
    'Colloque international et visites nocturnes commémoratives à la Maison des Esclaves.',
    'EXPOSITION',
    '2026-11-25 09:00:00',
    '2026-11-26 18:00:00',
    'Maison des Esclaves, Île de Gorée',
    100,
    3000.0,
    1
),
(
    3,
    'Atelier d''Architecture Vernaculaire et Impluvium',
    'Transmission des techniques séculaires de charpente et de recueil des eaux en pays diola.',
    'ATELIER',
    '2026-12-05 08:30:00',
    '2026-12-06 17:00:00',
    'Enampore, Basse-Casamance',
    40,
    8000.0,
    5
);

SELECT setval('evenement_id_seq', (SELECT MAX(id) FROM evenement));
