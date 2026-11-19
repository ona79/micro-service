import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideCheck, LucideCheckCheck, LucideEye, LucideRefreshCw } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { PermissionService } from '../../../../core/auth/permissions';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import {
  NotificationItem,
  StatutNotification,
  formatNotificationEventLabel,
} from '../../../../core/models/notification.model';
import { NotificationStats } from '../../../../core/models/statistics.model';
import { UiConfirmDialogComponent } from '../../../../shared/components/ui-confirm-dialog/ui-confirm-dialog.component';
import { UiDetailDrawerComponent } from '../../../../shared/components/ui-detail-drawer/ui-detail-drawer.component';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiKpiCardComponent } from '../../../../shared/components/ui-kpi-card/ui-kpi-card.component';
import { UiPaginationComponent } from '../../../../shared/components/ui-pagination/ui-pagination.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { NotificationApiService } from '../../../notifications/data-access/notification-api.service';
import { NotificationStore } from '../../../notifications/data-access/notification.store';

@Component({
  selector: 'app-pro-notifications-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    DateFrPipe,
    UiKpiCardComponent,
    UiPaginationComponent,
    UiDetailDrawerComponent,
    UiEmptyStateComponent,
    UiErrorBannerComponent,
    LucideCheck,
    LucideCheckCheck,
    LucideRefreshCw,
    LucideEye,
  ],
  template: `
    <header class="bo-header">
      <div>
        <p class="bo-header__eyebrow">Alertes &amp; Supervision ms-notification</p>
        <h1 class="bo-header__title">Centre des notifications</h1>
        <p class="bo-header__lead">
          Consultez vos alertes métier personnelles
          @if (permissions.has('NOTIFICATION:LIRE_TOUT')) {
            et supervisez l’ensemble des livraisons EMAIL / SMS / IN_APP de la plateforme.
          }
        </p>
      </div>
      <div class="bo-header__actions">
        <button type="button" class="bo-btn" (click)="refreshCurrent()">
          <svg lucideRefreshCw [size]="14" aria-hidden="true"></svg>
          <span>Actualiser</span>
        </button>
      </div>
    </header>

    @if (permissions.has('NOTIFICATION:LIRE_TOUT')) {
      <div class="bo-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="bo-tab"
          [class.bo-tab--active]="activeTab() === 'perso'"
          (click)="switchTab('perso')"
        >
          Mes notifications ({{ notificationStore.unreadCount() }} non lues)
        </button>
        <button
          type="button"
          role="tab"
          class="bo-tab"
          [class.bo-tab--active]="activeTab() === 'supervision'"
          (click)="switchTab('supervision')"
        >
          Supervision globale (Admin)
        </button>
      </div>
    }

    @if (error()) {
      <app-ui-error-banner [message]="error()!" (retry)="refreshCurrent()" />
    }

    @if (activeTab() === 'perso') {
      <section class="bo-panel">
        <div class="bo-panel__head">
          <div class="bo-filters" style="margin-bottom: 0;">
            <label class="bo-btn" style="cursor: pointer;">
              <input type="checkbox" [(ngModel)]="nonLuesOnly" (ngModelChange)="loadPerso(0)" />
              <span>Non lues uniquement</span>
            </label>
            <select
              class="bo-select"
              [(ngModel)]="persoType"
              (ngModelChange)="loadPerso(0)"
              aria-label="Filtrer mes notifications par type"
              style="width: auto;"
            >
              <option value="">Tous les événements</option>
              <option value="RESERVATION_CONFIRMEE">Réservation confirmée</option>
              <option value="PAIEMENT_ACCEPTE">Paiement accepté</option>
              <option value="GUIDE_PROFILE_VALIDE">Profil guide validé</option>
              <option value="GUIDE_AFFECTE_CIRCUIT">Affectation circuit</option>
              <option value="AVIS_MODERE">Décision modération</option>
            </select>
          </div>
          @if (notificationStore.unreadCount() > 0) {
            <button type="button" class="bo-btn bo-btn--primary" (click)="markAllRead()">
              <svg lucideCheckCheck [size]="14" aria-hidden="true"></svg>
              <span>Tout marquer comme lu</span>
            </button>
          }
        </div>

        @if (loading()) {
          <p class="bo-cell-sub">Chargement...</p>
        } @else if (persoItems().length === 0) {
          <app-ui-empty-state
            title="Aucune notification"
            description="Vous n'avez aucune alerte correspondant à ce filtre."
          />
        } @else {
          <div class="bo-table-wrap">
            <table class="bo-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Événement &amp; Canal</th>
                  <th>Sujet &amp; Contenu</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (n of persoItems(); track n.id) {
                  <tr>
                    <td class="tabular-nums">{{ n.dateEnvoi | dateFr: 'd MMM yyyy HH:mm' }}</td>
                    <td>
                      <span class="ui-badge ui-badge--terracotta">{{ formatEvent(n.typeEvenement) }}</span>
                      <span class="bo-cell-sub">{{ n.canal }}</span>
                    </td>
                    <td>
                      <span class="bo-cell-title">{{ n.sujet }}</span>
                      <span class="bo-cell-sub">{{ n.contenu }}</span>
                    </td>
                    <td>
                      <span class="ui-badge" [class.ui-badge--success]="n.lue" [class.ui-badge--warning]="!n.lue">
                        {{ n.lue ? 'Lue' : 'Non lue' }}
                      </span>
                    </td>
                    <td>
                      <div class="bo-actions-cell">
                        @if (!n.lue) {
                          <button type="button" class="bo-btn bo-btn--sm" (click)="markRead(n)">
                            <svg lucideCheck [size]="13" aria-hidden="true"></svg>
                            <span>Marquer lue</span>
                          </button>
                        }
                        @if (n.cibleType === 'GUIDE') {
                          <a routerLink="/pro/mon-profil-guide" class="bo-btn bo-btn--sm">Mon profil</a>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-ui-pagination
            [page]="persoPage()"
            [totalPages]="persoTotalPages()"
            [totalElements]="persoTotal()"
            [last]="persoLast()"
            (pageChange)="loadPerso($event)"
          />
        }
      </section>
    } @else {
      @if (adminStats(); as s) {
        <div class="bo-kpi-grid">
          <app-ui-kpi-card label="Total émises" [value]="s.total" />
          <app-ui-kpi-card label="Envoyées" [value]="s.envoyees" tone="success" />
          <app-ui-kpi-card label="Échecs temporaires" [value]="s.echecsTemporaires" tone="ochre" />
          <app-ui-kpi-card label="Échecs définitifs" [value]="s.echecsDefinitifs" [tone]="s.echecsDefinitifs > 0 ? 'danger' : 'neutral'" />
        </div>
      }

      <section class="bo-panel">
        <div class="bo-panel__head">
          <div class="bo-filters" style="margin-bottom: 0;">
            <select
              class="bo-select"
              [(ngModel)]="adminStatut"
              (ngModelChange)="loadAdmin(0)"
              aria-label="Filtrer les notifications d'administration par statut"
              style="width: auto;"
            >
              <option value="">Tous les statuts</option>
              <option value="ENVOYEE">ENVOYEE</option>
              <option value="EN_ATTENTE">EN_ATTENTE</option>
              <option value="ECHEC_TEMPORAIRE">ECHEC_TEMPORAIRE</option>
              <option value="ECHEC">ECHEC</option>
            </select>
            <input
              type="text"
              class="bo-input"
              [(ngModel)]="adminType"
              aria-label="Filtrer les notifications d'administration par type d'événement"
              placeholder="Filtrer typeEvenement (ex: PAIEMENT_ACCEPTE)"
              (keyup.enter)="loadAdmin(0)"
              style="width: 240px;"
            />
            <button type="button" class="bo-btn" (click)="loadAdmin(0)">Filtrer</button>
          </div>
          @if (permissions.has('NOTIFICATION:RELANCER')) {
            <button type="button" class="bo-btn bo-btn--terracotta" (click)="forcerRepriseEchecs()" [disabled]="busy()">
              Relancer tous les échecs
            </button>
          }
        </div>

        @if (loading()) {
          <p class="bo-cell-sub">Chargement de la file globale...</p>
        } @else if (adminItems().length === 0) {
          <app-ui-empty-state
            title="Aucune notification système"
            description="Aucun envoi ne correspond aux filtres sélectionnés."
          />
        } @else {
          <div class="bo-table-wrap">
            <table class="bo-table">
              <thead>
                <tr>
                  <th>ID &amp; Date</th>
                  <th>Destinataire</th>
                  <th>Sujet &amp; Type</th>
                  <th>Statut / Tentatives</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (n of adminItems(); track n.id) {
                  <tr>
                    <td>
                      <strong class="tabular-nums">{{ n.id }}</strong>
                      <span class="bo-cell-sub">{{ n.dateEnvoi | dateFr: 'd MMM HH:mm' }}</span>
                    </td>
                    <td>
                      <span class="bo-cell-title">{{ n.destinataire }}</span>
                      <span class="bo-cell-sub">{{ n.canal }} · User {{ n.utilisateurId ?? 'N/A' }}</span>
                    </td>
                    <td>
                      <span class="bo-cell-title">{{ n.sujet }}</span>
                      <span class="bo-cell-sub">{{ formatEvent(n.typeEvenement) }}</span>
                    </td>
                    <td>
                      <span
                        class="ui-badge"
                        [class.ui-badge--success]="n.statut === 'ENVOYEE'"
                        [class.ui-badge--warning]="n.statut === 'EN_ATTENTE' || n.statut === 'ECHEC_TEMPORAIRE'"
                        [class.ui-badge--danger]="n.statut === 'ECHEC'"
                      >
                        {{ n.statut }}
                      </span>
                      <span class="bo-cell-sub tabular-nums">
                        {{ n.tentatives ?? 1 }} / {{ n.maxTentatives ?? 3 }} tentative(s)
                      </span>
                    </td>
                    <td>
                      <div class="bo-actions-cell">
                        <button type="button" class="bo-btn bo-btn--sm" (click)="selectedItem.set(n)">
                          <svg lucideEye [size]="13" aria-hidden="true"></svg>
                          <span>Détail</span>
                        </button>
                        @if (n.statut !== 'ENVOYEE' && permissions.has('NOTIFICATION:RELANCER')) {
                          <button type="button" class="bo-btn bo-btn--sm bo-btn--primary" (click)="relancer(n)" [disabled]="busy()">
                            Relancer
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
            [page]="adminPage()"
            [totalPages]="adminTotalPages()"
            [totalElements]="adminTotal()"
            [last]="adminLast()"
            (pageChange)="loadAdmin($event)"
          />
        }
      </section>
    }

    <app-ui-detail-drawer
      [open]="selectedItem() !== null"
      [title]="'Notification #' + (selectedItem()?.id ?? '')"
      eyebrow="Détail livraison ms-notification"
      (close)="selectedItem.set(null)"
    >
      @if (selectedItem(); as d) {
        <dl class="bo-kv-list">
          <div class="bo-kv-row"><dt>Destinataire</dt><dd>{{ d.destinataire }}</dd></div>
          <div class="bo-kv-row"><dt>Canal / Statut</dt><dd>{{ d.canal }} · {{ d.statut }}</dd></div>
          <div class="bo-kv-row"><dt>Événement</dt><dd>{{ formatEvent(d.typeEvenement) }} ({{ d.typeEvenement }})</dd></div>
          <div class="bo-kv-row"><dt>Corrélation</dt><dd>{{ d.correlationId || 'N/A' }}</dd></div>
          <div class="bo-kv-row"><dt>Sujet</dt><dd>{{ d.sujet }}</dd></div>
          <div class="bo-kv-row"><dt>Contenu complet</dt><dd>{{ d.contenu }}</dd></div>
          @if (d.dernierErreur) {
            <div class="bo-kv-row"><dt>Dernière erreur</dt><dd class="bo-error">{{ d.dernierErreur }}</dd></div>
          }
        </dl>
      }
    </app-ui-detail-drawer>
  `,
})
export class ProNotificationsPageComponent implements OnInit {
  private readonly dialog = inject(Dialog);
  protected readonly permissions = inject(PermissionService);
  protected readonly notificationStore = inject(NotificationStore);
  private readonly notifApi = inject(NotificationApiService);

