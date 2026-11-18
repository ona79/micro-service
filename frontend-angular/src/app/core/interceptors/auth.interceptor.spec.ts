import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { apiPrefixInterceptor } from './api-prefix.interceptor';
import { authInterceptor, resetAuthRefreshStateForTests } from './auth.interceptor';
import { httpErrorInterceptor } from './http-error.interceptor';

describe('authInterceptor (P07 401 refresh + anti-replay)', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;
  const isAuthenticatedSig = signal(true);
  const clearSessionLocallySpy = vi.fn();

  beforeEach(() => {
    resetAuthRefreshStateForTests();
    isAuthenticatedSig.set(true);
    clearSessionLocallySpy.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(
          withInterceptors([apiPrefixInterceptor, authInterceptor, httpErrorInterceptor])
        ),
        provideHttpClientTesting(),
        {
          provide: AuthStore,
          useValue: {
            isAuthenticated: isAuthenticatedSig.asReadonly(),
            clearSessionLocally: clearSessionLocallySpy,
          },
        },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    resetAuthRefreshStateForTests();
    httpMock.verify();
  });

  it('triggers ONE silent refresh for concurrent 401 ApiError responses and retries both', async () => {
    const p1 = firstValueFrom(http.get<{ ok: number }>('/patrimoines/statistiques'));
    const p2 = firstValueFrom(http.get<{ ok: number }>('/circuits/statistiques'));

    const req1 = httpMock.expectOne('/api/patrimoines/statistiques');
    const req2 = httpMock.expectOne('/api/circuits/statistiques');

    // Both hit 401 simultaneously, converted into ApiError by httpErrorInterceptor
    req1.flush({ erreur: 'Session expirée' }, { status: 401, statusText: 'Unauthorized' });
    req2.flush({ erreur: 'Session expirée' }, { status: 401, statusText: 'Unauthorized' });

    // Only ONE refresh rotation call should be made
    const refreshReqs = httpMock.match('/api/utilisateurs/refresh');
    expect(refreshReqs).toHaveLength(1);
    refreshReqs[0].flush({});

    // Both original requests are retried cleanly
    const retry1 = httpMock.expectOne('/api/patrimoines/statistiques');
    const retry2 = httpMock.expectOne('/api/circuits/statistiques');
    retry1.flush({ ok: 1 });
    retry2.flush({ ok: 2 });

    expect(await p1).toEqual({ ok: 1 });
    expect(await p2).toEqual({ ok: 2 });
  });

  it('clears local session and redirects to /connexion?expired=1 when refresh fails', async () => {
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const reqPromise = firstValueFrom(http.get('/guides/mon-profil'));
    const initialReq = httpMock.expectOne('/api/guides/mon-profil');
    initialReq.flush({ erreur: 'Session expirée' }, { status: 401, statusText: 'Unauthorized' });

    const refreshReq = httpMock.expectOne('/api/utilisateurs/refresh');
    refreshReq.flush({ erreur: 'Refresh expiré' }, { status: 401, statusText: 'Unauthorized' });

    await expect(reqPromise).rejects.toBeTruthy();
    expect(clearSessionLocallySpy).toHaveBeenCalledTimes(1);
    expect(navSpy).toHaveBeenCalledWith(['/connexion'], {
      queryParams: { returnUrl: '/', expired: '1' },
    });
  });
});
