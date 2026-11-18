import { HttpBackend, HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { ApiError } from '../models/api-error.model';

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

function extractHttpStatus(error: unknown): number | null {
  if (error instanceof HttpErrorResponse || error instanceof ApiError) {
    return error.status;
  }
  if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
    return error.status;
  }
  return null;
}

let inFlightRefresh$: Observable<void> | null = null;

export function resetAuthRefreshStateForTests(): void {
  inFlightRefresh$ = null;
}

/**
 * Attache systématiquement `withCredentials: true` et l'en-tête anti-CSRF `X-XSRF-TOKEN`
 * aux requêtes mutatives, et gère le rafraîchissement transparent (silent refresh) mutualisé sur 401.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const injector = inject(Injector);
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
      if (extractHttpStatus(error) === 401) {
        const isSessionProbe = req.url.includes('/api/utilisateurs/me');
        const isLoginCall = req.url.includes('/api/utilisateurs/connexion');
        const isRefreshCall = req.url.includes('/api/utilisateurs/refresh');

        if (!isSessionProbe && !isLoginCall && !isRefreshCall && authStore.isAuthenticated()) {
          if (!inFlightRefresh$) {
            const refreshXsrf = readCookie('XSRF-TOKEN');
            const refreshHeaders: Record<string, string> = refreshXsrf ? { 'X-XSRF-TOKEN': refreshXsrf } : {};
            inFlightRefresh$ = rawHttp
              .post<void>('/api/utilisateurs/refresh', {}, { withCredentials: true, headers: refreshHeaders })
              .pipe(
                shareReplay(1),
                finalize(() => {
                  inFlightRefresh$ = null;
                })
              );
          }

          return inFlightRefresh$.pipe(
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
              const router = injector.get(Router);
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
