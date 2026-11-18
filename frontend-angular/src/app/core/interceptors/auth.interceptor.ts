import { HttpBackend, HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth.store';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined' || !document.cookie) {
    return null;
  }
  const cookies = document.cookie.split(';');
  for (const raw of cookies) {
    const [k, ...rest] = raw.trim().split('=');
    if (k === name && rest.length > 0) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

/**
 * Attache systématiquement `withCredentials: true` et l'en-tête anti-CSRF `X-XSRF-TOKEN`
 * aux requêtes mutatives, et gère le rafraîchissement transparent (silent refresh) sur 401.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const httpBackend = inject(HttpBackend);
  const rawHttp = new HttpClient(httpBackend);

  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
  const xsrfToken = isMutating ? readCookie('XSRF-TOKEN') : null;

  const authReq = req.clone({
    withCredentials: true,
    setHeaders: xsrfToken && !req.headers.has('X-XSRF-TOKEN') ? { 'X-XSRF-TOKEN': xsrfToken } : {},
  });

  return next(authReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const isSessionProbe = req.url.includes('/api/utilisateurs/me');
        const isLoginCall = req.url.includes('/api/utilisateurs/connexion');
        const isRefreshCall = req.url.includes('/api/utilisateurs/refresh');

        if (!isSessionProbe && !isLoginCall && !isRefreshCall && authStore.isAuthenticated()) {
          const refreshXsrf = readCookie('XSRF-TOKEN');
          const refreshHeaders: Record<string, string> = refreshXsrf ? { 'X-XSRF-TOKEN': refreshXsrf } : {};
          return rawHttp
            .post('/api/utilisateurs/refresh', {}, { withCredentials: true, headers: refreshHeaders })
            .pipe(
              switchMap(() => {
                const updatedXsrf = isMutating ? readCookie('XSRF-TOKEN') : null;
                const retryReq = req.clone({
                  withCredentials: true,
                  setHeaders: updatedXsrf ? { 'X-XSRF-TOKEN': updatedXsrf } : {},
                });
                return next(retryReq);
              }),
              catchError((refreshErr) => {
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
