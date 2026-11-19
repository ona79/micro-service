import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LucideEye, LucideMoreHorizontal, LucideRefreshCw, LucideXCircle } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { PermissionService } from '../../../../core/auth/permissions';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import {
  ModePaiement,
  Paiement,
  PaiementStats,
  StatutPaiement,
  formatModePaiementLabel,
  formatPaiementStatusLabel,
  paiementStatusBadgeClass,
} from '../../../../core/models/paiement.model';
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
import { PaiementApiService } from '../../../paiements/data-access/paiement-api.service';

@Component({
  selector: 'app-pro-paiements-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
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
        <p class="bo-header__eyebrow">Supervision financière simulée · Administrateur uniquement</p>
        <h1 class="bo-header__title">Paiements</h1>
        <p class="bo-header__lead">
          Supervisez les transactions pédagogiques simulées, exécutez des remboursements simulés et
          rejouez les événements outbox en échec.
        </p>
      </div>
      <div class="bo-header__actions">
        <button type="button" class="bo-btn" (click)="loadAll(page())" [disabled]="loading()">
          <svg lucideRefreshCw [size]="14" aria-hidden="true"></svg>
          <span>Actualiser</span>
        </button>
        @if (permissions.has('PAIEMENT:REMBOURSER')) {
          <button type="button" class="bo-btn bo-btn--terracotta" (click)="rejouerOutbox()" [disabled]="busy()">
            Synchroniser les paiements
          </button>
        }
      </div>
    </header>

    <p class="bo-notice" style="margin-bottom: var(--space-4);">
      Environnement simulé académique (Wave / Orange Money Sénégal) : aucune transaction bancaire
      réelle et aucune modification directe de statut n'est autorisée hors machine à états P04.
    </p>

    @if (stats(); as s) {
      <div class="bo-kpi-grid">
        <app-ui-kpi-card label="Transactions totales" [value]="s.totalTransactions" subtitle="Acceptées : {{ s.acceptees }} · Remboursées : {{ s.remboursees }}" />
        <app-ui-kpi-card label="Volume accepté (simulé)" [value]="s.montantTotalAccepteSimule | fcfaPrice" tone="success" />
        <app-ui-kpi-card label="Wave / Orange Money" [value]="(s.montantWaveSimule | fcfaPrice) + ' / ' + (s.montantOrangeMoneySimule | fcfaPrice)" tone="ochre" />
        <app-ui-kpi-card label="Outbox en attente" [value]="s.outboxEnAttente" [tone]="s.outboxEnAttente > 0 ? 'danger' : 'neutral'" subtitle="Remboursé : {{ s.montantTotalRembourseSimule | fcfaPrice }}" />
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
        searchPlaceholder="Référence PAY-SIM..., corrélation..."
        searchAriaLabel="Rechercher un paiement"
        [resultsLabel]="totalElements() + ' transaction(s)'"
        [hasActiveFilters]="Boolean(q.trim() || statutFilter || modeFilter || reservationIdFilter)"
        (searchChange)="q = $event; loadPage(0)"
        (reset)="q = ''; statutFilter = ''; modeFilter = ''; reservationIdFilter = null; loadPage(0)"
      >
        <ng-container filter-primary>
          <select id="pay-mode" aria-label="Opérateur simulé" class="ui-filter-control" [(ngModel)]="modeFilter" (ngModelChange)="loadPage(0)">
            <option value="">Opérateur : Tous</option>
            <option value="WAVE">WAVE</option>
            <option value="ORANGE_MONEY">ORANGE_MONEY</option>
          </select>
          <input id="pay-resa" type="number" min="1" aria-label="ID Réservation" placeholder="N° résa" class="ui-filter-control" [(ngModel)]="reservationIdFilter" (ngModelChange)="onSearchInput()" style="width: 100px;" />
        </ng-container>
      </app-ui-filter-bar>

      @if (error()) {
        <app-ui-error-banner [message]="error()!" (retry)="loadPage(page())" />
      } @else if (loading()) {
        <p class="bo-cell-sub">Chargement des paiements simulés...</p>
      } @else if (items().length === 0) {
        <app-ui-empty-state title="Aucune transaction" description="Aucun paiement simulé trouvé pour ces filtres." />
      } @else {
        <div class="bo-table-wrap">
          <table class="bo-table">
            <thead>
              <tr>
                <th>Référence &amp; Date</th>
                <th>Canal simulé</th>
                <th>Réservation &amp; Montant</th>
                <th>Statut / Synchro</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (p of items(); track p.id) {
                <tr>
                  <td class="tabular-nums" [title]="p.referenceTransaction + ' · ' + ((p.datePaiement || p.dateCreation || '') | dateFr: 'd MMM yyyy HH:mm')">
                    <strong>{{ p.referenceTransaction }}</strong>
                  </td>
                  <td [title]="formatMode(p.modePaiement) + ' · ' + (p.numeroTelephoneMasque || 'Téléphone masqué')">
                    {{ formatMode(p.modePaiement) }}
                  </td>
                  <td class="tabular-nums" [title]="'Réservation n° ' + p.reservationId">
                    {{ p.montant | fcfaPrice }} · Résa {{ p.reservationId }}
                  </td>
                  <td>
                    <span [class]="statusBadge(p.statut)">{{ statusLabel(p.statut) }}</span>
                  </td>
                  <td>
                    <div class="bo-actions-cell">
                      <button type="button" class="bo-btn bo-btn--sm" (click)="openDetail(p)">
                        Détail
                      </button>
                      @if (p.statut === 'ACCEPTE' && permissions.has('PAIEMENT:REMBOURSER')) {
                        <div class="bo-row-menu">
                          <button
                            type="button"
                            class="bo-btn bo-btn--sm bo-btn--icon"
                            aria-label="Plus d'actions"
                            (click)="toggleRowMenu(p.id)"
                          >
                            <svg lucideMoreHorizontal [size]="15" aria-hidden="true"></svg>
                          </button>
                          @if (openMenuId() === p.id) {
                            <div class="bo-row-menu__dropdown" role="menu">
                              <button type="button" class="bo-row-menu__item bo-row-menu__item--danger" role="menuitem" [disabled]="busy()" (click)="openMenuId.set(null); rembourser(p)">
                                Rembourser
                              </button>
                            </div>
                          }
                        </div>
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
      [title]="selectedItem()?.referenceTransaction || 'Transaction n° ' + (selectedItem()?.id ?? '')"
      eyebrow="Détail transaction"
      (close)="selectedItem.set(null)"
    >
      @if (selectedItem(); as d) {
        <dl class="bo-kv-list">
          <div class="bo-kv-row"><dt>Statut</dt><dd><span [class]="statusBadge(d.statut)">{{ statusLabel(d.statut) }}</span></dd></div>
          <div class="bo-kv-row"><dt>Simulation</dt><dd>{{ d.mentionSimulation || 'PAIEMENT SIMULÉ' }}</dd></div>
          <div class="bo-kv-row"><dt>Opérateur / Tél</dt><dd>{{ formatMode(d.modePaiement) }} · {{ d.numeroTelephoneMasque || '—' }}</dd></div>
          <div class="bo-kv-row"><dt>Montant</dt><dd class="tabular-nums">{{ d.montant | fcfaPrice }}</dd></div>
          <div class="bo-kv-row"><dt>Réservation liée</dt><dd>{{ d.reservationId }} {{ d.reservation?.referenceReservation || '' }}</dd></div>
          <div class="bo-kv-row"><dt>Synchro résa</dt><dd>{{ d.synchroReservationStatut || 'N/A' }}</dd></div>
          <div class="bo-kv-row"><dt>Corrélation</dt><dd>{{ d.correlationId || '—' }}</dd></div>
          @if (d.motifDecision) {
            <div class="bo-kv-row"><dt>Motif décision</dt><dd>{{ d.motifDecision }}</dd></div>
          }
        </dl>

        @if (d.historique?.length) {
          <section>
            <h3 class="bo-label" style="margin-bottom: var(--space-2);">Audit transitions paiement</h3>
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
export class ProPaiementsPageComponent implements OnInit {
  private readonly dialog = inject(Dialog);
  private readonly route = inject(ActivatedRoute);
  protected readonly permissions = inject(PermissionService);
  private readonly api = inject(PaiementApiService);

  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly stats = signal<PaiementStats | null>(null);
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
      { id: 'ALL', label: 'Tous', count: s?.total },
      { id: 'ACCEPTE', label: 'Acceptés', count: s?.acceptes },
      { id: 'EN_COURS', label: 'En cours', count: s?.enCours },
      { id: 'INITIE', label: 'Initiés' },
      { id: 'REFUSE', label: 'Refusés', count: s?.refuses },
      { id: 'REMBOURSE', label: 'Remboursés', count: s?.rembourses },
      { id: 'EXPIRE', label: 'Expirés' },
    ];
  });
  protected readonly items = signal<Paiement[]>([]);
  protected readonly selectedItem = signal<Paiement | null>(null);

  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);
  protected readonly last = signal(true);

  protected q = '';
  protected statutFilter: StatutPaiement | '' = '';
  protected modeFilter: ModePaiement | '' = '';
  protected reservationIdFilter: number | null = null;

  protected readonly statusLabel = formatPaiementStatusLabel;
  protected readonly statusBadge = paiementStatusBadgeClass;
  protected readonly formatMode = formatModePaiementLabel;

  ngOnInit(): void {
    const resaParam = this.route.snapshot.queryParamMap.get('reservationId');
    if (resaParam && Number(resaParam) > 0) {
      this.reservationIdFilter = Number(resaParam);
    }
    void this.loadAll(0);
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
          modePaiement: this.modeFilter || undefined,
          reservationId: this.reservationIdFilter,
          page,
          size: 12,
          sortBy: 'dateCreation',
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

  async openDetail(p: Paiement): Promise<void> {
    try {
      this.selectedItem.set(await firstValueFrom(this.api.getById(p.id)));
    } catch {
      this.selectedItem.set(p);
    }
  }

  async rembourser(p: Paiement): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<boolean>(UiConfirmDialogComponent, {
          data: {
            title: `Rembourser (simulé) ${p.referenceTransaction} ?`,
            message: `Un remboursement simulé de ${p.montant} XOF passera la transaction ${p.id} à REMBOURSE et synchronisera la réservation liée.`,
            confirmLabel: 'Confirmer le remboursement',
            cancelLabel: 'Annuler',
            variant: 'danger',
          },
        })
        .closed
    );
    if (!ok) return;

    this.busy.set(true);
    this.actionError.set(null);
    try {
      await firstValueFrom(this.api.rembourser(p.id, 'Remboursement simulé validé par Administrateur'));
      toast.success(`Paiement ${p.referenceTransaction} remboursé (simulé).`);
      await this.loadAll(this.page());
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  async rejouerOutbox(): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<boolean>(UiConfirmDialogComponent, {
          data: {
            title: 'Synchroniser les paiements en attente ?',
            message: 'Les paiements en attente seront synchronisés avec les réservations.',
            confirmLabel: 'Synchroniser',
            cancelLabel: 'Annuler',
            variant: 'primary',
          },
        })
        .closed
    );
    if (!ok) return;

    this.busy.set(true);
    this.actionError.set(null);
    try {
      const res = await firstValueFrom(this.api.rejouerOutbox());
      toast.success(`${res.evenementsSynchronises} événement(s) outbox synchronisé(s).`);
      await this.loadAll(this.page());
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
