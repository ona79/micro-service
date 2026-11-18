import { Pipe, PipeTransform } from '@angular/core';

const DAKAR_TZ = 'Africa/Dakar';

const HAS_EXPLICIT_TZ_RE = /(Z|[+-]\d{2}:?\d{2})$/i;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse une date ISO backend (`LocalDate` ou `LocalDateTime` sans décalage) dans le fuseau officiel Africa/Dakar (UTC+0).
 */
export function parseDakarIsoDate(isoString: string): Date | null {
  const trimmed = isoString.trim();
  if (!trimmed) return null;

  let normalized = trimmed;
  if (DATE_ONLY_RE.test(trimmed)) {
    normalized = `${trimmed}T00:00:00Z`;
  } else if (trimmed.includes('T') && !HAS_EXPLICIT_TZ_RE.test(trimmed)) {
    // Les microservices Java utilisent LocalDateTime sur Africa/Dakar (UTC+0 permanent sans heure d'été).
    normalized = `${trimmed}Z`;
  }

  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

@Pipe({
  name: 'dateFr',
  standalone: true,
})
export class DateFrPipe implements PipeTransform {
  transform(
    isoString: string | null | undefined,
    pattern = "d MMMM yyyy 'à' HH:mm"
  ): string {
    if (!isoString) {
      return 'Date non renseignée';
    }
    const parsed = parseDakarIsoDate(isoString);
    if (!parsed) {
      return isoString;
    }

    if (pattern === 'dd') {
      return new Intl.DateTimeFormat('fr-FR', {
        timeZone: DAKAR_TZ,
        day: '2-digit',
      }).format(parsed);
    }

    if (pattern === 'MMM yyyy') {
      return new Intl.DateTimeFormat('fr-FR', {
        timeZone: DAKAR_TZ,
        month: 'short',
        year: 'numeric',
      }).format(parsed);
    }

    if (pattern === 'date' || pattern === 'd MMMM yyyy') {
      return new Intl.DateTimeFormat('fr-FR', {
        timeZone: DAKAR_TZ,
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(parsed);
    }

    if (pattern === 'd MMM yyyy') {
      return new Intl.DateTimeFormat('fr-FR', {
        timeZone: DAKAR_TZ,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(parsed);
    }

    const datePart = new Intl.DateTimeFormat('fr-FR', {
      timeZone: DAKAR_TZ,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(parsed);

    const timePart = new Intl.DateTimeFormat('fr-FR', {
      timeZone: DAKAR_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(parsed);

    return `${datePart} à ${timePart}`;
  }
}
