-- =============================================================================
-- Migration V2 : Données de référence pour ms-paiement (Transactions Simulées)
-- =============================================================================

INSERT INTO paiement (id, reference_transaction, reservation_id, montant, mode_paiement, statut, date_paiement)
VALUES
(
    1,
    'PAY-TX-2026-0001',
    1,
    50000.0,
    'WAVE',
    'VALIDE',
    CURRENT_TIMESTAMP - INTERVAL '5 days'
),
(
    2,
    'PAY-TX-2026-0002',
    2,
    15000.0,
    'ORANGE_MONEY',
    'VALIDE',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
);

SELECT setval(pg_get_serial_sequence('paiement', 'id'), (SELECT MAX(id) FROM paiement));
