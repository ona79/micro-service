/**
 * Génère une clé d'idempotence unique côté client pour protéger les créations
 * et paiements contre les doubles clics ou rejeux réseau.
 */
export function generateIdempotencyKey(prefix = 'casamance'): string {
  const randomPart =
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}-${randomPart}`;
}
