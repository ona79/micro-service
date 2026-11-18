import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'durationMinutes',
  standalone: true,
})
export class DurationMinutesPipe implements PipeTransform {
  transform(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined || Number.isNaN(Number(minutes))) {
      return 'Non renseignée';
    }
    const total = Math.max(0, Math.round(Number(minutes)));
    if (total < 60) {
      return `${total} min`;
    }
    const hours = Math.floor(total / 60);
    const remaining = total % 60;
    return remaining > 0 ? `${hours} h ${remaining} min` : `${hours} h`;
  }
}
