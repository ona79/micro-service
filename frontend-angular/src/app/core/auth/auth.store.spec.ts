import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Utilisateur } from '../models/utilisateur.model';
import { AuthStore, formatRoleLabel } from './auth.store';

describe('AuthStore — Gestion de session HttpOnly et Rôles', () => {
  let store: AuthStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(AuthStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('connecte un utilisateur, expose ses rôles et calcule ses initiales', async () => {
    const mockAdmin: Utilisateur = {
      id: 1,
      nom: 'Faty',
      prenom: 'Lamine',
      email: 'lamine.faty@univ-zig.sn',
      telephone: '+221770000001',
      role: 'ADMINISTRATEUR',
      actif: true,
      dateInscription: '2026-11-17T08:00:00',
    };

    const loginPromise = store.login({
      email: 'lamine.faty@univ-zig.sn',
      motDePasse: 'Admin2026!',
    });

    const req = httpMock.expectOne('/api/utilisateurs/connexion');
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush(mockAdmin);

    const connected = await loginPromise;
    expect(connected.email).toBe('lamine.faty@univ-zig.sn');
    expect(store.isAuthenticated()).toBe(true);
    expect(store.isAdmin()).toBe(true);
    expect(store.isStaff()).toBe(true);
    expect(store.initials()).toBe('LF');
    expect(store.roleLabel()).toBe('Administrateur');
  });

  it('déconnecte l’utilisateur et réinitialise l’état de session', async () => {
    const logoutPromise = store.logout();
    const req = httpMock.expectOne('/api/utilisateurs/deconnexion');
    expect(req.request.method).toBe('POST');
    req.flush(null, { status: 204, statusText: 'No Content' });

    await logoutPromise;
    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
  });

  it('formate correctement les libellés de rôle', () => {
    expect(formatRoleLabel('ADMINISTRATEUR')).toBe('Administrateur');
    expect(formatRoleLabel('GESTIONNAIRE_SITE')).toBe('Gestionnaire de site');
    expect(formatRoleLabel('TOURISTE')).toBe('Visiteur / Touriste');
  });
});
