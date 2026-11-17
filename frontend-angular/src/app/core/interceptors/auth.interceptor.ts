import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth.store';

/**
 * Attache systématiquement `withCredentials: true` aux requêtes API pour transmettre
 * le cookie HttpOnly `PATRIMOINE_SESSION` et gère l'expiration de session (401).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const authReq = req.clone({
    withCredentials: true,
  });

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const isSessionProbe = req.url.endsWith('/api/utilisateurs/me');
        const isLoginCall = req.url.endsWith('/api/utilisateurs/connexion');
        if (!isSessionProbe && !isLoginCall && authStore.isAuthenticated()) {
          authStore.clearSessionLocally();
          const currentUrl = router.url;
          if (!currentUrl.startsWith('/connexion')) {
            void router.navigate(['/connexion'], {
              queryParams: { returnUrl: currentUrl, expired: '1' },
            });
          }
        }
      }
      return throwError(() => error);
    })
  );
};
