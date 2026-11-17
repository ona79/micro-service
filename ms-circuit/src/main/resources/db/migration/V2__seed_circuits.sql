-- =============================================================================
-- Migration V2 : Données de référence pour ms-circuit (Circuits Casamance)
-- =============================================================================

INSERT INTO circuit (id, nom_circuit, description_circuit, difficulte, duree_estimee, distance_totale, places_max, prix)
VALUES
(
    1,
    'Boucle Mémorielle et Culturelle de Casamance',
    'Grand périple mémoriel et culturel reliant le Mémorial du Joola à Ziguinchor, la cathédrale Saint-Antoine et les cases traditionnelles d''Enampore.',
    'MOYEN',
    240,
    45.0,
    20,
    25000.0
),
(
    2,
    'Trésors de Basse-Casamance',
    'Immersion au cœur des traditions diolas : visite de la cathédrale de Ziguinchor, des bolongs et des cases à impluvium d''Enampore.',
    'FACILE',
    180,
    55.0,
    15,
    15000.0
);

SELECT setval(pg_get_serial_sequence('circuit', 'id'), (SELECT MAX(id) FROM circuit));

INSERT INTO etape (id, ordre, duree_visite, patrimoine_id, circuit_id)
VALUES
(1, 1, 60, 1, 1),
(2, 2, 90, 3, 1),
(3, 3, 90, 5, 1),
(4, 1, 60, 3, 2),
(5, 2, 120, 5, 2);

SELECT setval(pg_get_serial_sequence('etape', 'id'), (SELECT MAX(id) FROM etape));
