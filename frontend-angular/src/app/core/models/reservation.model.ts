import { Circuit } from './circuit.model';
import { Evenement } from './evenement.model';

export type TypeReservation = 'CIRCUIT' | 'EVENEMENT';

export type StatutReservation =
  | 'BROUILLON'
  | 'EN_ATTENTE_PAIEMENT'
  | 'CONFIRMEE'
  | 'EXPIREE'
  | 'ANNULEE'
  | 'ECHEC'
  | 'REMBOURSEE';

export interface ReservationParticipant {
  id?: number;
  nomComplet: string;
  email?: string | null;
  telephone?: string | null;
  categorie?: string | null;
}

export interface ReservationHistorique {
  id: number;
  ancienStatut: StatutReservation | null;
  nouveauStatut: StatutReservation;
  acteurId: number | null;
  acteurRole: string | null;
  acteurType: string | null;
  correlationId: string | null;
  referencePaiement: string | null;
  motif: string | null;
  dateTransition: string;
}

export interface DisponibilitePrestation {
  typePrestation: TypeReservation;
  prestationId: number;
  nomPrestation: string;
  datePrestation: string | null;
  statutPrestation: string;
  ouvertReservation: boolean;
  reservable: boolean;
  capaciteLimitee: boolean;
  capaciteTotale: number;
  placesReservees: number;
  placesDisponibles: number | null;
  prixUnitaire: number;
  devise: string;
  motifIndisponibilite: string | null;
}

export interface ReservationStats {
  totalReservations: number;
  brouillon: number;
  enAttentePaiement: number;
  confirmees: number;
  expirees: number;
  annulees: number;
  echecs: number;
  remboursees: number;
  placesReserveesActives: number;
  montantTotalConfirme: number;
  montantTotalEnAttente: number;
  devise: string;
  reservationsParCircuit: number;
  reservationsParEvenement: number;
}

export interface ManifesteParticipant {
  reservationId: number;
  referenceReservation: string;
  circuitId: number;
  nomClient: string;
  nombrePlaces: number;
  datePrestation: string | null;
  creneauPrestation: string | null;
  statut: StatutReservation;
  commentaire: string | null;
  participants: ReservationParticipant[];
}

export interface ReservationCreatePayload {
  nomClient: string;
  emailClient: string;
  telephoneClient: string | null;
  nombrePlaces: number;
  datePrestation?: string | null;
  creneauPrestation?: string | null;
  commentaire?: string | null;
  typeReservation: TypeReservation;
  circuitId: number | null;
  evenementId: number | null;
  soumettrePourPaiement?: boolean;
  participants?: ReservationParticipant[];
}

export interface Reservation {
  id: number;
  referenceReservation?: string | null;
  utilisateurId?: number | null;
  nomClient: string;
  emailClient: string;
  telephoneClient: string | null;
  nombrePlaces: number;
  datePrestation?: string | null;
  creneauPrestation?: string | null;
  commentaire?: string | null;
  dateReservation: string;
  typeReservation: TypeReservation;
  statut: StatutReservation;
  prixUnitaire?: number | null;
  montantTotal: number;
  devise?: string;
  circuitId: number | null;
  evenementId: number | null;
  referencePaiement?: string | null;
  expiresAt?: string | null;
  dateCreation?: string | null;
  dateModification?: string | null;
  dateConfirmation?: string | null;
  dateAnnulation?: string | null;
  motifStatut?: string | null;
  correlationId?: string | null;
  rejoueeIdempotence?: boolean;
  participants?: ReservationParticipant[];
  historique?: ReservationHistorique[];
  circuit: Circuit | null;
  evenement: Evenement | null;
}

export interface GuideAgendaItem {
  date: string;
  creneau: string;
  circuitId: number;
  nomCircuit: string;
  placesOccupees: number;
  placesMax: number;
  nombreReservations: number;
  conflit: boolean;
  reservations: Reservation[];
}

export interface GuideDisponibilite {
  guideId: number;
  date: string;
  creneau?: string;
  disponible: boolean;
  motif?: string;
}

export function formatReservationStatusLabel(statut: StatutReservation): string {
  switch (statut) {
    case 'BROUILLON':
      return 'Brouillon';
    case 'EN_ATTENTE_PAIEMENT':
      return 'En attente de paiement';
    case 'CONFIRMEE':
      return 'Confirmée';
    case 'EXPIREE':
      return 'Expirée';
    case 'ANNULEE':
      return 'Annulée';
    case 'ECHEC':
      return 'Échec paiement';
    case 'REMBOURSEE':
      return 'Remboursée (simulé)';
  }
}

export function reservationStatusBadgeClass(statut: StatutReservation): string {
  switch (statut) {
    case 'CONFIRMEE':
      return 'ui-badge ui-badge--success';
    case 'EN_ATTENTE_PAIEMENT':
    case 'BROUILLON':
      return 'ui-badge ui-badge--warning';
    case 'ANNULEE':
    case 'EXPIREE':
    case 'ECHEC':
      return 'ui-badge ui-badge--danger';
    case 'REMBOURSEE':
      return 'ui-badge ui-badge--neutral';
  }
}
