import { Pipe, PipeTransform } from '@angular/core';
import { Difficulte } from '../../core/models/circuit.model';

const DIFFICULTE_LABELS: Record<Difficulte, string> = {
  FACILE: 'Facile',
  MOYEN: 'Modéré',
  DIFFICILE: 'Sportif',
};

@Pipe({
  name: 'difficulteLabel',
  standalone: true,
})
export class DifficulteLabelPipe implements PipeTransform {
  transform(difficulte: Difficulte | string | null | undefined): string {
    if (!difficulte) return 'Standard';
    return DIFFICULTE_LABELS[difficulte as Difficulte] ?? difficulte;
  }
}
