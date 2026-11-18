-- =============================================================================
-- Migration V6 (P04) : Permission de remboursement simulé pour l'administration
-- =============================================================================

INSERT INTO permission (code, module, description) VALUES
    ('PAIEMENT:REMBOURSER', 'PAIEMENT', 'Simulation d''un remboursement intégral par un administrateur')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role, permission_code)
SELECT 'ADMINISTRATEUR', code FROM permission
WHERE code = 'PAIEMENT:REMBOURSER'
  AND NOT EXISTS (
    SELECT 1 FROM role_permission rp
    WHERE rp.role = 'ADMINISTRATEUR' AND rp.permission_code = permission.code
);
