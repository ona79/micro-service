import { computed, inject, Injectable } from '@angular/core';
import { AuthStore } from './auth.store';
import { RoleUtilisateur } from '../models/utilisateur.model';

export type Permission =
  | 'PATRIMOINE:LIRE'
  | 'PATRIMOINE:CREER'
  | 'PATRIMOINE:MODIFIER'
  | 'PATRIMOINE:SUPPRIMER'
  | 'PATRIMOINE:PUBLIER'
  | 'PATRIMOINE:ARCHIVER'
  | 'CIRCUIT:LIRE'
  | 'CIRCUIT:CREER'
  | 'CIRCUIT:MODIFIER'
  | 'CIRCUIT:SUPPRIMER'
  | 'CIRCUIT:PUBLIER'
  | 'CIRCUIT:ARCHIVER'
  | 'EVENEMENT:LIRE'
  | 'EVENEMENT:CREER'
  | 'EVENEMENT:MODIFIER'
  | 'EVENEMENT:SUPPRIMER'
  | 'EVENEMENT:PUBLIER'
  | 'EVENEMENT:ANNULER'
  | 'EVENEMENT:ARCHIVER'
  | 'RESERVATION:CREER'
  | 'RESERVATION:LIRE_PROPRE'
  | 'RESERVATION:LIRE_TOUT'
  | 'RESERVATION:ANNULER_PROPRE'
  | 'RESERVATION:GERER'
  | 'PAIEMENT:INITIER'
  | 'PAIEMENT:LIRE_PROPRE'
  | 'PAIEMENT:LIRE_TOUT'
  | 'PAIEMENT:REMBOURSER'
  | 'UTILISATEUR:LIRE_PROFIL'
  | 'UTILISATEUR:LIRE_TOUT'
  | 'UTILISATEUR:CREER_STAFF'
  | 'UTILISATEUR:GERER_ROLES'
  | 'UTILISATEUR:SUPPRIMER'
  | 'AUDIT:LIRE'
  | 'GUIDE:LIRE'
  | 'GUIDE:GERER_PROPRE_PROFIL'
  | 'GUIDE:VALIDER'
  | 'GUIDE:SUSPENDRE'
  | 'VISITE:VALIDER'
  | 'AVIS:LIRE'
  | 'AVIS:CREER'
  | 'AVIS:MODIFIER_PROPRE'
  | 'AVIS:SUPPRIMER_PROPRE'
  | 'AVIS:SIGNALER'
  | 'AVIS:MODERER'
  | 'NOTIFICATION:LIRE_PROPRE'
  | 'NOTIFICATION:GERER_PROPRE'
  | 'NOTIFICATION:LIRE_TOUT'
  | 'NOTIFICATION:RELANCER';

export const BACK_OFFICE_ROLES: readonly RoleUtilisateur[] = [
  'ADMINISTRATEUR',
  'GESTIONNAIRE_SITE',
  'CONSERVATEUR',
  'GUIDE',
];

