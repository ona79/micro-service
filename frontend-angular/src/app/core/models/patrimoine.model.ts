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
}
