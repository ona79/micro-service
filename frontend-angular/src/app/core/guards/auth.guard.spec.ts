import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { Utilisateur } from '../models/utilisateur.model';
import { authGuard, permissionGuard, roleGuard } from './auth.guard';

describe('Route Guards (authGuard, roleGuard, permissionGuard)', () => {
  let ensureInitializedMock: ReturnType<typeof vi.fn>;
  let router: Router;

  beforeEach(() => {
    ensureInitializedMock = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: { ensureInitialized: ensureInitializedMock },
        },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('redirects unauthenticated user to /connexion with returnUrl', async () => {
    ensureInitializedMock.mockResolvedValue(null);
    const result = await TestBed.runInInjectionContext(() =>
      authGuard(
        {} as ActivatedRouteSnapshot,
        { url: '/pro/paiements' } as RouterStateSnapshot
      )
    );
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toContain('/connexion');
  });

  it('redirects GUIDE attempting /administration or /pro/paiements to /acces-refuse', async () => {
    ensureInitializedMock.mockResolvedValue({
      id: 5,
      role: 'GUIDE',
      actif: true,
    } as Utilisateur);

    const adminCheck = await TestBed.runInInjectionContext(() =>
      roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR'])(
        {} as ActivatedRouteSnapshot,
        { url: '/administration' } as RouterStateSnapshot
      )
    );
    expect(router.serializeUrl(adminCheck as UrlTree)).toContain('/acces-refuse');

    const permCheck = await TestBed.runInInjectionContext(() =>
      permissionGuard(['PAIEMENT:LIRE_TOUT'])(
        {} as ActivatedRouteSnapshot,
        { url: '/pro/paiements' } as RouterStateSnapshot
      )
    );
    expect(router.serializeUrl(permCheck as UrlTree)).toContain('/acces-refuse');
  });

  it('allows ADMINISTRATEUR across permissionGuard PAIEMENT:LIRE_TOUT', async () => {
    ensureInitializedMock.mockResolvedValue({
      id: 1,
      role: 'ADMINISTRATEUR',
      actif: true,
    } as Utilisateur);

    const allowed = await TestBed.runInInjectionContext(() =>
      permissionGuard(['PAIEMENT:LIRE_TOUT'])(
        {} as ActivatedRouteSnapshot,
        { url: '/pro/paiements' } as RouterStateSnapshot
      )
    );
    expect(allowed).toBe(true);
  });
});
