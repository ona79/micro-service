-- =============================================================================
-- Migration V2 : Données de référence pour ms-notification (Notifications Démo)
-- =============================================================================

INSERT INTO notification (id, destinataire, sujet, contenu, canal, statut, date_envoi, reservation_id)
VALUES
(
    1,
    'moussa.diop@zig.univ.sn',
    'Confirmation de réservation - De Gorée à la Casamance',
    'Votre réservation n° 1 pour 2 personnes a été validée avec succès.',
    'EMAIL',
    'ENVOYE',
    CURRENT_TIMESTAMP - INTERVAL '5 days',
    1
),
(
    2,
    'awa.sagna@zig.univ.sn',
    'Confirmation d''inscription - Festival International de Danses',
    'Votre réservation n° 2 pour 3 places est confirmée.',
    'EMAIL',
    'ENVOYE',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    2
);

SELECT setval(pg_get_serial_sequence('notification', 'id'), (SELECT MAX(id) FROM notification));
