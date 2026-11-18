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
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj['message'] === 'string') return obj['message'];
    if (typeof obj['error'] === 'string') return obj['error'];
    if (typeof obj['erreur'] === 'string') return obj['erreur'];
    if (typeof obj['error'] === 'object' && obj['error'] !== null) {
      const nested = obj['error'] as Record<string, unknown>;
      if (typeof nested['message'] === 'string') return nested['message'];
      if (typeof nested['erreur'] === 'string') return nested['erreur'];
    }
  }
  return fallback;
}
