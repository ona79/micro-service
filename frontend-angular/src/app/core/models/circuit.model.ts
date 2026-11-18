import { Patrimoine } from './patrimoine.model';

export type Difficulte = 'FACILE' | 'MOYEN' | 'DIFFICILE';

export type MoyenTransport =
  | 'PIED'
  | 'PIROGUE'
  | 'VELO'
  | 'VEHICULE_4X4'
  | 'MINIBUS'
  | 'MIXTE';

export type StatutCircuit = 'BROUILLON' | 'SOUMIS' | 'PUBLIE' | 'ARCHIVE';

export interface Etape {
  id?: number;
  ordre: number;
  dureeVisite: number;
  patrimoineId: number;
  descriptionEtape?: string | null;
  moyenTransport?: MoyenTransport | null;
  patrimoine: Patrimoine | null;
}

export interface Circuit {
  id: number;
  nomCircuit: string;
  descriptionCircuit: string | null;
  presentationTouristique?: string | null;
  difficulte: Difficulte | null;
  moyenTransport?: MoyenTransport;
  zoneGeographique?: string;
  pointDepart?: string | null;
  pointArrivee?: string | null;
  informationsPratiques?: string | null;
  imageUrl?: string | null;
  dureeEstimee: number;
  distanceTotale: number;
  modeCalculDistance?: string;
  placesMax: number;
  prix: number;
  statutCircuit?: StatutCircuit;
  donneeDemonstration?: boolean;
  guideResponsableId?: number | null;
  motifStatut?: string | null;
  dateCreation?: string | null;
  datePublication?: string | null;
  etapes: Etape[];
}
