-- =============================================================================
-- Migration V3 : Schéma RBAC, Sessions Persistantes, Refresh Tokens & Audit
-- Microservice ms-utilisateur (PostgreSQL 16) - Phase P02
-- =============================================================================

-- 1. Table des permissions atomiques
CREATE TABLE permission (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description VARCHAR(255)
);

-- 2. Table d'association rôles - permissions
CREATE TABLE role_permission (
    id BIGSERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    CONSTRAINT fk_role_perm_code FOREIGN KEY (permission_code) REFERENCES permission(code) ON DELETE CASCADE,
    CONSTRAINT uk_role_perm UNIQUE(role, permission_code)
);

-- 3. Table des sessions actives (révocation persistante)
CREATE TABLE session_utilisateur (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL UNIQUE,
    utilisateur_id BIGINT NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_session_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id) ON DELETE CASCADE
);

-- 4. Table des jetons de renouvellement (Refresh Tokens) avec rotation et détection de rejeu
CREATE TABLE refresh_token (
    id BIGSERIAL PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    family_id VARCHAR(64) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    utilisateur_id BIGINT NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    replaced_by_hash VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    CONSTRAINT fk_refresh_utilisateur FOREIGN KEY (utilisateur_id) REFERENCES utilisateur(id) ON DELETE CASCADE
);

-- 5. Table d'audit de sécurité
CREATE TABLE audit_securite (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_type VARCHAR(50) NOT NULL,
    utilisateur_id BIGINT,
    email VARCHAR(255),
    ip_address VARCHAR(45),
    details TEXT,
    status VARCHAR(20) NOT NULL
);

-- Index pour performances et intégrité
CREATE INDEX idx_role_perm_role ON role_permission(role);
CREATE INDEX idx_session_utilisateur_user ON session_utilisateur(utilisateur_id);
CREATE INDEX idx_session_utilisateur_active ON session_utilisateur(active);
CREATE INDEX idx_refresh_token_family ON refresh_token(family_id);
CREATE INDEX idx_refresh_token_hash ON refresh_token(token_hash);
CREATE INDEX idx_refresh_token_session ON refresh_token(session_id);
CREATE INDEX idx_audit_timestamp ON audit_securite(timestamp);
CREATE INDEX idx_audit_event_type ON audit_securite(event_type);

-- =============================================================================
-- SEED DATA : Définition des Permissions du Modèle RBAC
-- =============================================================================

INSERT INTO permission (code, module, description) VALUES
('PATRIMOINE:LIRE', 'PATRIMOINE', 'Consultation des fiches de patrimoine matériel et immatériel'),
('PATRIMOINE:CREER', 'PATRIMOINE', 'Création d''une nouvelle fiche patrimoniale'),
('PATRIMOINE:MODIFIER', 'PATRIMOINE', 'Modification d''une fiche patrimoniale existante'),
('PATRIMOINE:SUPPRIMER', 'PATRIMOINE', 'Suppression d''une fiche patrimoniale'),
('CIRCUIT:LIRE', 'CIRCUIT', 'Consultation des circuits écotouristiques et culturels'),
('CIRCUIT:CREER', 'CIRCUIT', 'Création d''un nouveau circuit touristique'),
('CIRCUIT:MODIFIER', 'CIRCUIT', 'Modification d''un circuit touristique existant'),
('CIRCUIT:SUPPRIMER', 'CIRCUIT', 'Suppression d''un circuit touristique'),
('EVENEMENT:LIRE', 'EVENEMENT', 'Consultation des événements culturels et festivals'),
('EVENEMENT:CREER', 'EVENEMENT', 'Création d''un événement culturel'),
('EVENEMENT:MODIFIER', 'EVENEMENT', 'Modification d''un événement culturel'),
('EVENEMENT:SUPPRIMER', 'EVENEMENT', 'Suppression d''un événement culturel'),
('RESERVATION:CREER', 'RESERVATION', 'Création d''une réservation touristique'),
('RESERVATION:LIRE_PROPRE', 'RESERVATION', 'Consultation de ses propres réservations'),
('RESERVATION:LIRE_TOUT', 'RESERVATION', 'Consultation globale de toutes les réservations'),
('RESERVATION:ANNULER_PROPRE', 'RESERVATION', 'Annulation de ses propres réservations'),
('RESERVATION:GERER', 'RESERVATION', 'Gestion, modification ou forçage d''une réservation'),
('PAIEMENT:INITIER', 'PAIEMENT', 'Initiation d''un paiement de réservation'),
('PAIEMENT:LIRE_PROPRE', 'PAIEMENT', 'Consultation de ses propres reçus de paiement'),
('PAIEMENT:LIRE_TOUT', 'PAIEMENT', 'Consultation globale des transactions financières'),
('UTILISATEUR:LIRE_PROFIL', 'UTILISATEUR', 'Consultation et modification de son propre profil'),
('UTILISATEUR:LIRE_TOUT', 'UTILISATEUR', 'Consultation de l''annuaire des utilisateurs'),
('UTILISATEUR:CREER_STAFF', 'UTILISATEUR', 'Création de comptes personnel et administrateur'),
('UTILISATEUR:GERER_ROLES', 'UTILISATEUR', 'Attribution et révocation des rôles et statuts'),
('UTILISATEUR:SUPPRIMER', 'UTILISATEUR', 'Suppression d''un compte utilisateur'),
('AUDIT:LIRE', 'AUDIT', 'Consultation des pistes et journaux d''audit de sécurité');

