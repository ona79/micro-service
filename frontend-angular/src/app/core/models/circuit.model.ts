import { Patrimoine } from './patrimoine.model';

export type Difficulte = 'FACILE' | 'MOYEN' | 'DIFFICILE';

export interface Etape {
  id: number;
  ordre: number;
  dureeVisite: number;
  patrimoineId: number;
  patrimoine: Patrimoine | null;
}

export interface Circuit {
  id: number;
  nomCircuit: string;
  descriptionCircuit: string | null;
  difficulte: Difficulte | null;
  dureeEstimee: number;
  distanceTotale: number;
  placesMax: number;
  prix: number;
  etapes: Etape[];
}
