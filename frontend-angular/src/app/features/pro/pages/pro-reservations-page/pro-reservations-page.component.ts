import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideEye, LucideRefreshCw, LucideXCircle } from '@lucide/angular';
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
    LucideEye,
    LucideRefreshCw,
    LucideXCircle,
  ],
  template: `
    <header class="bo-header">
      <div>
        <p class="bo-header__eyebrow">Supervision ms-reservation · Workflow P04 strict</p>
        <h1 class="bo-header__title">Gestion des réservations</h1>
        <p class="bo-header__lead">
          Suivez l’ensemble des réservations clients, consultez leurs transitions d’état, synchronisez
          un dossier avec ms-paiement ou annulez une réservation autorisée.
        </p>
      </div>
      <button type="button" class="bo-btn" (click)="loadAll(page())" [disabled]="loading()">
        <svg lucideRefreshCw [size]="14" aria-hidden="true"></svg>
        <span>Actualiser</span>
      </button>
    </header>

    <p class="bo-notice" style="margin-bottom: var(--space-4);">
      Règle métier P04 : une réservation n'est confirmée qu'à réception d'un événement de paiement
      ACCEPTE émis par ms-paiement (aucune confirmation manuelle autorisée).
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
      <div class="bo-filters">
        <div class="bo-field bo-field--grow">
          <label for="resa-q" class="bo-label">Recherche</label>
          <input id="resa-q" type="search" class="bo-input" [(ngModel)]="q" placeholder="Référence, nom client, email..." (keyup.enter)="loadPage(0)" />
        </div>
        <div class="bo-field">
          <label for="resa-statut" class="bo-label">Statut</label>
          <select id="resa-statut" class="bo-select" [(ngModel)]="statutFilter" (ngModelChange)="loadPage(0)">
            <option value="">Tous</option>
            <option value="BROUILLON">BROUILLON</option>
            <option value="EN_ATTENTE_PAIEMENT">EN_ATTENTE_PAIEMENT</option>
            <option value="CONFIRMEE">CONFIRMEE</option>
            <option value="EXPIREE">EXPIREE</option>
            <option value="ANNULEE">ANNULEE</option>
            <option value="ECHEC">ECHEC</option>
            <option value="REMBOURSEE">REMBOURSEE</option>
          </select>
        </div>
        <div class="bo-field">
          <label for="resa-type" class="bo-label">Type</label>
          <select id="resa-type" class="bo-select" [(ngModel)]="typeFilter" (ngModelChange)="loadPage(0)">
            <option value="">Tous</option>
            <option value="CIRCUIT">CIRCUIT</option>
            <option value="EVENEMENT">EVENEMENT</option>
          </select>
        </div>
        <div class="bo-field">
          <label for="resa-dmin" class="bo-label">Du</label>
          <input id="resa-dmin" type="date" class="bo-input" [(ngModel)]="dateMin" />
        </div>
        <div class="bo-field">
          <label for="resa-dmax" class="bo-label">Au</label>
          <input id="resa-dmax" type="date" class="bo-input" [(ngModel)]="dateMax" />
        </div>
        <button type="button" class="bo-btn bo-btn--primary" (click)="loadPage(0)">Filtrer</button>
      </div>

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
                  <td>
                    <span class="bo-cell-title tabular-nums">{{ r.referenceReservation || ('RES-' + r.id) }}</span>
                    <span class="bo-cell-sub">{{ r.dateReservation | dateFr: 'd MMM yyyy HH:mm' }}</span>
                  </td>
                  <td>
                    <span class="bo-cell-title">{{ r.nomClient }}</span>
                    <span class="bo-cell-sub">{{ r.emailClient }} · {{ r.telephoneClient || 'N/A' }}</span>
                  </td>
                  <td>
                    <span class="ui-badge ui-badge--neutral">{{ r.typeReservation }}</span>
                    <span class="bo-cell-sub">
                      @if (r.typeReservation === 'CIRCUIT') {
                        Circuit {{ r.circuitId }}
                      } @else {
                        Événement {{ r.evenementId }}
                      }
                    </span>
                  </td>
                  <td class="tabular-nums">
                    {{ r.montantTotal | fcfaPrice }}
                    <span class="bo-cell-sub">{{ r.nombrePlaces }} place(s)</span>
                  </td>
                  <td>
                    <span [class]="statusBadge(r.statut)">{{ statusLabel(r.statut) }}</span>
                  </td>
                  <td>
                    <div class="bo-actions-cell">
                      <button type="button" class="bo-btn bo-btn--sm" (click)="openDetail(r)">
                        <svg lucideEye [size]="13" aria-hidden="true"></svg>
                        <span>Détail</span>
                      </button>
                      <button type="button" class="bo-btn bo-btn--sm" (click)="synchroniser(r)" [disabled]="busy()">
                        <svg lucideRefreshCw [size]="12" aria-hidden="true"></svg>
                        <span>Sync</span>
                      </button>
                      @if (canCancel(r) && permissions.has('RESERVATION:GERER')) {
                        <button type="button" class="bo-btn bo-btn--sm bo-btn--danger" (click)="annuler(r)" [disabled]="busy()">
                          <svg lucideXCircle [size]="12" aria-hidden="true"></svg>
                          <span>Annuler</span>
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
      [title]="selectedItem()?.referenceReservation || 'Réservation #' + (selectedItem()?.id ?? '')"
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
      toast.success(`Réservation ${updated.referenceReservation || '#' + r.id} synchronisée (${updated.statut}).`);
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
            title: `Annuler la réservation ${r.referenceReservation || '#' + r.id} ?`,
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
