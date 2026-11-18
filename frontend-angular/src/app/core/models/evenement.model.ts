import { Patrimoine } from './patrimoine.model';

export type TypeEvenement =
  | 'EXPOSITION'
  | 'ATELIER'
  | 'VISITE_GUIDEE'
  | 'CONFERENCE'
  | 'FESTIVAL';

export interface Evenement {
  id: number;
  nomEvenement: string;
  descriptionEvenement: string | null;
  typeEvenement: TypeEvenement;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  capaciteMax: number;
  prix: number;
  patrimoineId: number;
  patrimoine: Patrimoine | null;
}
