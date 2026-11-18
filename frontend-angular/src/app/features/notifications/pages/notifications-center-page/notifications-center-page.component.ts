import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideCheck,
  LucideCheckCheck,
  LucideRefreshCw,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import {
  NotificationItem,
  formatNotificationEventLabel,
} from '../../../../core/models/notification.model';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { NotificationApiService } from '../../data-access/notification-api.service';
import { NotificationStore } from '../../data-access/notification.store';

@Component({
  selector: 'app-notifications-center-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    DateFrPipe,
    UiEmptyStateComponent,
    UiErrorBannerComponent,
    LucideCheck,
    LucideCheckCheck,
    LucideRefreshCw,
  ],
  template: `
    <div class="page-section">
      <div class="container">
        <header class="notif-header">
          <div>
            <p class="editorial-header__eyebrow">Centre d'alertes &amp; suivi transactionnel</p>
            <h1 class="editorial-header__title">
              Mes notifications
              @if (unreadCount() > 0) {
                <span class="ui-badge ui-badge--terracotta tabular-nums">{{ unreadCount() }} non lue(s)</span>
              }
            </h1>
          </div>

          <div class="header-actions">
            <button type="button" class="btn-outline" (click)="loadNotifications(page())" [disabled]="loading()">
              <svg lucideRefreshCw [size]="15" aria-hidden="true"></svg>
              <span>Actualiser</span>
            </button>
            @if (unreadCount() > 0) {
              <button type="button" class="btn-primary" (click)="markAllRead()">
                <svg lucideCheckCheck [size]="15" aria-hidden="true"></svg>
                <span>Tout marquer comme lu</span>
              </button>
            }
          </div>
        </header>

        <div class="toolbar">
          <div class="filter-tabs" role="tablist" aria-label="Filtrer par lecture">
            <button
              type="button"
              role="tab"
              [class.tab-active]="!nonLuesOnly()"
              (click)="setNonLuesFilter(false)"
            >
              Toutes ({{ totalElements() }})
            </button>
            <button
              type="button"
              role="tab"
              [class.tab-active]="nonLuesOnly()"
              (click)="setNonLuesFilter(true)"
            >
              Non lues ({{ unreadCount() }})
            </button>
          </div>

          <select
            class="type-select"
            [(ngModel)]="typeFilter"
            (ngModelChange)="loadNotifications(0)"
            aria-label="Filtrer par type d'événement"
          >
            <option value="">Tous les types d'événements</option>
            <option value="RESERVATION_CONFIRMEE">Réservation confirmée</option>
            <option value="RESERVATION_ANNULEE">Réservation annulée</option>
            <option value="PAIEMENT_ACCEPTE">Paiement accepté</option>
            <option value="PAIEMENT_REMBOURSE">Remboursement simulé</option>
            <option value="GUIDE_PROFILE_VALIDE">Profil guide validé</option>
            <option value="GUIDE_AFFECTE_CIRCUIT">Affectation circuit</option>
            <option value="AVIS_MODERE">Modération d'avis</option>
            <option value="SIGNALEMENT_TRAITE">Signalement traité</option>
          </select>
        </div>

        @if (error()) {
          <app-ui-error-banner [message]="error()!" (retry)="loadNotifications(page())" />
        } @else if (loading()) {
          <p class="muted">Chargement de vos notifications...</p>
        } @else if (items().length === 0) {
          <app-ui-empty-state
            title="Aucune notification"
            message="Vous n'avez aucune notification correspondant aux filtres sélectionnés."
          />
        } @else {
          <ul class="notif-list">
            @for (n of items(); track n.id) {
              <li class="notif-card" [class.notif-card--unread]="!n.lue">
                <div class="notif-card__head">
                  <div class="notif-card__badges">
                    <span class="ui-badge" [class.ui-badge--terracotta]="!n.lue" [class.ui-badge--neutral]="n.lue">
                      {{ formatEvent(n.typeEvenement) }}
                    </span>
                    <span class="ui-badge ui-badge--neutral">{{ n.canal }}</span>
                    @if (!n.lue) {
                      <span class="dot-unread" aria-label="Non lue">● Nouveauté</span>
                    }
                  </div>
                  <time class="notif-date">{{ n.dateEnvoi | dateFr: 'd MMM yyyy HH:mm' }}</time>
                </div>

                <h2 class="notif-card__title">{{ n.sujet }}</h2>
                <p class="notif-card__body">{{ n.contenu }}</p>

                <div class="notif-card__footer">
                  <div class="notif-meta">
                    @if (n.correlationId) {
                      <span class="corr-id">Réf. {{ n.correlationId }}</span>
                    }
                    @if (n.cibleType === 'CIRCUIT' && n.cibleId) {
                      <a [routerLink]="['/circuits', n.cibleId]" class="deep-link">Voir le circuit</a>
                    } @else if (n.reservationId) {
                      <a routerLink="/mon-espace" class="deep-link">Voir ma réservation</a>
                    } @else if (n.cibleType === 'GUIDE') {
                      <a routerLink="/espace-guide" class="deep-link">Mon espace guide</a>
                    }
                  </div>

                  @if (!n.lue) {
                    <button type="button" class="btn-mark-read" (click)="markAsRead(n)">
                      <svg lucideCheck [size]="14" aria-hidden="true"></svg>
                      <span>Marquer comme lue</span>
                    </button>
                  } @else if (n.dateLecture) {
                    <span class="read-stamp">Lu le {{ n.dateLecture | dateFr: 'd MMM HH:mm' }}</span>
                  }
                </div>
              </li>
            }
          </ul>

          @if (totalPages() > 1) {
            <div class="pagination-row">
              <button type="button" class="btn-outline" [disabled]="page() <= 0" (click)="loadNotifications(page() - 1)">
                Précédent
              </button>
              <span class="tabular-nums">Page {{ page() + 1 }} / {{ totalPages() }}</span>
              <button
                type="button"
                class="btn-outline"
                [disabled]="page() + 1 >= totalPages()"
                (click)="loadNotifications(page() + 1)"
              >
                Suivant
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    .notif-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .header-actions {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem 1.05rem;
      border: none;
      border-radius: var(--radius-sm);
      background: var(--brand-primary);
      color: var(--ink-on-dark);
      font-weight: 700;
      font-size: var(--text-sm);
      cursor: pointer;
    }
    .btn-outline {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 0.95rem;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      background: var(--surface-elevated);
      font-weight: 600;
      font-size: var(--text-sm);
      cursor: pointer;
    }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 0.85rem;
      margin-bottom: 1.25rem;
    }
    .filter-tabs {
      display: inline-flex;
      gap: 0.4rem;
      background: var(--surface-sand);
      padding: 0.25rem;
      border-radius: var(--radius-md);
    }
    .filter-tabs button {
      border: none;
      background: transparent;
      padding: 0.45rem 0.9rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: var(--text-xs);
      cursor: pointer;
      color: var(--ink-secondary);
    }
    .filter-tabs button.tab-active {
      background: var(--surface-elevated);
      color: var(--brand-primary);
      box-shadow: var(--shadow-xs);
    }
    .type-select {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      background: var(--surface-elevated);
      font-family: inherit;
      font-size: var(--text-xs);
    }
    .notif-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 0.85rem;
    }
    .notif-card {
      padding: 1.15rem 1.25rem;
      background: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      display: grid;
      gap: 0.55rem;
    }
    .notif-card--unread {
      border-left: 4px solid var(--accent-terracotta);
      background: var(--surface-canvas);
    }
    .notif-card__head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }
    .notif-card__badges {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-wrap: wrap;
    }
    .dot-unread {
      font-size: var(--text-xs);
      font-weight: 800;
      color: var(--accent-terracotta);
    }
    .notif-date,
    .read-stamp,
    .corr-id {
      font-size: var(--text-xs);
      color: var(--ink-muted);
    }
    .notif-card__title {
      margin: 0;
      font-size: var(--text-base);
      color: var(--ink-primary);
    }
    .notif-card__body {
      margin: 0;
      font-size: var(--text-sm);
      color: var(--ink-secondary);
      line-height: 1.5;
    }
    .notif-card__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }
    .notif-meta {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .deep-link {
      font-size: var(--text-xs);
      font-weight: 700;
      color: var(--brand-primary);
    }
    .btn-mark-read {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--brand-border);
      background: var(--brand-soft);
      color: var(--brand-primary);
      font-size: var(--text-xs);
      font-weight: 700;
      cursor: pointer;
    }
    .pagination-row {
      margin-top: 1.25rem;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.75rem;
      font-size: var(--text-xs);
    }
    .muted {
      color: var(--ink-muted);
    }
  `,
})
export class NotificationsCenterPageComponent implements OnInit {
  private readonly notifApi = inject(NotificationApiService);
  private readonly notifStore = inject(NotificationStore);