-- =============================================================================
-- SEED DATA : Mappage Rôles -> Permissions
-- =============================================================================

-- TOURISTE
INSERT INTO role_permission (role, permission_code) VALUES
('TOURISTE', 'PATRIMOINE:LIRE'),
('TOURISTE', 'CIRCUIT:LIRE'),
('TOURISTE', 'EVENEMENT:LIRE'),
('TOURISTE', 'RESERVATION:CREER'),
('TOURISTE', 'RESERVATION:LIRE_PROPRE'),
('TOURISTE', 'RESERVATION:ANNULER_PROPRE'),
('TOURISTE', 'PAIEMENT:INITIER'),
('TOURISTE', 'PAIEMENT:LIRE_PROPRE'),
('TOURISTE', 'UTILISATEUR:LIRE_PROFIL');

-- GUIDE
INSERT INTO role_permission (role, permission_code) VALUES
('GUIDE', 'PATRIMOINE:LIRE'),
('GUIDE', 'CIRCUIT:LIRE'),
('GUIDE', 'CIRCUIT:MODIFIER'),
('GUIDE', 'EVENEMENT:LIRE'),
('GUIDE', 'RESERVATION:LIRE_PROPRE'),
('GUIDE', 'UTILISATEUR:LIRE_PROFIL');

-- CONSERVATEUR
INSERT INTO role_permission (role, permission_code) VALUES
('CONSERVATEUR', 'PATRIMOINE:LIRE'),
('CONSERVATEUR', 'PATRIMOINE:CREER'),
('CONSERVATEUR', 'PATRIMOINE:MODIFIER'),
('CONSERVATEUR', 'PATRIMOINE:SUPPRIMER'),
('CONSERVATEUR', 'CIRCUIT:LIRE'),
('CONSERVATEUR', 'EVENEMENT:LIRE'),
('CONSERVATEUR', 'UTILISATEUR:LIRE_PROFIL');

-- GESTIONNAIRE_SITE
INSERT INTO role_permission (role, permission_code) VALUES
('GESTIONNAIRE_SITE', 'PATRIMOINE:LIRE'),
('GESTIONNAIRE_SITE', 'CIRCUIT:LIRE'),
('GESTIONNAIRE_SITE', 'CIRCUIT:CREER'),
('GESTIONNAIRE_SITE', 'CIRCUIT:MODIFIER'),
('GESTIONNAIRE_SITE', 'CIRCUIT:SUPPRIMER'),
('GESTIONNAIRE_SITE', 'EVENEMENT:LIRE'),
('GESTIONNAIRE_SITE', 'EVENEMENT:CREER'),
('GESTIONNAIRE_SITE', 'EVENEMENT:MODIFIER'),
('GESTIONNAIRE_SITE', 'EVENEMENT:SUPPRIMER'),
('GESTIONNAIRE_SITE', 'RESERVATION:LIRE_TOUT'),
('GESTIONNAIRE_SITE', 'RESERVATION:GERER'),
('GESTIONNAIRE_SITE', 'UTILISATEUR:LIRE_PROFIL');

-- ADMINISTRATEUR (Toutes les permissions)
INSERT INTO role_permission (role, permission_code)
SELECT 'ADMINISTRATEUR', code FROM permission;

-- =============================================================================
-- SEED DATA : Comptes de Démonstration pour les rôles CONSERVATEUR et GUIDE
-- =============================================================================

INSERT INTO utilisateur (id, nom, prenom, email, mot_de_passe, telephone, role, actif, date_inscription)
VALUES
(
    4,
    'Kaboré',
    'Fatou',
    'fatou.kabore@zig.univ.sn',
    '$2a$10$9l9ghTAFd3dHek6.a61OWe8mPok5n8008d6wPT1WJaXaAF1Ln/Sam',
    '+221774445566',
    'CONSERVATEUR',
    TRUE,
    CURRENT_TIMESTAMP - INTERVAL '10 days'
),
(
    5,
    'Badji',
    'Alassane',
    'alassane.badji@zig.univ.sn',
    '$2a$10$9l9ghTAFd3dHek6.a61OWe8mPok5n8008d6wPT1WJaXaAF1Ln/Sam',
    '+221773332211',
    'GUIDE',
    TRUE,
    CURRENT_TIMESTAMP - INTERVAL '8 days'
)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('utilisateur', 'id'), (SELECT MAX(id) FROM utilisateur));
