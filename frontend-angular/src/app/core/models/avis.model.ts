export type CibleAvis = 'PATRIMOINE' | 'CIRCUIT' | 'EVENEMENT' | 'GUIDE';

export type StatutModerationAvis = 'EN_ATTENTE' | 'APPROUVE' | 'MASQUE' | 'REJETE';

export type CategorieSignalement =
  | 'CONTENU_INAPPROPRIE'
  | 'SPAM'
  | 'PROPOS_OFFENSANTS'
  | 'FAUSSE_INFORMATION'
  | 'AUTRE';

export type StatutSignalement = 'OUVERT' | 'VALIDE_CONTENU_RETIRE' | 'REJETE_ABUSIF';

export interface Avis {
  id: number;
  auteurId: number;
  auteurNom: string;
  cibleType: CibleAvis;
  cibleId: number;
  cibleNom?: string | null;
  reservationId?: number | null;
  note: number;
  commentaire: string;
  experienceVerifiee: boolean;
  statutModeration: StatutModerationAvis;
  motifModeration?: string | null;
  modereParId?: number | null;
  datePublication: string;
  dateModification?: string | null;
  dateModeration?: string | null;
}

export interface AvisCreatePayload {
  cibleType: CibleAvis;
  cibleId: number;
  reservationId?: number | null;
  note: number;
  commentaire: string;
}

export interface AvisUpdatePayload {
  note: number;
  commentaire: string;
}

export interface AvisEligibilite {
  cibleType: CibleAvis;
  cibleId: number;
  eligible: boolean;
  dejaEvalue: boolean;
  reservationsEligiblesIds: number[];
  motifIneligibilite: string | null;
}

export interface AvisResume {
  cibleType: CibleAvis;
  cibleId: number;
  noteMoyenne: number;
  totalAvis: number;
  repartition: Record<number, number>;
}

export interface SignalementAvis {
  id: number;
  avisId: number;
  signaleParId: number;
  signaleParNom: string;
  categorie: CategorieSignalement;
  motif: string;
  statut: StatutSignalement;
  decisionCommentaire?: string | null;
  traiteParId?: number | null;
  dateSignalement: string;
  dateResolution?: string | null;
  avis?: Avis | null;
  avisStatutActuel?: StatutModerationAvis | null;
}

export interface AvisModerationHistorique {
  id: number;
  avisId: number;
  signalementId?: number | null;
  ancienStatut: StatutModerationAvis | null;
  nouveauStatut: StatutModerationAvis;
  acteurId: number;
  acteurRole: string;
  justification: string;
  correlationId?: string | null;
  dateDecision: string;
}

export function formatModerationStatusLabel(statut: StatutModerationAvis | null | undefined): string {
  switch (statut) {
    case 'APPROUVE':
      return 'Approuvé';
    case 'EN_ATTENTE':
      return 'En attente d’examen';
    case 'MASQUE':
      return 'Masqué';
    case 'REJETE':
      return 'Rejeté';
    default:
      return 'Inconnu';
  }
}

export function moderationBadgeClass(statut: StatutModerationAvis | null | undefined): string {
  switch (statut) {
    case 'APPROUVE':
      return 'ui-badge ui-badge--success';
    case 'EN_ATTENTE':
      return 'ui-badge ui-badge--warning';
    case 'MASQUE':
      return 'ui-badge ui-badge--ochre';
    case 'REJETE':
      return 'ui-badge ui-badge--danger';
    default:
      return 'ui-badge ui-badge--neutral';
  }
}

export function formatSignalementStatusLabel(statut: StatutSignalement | null | undefined): string {
  switch (statut) {
    case 'OUVERT':
      return 'Ouvert — à examiner';
    case 'VALIDE_CONTENU_RETIRE':
      return 'Validé — contenu retiré';
    case 'REJETE_ABUSIF':
      return 'Rejeté — signalement non fondé';
    default:
      return 'Inconnu';
  }
}
