import { Circuit } from './circuit.model';
import { Evenement } from './evenement.model';

export type TypeReservation = 'CIRCUIT' | 'EVENEMENT';
export type StatutReservation = 'EN_ATTENTE' | 'CONFIRMEE' | 'ANNULEE';

export interface ReservationCreatePayload {
  nomClient: string;
  emailClient: string;
  telephoneClient: string | null;
  nombrePlaces: number;
  typeReservation: TypeReservation;
  circuitId: number | null;
  evenementId: number | null;
}

export interface Reservation {
  id: number;
  nomClient: string;
  emailClient: string;
  telephoneClient: string | null;
  nombrePlaces: number;
  dateReservation: string;
  typeReservation: TypeReservation;
  statut: StatutReservation;
  montantTotal: number;
  circuitId: number | null;
  evenementId: number | null;
  circuit: Circuit | null;
  evenement: Evenement | null;
}
