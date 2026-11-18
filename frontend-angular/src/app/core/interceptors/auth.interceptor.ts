import { HttpBackend, HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth.store';

/**
 * Attache systématiquement `withCredentials: true` aux requêtes API pour transmettre
 * les cookies HttpOnly de session et gère le rafraîchissement transparent (silent refresh) sur 401.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const httpBackend = inject(HttpBackend);
  const rawHttp = new HttpClient(httpBackend);

  const authReq = req.clone({
    withCredentials: true,
  });

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const isSessionProbe = req.url.includes('/api/utilisateurs/me');
        const isLoginCall = req.url.includes('/api/utilisateurs/connexion');
        const isRefreshCall = req.url.includes('/api/utilisateurs/refresh');

        if (!isSessionProbe && !isLoginCall && !isRefreshCall && authStore.isAuthenticated()) {
          // Tentative de rafraîchissement transparent du jeton (Silent Refresh)
          return rawHttp.post('/api/utilisateurs/refresh', {}, { withCredentials: true }).pipe(
            switchMap(() => {
              // Rafraîchissement réussi : on rejoue la requête initiale
              return next(authReq);
            }),
            catchError((refreshErr) => {
              // Échec du rafraîchissement : révocation de session et redirection vers connexion
              authStore.clearSessionLocally();
              const currentUrl = router.url;
              if (!currentUrl.startsWith('/connexion')) {
                void router.navigate(['/connexion'], {
                  queryParams: { returnUrl: currentUrl, expired: '1' },
                });
              }
              return throwError(() => refreshErr);
            })
          );
        }
      }
      return throwError(() => error);
    })
  );
};
