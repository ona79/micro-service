import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { Permission, hasRolePermission } from '../auth/permissions';
import { RoleUtilisateur } from '../models/utilisateur.model';

/**
 * Protège les routes nécessitant une session authentifiée valide.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const user = await authStore.ensureInitialized();
  if (user) {
    return true;
  }

  return router.createUrlTree(['/connexion'], {
    queryParams: { returnUrl: state.url },
  });
};

/**
 * Redirige vers l'espace personnel si l'utilisateur est déjà connecté.
 */
export const guestGuard: CanActivateFn = async () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const user = await authStore.ensureInitialized();
  if (!user) {
    return true;
  }
  return router.createUrlTree(['/mon-espace']);
};

/**
 * Fabrique un guard vérifiant que l'utilisateur connecté possède l'un des rôles autorisés.
 */
export function roleGuard(allowedRoles: readonly RoleUtilisateur[]): CanActivateFn {
  return async (_route, state) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    const user = await authStore.ensureInitialized();
    if (!user) {
      return router.createUrlTree(['/connexion'], {
        queryParams: { returnUrl: state.url },
      });
    }

    if (allowedRoles.includes(user.role)) {
      return true;
    }

    return router.createUrlTree(['/acces-refuse'], {
      queryParams: {
        required: allowedRoles.join(','),
        from: state.url,
      },
    });
  };
}

/**
 * Fabrique un guard vérifiant que l'utilisateur possède au moins une permission métier requise.
 */
export function permissionGuard(requiredAnyPermissions: readonly Permission[]): CanActivateFn {
  return async (_route, state) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);

    const user = await authStore.ensureInitialized();
    if (!user) {
      return router.createUrlTree(['/connexion'], {
        queryParams: { returnUrl: state.url },
      });
    }

    if (requiredAnyPermissions.some((perm) => hasRolePermission(user.role, perm))) {
      return true;
    }

    return router.createUrlTree(['/acces-refuse'], {
      queryParams: {
        required: requiredAnyPermissions.join(','),
        from: state.url,
      },
    });
  };
}
