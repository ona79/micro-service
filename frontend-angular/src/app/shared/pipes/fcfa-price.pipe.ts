import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'fcfaPrice',
  standalone: true,
})
export class FcfaPricePipe implements PipeTransform {
  transform(prix: number | null | undefined): string {
    if (prix === null || prix === undefined || Number.isNaN(Number(prix))) {
      return 'Non renseigné';
    }
    const num = Number(prix);
    if (num === 0) {
      return 'Gratuit';
    }
    return `${num.toLocaleString('fr-FR')} FCFA`;
  }
}
