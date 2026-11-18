-- =============================================================================
-- Migration V9 (P07.6 - Lot 2) : Permission de contrôle d'accès et scan de billets
-- =============================================================================

INSERT INTO permission (code, module, description) VALUES
    ('VISITE:VALIDER', 'RESERVATION', 'Valider et scanner les billets d''accès aux sites touristiques et prestations')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role, permission_code) VALUES
    ('CONSERVATEUR', 'VISITE:VALIDER'),
    ('GESTIONNAIRE_SITE', 'VISITE:VALIDER'),
    ('ADMINISTRATEUR', 'VISITE:VALIDER')
ON CONFLICT (role, permission_code) DO NOTHING;
