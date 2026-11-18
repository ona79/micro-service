import { SITE_CONFIG } from '../../core/config/site.config';
import { Etape } from '../../core/models/circuit.model';
import { Patrimoine } from '../../core/models/patrimoine.model';

/**
 * Détermine si un patrimoine est un lieu de mémoire nécessitant un registre sobre et respectueux.
 */
export function isLieuDeMemoire(patrimoine: Partial<Patrimoine> | null | undefined): boolean {
  if (!patrimoine) return false;
  const text = `${patrimoine.nomPatrimoine ?? ''} ${patrimoine.codePatrimoine ?? ''} ${
    patrimoine.descriptionPatrimoine ?? ''
  }`.toLowerCase();
  return SITE_CONFIG.memorialKeywords.some((kw) => text.includes(kw));
}

/**
 * Trie les étapes d'un circuit par ordre croissant sans muter le tableau d'origine.
 */
export function sortEtapes(etapes: readonly Etape[] | null | undefined): Etape[] {
  if (!etapes?.length) return [];
  return [...etapes].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
}

/**
 * Vérifie que la latitude et la longitude sont des nombres finis exploitables
 * et ne correspondent pas aux coordonnées nulles par défaut (0, 0).
 */
export function hasValidCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): boolean {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return false;
  }
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return false;
  }
  if (lat === 0 && lon === 0) {
    return false;
  }
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Construit un lien OpenStreetMap sécurisé à partir de coordonnées validées.
 */
export function buildOsmMapUrl(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): string | null {
  if (!hasValidCoordinates(latitude, longitude)) {
    return null;
  }
  const lat = Number(latitude);
  const lon = Number(longitude);
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(
    lon
  )}#map=15/${lat}/${lon}`;
}
