import { Patrimoine } from './patrimoine.model';

export type TypeEvenement =
  | 'EXPOSITION'
  | 'ATELIER'
  | 'VISITE_GUIDEE'
  | 'CONFERENCE'
  | 'FESTIVAL'
  | 'CEREMONIE_TRADITIONNELLE'
  | 'FOIRE_ARTISANALE';

export type StatutEvenement =
  | 'BROUILLON'
  | 'SOUMIS'
  | 'PUBLIE'
  | 'TERMINE'
  | 'ANNULE'
  | 'ARCHIVE';

export interface Evenement {
  id: number;
  nomEvenement: string;
  descriptionEvenement: string | null;
  typeEvenement: TypeEvenement;
  dateDebut: string;
  dateFin: string;
  horaires?: string | null;
  lieu: string | null;
  zoneGeographique?: string;
  localite?: string | null;
  organisateur?: string | null;
  contactOrganisateur?: string | null;
  capaciteMax: number;
  prix: number;
  devise?: string;
  ouvertReservation?: boolean;
  conditionsAcces?: string | null;
  imageUrl?: string | null;
  supportCommunication?: string | null;
  patrimoineId: number | null;
  patrimoine: Patrimoine | null;
  statutEvenement?: StatutEvenement;
  motifAnnulation?: string | null;
  fuseauHoraire?: string;
  donneeDemonstration?: boolean;
  dateCreation?: string | null;
  datePublication?: string | null;
}
