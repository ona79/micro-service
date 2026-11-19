import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideEye, LucideMoreHorizontal, LucideRefreshCw, LucideXCircle } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { PermissionService } from '../../../../core/auth/permissions';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import {
  Reservation,
  ReservationStats,
  StatutReservation,
  TypeReservation,
  formatReservationStatusLabel,
  reservationStatusBadgeClass,
} from '../../../../core/models/reservation.model';
import { UiConfirmDialogComponent } from '../../../../shared/components/ui-confirm-dialog/ui-confirm-dialog.component';
import { UiDetailDrawerComponent } from '../../../../shared/components/ui-detail-drawer/ui-detail-drawer.component';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import {
  FilterStatusPill,
  UiFilterBarComponent,
} from '../../../../shared/components/ui-filter-bar/ui-filter-bar.component';
import { UiKpiCardComponent } from '../../../../shared/components/ui-kpi-card/ui-kpi-card.component';
import { UiPaginationComponent } from '../../../../shared/components/ui-pagination/ui-pagination.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { ReservationApiService } from '../../../reservations/data-access/reservation-api.service';

@Component({
  selector: 'app-pro-reservations-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    DateFrPipe,
    FcfaPricePipe,
    UiKpiCardComponent,
    UiPaginationComponent,
    UiDetailDrawerComponent,
    UiEmptyStateComponent,
    UiErrorBannerComponent,
    UiFilterBarComponent,
    LucideEye,
    LucideMoreHorizontal,
    LucideRefreshCw,
    LucideXCircle,
  ],
  template: `
    <header class="bo-header">
      <div>
        <p class="bo-header__eyebrow">Réservations</p>
        <h1 class="bo-header__title">Gestion des réservations</h1>
        <p class="bo-header__lead">
          Suivez l’ensemble des réservations clients, consultez leurs transitions d’état, synchronisez
          un dossier ou annulez une réservation autorisée.
        </p>
      </div>
      <button type="button" class="bo-btn" (click)="loadAll(page())" [disabled]="loading()">
        <svg lucideRefreshCw [size]="14" aria-hidden="true"></svg>
        <span>Actualiser</span>
      </button>
    </header>

    <p class="bo-notice" style="margin-bottom: var(--space-4);">
      Règle métier P04 : une réservation n'est confirmée qu'à réception d'un événement de paiement
      accepté.
    </p>

    @if (stats(); as s) {
      <div class="bo-kpi-grid">
        <app-ui-kpi-card label="Total réservations" [value]="s.totalReservations" />
        <app-ui-kpi-card label="Confirmées" [value]="s.confirmees" tone="success" subtitle="{{ s.placesReserveesActives }} places actives" />
        <app-ui-kpi-card label="En attente paiement" [value]="s.enAttentePaiement" tone="ochre" subtitle="{{ s.montantTotalEnAttente | fcfaPrice }}" />
        <app-ui-kpi-card label="Montant confirmé" [value]="s.montantTotalConfirme | fcfaPrice" tone="terracotta" subtitle="Annulées : {{ s.annulees }} · Exp : {{ s.expirees }}" />
      </div>
    }

    @if (actionError()) {
      <app-ui-error-banner [message]="actionError()!" [showRetry]="false" />
    }

    <section class="bo-panel">
      <app-ui-filter-bar
        [statusPills]="statusPills()"
        [activeStatus]="statutFilter || 'ALL'"
        (statusChange)="statutFilter = $event === 'ALL' ? '' : $any($event); loadPage(0)"
        [searchValue]="q"
        searchPlaceholder="Référence, client, email..."
        searchAriaLabel="Rechercher une réservation"
        [hasSecondaryFilters]="true"
        [secondaryActiveCount]="(dateMin ? 1 : 0) + (dateMax ? 1 : 0)"
        [resultsLabel]="totalElements() + ' réservation(s)'"
        [hasActiveFilters]="!!(q.trim() || statutFilter || typeFilter || dateMin || dateMax)"
        (searchChange)="q = $event; loadPage(0)"
        (reset)="q = ''; statutFilter = ''; typeFilter = ''; dateMin = ''; dateMax = ''; loadPage(0)"
      >
        <ng-container filter-primary>
          <select id="resa-type" aria-label="Type" class="ui-filter-control" [(ngModel)]="typeFilter" (ngModelChange)="loadPage(0)">
            <option value="">Type : Tous</option>
            <option value="CIRCUIT">CIRCUIT</option>
            <option value="EVENEMENT">EVENEMENT</option>
          </select>
        </ng-container>
        <ng-container filter-secondary>
          <input id="resa-dmin" type="date" aria-label="Date début" class="ui-filter-control" [(ngModel)]="dateMin" (ngModelChange)="loadPage(0)" />
          <input id="resa-dmax" type="date" aria-label="Date fin" class="ui-filter-control" [(ngModel)]="dateMax" (ngModelChange)="loadPage(0)" />
        </ng-container>
      </app-ui-filter-bar>

      @if (error()) {
        <app-ui-error-banner [message]="error()!" (retry)="loadPage(page())" />
      } @else if (loading()) {
        <p class="bo-cell-sub">Chargement des réservations...</p>
      } @else if (items().length === 0) {
        <app-ui-empty-state title="Aucune réservation" description="Aucune réservation ne correspond aux filtres sélectionnés." />
      } @else {
        <div class="bo-table-wrap">
          <table class="bo-table">
            <thead>
              <tr>
                <th>Réf. &amp; Date</th>
                <th>Client</th>
                <th>Prestation</th>
                <th>Montant &amp; Places</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (r of items(); track r.id) {
                <tr>
                  <td class="tabular-nums" [title]="(r.referenceReservation || 'RES-' + r.id) + ' · ' + (r.dateReservation | dateFr: 'd MMM yyyy HH:mm')">
                    <strong>{{ r.referenceReservation || ('RES-' + r.id) }}</strong>
                  </td>
                  <td>
                    <span class="bo-cell-one" [title]="r.nomClient + ' (' + r.emailClient + ')'">{{ r.nomClient }}</span>
                  </td>
                  <td>
                    <span class="ui-badge ui-badge--neutral" [title]="r.typeReservation === 'CIRCUIT' ? 'Circuit ' + r.circuitId : 'Événement ' + r.evenementId">
                      {{ r.typeReservation }}
                    </span>
                  </td>
                  <td class="tabular-nums" [title]="(r.montantTotal | fcfaPrice) + ' · ' + r.nombrePlaces + ' place(s)'">
                    {{ r.montantTotal | fcfaPrice }} · {{ r.nombrePlaces }} pl.
                  </td>
                  <td>
                    <span [class]="statusBadge(r.statut)">{{ statusLabel(r.statut) }}</span>
                  </td>
                  <td>
                    <div class="bo-actions-cell">
                      <button type="button" class="bo-btn bo-btn--sm" (click)="openDetail(r)">
                        Détail
                      </button>
                      <div class="bo-row-menu">
                        <button
                          type="button"
                          class="bo-btn bo-btn--sm bo-btn--icon"
                          aria-label="Plus d'actions"
                          (click)="toggleRowMenu(r.id)"
                        >
                          <svg lucideMoreHorizontal [size]="15" aria-hidden="true"></svg>
                        </button>
                        @if (openMenuId() === r.id) {
                          <div class="bo-row-menu__dropdown" role="menu">
                            <button type="button" class="bo-row-menu__item" role="menuitem" [disabled]="busy()" (click)="openMenuId.set(null); synchroniser(r)">
                              Synchroniser
                            </button>
                            @if (canCancel(r) && permissions.has('RESERVATION:GERER')) {
                              <button type="button" class="bo-row-menu__item bo-row-menu__item--danger" role="menuitem" [disabled]="busy()" (click)="openMenuId.set(null); annuler(r)">
                                Annuler
                              </button>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <app-ui-pagination
          [page]="page()"
          [totalPages]="totalPages()"
          [totalElements]="totalElements()"
          [last]="last()"
          (pageChange)="loadPage($event)"
        />
      }
    </section>

    <app-ui-detail-drawer
      [open]="selectedItem() !== null"
      [title]="selectedItem()?.referenceReservation || 'Réservation n° ' + (selectedItem()?.id ?? '')"
      eyebrow="Dossier réservation complet"
      (close)="selectedItem.set(null)"
    >
      @if (selectedItem(); as d) {
        <dl class="bo-kv-list">
          <div class="bo-kv-row"><dt>Statut</dt><dd><span [class]="statusBadge(d.statut)">{{ statusLabel(d.statut) }}</span></dd></div>
          <div class="bo-kv-row"><dt>Client</dt><dd>{{ d.nomClient }} ({{ d.emailClient }})</dd></div>
          <div class="bo-kv-row"><dt>Places / Montant</dt><dd class="tabular-nums">{{ d.nombrePlaces }} · {{ d.montantTotal | fcfaPrice }}</dd></div>
          <div class="bo-kv-row"><dt>Date prestation</dt><dd>{{ d.datePrestation || 'Non précisée' }} {{ d.creneauPrestation || '' }}</dd></div>
          <div class="bo-kv-row"><dt>Réf. paiement</dt><dd>{{ d.referencePaiement || 'Aucun paiement lié' }}</dd></div>
          @if (d.motifStatut) {
            <div class="bo-kv-row"><dt>Motif statut</dt><dd>{{ d.motifStatut }}</dd></div>
          }
        </dl>

        @if (permissions.has('PAIEMENT:LIRE_TOUT')) {
          <div>
            <a [routerLink]="['/pro/paiements']" [queryParams]="{ reservationId: d.id }" class="bo-btn bo-btn--sm">
              Superviser les paiements liés
            </a>
          </div>
        }

        @if (d.participants?.length) {
          <section>
            <h3 class="bo-label" style="margin-bottom: var(--space-2);">Participants ({{ d.participants!.length }})</h3>
            <ul style="list-style: none; padding: 0; display: grid; gap: 0.25rem;">
              @for (p of d.participants!; track $index) {
                <li style="font-size: var(--text-xs);">{{ p.nomComplet }} — {{ p.categorie || 'ADULTE' }}</li>
              }
            </ul>
          </section>
        }

        @if (d.historique?.length) {
          <section>
            <h3 class="bo-label" style="margin-bottom: var(--space-2);">Historique des transitions</h3>
            <ul style="list-style: none; padding: 0; display: grid; gap: 0.35rem;">
              @for (h of d.historique!; track h.id) {
                <li style="font-size: var(--text-xs); border-bottom: 1px dashed var(--border-subtle); padding-bottom: 0.3rem;">
                  <strong>{{ h.ancienStatut || 'INITIAL' }} → {{ h.nouveauStatut }}</strong>
                  · {{ h.dateTransition | dateFr: 'd MMM yyyy HH:mm' }} ({{ h.acteurRole || h.acteurType || 'SYSTEM' }})
                  @if (h.motif) {
                    <div class="bo-cell-sub">{{ h.motif }}</div>
                  }
                </li>
              }
            </ul>
          </section>
        }
      }
    </app-ui-detail-drawer>
  `,
})
export class ProReservationsPageComponent implements OnInit {
  private readonly dialog = inject(Dialog);
  protected readonly permissions = inject(PermissionService);
  private readonly api = inject(ReservationApiService);
  protected readonly openMenuId = signal<number | null>(null);
  private searchTimer?: ReturnType<typeof setTimeout>;

