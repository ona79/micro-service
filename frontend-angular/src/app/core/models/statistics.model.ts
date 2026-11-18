export interface PatrimoineStats {
  total: number;
  brouillons: number;
  soumis: number;
  publies: number;
  archives: number;
  scope: string;
  parCategorie: Record<string, number>;
  parZone: Record<string, number>;
  capaciteTotalePubliee: number;
  tarifMoyenPublie: number;
}

export interface CircuitStats {
  total: number;
  brouillons: number;
  soumis: number;
  publies: number;
  archives: number;
  avecGuideAffecte: number;
  sansGuide: number;
  scope: string;
  parDifficulte: Record<string, number>;
  parMoyenTransport: Record<string, number>;
  parZone: Record<string, number>;
  prixMoyenPublie: number;
  dureeMoyenneMinutes: number;
}

export interface EvenementStats {
  total: number;
  brouillons: number;
  soumis: number;
  publies: number;
  annules: number;
  termines: number;
  archives: number;
  aVenirPublies: number;
  ouvertsReservation: number;
  parType: Record<string, number>;
  parZone: Record<string, number>;
}

export interface GuideStats {
  total: number;
  brouillons: number;
  enAttenteValidation: number;
  valides: number;
  rejetes: number;
  suspendus: number;
  desactives: number;
  disponiblesEtValides: number;
  visiblesPublic: number;
  parZone: Record<string, number>;
  parLangue: Record<string, number>;
}

export interface ModerationStats {
  totalAvis: number;
  approuves: number;
  enAttente: number;
  masques: number;
  rejetes: number;
  noteMoyenneApprouves: number;
  totalSignalements: number;
  signalementsOuverts: number;
  signalementsFondes: number;
  signalementsRejetes: number;
  avisParCible: Record<string, number>;
}

export interface NotificationStats {
  total: number;
  enAttente: number;
  envoyees: number;
  echecsTemporaires: number;
  echecsDefinitifs: number;
  nonLuesTotal: number;
  parStatut: Record<string, number>;
  parCanal: Record<string, number>;
  parTypeEvenement: Record<string, number>;
}

export interface UtilisateurStats {
  total: number;
  actifs: number;
  inactifs: number;
  parRole: Record<string, number>;
  auditLogsTotal: number;
  alertesSecurite24h: number;
  echecsConnexion24h: number;
}
