-- =============================================================================
-- Migration V2 : Données de référence pour ms-circuit
-- =============================================================================

INSERT INTO circuit (id, nom_circuit, description_circuit, difficulte, duree_estimee, distance_totale, places_max, prix)
VALUES
(
    1,
    'De Gorée à la Casamance',
    'Grand périple mémoriel et culturel reliant l''île de Gorée à Dakar aux sanctuaires et cases traditionnelles de Basse-Casamance.',
    'MOYEN',
    240,
    450.0,
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

SELECT setval('circuit_id_seq', (SELECT MAX(id) FROM circuit));

INSERT INTO etape (ordre, duree_visite, patrimoine_id, circuit_id)
VALUES
(1, 60, 1, 1),
(2, 90, 3, 1),
(3, 90, 5, 1),
(1, 60, 3, 2),
(2, 120, 5, 2);