  protected onSearchInput(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadPage(0), 250);
  }

  protected toggleRowMenu(id: number): void {
    this.openMenuId.update((curr) => (curr === id ? null : id));
  }

  protected readonly statusPills = computed<FilterStatusPill[]>(() => {
    const s = this.stats();
    return [
      { id: 'ALL', label: 'Toutes', count: s?.totalReservations },
      { id: 'CONFIRMEE', label: 'Confirmées', count: s?.confirmees },
      { id: 'EN_ATTENTE_PAIEMENT', label: 'En attente', count: s?.enAttentePaiement },
      { id: 'BROUILLON', label: 'Brouillons' },
      { id: 'ANNULEE', label: 'Annulées', count: s?.annulees },
      { id: 'EXPIREE', label: 'Expirées', count: s?.expirees },
    ];
  });

  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly stats = signal<ReservationStats | null>(null);
  protected readonly items = signal<Reservation[]>([]);
  protected readonly selectedItem = signal<Reservation | null>(null);

  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);
  protected readonly last = signal(true);

  protected q = '';
  protected statutFilter: StatutReservation | '' = '';
  protected typeFilter: TypeReservation | '' = '';
  protected dateMin = '';
  protected dateMax = '';

  protected readonly statusLabel = formatReservationStatusLabel;
  protected readonly statusBadge = reservationStatusBadgeClass;

  ngOnInit(): void {
    void this.loadAll(0);
  }

  protected canCancel(r: Reservation): boolean {
    return r.statut === 'BROUILLON' || r.statut === 'EN_ATTENTE_PAIEMENT' || r.statut === 'CONFIRMEE';
  }

  async loadAll(page = 0): Promise<void> {
    await Promise.all([this.loadStats(), this.loadPage(page)]);
  }

  async loadStats(): Promise<void> {
    try {
      this.stats.set(await firstValueFrom(this.api.getStatistiques()));
    } catch {
      // Silencieux
    }
  }

  async loadPage(page = 0): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(
        this.api.rechercher({
          q: this.q.trim() || undefined,
          statut: this.statutFilter || undefined,
          type: this.typeFilter || undefined,
          dateMin: this.dateMin ? `${this.dateMin}T00:00:00` : undefined,
          dateMax: this.dateMax ? `${this.dateMax}T23:59:59` : undefined,
          page,
          size: 12,
          sortBy: 'dateReservation',
          sortDir: 'desc',
        })
      );
      this.items.set(res.content);
      this.page.set(res.page);
      this.totalPages.set(res.totalPages);
      this.totalElements.set(res.totalElements);
      this.last.set(res.last);
    } catch (err) {
      this.error.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async openDetail(r: Reservation): Promise<void> {
    try {
      this.selectedItem.set(await firstValueFrom(this.api.getById(r.id)));
    } catch {
      this.selectedItem.set(r);
    }
  }

  async synchroniser(r: Reservation): Promise<void> {
    this.busy.set(true);
    this.actionError.set(null);
    try {
      const updated = await firstValueFrom(this.api.synchroniser(r.id));
      toast.success(`Réservation ${updated.referenceReservation || 'n° ' + r.id} synchronisée (${updated.statut}).`);
      await this.loadAll(this.page());
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async annuler(r: Reservation): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<boolean>(UiConfirmDialogComponent, {
          data: {
            title: `Annuler la réservation ${r.referenceReservation || 'n° ' + r.id} ?`,
            message: 'Les places réservées seront libérées immédiatement.',
            confirmLabel: 'Confirmer l’annulation',
            cancelLabel: 'Conserver',
            variant: 'danger',
          },
        })
        .closed
    );
    if (!ok) return;

    this.busy.set(true);
    this.actionError.set(null);
    try {
      await firstValueFrom(this.api.cancel(r.id, 'Annulation gestionnaire depuis Back-Office'));
      toast.info('Réservation annulée.');
      await this.loadAll(this.page());
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
