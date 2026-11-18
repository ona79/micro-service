import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from './auth.store';
import { PermissionService, ROLE_PERMISSIONS, getDefaultPostLoginRoute } from './permissions';
import { RoleUtilisateur, Utilisateur } from '../models/utilisateur.model';

function fakeUser(role: RoleUtilisateur): Utilisateur {
  return {
    id: 10,
    prenom: 'Test',
    nom: role,
    email: `${role.toLowerCase()}@uasz.sn`,
    telephone: null,
    role,
    actif: true,
    dateInscription: null,
  };
}

describe('PermissionService & RBAC Matrix (P07)', () => {
  const userSig = signal<Utilisateur | null>(null);
  let service: PermissionService;

  beforeEach(() => {
    userSig.set(null);
    TestBed.configureTestingModule({
      providers: [
        PermissionService,
        {
          provide: AuthStore,
          useValue: { user: userSig.asReadonly() },
        },
      ],
    });
    service = TestBed.inject(PermissionService);
  });

  it('grants all 48 administrative permissions to ADMINISTRATEUR (excluding guide self-profile)', () => {
    expect(ROLE_PERMISSIONS.ADMINISTRATEUR).toHaveLength(48);
    expect(ROLE_PERMISSIONS.GUIDE).toContain('GUIDE:GERER_PROPRE_PROFIL');
    expect(ROLE_PERMISSIONS.ADMINISTRATEUR).not.toContain('GUIDE:GERER_PROPRE_PROFIL');
    userSig.set(fakeUser('ADMINISTRATEUR'));
    expect(service.canAccessBackOffice()).toBe(true);
    expect(service.has('PAIEMENT:REMBOURSER')).toBe(true);
    expect(service.has('UTILISATEUR:GERER_ROLES')).toBe(true);
    expect(service.has('AUDIT:LIRE')).toBe(true);
    expect(service.has('NOTIFICATION:RELANCER')).toBe(true);
    expect(service.has('VISITE:VALIDER')).toBe(true);
  });

  it('isolates CONSERVATEUR to heritage catalog, guide validation and access control, while blocking reservations/payments/moderation/users', () => {
    userSig.set(fakeUser('CONSERVATEUR'));
    expect(service.canAccessBackOffice()).toBe(true);
    expect(service.has('PATRIMOINE:CREER')).toBe(true);
    expect(service.has('PATRIMOINE:PUBLIER')).toBe(true);
    expect(service.has('CIRCUIT:CREER')).toBe(false);
    expect(service.has('EVENEMENT:CREER')).toBe(false);
    expect(service.has('GUIDE:VALIDER')).toBe(true);
    expect(service.has('VISITE:VALIDER')).toBe(true);
    expect(service.has('RESERVATION:LIRE_TOUT')).toBe(false);
    expect(service.has('PAIEMENT:LIRE_TOUT')).toBe(false);
    expect(service.has('AVIS:MODERER')).toBe(false);
    expect(service.has('UTILISATEUR:LIRE_TOUT')).toBe(false);
  });

  it('grants GESTIONNAIRE_SITE circuits/events/guides/reservations/moderation but blocks heritage edit, payments, users and global notifications', () => {
    userSig.set(fakeUser('GESTIONNAIRE_SITE'));
    expect(service.canAccessBackOffice()).toBe(true);
    expect(service.has('PATRIMOINE:LIRE')).toBe(true);
    expect(service.has('PATRIMOINE:CREER')).toBe(false);
    expect(service.has('PATRIMOINE:MODIFIER')).toBe(false);
    expect(service.has('CIRCUIT:PUBLIER')).toBe(true);
    expect(service.has('EVENEMENT:ANNULER')).toBe(true);
    expect(service.has('GUIDE:VALIDER')).toBe(true);
    expect(service.has('RESERVATION:GERER')).toBe(true);
    expect(service.has('AVIS:MODERER')).toBe(true);
    expect(service.has('PAIEMENT:LIRE_TOUT')).toBe(false);
    expect(service.has('PAIEMENT:REMBOURSER')).toBe(false);
    expect(service.has('UTILISATEUR:LIRE_TOUT')).toBe(false);
    expect(service.has('NOTIFICATION:LIRE_TOUT')).toBe(false);
  });

  it('grants GUIDE self-guide profile and circuit modification only', () => {
    userSig.set(fakeUser('GUIDE'));
    expect(service.canAccessBackOffice()).toBe(true);
    expect(service.has('GUIDE:GERER_PROPRE_PROFIL')).toBe(true);
    expect(service.has('CIRCUIT:MODIFIER')).toBe(true);
    expect(service.has('CIRCUIT:PUBLIER')).toBe(false);
    expect(service.has('GUIDE:VALIDER')).toBe(false);
    expect(service.has('RESERVATION:LIRE_TOUT')).toBe(false);
  });

  it('blocks TOURISTE from back-office and routes post-login correctly', () => {
    userSig.set(fakeUser('TOURISTE'));
    expect(service.canAccessBackOffice()).toBe(false);
    expect(getDefaultPostLoginRoute('TOURISTE')).toBe('/mon-espace');
    expect(getDefaultPostLoginRoute('ADMINISTRATEUR')).toBe('/pro/tableau-de-bord');
    expect(getDefaultPostLoginRoute('GESTIONNAIRE_SITE')).toBe('/pro/tableau-de-bord');
    expect(getDefaultPostLoginRoute('CONSERVATEUR')).toBe('/pro/tableau-de-bord');
    expect(getDefaultPostLoginRoute('GUIDE')).toBe('/pro/tableau-de-bord');
  });
});
