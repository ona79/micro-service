-- =============================================================================
-- Migration V2 : Données de référence pour ms-reservation
-- =============================================================================

INSERT INTO reservation (id, nom_client, email_client, telephone_client, nombre_places, date_reservation, type_reservation, statut, montant_total, circuit_id, evenement_id)
VALUES
(
    1,
    'Diop',
    'moussa.diop@zig.univ.sn',
    '+221771234567',
    2,
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    'CIRCUIT',
    'CONFIRMEE',
    50000.0,
    1,
    NULL
),
(
    2,
    'Sagna',
    'awa.sagna@zig.univ.sn',
    '+221778889900',
    3,
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    'EVENEMENT',
    'CONFIRMEE',
    15000.0,
    NULL,
    1
);

SELECT setval(pg_get_serial_sequence('reservation', 'id'), (SELECT MAX(id) FROM reservation));
