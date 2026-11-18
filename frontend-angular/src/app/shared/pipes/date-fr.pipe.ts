import { Pipe, PipeTransform } from '@angular/core';
import { format, isValid, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

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
    const parsed = parseISO(isoString);
    if (!isValid(parsed)) {
      return isoString;
    }
    return format(parsed, pattern, { locale: fr });
  }
}
