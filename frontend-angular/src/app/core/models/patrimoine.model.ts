export type CategoriePatrimoine =
  | 'NATUREL'
  | 'CULTUREL'
  | 'HISTORIQUE'
  | 'ARCHITECTURAL'
  | 'IMMATERIEL';

export type ZoneCasamance =
  | 'BASSE_CASAMANCE'
  | 'MOYENNE_CASAMANCE'
  | 'HAUTE_CASAMANCE';

export type StatutPublication = 'BROUILLON' | 'SOUMIS' | 'PUBLIE' | 'ARCHIVE';

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface Patrimoine {
  id: number;
  nomPatrimoine: string;
  codePatrimoine: string;
  descriptionPatrimoine: string | null;
  historiquePatrimoine: string | null;
  adressePatrimoine: string | null;
  capacitePatrimoine: number;
  latitudePatrimoine: number;
  longitudePatrimoine: number;
  categoriePatrimoine?: CategoriePatrimoine;
  typePatrimoine?: string | null;
  zoneGeographique?: ZoneCasamance;
  localite?: string | null;
  informationsCulturelles?: string | null;
  horairesOuverture?: string | null;
  tarifEntree?: number;
  informationsPratiques?: string | null;
  imageUrl?: string | null;
  galerieMedias?: string | null;
  statutPublication?: StatutPublication;
  donneeDemonstration?: boolean;
  motifStatut?: string | null;
  dateCreation?: string | null;
  dateModification?: string | null;
  datePublication?: string | null;
  dateArchivage?: string | null;
}
