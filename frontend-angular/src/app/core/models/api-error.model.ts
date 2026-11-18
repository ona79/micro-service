export type ApiErrorKind =
  | 'network'
  | 'validation'
  | 'business'
  | 'not_found'
  | 'unavailable'
  | 'server';

export interface BackendErrorPayload {
  erreur?: string;
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;

  constructor(message: string, status: number, kind: ApiErrorKind) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
  }
}

export function extractErrorMessage(err: unknown, fallback = 'Une erreur inattendue est survenue.'): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}
