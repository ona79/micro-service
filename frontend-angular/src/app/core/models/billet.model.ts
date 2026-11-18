import { TypeReservation } from './reservation.model';

export type StatutBillet = 'VALIDE' | 'CONSOMME' | 'ANNULE' | 'EXPIRE';

export interface Billet {
  id: number;
  reservationId: number;
  referenceReservation: string;
  numeroBillet: string;
  tokenQr: string;
  nomBeneficiaire: string;
  statut: StatutBillet;
  dateUtilisation?: string | null;
  validePar?: string | null;
  createdAt?: string | null;

  typeReservation?: TypeReservation | null;
  prestationId?: number | null;
  nomPrestation?: string | null;
  datePrestation?: string | null;
  creneauPrestation?: string | null;
  prixUnitaire?: number | null;
  devise?: string | null;
  nomClient?: string | null;
  emailClient?: string | null;
  telephoneClient?: string | null;
}

export interface ValidationBilletResponse {
  valide: boolean;
  message: string;
  billet: Billet;
}

export interface ValidationBilletRequest {
  tokenQr: string;
}

export function formatBilletStatusLabel(statut: StatutBillet): string {
  switch (statut) {
    case 'VALIDE':
      return 'Valide';
    case 'CONSOMME':
      return 'Consommé (Entrée effectuée)';
    case 'ANNULE':
      return 'Annulé';
    case 'EXPIRE':
      return 'Expiré';
  }
}

export function billetStatusBadgeClass(statut: StatutBillet): string {
  switch (statut) {
    case 'VALIDE':
      return 'ui-badge ui-badge--success';
    case 'CONSOMME':
      return 'ui-badge ui-badge--neutral';
    case 'ANNULE':
    case 'EXPIRE':
      return 'ui-badge ui-badge--danger';
  }
}
