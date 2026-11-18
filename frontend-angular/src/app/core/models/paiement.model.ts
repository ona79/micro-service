export type ModePaiement = 'WAVE' | 'ORANGE_MONEY';

export type StatutPaiement =
  | 'INITIE'
  | 'EN_COURS'
  | 'ACCEPTE'
  | 'REFUSE'
  | 'EXPIRE'
  | 'ANNULE'
  | 'REMBOURSE';

export type DecisionSimulation = 'ACCEPTER' | 'REFUSER' | 'EXPIRER' | 'ANNULER';

export interface PaiementHistorique {
  id: number;
  ancienStatut: StatutPaiement | null;
  nouveauStatut: StatutPaiement;
  acteurId: number | null;
  acteurRole: string | null;
  acteurType: string | null;
  correlationId: string | null;
  motif: string | null;
  dateTransition: string;
}

export interface Paiement {
  id: number;
  utilisateurId?: number | null;
  referenceTransaction: string;
  reservationId: number;
  montant: number;
  devise?: string;
  modePaiement: ModePaiement;
  statut: StatutPaiement;
  datePaiement: string | null;
  estSimule: boolean;
  mentionSimulation?: string | null;
  numeroTelephoneSimule?: string | null;
  numeroTelephoneMasque?: string | null;
  jetonSimulation?: string | null;
  correlationId?: string | null;
  motifDecision?: string | null;
  dateCreation?: string | null;
  dateModification?: string | null;
  dateExpiration?: string | null;
  dateConfirmation?: string | null;
  dateRemboursement?: string | null;
  synchroReservationStatut?: string | null;
  rejoueeIdempotence?: boolean;
  historique?: PaiementHistorique[];
  reservation?: {
    id: number;
    referenceReservation?: string | null;
    nomClient?: string;
    emailClient?: string;
    nombrePlaces?: number;
    typeReservation?: string;
    statut?: string;
    montantTotal?: number;
    devise?: string;
  } | null;
}

export interface PaiementInitiatePayload {
  reservationId: number;
  modePaiement: ModePaiement;
  numeroTelephoneSimule?: string | null;
}

export interface SimulationPaiementPayload {
  decision: DecisionSimulation;
  motif?: string | null;
}

export interface PaiementStats {
  totalTransactions: number;
  enCours: number;
  acceptees: number;
  refusees: number;
  expirees: number;
  annulees: number;
  remboursees: number;
  montantTotalAccepteSimule: number;
  montantTotalRembourseSimule: number;
  montantWaveSimule: number;
  montantOrangeMoneySimule: number;
  outboxEnAttente: number;
  devise: string;
  estSimule: boolean;
}

export function formatPaiementStatusLabel(statut: StatutPaiement): string {
  switch (statut) {
    case 'INITIE':
      return 'Initié (simulé)';
    case 'EN_COURS':
      return 'En attente de validation';
    case 'ACCEPTE':
      return 'Accepté (simulé)';
    case 'REFUSE':
      return 'Refusé (simulé)';
    case 'EXPIRE':
      return 'Expiré';
    case 'ANNULE':
      return 'Annulé';
    case 'REMBOURSE':
      return 'Remboursé (simulé)';
  }
}

export function paiementStatusBadgeClass(statut: StatutPaiement): string {
  switch (statut) {
    case 'ACCEPTE':
      return 'ui-badge ui-badge--success';
    case 'INITIE':
    case 'EN_COURS':
      return 'ui-badge ui-badge--warning';
    case 'REFUSE':
    case 'EXPIRE':
    case 'ANNULE':
      return 'ui-badge ui-badge--danger';
    case 'REMBOURSE':
      return 'ui-badge ui-badge--neutral';
  }
}

export function formatModePaiementLabel(mode: ModePaiement): string {
  return mode === 'WAVE' ? 'Wave Sénégal (Simulé)' : 'Orange Money Sénégal (Simulé)';
}