export const ROLE_PERMISSIONS: Readonly<Record<RoleUtilisateur, readonly Permission[]>> = {
  TOURISTE: [
    'PATRIMOINE:LIRE',
    'CIRCUIT:LIRE',
    'EVENEMENT:LIRE',
    'RESERVATION:CREER',
    'RESERVATION:LIRE_PROPRE',
    'RESERVATION:ANNULER_PROPRE',
    'PAIEMENT:INITIER',
    'PAIEMENT:LIRE_PROPRE',
    'UTILISATEUR:LIRE_PROFIL',
    'GUIDE:LIRE',
    'AVIS:LIRE',
    'AVIS:CREER',
    'AVIS:MODIFIER_PROPRE',
    'AVIS:SUPPRIMER_PROPRE',
    'AVIS:SIGNALER',
    'NOTIFICATION:LIRE_PROPRE',
    'NOTIFICATION:GERER_PROPRE',
  ],
  GUIDE: [
    'PATRIMOINE:LIRE',
    'CIRCUIT:LIRE',
    'CIRCUIT:MODIFIER',
    'EVENEMENT:LIRE',
    'RESERVATION:LIRE_PROPRE',
    'UTILISATEUR:LIRE_PROFIL',
    'GUIDE:LIRE',
    'GUIDE:GERER_PROPRE_PROFIL',
    'AVIS:LIRE',
    'AVIS:SIGNALER',
    'NOTIFICATION:LIRE_PROPRE',
    'NOTIFICATION:GERER_PROPRE',
  ],
  CONSERVATEUR: [
    'PATRIMOINE:LIRE',
    'PATRIMOINE:CREER',
    'PATRIMOINE:MODIFIER',
    'PATRIMOINE:SUPPRIMER',
    'PATRIMOINE:PUBLIER',
    'PATRIMOINE:ARCHIVER',
    'CIRCUIT:LIRE',
    'EVENEMENT:LIRE',
    'UTILISATEUR:LIRE_PROFIL',
    'GUIDE:LIRE',
    'GUIDE:VALIDER',
    'GUIDE:SUSPENDRE',
    'VISITE:VALIDER',
    'AVIS:LIRE',
    'AVIS:SIGNALER',
    'NOTIFICATION:LIRE_PROPRE',
    'NOTIFICATION:GERER_PROPRE',
  ],
  GESTIONNAIRE_SITE: [
    'PATRIMOINE:LIRE',
    'CIRCUIT:LIRE',
    'CIRCUIT:CREER',
    'CIRCUIT:MODIFIER',
    'CIRCUIT:SUPPRIMER',
    'CIRCUIT:PUBLIER',
    'CIRCUIT:ARCHIVER',
    'EVENEMENT:LIRE',
    'EVENEMENT:CREER',
    'EVENEMENT:MODIFIER',
    'EVENEMENT:SUPPRIMER',
    'EVENEMENT:PUBLIER',
    'EVENEMENT:ANNULER',
    'EVENEMENT:ARCHIVER',
    'RESERVATION:LIRE_TOUT',
    'RESERVATION:GERER',
    'UTILISATEUR:LIRE_PROFIL',
    'GUIDE:LIRE',
    'GUIDE:VALIDER',
    'GUIDE:SUSPENDRE',
    'VISITE:VALIDER',
    'AVIS:LIRE',
    'AVIS:SIGNALER',
    'AVIS:MODERER',
    'NOTIFICATION:LIRE_PROPRE',
    'NOTIFICATION:GERER_PROPRE',
  ],
  ADMINISTRATEUR: [
    'PATRIMOINE:LIRE',
    'PATRIMOINE:CREER',
    'PATRIMOINE:MODIFIER',
    'PATRIMOINE:SUPPRIMER',
    'PATRIMOINE:PUBLIER',
    'PATRIMOINE:ARCHIVER',
    'CIRCUIT:LIRE',
    'CIRCUIT:CREER',
    'CIRCUIT:MODIFIER',
    'CIRCUIT:SUPPRIMER',
    'CIRCUIT:PUBLIER',
    'CIRCUIT:ARCHIVER',
    'EVENEMENT:LIRE',
    'EVENEMENT:CREER',
    'EVENEMENT:MODIFIER',
    'EVENEMENT:SUPPRIMER',
    'EVENEMENT:PUBLIER',
    'EVENEMENT:ANNULER',
    'EVENEMENT:ARCHIVER',
    'RESERVATION:CREER',
    'RESERVATION:LIRE_PROPRE',
    'RESERVATION:LIRE_TOUT',
    'RESERVATION:ANNULER_PROPRE',
    'RESERVATION:GERER',
    'PAIEMENT:INITIER',
    'PAIEMENT:LIRE_PROPRE',
    'PAIEMENT:LIRE_TOUT',
    'PAIEMENT:REMBOURSER',
    'UTILISATEUR:LIRE_PROFIL',
    'UTILISATEUR:LIRE_TOUT',
    'UTILISATEUR:CREER_STAFF',
    'UTILISATEUR:GERER_ROLES',
    'UTILISATEUR:SUPPRIMER',
    'AUDIT:LIRE',
    'GUIDE:LIRE',
    'GUIDE:VALIDER',
    'GUIDE:SUSPENDRE',
    'VISITE:VALIDER',
    'AVIS:LIRE',
    'AVIS:CREER',
    'AVIS:MODIFIER_PROPRE',
    'AVIS:SUPPRIMER_PROPRE',
    'AVIS:SIGNALER',
    'AVIS:MODERER',
    'NOTIFICATION:LIRE_PROPRE',
    'NOTIFICATION:GERER_PROPRE',
    'NOTIFICATION:LIRE_TOUT',
    'NOTIFICATION:RELANCER',
  ],
};

export function hasRolePermission(role: RoleUtilisateur | null | undefined, perm: Permission): boolean {
  if (!role) return false;
  if (role === 'ADMINISTRATEUR') return true;
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

export function getDefaultPostLoginRoute(role: RoleUtilisateur | null | undefined): string {
  if (role && BACK_OFFICE_ROLES.includes(role)) {
    return '/pro/tableau-de-bord';
  }
  return '/mon-espace';
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly authStore = inject(AuthStore);

  readonly role = computed(() => this.authStore.user()?.role ?? null);
  readonly permissions = computed<readonly Permission[]>(() => {
    const r = this.role();
    return r ? (ROLE_PERMISSIONS[r] ?? []) : [];
  });
  readonly canAccessBackOffice = computed(() => {
    const r = this.role();
    return r !== null && BACK_OFFICE_ROLES.includes(r);
  });

  has(perm: Permission): boolean {
    return hasRolePermission(this.role(), perm);
  }

  hasAny(perms: readonly Permission[]): boolean {
    return perms.some((p) => this.has(p));
  }

  hasRole(roles: readonly RoleUtilisateur[]): boolean {
    const r = this.role();
    return r !== null && roles.includes(r);
  }
}
