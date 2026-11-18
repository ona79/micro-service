export type RoleUtilisateur =
  | 'TOURISTE'
  | 'GUIDE'
  | 'CONSERVATEUR'
  | 'GESTIONNAIRE_SITE'
  | 'ADMINISTRATEUR';

export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  role: RoleUtilisateur;
  actif: boolean;
  dateInscription: string | null;
}

export interface ConnexionPayload {
  email: string;
  motDePasse: string;
}

export interface InscriptionPayload {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
  telephone?: string | null;
  role?: RoleUtilisateur;
  actif?: boolean;
}

export interface UpdateProfilePayload {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  motDePasse?: string;
}

export type { ModePaiement, Paiement, StatutPaiement } from './paiement.model';
export type { NotificationItem } from './notification.model';
