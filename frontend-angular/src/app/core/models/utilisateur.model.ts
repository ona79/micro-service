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

export type { ModePaiement, Paiement, StatutPaiement } from './paiement.model';

export interface NotificationItem {
  id: number;
  destinataire: string;
  sujet: string;
  contenu: string;
  canal: 'EMAIL' | 'SMS' | 'PUSH';
  statut: 'ENVOYEE' | 'ECHEC';
  dateEnvoi: string;
  reservationId: number | null;
}