  protected readonly activeTab = signal<'perso' | 'supervision'>('perso');
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selectedItem = signal<NotificationItem | null>(null);

  protected nonLuesOnly = false;
  protected persoType = '';
  protected readonly persoItems = signal<NotificationItem[]>([]);
  protected readonly persoPage = signal(0);
  protected readonly persoTotalPages = signal(0);
  protected readonly persoTotal = signal(0);
  protected readonly persoLast = signal(true);

  protected adminStatut: StatutNotification | '' = '';
  protected adminType = '';
  protected readonly adminStats = signal<NotificationStats | null>(null);
  protected readonly adminItems = signal<NotificationItem[]>([]);
  protected readonly adminPage = signal(0);
  protected readonly adminTotalPages = signal(0);
  protected readonly adminTotal = signal(0);
  protected readonly adminLast = signal(true);

  protected readonly formatEvent = formatNotificationEventLabel;

  ngOnInit(): void {
    void this.loadPerso(0);
  }

  protected switchTab(tab: 'perso' | 'supervision'): void {
    this.activeTab.set(tab);
    if (tab === 'perso') {
      void this.loadPerso(0);
    } else {
      void this.loadAdmin(0);
    }
  }

  protected refreshCurrent(): void {
    if (this.activeTab() === 'perso') {
      void this.loadPerso(this.persoPage());
    } else {
      void this.loadAdmin(this.adminPage());
    }
  }

