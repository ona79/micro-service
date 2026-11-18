import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideShieldAlert,
  LucideTrash2,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AuthStore, formatRoleLabel } from '../../../../core/auth/auth.store';
import { PermissionService } from '../../../../core/auth/permissions';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import { AuditSecuriteItem } from '../../../../core/models/audit.model';
import { UtilisateurStats } from '../../../../core/models/statistics.model';
import { RoleUtilisateur, Utilisateur } from '../../../../core/models/utilisateur.model';
import { UiConfirmDialogComponent } from '../../../../shared/components/ui-confirm-dialog/ui-confirm-dialog.component';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiKpiCardComponent } from '../../../../shared/components/ui-kpi-card/ui-kpi-card.component';
import { UiPaginationComponent } from '../../../../shared/components/ui-pagination/ui-pagination.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';

@Component({
  selector: 'app-pro-utilisateurs-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DateFrPipe,
    UiKpiCardComponent,
    UiPaginationComponent,
    UiEmptyStateComponent,
    UiErrorBannerComponent,
    LucidePlus,
    LucidePencil,
    LucideTrash2,
    LucideRefreshCw,
    LucideShieldAlert,
  ],
  template: `
    <header class="bo-header">
      <div>
        <p class="bo-header__eyebrow">Sécurité &amp; Gouvernance ms-utilisateur · Administrateur</p>
        <h1 class="bo-header__title">Utilisateurs, Rôles RBAC &amp; Audit sécurité</h1>
        <p class="bo-header__lead">
          Créez des comptes staff, modifiez les rôles (avec révocation immédiate des sessions), et
          inspectez le journal immuable d’audit sécurité.
        </p>
      </div>
      <div class="bo-header__actions">
        <button type="button" class="bo-btn" (click)="refresh()">
          <svg lucideRefreshCw [size]="14" aria-hidden="true"></svg>
          <span>Actualiser</span>
        </button>
        @if (permissions.has('UTILISATEUR:CREER_STAFF')) {
          <button type="button" class="bo-btn bo-btn--primary" (click)="openCreateForm()">
            <svg lucidePlus [size]="15" aria-hidden="true"></svg>
            <span>Créer un utilisateur</span>
          </button>
        }
      </div>
    </header>

    @if (stats(); as s) {
      <div class="bo-kpi-grid">
        <app-ui-kpi-card label="Total comptes" [value]="s.total" subtitle="Actifs : {{ s.actifs }} · Inactifs : {{ s.inactifs }}" />
        <app-ui-kpi-card label="Staff &amp; Guides" [value]="(s.parRole['ADMINISTRATEUR'] ?? 0) + (s.parRole['GESTIONNAIRE_SITE'] ?? 0) + (s.parRole['CONSERVATEUR'] ?? 0) + (s.parRole['GUIDE'] ?? 0)" tone="ochre" />
        <app-ui-kpi-card label="Événements d'audit" [value]="s.auditLogsTotal" tone="forest" />
        <app-ui-kpi-card label="Alertes / Échecs (24h)" [value]="s.alertesSecurite24h + ' / ' + s.echecsConnexion24h" [tone]="s.alertesSecurite24h > 0 ? 'danger' : 'neutral'" />
      </div>
    }

    <div class="bo-tabs" role="tablist">
      <button type="button" role="tab" class="bo-tab" [class.bo-tab--active]="activeTab() === 'users'" (click)="switchTab('users')">
        Comptes &amp; Rôles RBAC
      </button>
      @if (permissions.has('AUDIT:LIRE')) {
        <button type="button" role="tab" class="bo-tab" [class.bo-tab--active]="activeTab() === 'audit'" (click)="switchTab('audit')">
          Journal d'audit sécurité
        </button>
      }
    </div>

    @if (actionError()) {
      <app-ui-error-banner [message]="actionError()!" [showRetry]="false" />
    }

    @if (formOpen()) {
      <section class="bo-panel" aria-label="Formulaire compte utilisateur">
        <div class="bo-panel__head">
          <h2 class="bo-panel__title">
            {{ editingUser() ? 'Modifier le compte #' + editingUser()!.id + ' (' + editingUser()!.email + ')' : 'Créer un compte staff ou guide' }}
          </h2>
          <button type="button" class="bo-btn" (click)="closeForm()">Fermer</button>
        </div>

        <form [formGroup]="userForm" (ngSubmit)="saveUser()" class="bo-form-grid" novalidate>
          <div class="bo-field">
            <label for="u-prenom" class="bo-label">Prénom *</label>
            <input id="u-prenom" type="text" class="bo-input" formControlName="prenom" />
          </div>
          <div class="bo-field">
            <label for="u-nom" class="bo-label">Nom *</label>
            <input id="u-nom" type="text" class="bo-input" formControlName="nom" />
          </div>
          <div class="bo-field">
            <label for="u-email" class="bo-label">Email *</label>
            <input id="u-email" type="email" class="bo-input" formControlName="email" />
          </div>
          <div class="bo-field">
            <label for="u-tel" class="bo-label">Téléphone</label>
            <input id="u-tel" type="text" class="bo-input" formControlName="telephone" />
          </div>
          <div class="bo-field">
            <label for="u-role" class="bo-label">Rôle RBAC *</label>
            <select id="u-role" class="bo-select" formControlName="role">
              <option value="TOURISTE">TOURISTE</option>
              <option value="GUIDE">GUIDE</option>
              <option value="CONSERVATEUR">CONSERVATEUR</option>
              <option value="GESTIONNAIRE_SITE">GESTIONNAIRE_SITE</option>
              <option value="ADMINISTRATEUR">ADMINISTRATEUR</option>
            </select>
          </div>
          <div class="bo-field">
            <label for="u-pwd" class="bo-label">
              {{ editingUser() ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe (6 car. min.) *' }}
            </label>
            <input id="u-pwd" type="password" class="bo-input" formControlName="motDePasse" />
          </div>

          @if (editingUser()) {
            <div class="bo-field bo-form-span2">
              <label class="bo-btn" style="cursor: pointer; width: fit-content;">
                <input type="checkbox" formControlName="actif" />
                <span>Compte actif (décocher désactive immédiatement l'utilisateur et révoque ses sessions)</span>
              </label>
            </div>
          }

          <div class="bo-form-span2 bo-actions-cell">
            <button type="submit" class="bo-btn bo-btn--primary" [disabled]="saving()">
              <span>{{ saving() ? 'Enregistrement...' : (editingUser() ? 'Enregistrer modifications' : 'Créer le compte') }}</span>
            </button>
            <button type="button" class="bo-btn" (click)="closeForm()">Annuler</button>
          </div>
        </form>
      </section>
    }

    @if (activeTab() === 'users') {
      <section class="bo-panel">
        <div class="bo-filters">
          <div class="bo-field bo-field--grow">
            <label for="usr-q" class="bo-label">Recherche</label>
            <input id="usr-q" type="search" class="bo-input" [(ngModel)]="userQ" placeholder="Nom, prénom, email..." (keyup.enter)="loadUsers(0)" />
          </div>
          <div class="bo-field">
            <label for="usr-role" class="bo-label">Rôle</label>
            <select id="usr-role" class="bo-select" [(ngModel)]="userRoleFilter" (ngModelChange)="loadUsers(0)">
              <option value="">Tous les rôles</option>
              <option value="ADMINISTRATEUR">ADMINISTRATEUR</option>
              <option value="GESTIONNAIRE_SITE">GESTIONNAIRE_SITE</option>
              <option value="CONSERVATEUR">CONSERVATEUR</option>
              <option value="GUIDE">GUIDE</option>
              <option value="TOURISTE">TOURISTE</option>
            </select>
          </div>
          <div class="bo-field">
            <label for="usr-actif" class="bo-label">Activation</label>
            <select id="usr-actif" class="bo-select" [(ngModel)]="userActifFilter" (ngModelChange)="loadUsers(0)">
              <option value="">Tous</option>
              <option value="true">Actifs</option>
              <option value="false">Désactivés</option>
            </select>
          </div>
          <button type="button" class="bo-btn bo-btn--primary" (click)="loadUsers(0)">Filtrer</button>
        </div>

        @if (error()) {
          <app-ui-error-banner [message]="error()!" (retry)="loadUsers(userPage())" />
        } @else if (loading()) {
          <p class="bo-cell-sub">Chargement des utilisateurs...</p>
        } @else if (users().length === 0) {
          <app-ui-empty-state title="Aucun utilisateur" description="Aucun compte ne correspond à ces filtres." />
        } @else {
          <div class="bo-table-wrap">
            <table class="bo-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Rôle RBAC</th>
                  <th>État &amp; Inscription</th>
                  <th>Actions sécurité</th>
                </tr>
              </thead>
              <tbody>
                @for (u of users(); track u.id) {
                  <tr>
                    <td>
                      <span class="bo-cell-title">{{ u.prenom }} {{ u.nom }}</span>
                      <span class="bo-cell-sub">{{ u.email }} · {{ u.telephone || 'N/A' }}</span>
                    </td>
                    <td>
                      <span class="ui-badge ui-badge--terracotta">{{ formatRole(u.role) }}</span>
                    </td>
                    <td>
                      <span class="ui-badge" [class.ui-badge--success]="u.actif" [class.ui-badge--danger]="!u.actif">
                        {{ u.actif ? 'Actif' : 'Désactivé' }}
                      </span>
                      @if (u.dateInscription) {
                        <span class="bo-cell-sub">{{ u.dateInscription | dateFr: 'd MMM yyyy' }}</span>
                      }
                    </td>
                    <td>
                      <div class="bo-actions-cell">
                        @if (permissions.has('UTILISATEUR:GERER_ROLES')) {
                          <button type="button" class="bo-btn bo-btn--sm" (click)="openEditForm(u)">
                            <svg lucidePencil [size]="12" aria-hidden="true"></svg>
                            <span>Modifier / Rôle</span>
                          </button>
                          <button type="button" class="bo-btn bo-btn--sm bo-btn--terracotta" (click)="revokerSessions(u)">
                            <svg lucideShieldAlert [size]="12" aria-hidden="true"></svg>
                            <span>Révoquer sessions</span>
                          </button>
                        }
                        @if (permissions.has('UTILISATEUR:SUPPRIMER') && u.id !== authStore.user()?.id) {
                          <button type="button" class="bo-btn bo-btn--sm bo-btn--danger" (click)="supprimerUser(u)">
                            <svg lucideTrash2 [size]="12" aria-hidden="true"></svg>
                            <span>Supprimer</span>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <app-ui-pagination
            [page]="userPage()"
            [totalPages]="userTotalPages()"
            [totalElements]="userTotal()"
            [last]="userLast()"
            (pageChange)="loadUsers($event)"
          />
        }
      </section>
    } @else {
      <section class="bo-panel">
        <div class="bo-filters">
          <div class="bo-field bo-field--grow">
            <label for="aud-q" class="bo-label">Recherche logs</label>
            <input id="aud-q" type="search" class="bo-input" [(ngModel)]="auditQ" placeholder="Email, IP, détails..." (keyup.enter)="loadAudit(0)" />
          </div>
          <div class="bo-field">
            <label for="aud-type" class="bo-label">Type événement</label>
            <select id="aud-type" class="bo-select" [(ngModel)]="auditEventType" (ngModelChange)="loadAudit(0)">
              <option value="">Tous</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="TOKEN_REFRESH">TOKEN_REFRESH</option>
              <option value="ALERT_TOKEN_REPLAY">ALERT_TOKEN_REPLAY</option>
              <option value="ROLE_CHANGE">ROLE_CHANGE</option>
              <option value="ADMIN_ACTION">ADMIN_ACTION</option>
              <option value="ACCESS_DENIED">ACCESS_DENIED</option>
            </select>
          </div>
          <button type="button" class="bo-btn bo-btn--primary" (click)="loadAudit(0)">Filtrer</button>
        </div>

        @if (auditLoading()) {
          <p class="bo-cell-sub">Chargement du journal d'audit...</p>
        } @else if (auditLogs().length === 0) {
          <app-ui-empty-state title="Aucune entrée d'audit" description="Aucun événement sécurité correspondant." />
        } @else {
          <div class="bo-table-wrap">
            <table class="bo-table">
              <thead>
                <tr>
                  <th>Horodatage</th>
                  <th>Événement &amp; Statut</th>
                  <th>Acteur / IP</th>
                  <th>Détails</th>
                </tr>
              </thead>
              <tbody>
                @for (a of auditLogs(); track a.id) {
                  <tr>
                    <td class="tabular-nums">{{ a.timestamp | dateFr: 'd MMM yyyy HH:mm:ss' }}</td>
                    <td>
                      <span class="bo-cell-title">{{ a.eventType }}</span>
                      <span
                        class="ui-badge"
                        [class.ui-badge--success]="a.status === 'SUCCESS'"
                        [class.ui-badge--warning]="a.status === 'FAILURE' || a.status === 'DENIED'"
                        [class.ui-badge--danger]="a.status === 'ALERT'"
                      >
                        {{ a.status }}
                      </span>
                    </td>
                    <td>
                      <span>User #{{ a.utilisateurId ?? 'N/A' }}</span>
                      <span class="bo-cell-sub">{{ a.email || '—' }} · {{ a.ipAddress || '0.0.0.0' }}</span>
                    </td>
                    <td>{{ a.details || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <app-ui-pagination
            [page]="auditPage()"
            [totalPages]="auditTotalPages()"
            [totalElements]="auditTotal()"
            [last]="auditLast()"
            (pageChange)="loadAudit($event)"
          />
        }
      </section>
    }
  `,
})
export class ProUtilisateursPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(Dialog);
  protected readonly authStore = inject(AuthStore);
  protected readonly permissions = inject(PermissionService);

  protected readonly activeTab = signal<'users' | 'audit'>('users');
  protected readonly loading = signal(true);
  protected readonly auditLoading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly stats = signal<UtilisateurStats | null>(null);
  protected readonly users = signal<Utilisateur[]>([]);
  protected readonly userPage = signal(0);
  protected readonly userTotalPages = signal(0);
  protected readonly userTotal = signal(0);
  protected readonly userLast = signal(true);

  protected readonly auditLogs = signal<AuditSecuriteItem[]>([]);
  protected readonly auditPage = signal(0);
  protected readonly auditTotalPages = signal(0);
  protected readonly auditTotal = signal(0);
  protected readonly auditLast = signal(true);

  protected readonly formOpen = signal(false);
  protected readonly editingUser = signal<Utilisateur | null>(null);

  protected userQ = '';
  protected userRoleFilter: RoleUtilisateur | '' = '';
  protected userActifFilter: '' | 'true' | 'false' = '';

  protected auditQ = '';
  protected auditEventType = '';

  protected readonly formatRole = formatRoleLabel;

  protected readonly userForm = this.fb.nonNullable.group({
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    nom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    telephone: [''],
    role: ['GUIDE' as RoleUtilisateur, [Validators.required]],
    motDePasse: [''],
    actif: [true],
  });

  ngOnInit(): void {
    void this.refresh();
  }

  protected switchTab(tab: 'users' | 'audit'): void {
    this.activeTab.set(tab);
    if (tab === 'audit') {
      void this.loadAudit(0);
    } else {
      void this.loadUsers(0);
    }
  }

  async refresh(): Promise<void> {
    await Promise.all([
      this.loadStats(),
      this.activeTab() === 'users' ? this.loadUsers(this.userPage()) : this.loadAudit(this.auditPage()),
    ]);
  }

  async loadStats(): Promise<void> {
    try {
      this.stats.set(await this.authStore.getUserStats());
    } catch {
      // Silencieux
    }
  }

  async loadUsers(page = 0): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const actifParam = this.userActifFilter === '' ? null : this.userActifFilter === 'true';
      const res = await this.authStore.rechercherUsers({
        q: this.userQ.trim() || undefined,
        role: this.userRoleFilter || undefined,
        actif: actifParam,
        page,
        size: 12,
      });
      this.users.set(res.content);
      this.userPage.set(res.page);
      this.userTotalPages.set(res.totalPages);
      this.userTotal.set(res.totalElements);
      this.userLast.set(res.last);
    } catch (err) {
      this.error.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async loadAudit(page = 0): Promise<void> {
    this.auditLoading.set(true);
    this.actionError.set(null);
    try {
      const res = await this.authStore.getAuditLogs({
        eventType: this.auditEventType || undefined,
        q: this.auditQ.trim() || undefined,
        page,
        size: 20,
      });
      this.auditLogs.set(res.content);
      this.auditPage.set(res.page);
      this.auditTotalPages.set(res.totalPages);
      this.auditTotal.set(res.totalElements);
      this.auditLast.set(res.last);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.auditLoading.set(false);
    }
  }

  openCreateForm(): void {
    this.editingUser.set(null);
    this.actionError.set(null);
    this.userForm.reset({
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      role: 'GUIDE',
      motDePasse: '',
      actif: true,
    });
    this.formOpen.set(true);
  }

  openEditForm(u: Utilisateur): void {
    this.editingUser.set(u);
    this.actionError.set(null);
    this.userForm.reset({
      prenom: u.prenom,
      nom: u.nom,
      email: u.email,
      telephone: u.telephone ?? '',
      role: u.role,
      motDePasse: '',
      actif: u.actif,
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingUser.set(null);
  }

  async saveUser(): Promise<void> {
    this.actionError.set(null);
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    const v = this.userForm.getRawValue();
    const target = this.editingUser();

    if (!target && v.motDePasse.trim().length < 6) {
      this.actionError.set('Un mot de passe d’au moins 6 caractères est obligatoire à la création.');
      return;
    }

    if (target && (target.role !== v.role || (target.actif && !v.actif))) {
      const ok = await firstValueFrom(
        this.dialog
          .open<boolean>(UiConfirmDialogComponent, {
            data: {
              title: 'Modifier privilèges ou activation ?',
              message: `Tout changement de rôle (${target.role} → ${v.role}) ou désactivation révoquera immédiatement les sessions de ${target.email}.`,
              confirmLabel: 'Confirmer le changement',
              cancelLabel: 'Annuler',
              variant: 'danger',
            },
          })
          .closed
      );
      if (!ok) return;
    }

    this.saving.set(true);
    try {
      if (target) {
        await this.authStore.updateUser(target.id, {
          nom: v.nom.trim(),
          prenom: v.prenom.trim(),
          email: v.email.trim(),
          telephone: v.telephone.trim() || null,
          role: v.role,
          actif: v.actif,
          ...(v.motDePasse.trim() ? { motDePasse: v.motDePasse.trim() } : {}),
        });
        toast.success(`Compte ${v.email} mis à jour.`);
      } else {
        await this.authStore.createUserByAdmin({
          nom: v.nom.trim(),
          prenom: v.prenom.trim(),
          email: v.email.trim(),
          telephone: v.telephone.trim() || null,
          role: v.role,
          motDePasse: v.motDePasse.trim(),
        });
        toast.success(`Compte ${v.email} créé.`);
      }
      this.closeForm();
      await Promise.all([this.loadStats(), this.loadUsers(this.userPage())]);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  async revokerSessions(u: Utilisateur): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<boolean>(UiConfirmDialogComponent, {
          data: {
            title: `Révoquer toutes les sessions de ${u.prenom} ${u.nom} ?`,
            message: 'L’utilisateur devra se réauthentifier immédiatement.',
            confirmLabel: 'Révoquer sessions',
            cancelLabel: 'Annuler',
            variant: 'danger',
          },
        })
        .closed
    );
    if (!ok) return;
    try {
      await this.authStore.revoquerSessions(u.id);
      toast.success(`Toutes les sessions de ${u.email} ont été révoquées.`);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }

  async supprimerUser(u: Utilisateur): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<boolean>(UiConfirmDialogComponent, {
          data: {
            title: `Supprimer le compte ${u.email} ?`,
            message: 'Cette suppression est définitive.',
            confirmLabel: 'Supprimer',
            cancelLabel: 'Conserver',
            variant: 'danger',
          },
        })
        .closed
    );
    if (!ok) return;
    try {
      await this.authStore.deleteUser(u.id);
      toast.success('Compte supprimé.');
      await Promise.all([this.loadStats(), this.loadUsers(this.userPage())]);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }
}
