import { Pipe, PipeTransform } from '@angular/core';
import { TypeEvenement } from '../../core/models/evenement.model';

const TYPE_EVENEMENT_LABELS: Record<TypeEvenement, string> = {
  EXPOSITION: 'Exposition',
  ATELIER: 'Atelier culturel',
  VISITE_GUIDEE: 'Visite guidée',
  CONFERENCE: 'Conférence',
  FESTIVAL: 'Festival',
  CEREMONIE_TRADITIONNELLE: 'Cérémonie traditionnelle',
  FOIRE_ARTISANALE: 'Foire artisanale',
};

@Pipe({
  name: 'evenementType',
  standalone: true,
})
export class EvenementTypePipe implements PipeTransform {
  transform(type: TypeEvenement | string | null | undefined): string {
    if (!type) return 'Événement';
    return TYPE_EVENEMENT_LABELS[type as TypeEvenement] ?? type;
  }
}
