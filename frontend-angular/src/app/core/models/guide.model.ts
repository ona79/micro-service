export type StatutValidationGuide =
  | 'BROUILLON'
  | 'EN_ATTENTE_VALIDATION'
  | 'VALIDE'
  | 'REJETE'
  | 'SUSPENDU'
  | 'DESACTIVE';

export interface GuideProfil {
  id: number;
  utilisateurId: number;
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  compteActif: boolean;
  presentationCourte: string;
  biographie: string;
  languesParlees: string;
  specialites: string;
  zonesIntervention: string;
  anneesExperience: number;
  numeroCarteProfessionnelle?: string | null;
  documentsJustificatifs?: string | null;
  tarifJournalierIndicatif?: number | null;
  devise?: string;
  disponible: boolean;
  visibilitePublique: boolean;
  statutValidation: StatutValidationGuide;
  motifDecision?: string | null;
  valideParId?: number | null;
  dateSoumission?: string | null;
  dateValidation?: string | null;
  dateSuspension?: string | null;
  dateDesactivation?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface GuideSelfUpdatePayload {
  presentationCourte: string;
  biographie: string;
  languesParlees: string;
  specialites: string;
  zonesIntervention: string;
  anneesExperience: number;
  numeroCarteProfessionnelle?: string | null;
  documentsJustificatifs?: string | null;
  tarifJournalierIndicatif?: number | null;
  disponible?: boolean;
  visibilitePublique?: boolean;
}

export interface GuideHistorique {
  id: number;
  guideProfilId: number;
  ancienStatut: StatutValidationGuide | null;
  nouveauStatut: StatutValidationGuide;
  acteurId: number | null;
  acteurRole: string | null;
  motif: string | null;
  correlationId: string | null;
  dateTransition: string;
}

export function formatGuideStatusLabel(statut: StatutValidationGuide | null | undefined): string {
  switch (statut) {
    case 'BROUILLON':
      return 'Brouillon';
    case 'EN_ATTENTE_VALIDATION':
      return 'En attente de validation';
    case 'VALIDE':
      return 'Validé';
    case 'REJETE':
      return 'Rejeté';
    case 'SUSPENDU':
      return 'Suspendu';
    case 'DESACTIVE':
      return 'Désactivé';
    default:
      return 'Inconnu';
  }
}

export function guideStatusBadgeClass(statut: StatutValidationGuide | null | undefined): string {
  switch (statut) {
    case 'VALIDE':
      return 'ui-badge ui-badge--success';
    case 'EN_ATTENTE_VALIDATION':
      return 'ui-badge ui-badge--warning';
    case 'REJETE':
    case 'SUSPENDU':
      return 'ui-badge ui-badge--danger';
    case 'DESACTIVE':
    case 'BROUILLON':
    default:
      return 'ui-badge ui-badge--neutral';
  }
}
