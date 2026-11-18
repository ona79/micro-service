-- V8: Attribution des permissions de gestion et validation des guides au rôle CONSERVATEUR
INSERT INTO role_permission (role, permission_code) VALUES
    ('CONSERVATEUR', 'GUIDE:LIRE'),
    ('CONSERVATEUR', 'GUIDE:VALIDER'),
    ('CONSERVATEUR', 'GUIDE:SUSPENDRE')
ON CONFLICT (role, permission_code) DO NOTHING;
