import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { normalizeHttpError } from '../interceptors/http-error.interceptor';
import {
  ConnexionPayload,
  InscriptionPayload,
  RoleUtilisateur,
  UpdateProfilePayload,
  Utilisateur,
} from '../models/utilisateur.model';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly http = inject(HttpClient);

  private readonly _user = signal<Utilisateur | null>(null);
  private readonly _loading = signal<boolean>(false);
  private readonly _initialized = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  private initPromise: Promise<Utilisateur | null> | null = null;

  readonly user = this._user.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly initialized = this._initialized.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'ADMINISTRATEUR');
  readonly isSiteManager = computed(() => this._user()?.role === 'GESTIONNAIRE_SITE');
  readonly isConservateur = computed(() => this._user()?.role === 'CONSERVATEUR');
  readonly isGuide = computed(() => this._user()?.role === 'GUIDE');
  readonly isTouriste = computed(() => this._user()?.role === 'TOURISTE');
  readonly isStaff = computed(() => {
    const role = this._user()?.role;
    return role === 'ADMINISTRATEUR' || role === 'GESTIONNAIRE_SITE' || role === 'CONSERVATEUR';
  });

  readonly fullName = computed(() => {
    const u = this._user();
    return u ? `${u.prenom} ${u.nom}`.trim() : '';
  });

  readonly initials = computed(() => {
    const u = this._user();
    if (!u) return '';
    const p = u.prenom?.charAt(0) ?? '';
    const n = u.nom?.charAt(0) ?? '';
    return `${p}${n}`.toUpperCase();
  });

  readonly roleLabel = computed(() => formatRoleLabel(this._user()?.role));

  /**
   * Restaure la session depuis le cookie HttpOnly (/api/utilisateurs/me)
   * au démarrage ou lors d'un rechargement de page.
   */
  async ensureInitialized(): Promise<Utilisateur | null> {
    if (this._initialized()) {
      return this._user();
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this.refreshSession().finally(() => {
      this.initPromise = null;
    });
    return this.initPromise;
  }

  async refreshSession(): Promise<Utilisateur | null> {
    try {
      const current = await firstValueFrom(
        this.http.get<Utilisateur>('/api/utilisateurs/me', { withCredentials: true })
      );
      this._user.set(current);
      this._error.set(null);
      return current;
    } catch {
      this._user.set(null);
      return null;
    } finally {
      this._initialized.set(true);
    }
  }

  async login(payload: ConnexionPayload): Promise<Utilisateur> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const connected = await firstValueFrom(
        this.http.post<Utilisateur>('/api/utilisateurs/connexion', payload, {
          withCredentials: true,
        })
      );
      this._user.set(connected);
      this._initialized.set(true);
      return connected;
    } catch (err) {
      const normalized = normalizeHttpError(err);
      this._error.set(normalized.message);
      throw normalized;
    } finally {
      this._loading.set(false);
    }
  }

  async register(payload: InscriptionPayload): Promise<Utilisateur> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const created = await firstValueFrom(
        this.http.post<Utilisateur>('/api/utilisateurs', payload, {
          withCredentials: true,
        })
      );
      this._user.set(created);
      this._initialized.set(true);
      return created;
    } catch (err) {
      const normalized = normalizeHttpError(err);
      this._error.set(normalized.message);
      throw normalized;
    } finally {
      this._loading.set(false);
    }
  }

  async logout(): Promise<void> {
    this._loading.set(true);
    try {
      await firstValueFrom(
        this.http.post<void>('/api/utilisateurs/deconnexion', {}, { withCredentials: true })
      );
    } catch {
      // Même en cas d'erreur réseau, on purge l'état local
    } finally {
      this._user.set(null);
      this._error.set(null);
      this._loading.set(false);
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.post<void>('/api/utilisateurs/refresh', {}, { withCredentials: true })
      );
      await this.refreshSession();
      return true;
    } catch {
      this._user.set(null);
      return false;
    }
  }

  clearSessionLocally(): void {
    this._user.set(null);
  }

  async getAllUsers(): Promise<Utilisateur[]> {
    return firstValueFrom(
      this.http.get<Utilisateur[]>('/api/utilisateurs', { withCredentials: true })
    );
  }

  async createUserByAdmin(payload: InscriptionPayload): Promise<Utilisateur> {
    return firstValueFrom(
      this.http.post<Utilisateur>('/api/utilisateurs/admin', payload, { withCredentials: true })
    );
  }

  async updateUser(
    id: number,
    payload: InscriptionPayload | UpdateProfilePayload
  ): Promise<Utilisateur> {
    const updated = await firstValueFrom(
      this.http.put<Utilisateur>(`/api/utilisateurs/${id}`, payload, { withCredentials: true })
    );
    if (this._user()?.id === id) {
      this._user.set(updated);
    }
    return updated;
  }

  async deleteUser(id: number): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`/api/utilisateurs/${id}`, { withCredentials: true })
    );
  }
}

export function formatRoleLabel(role: RoleUtilisateur | null | undefined): string {
  switch (role) {
    case 'ADMINISTRATEUR':
      return 'Administrateur';
    case 'GESTIONNAIRE_SITE':
      return 'Gestionnaire de site';
    case 'CONSERVATEUR':
      return 'Conservateur du patrimoine';
    case 'GUIDE':
      return 'Guide touristique local';
    case 'TOURISTE':
    default:
      return 'Visiteur / Touriste';
  }
}
