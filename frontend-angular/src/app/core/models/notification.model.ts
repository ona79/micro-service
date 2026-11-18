export type CanalNotification = 'EMAIL' | 'SMS' | 'IN_APP';
export type StatutNotification = 'EN_ATTENTE' | 'ECHEC_TEMPORAIRE' | 'ENVOYEE' | 'ECHEC';

export interface NotificationItem {
  id: number;
  destinataire: string;
  utilisateurId?: number | null;
  sujet: string;
  contenu: string;
  canal: CanalNotification | 'PUSH';
  statut: StatutNotification;
  typeEvenement?: string | null;
  cibleType?: string | null;
  cibleId?: number | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
  lue?: boolean;
  dateLecture?: string | null;
  tentatives?: number;
  maxTentatives?: number;
  dernierErreur?: string | null;
  prochaineTentativeAt?: string | null;
  dateEnvoi: string;
  reservationId: number | null;
}

export interface NotificationPageResponse {
  content: NotificationItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
  unreadCount: number;
}

export interface NotificationCompteur {
  unreadCount: number;
}

export function formatNotificationEventLabel(typeEvenement: string | null | undefined): string {
  switch (typeEvenement) {
    case 'RESERVATION_CONFIRMEE':
      return 'Réservation confirmée';
    case 'RESERVATION_ANNULEE':
      return 'Réservation annulée';
    case 'RESERVATION_REMBOURSEE':
      return 'Réservation remboursée';
    case 'PAIEMENT_ACCEPTE':
      return 'Paiement accepté';
    case 'PAIEMENT_REFUSE':
      return 'Paiement refusé';
    case 'PAIEMENT_REMBOURSE':
      return 'Remboursement simulé';
    case 'GUIDE_PROFILE_SOUMIS':
      return 'Dossier guide soumis';
    case 'GUIDE_PROFILE_VALIDE':
      return 'Profil guide validé';
    case 'GUIDE_PROFILE_REJETE':
      return 'Profil guide rejeté';
    case 'GUIDE_PROFILE_SUSPENDU':
      return 'Profil guide suspendu';
    case 'GUIDE_PROFILE_REACTIVE':
      return 'Profil guide réactivé';
    case 'GUIDE_AFFECTE_CIRCUIT':
      return 'Affectation circuit';
    case 'AVIS_PUBLIE':
      return 'Nouvel avis publié';
    case 'AVIS_MODERE':
      return 'Décision de modération';
    case 'SIGNALEMENT_TRAITE':
      return 'Signalement traité';
    default:
      return 'Notification métier';
  }
}