  protected readonly formatEvent = formatNotificationEventLabel;

  protected readonly items = signal<NotificationItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly nonLuesOnly = signal(false);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);
  protected readonly unreadCount = signal(0);

  protected typeFilter = '';

  ngOnInit(): void {
    void this.loadNotifications(0);
  }

  protected setNonLuesFilter(onlyUnread: boolean): void {
    this.nonLuesOnly.set(onlyUnread);
    void this.loadNotifications(0);
  }

  protected async loadNotifications(targetPage: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(
        this.notifApi.getMesNotifications(
          targetPage,
          10,
          this.nonLuesOnly(),
          this.typeFilter || undefined
        )
      );
      this.items.set(res.content ?? []);
      this.page.set(res.page);
      this.totalPages.set(res.totalPages);
      this.totalElements.set(res.totalElements);
      this.unreadCount.set(res.unreadCount);
      this.notifStore.setUnreadCount(res.unreadCount);
    } catch (err) {
      this.error.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  protected async markAsRead(item: NotificationItem): Promise<void> {
    try {
      const updated = await firstValueFrom(this.notifApi.marquerCommeLue(item.id));
      this.items.update((list) => list.map((n) => (n.id === item.id ? updated : n)));
      this.unreadCount.update((c) => Math.max(0, c - 1));
      this.notifStore.decrementUnread();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  }

  protected async markAllRead(): Promise<void> {
    try {
      await firstValueFrom(this.notifApi.marquerToutesCommeLues());
      this.unreadCount.set(0);
      this.notifStore.setUnreadCount(0);
      toast.success('Toutes vos notifications ont été marquées comme lues.');
      await this.loadNotifications(this.page());
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  }
}