  async loadPerso(page = 0): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(
        this.notifApi.getMesNotifications(page, 12, this.nonLuesOnly, this.persoType || undefined)
      );
      this.persoItems.set(res.content);
      this.persoPage.set(res.page);
      this.persoTotalPages.set(res.totalPages);
      this.persoTotal.set(res.totalElements);
      this.persoLast.set(res.last);
      await this.notificationStore.refreshUnreadCount();
    } catch (err) {
      this.error.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async loadAdmin(page = 0): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [stats, res] = await Promise.all([
        firstValueFrom(this.notifApi.getStatistiques()),
        firstValueFrom(
          this.notifApi.getAllAdminPaged(page, 15, this.adminStatut || undefined, this.adminType.trim() || undefined)
        ),
      ]);
      this.adminStats.set(stats);
      this.adminItems.set(res.content);
      this.adminPage.set(res.page);
      this.adminTotalPages.set(res.totalPages);
      this.adminTotal.set(res.totalElements);
      this.adminLast.set(res.last);
    } catch (err) {
      this.error.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async markRead(n: NotificationItem): Promise<void> {
    await firstValueFrom(this.notifApi.marquerCommeLue(n.id));
    await this.loadPerso(this.persoPage());
  }

  async markAllRead(): Promise<void> {
    await firstValueFrom(this.notifApi.marquerToutesCommeLues());
    toast.success('Toutes vos notifications ont été marquées comme lues.');
    await this.loadPerso(0);
  }

  async relancer(n: NotificationItem): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(this.notifApi.relancerNotification(n.id));
      toast.success(`Notification ${n.id} relancée.`);
      await this.loadAdmin(this.adminPage());
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async forcerRepriseEchecs(): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<boolean>(UiConfirmDialogComponent, {
          data: {
            title: 'Relancer toutes les notifications en échec ?',
            message:
              'Les notifications en ECHEC ou ECHEC_TEMPORAIRE seront soumises à une nouvelle tentative immédiate.',
            confirmLabel: 'Relancer le batch',
            cancelLabel: 'Annuler',
            variant: 'primary',
          },
        })
        .closed
    );
    if (!ok) return;

    this.busy.set(true);
    try {
      const res = await firstValueFrom(this.notifApi.forcerRepriseEchecs());
      toast.success(`${res.notificationsLivrees} notification(s) livrée(s) lors de la reprise.`);
      await this.loadAdmin(this.adminPage());
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
