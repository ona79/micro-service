-- =============================================================================
-- Migration V2 : Données de référence pour ms-utilisateur (Comptes Démo UASZ)
-- =============================================================================

INSERT INTO utilisateur (id, nom, prenom, email, mot_de_passe, telephone, role, actif, date_inscription)
VALUES
(
    1,
    'Faty',
    'Lamine',
    'lamine.faty@univ-zig.sn',
    '$2a$10$p47f2bjYWHdCzix3ok.WEe3a6vBlrh7iVAanASqZGDNkyQ.Zg3.5C',
    '+221770000001',
    'ADMINISTRATEUR',
    TRUE,
    CURRENT_TIMESTAMP - INTERVAL '30 days'
),
(
    2,
    'Diop',
    'Moussa',
    'moussa.diop@zig.univ.sn',
    '$2a$10$9dP9hYjWbsPXBc3A8JtfKOqjxpBmb8.Ht1/h8eY2/fRz0M5GKSYpW',
    '+221771234567',
    'TOURISTE',
    TRUE,
    CURRENT_TIMESTAMP - INTERVAL '15 days'
),
(
    3,
    'Sagna',
    'Awa',
    'awa.sagna@zig.univ.sn',
    '$2a$10$9l9ghTAFd3dHek6.a61OWe8mPok5n8008d6wPT1WJaXaAF1Ln/Sam',
    '+221778889900',
    'GESTIONNAIRE_SITE',
    TRUE,
    CURRENT_TIMESTAMP - INTERVAL '20 days'
);

SELECT setval(pg_get_serial_sequence('utilisateur', 'id'), (SELECT MAX(id) FROM utilisateur));
