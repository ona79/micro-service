import { SITE_CONFIG } from '../config';

/**
 * Indique si un patrimoine est un lieu de mémoire nécessitant un ton sobre et respectueux
 * (ex: Mémorial-Musée du Joola, Maison des Esclaves).
 */
export function isLieuDeMemoire(patrimoine) {
  if (!patrimoine) return false;
  const text = `${patrimoine.nomPatrimoine || ''} ${patrimoine.codePatrimoine || ''} ${patrimoine.descriptionPatrimoine || ''}`.toLowerCase();
  return SITE_CONFIG.memorialKeywords.some((kw) => text.includes(kw));
}

/**
 * Formate un prix en Francs CFA (ou affiche "Gratuit" si 0).
 */
export function formatPrixFCFA(prix) {
  if (prix === null || prix === undefined) return 'Non renseigné';
  const num = Number(prix);
  if (num === 0) return 'Gratuit';
  return `${num.toLocaleString('fr-FR')} FCFA`;
}

/**
 * Formate une durée en minutes (ex. 150 -> "2 h 30 min").
 */
export function formatDureeMinutes(minutes) {
  if (!minutes && minutes !== 0) return 'Non renseignée';
  const total = Number(minutes);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Formate une date ISO (LocalDateTime) en français lisible.
 */
export function formatDateHeure(isoString) {
  if (!isoString) return 'Date non renseignée';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Libellé lisible pour le niveau de difficulté d'un circuit.
 */
export function formatDifficulte(difficulte) {
  const map = {
    FACILE: 'Facile',
    MOYEN: 'Modéré',
    DIFFICILE: 'Sportif',
  };
  return map[difficulte] || difficulte || 'Standard';
}

/**
 * Libellé lisible pour le type d'événement.
 */
export function formatTypeEvenement(type) {
  const map = {
    EXPOSITION: 'Exposition',
    ATELIER: 'Atelier culturel',
    VISITE_GUIDEE: 'Visite guidée',
    CONFERENCE: 'Conférence',
    FESTIVAL: 'Festival',
  };
  return map[type] || type || 'Événement';
}

