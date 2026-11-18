-- V8: Attribution des permissions de gestion et validation des guides au rôle CONSERVATEUR
INSERT INTO role_permission (role_code, permission_code) VALUES
    ('CONSERVATEUR', 'GUIDE:LIRE'),
    ('CONSERVATEUR', 'GUIDE:VALIDER'),
    ('CONSERVATEUR', 'GUIDE:SUSPENDRE')
ON CONFLICT DO NOTHING;
