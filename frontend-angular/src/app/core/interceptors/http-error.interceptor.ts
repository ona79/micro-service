import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiError, ApiErrorKind, BackendErrorPayload } from '../models/api-error.model';

/**
 * Convertit toute erreur HTTP ou ApiError en instance normalisée `ApiError`.
 */
export function normalizeHttpError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (!(error instanceof HttpErrorResponse)) {
    const msg =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Erreur réseau inattendue.';
    return new ApiError(msg, 0, 'network');
  }

  if (error.status === 0) {
    return new ApiError(
      "Impossible de joindre l'API Gateway. Vérifiez que les microservices sont démarrés.",
      0,
      'network'
    );
  }

  const payload = parseErrorBody(error.error);
  const backendMsg = payload?.erreur || payload?.message || payload?.error;
  const kind = classifyStatus(error.status, backendMsg);
  const message =
    backendMsg || `Erreur lors de la requête (${error.status} ${error.statusText || 'HTTP'})`;

  return new ApiError(message, error.status, kind);
}

/**
 * Intercepteur global normalisant les erreurs HTTP en ApiError typées.
 * Extrait systématiquement le champ {"erreur": "..."} renvoyé par les GlobalExceptionHandler Spring Boot.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: unknown) => {
      return throwError(() => normalizeHttpError(error));
    })
  );
};

function parseErrorBody(body: unknown): BackendErrorPayload | null {
  if (!body) return null;
  if (typeof body === 'object') {
    return body as BackendErrorPayload;
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as BackendErrorPayload;
    } catch {
      return null;
    }
  }
  return null;
}

function classifyStatus(status: number, message?: string): ApiErrorKind {
  if (status === 404) return 'not_found';
  if (status === 503) return 'unavailable';
  if (status === 400) {
    if (message && (message.includes('obligatoire') || message.includes('invalide'))) {
      return 'validation';
    }
    return 'business';
  }
  if (status >= 500) return 'server';
  return 'business';
}
