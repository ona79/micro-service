-- =============================================================================
-- Migration V5 (P03-CORRECTION) : Permissions granulaires de publication,
-- d'annulation et d'archivage pour le cœur métier touristique (Patrimoine,
-- Circuit, Événement) avec séparation stricte entre création/modification
-- et publication/archivage.
-- =============================================================================

INSERT INTO permission (code, module, description) VALUES
    ('PATRIMOINE:PUBLIER', 'PATRIMOINE', 'Validation et publication officielle d''une fiche patrimoine'),
    ('PATRIMOINE:ARCHIVER', 'PATRIMOINE', 'Archivage traçable d''une fiche patrimoine'),
    ('CIRCUIT:PUBLIER', 'CIRCUIT', 'Validation et publication officielle d''un circuit touristique'),
    ('CIRCUIT:ARCHIVER', 'CIRCUIT', 'Archivage traçable d''un circuit touristique'),
    ('EVENEMENT:PUBLIER', 'EVENEMENT', 'Validation et publication officielle d''un événement culturel'),
    ('EVENEMENT:ANNULER', 'EVENEMENT', 'Annulation officielle d''un événement programmé'),
    ('EVENEMENT:ARCHIVER', 'EVENEMENT', 'Archivage traçable d''un événement')
ON CONFLICT (code) DO NOTHING;

-- CONSERVATEUR : publication et archivage du patrimoine
INSERT INTO role_permission (role, permission_code)
SELECT 'CONSERVATEUR', code FROM permission
WHERE code IN ('PATRIMOINE:PUBLIER', 'PATRIMOINE:ARCHIVER')
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role = 'CONSERVATEUR' AND rp.permission_code = permission.code
);

-- GESTIONNAIRE_SITE : publication, annulation et archivage des circuits et événements
INSERT INTO role_permission (role, permission_code)
SELECT 'GESTIONNAIRE_SITE', code FROM permission
WHERE code IN (
    'CIRCUIT:PUBLIER', 'CIRCUIT:ARCHIVER',
    'EVENEMENT:PUBLIER', 'EVENEMENT:ANNULER', 'EVENEMENT:ARCHIVER'
)
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role = 'GESTIONNAIRE_SITE' AND rp.permission_code = permission.code
);

-- ADMINISTRATEUR : l'ensemble des nouvelles permissions de gouvernance catalogue
INSERT INTO role_permission (role, permission_code)
SELECT 'ADMINISTRATEUR', code FROM permission
WHERE code IN (
    'PATRIMOINE:PUBLIER', 'PATRIMOINE:ARCHIVER',
    'CIRCUIT:PUBLIER', 'CIRCUIT:ARCHIVER',
    'EVENEMENT:PUBLIER', 'EVENEMENT:ANNULER', 'EVENEMENT:ARCHIVER'
)
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role = 'ADMINISTRATEUR' AND rp.permission_code = permission.code
);
