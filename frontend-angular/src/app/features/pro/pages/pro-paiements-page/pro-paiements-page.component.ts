import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LucideEye, LucideRefreshCw, LucideXCircle } from '@lucide/angular';
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
    LucideEye,
    LucideRefreshCw,
    LucideXCircle,
  ],
  template: `
    <header class="bo-header">
      <div>
        <p class="bo-header__eyebrow">Supervision financière simulée · Administrateur uniquement</p>
        <h1 class="bo-header__title">Paiements simulés (Wave / Orange Money) &amp; Outbox</h1>
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
            Rejouer Outbox paiement
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
      <div class="bo-filters">
        <div class="bo-field bo-field--grow">
          <label for="pay-q" class="bo-label">Recherche</label>
          <input id="pay-q" type="search" class="bo-input" [(ngModel)]="q" placeholder="Référence PAY-SIM..., corrélation..." (keyup.enter)="loadPage(0)" />
        </div>
        <div class="bo-field">
          <label for="pay-statut" class="bo-label">Statut</label>
          <select id="pay-statut" class="bo-select" [(ngModel)]="statutFilter" (ngModelChange)="loadPage(0)">
            <option value="">Tous</option>
            <option value="INITIE">INITIE</option>
            <option value="EN_COURS">EN_COURS</option>
            <option value="ACCEPTE">ACCEPTE</option>
            <option value="REFUSE">REFUSE</option>
            <option value="EXPIRE">EXPIRE</option>
            <option value="ANNULE">ANNULE</option>
            <option value="REMBOURSE">REMBOURSE</option>
          </select>
        </div>
        <div class="bo-field">
          <label for="pay-mode" class="bo-label">Opérateur simulé</label>
          <select id="pay-mode" class="bo-select" [(ngModel)]="modeFilter" (ngModelChange)="loadPage(0)">
            <option value="">Tous</option>
            <option value="WAVE">WAVE</option>
            <option value="ORANGE_MONEY">ORANGE_MONEY</option>
          </select>
        </div>
        <div class="bo-field">
          <label for="pay-resa" class="bo-label">ID Réservation</label>
          <input id="pay-resa" type="number" min="1" class="bo-input" [(ngModel)]="reservationIdFilter" style="width: 120px;" />
        </div>
        <button type="button" class="bo-btn bo-btn--primary" (click)="loadPage(0)">Filtrer</button>
      </div>

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
                  <td>
                    <span class="bo-cell-title tabular-nums">{{ p.referenceTransaction }}</span>
                    <span class="bo-cell-sub">{{ (p.datePaiement || p.dateCreation || '') | dateFr: 'd MMM yyyy HH:mm' }}</span>
                  </td>
                  <td>
                    <span>{{ formatMode(p.modePaiement) }}</span>
                    <span class="bo-cell-sub">{{ p.numeroTelephoneMasque || 'Téléphone masqué' }}</span>
                  </td>
                  <td class="tabular-nums">
                    {{ p.montant | fcfaPrice }}
                    <span class="bo-cell-sub">Réservation {{ p.reservationId }}</span>
                  </td>
                  <td>
                    <span [class]="statusBadge(p.statut)">{{ statusLabel(p.statut) }}</span>
                    @if (p.synchroReservationStatut) {
                      <span class="bo-cell-sub">Synchro : {{ p.synchroReservationStatut }}</span>
                    }
                  </td>
                  <td>
                    <div class="bo-actions-cell">
                      <button type="button" class="bo-btn bo-btn--sm" (click)="openDetail(p)">
                        <svg lucideEye [size]="13" aria-hidden="true"></svg>
                        <span>Détail</span>
                      </button>
                      @if (p.statut === 'ACCEPTE' && permissions.has('PAIEMENT:REMBOURSER')) {
                        <button type="button" class="bo-btn bo-btn--sm bo-btn--danger" (click)="rembourser(p)" [disabled]="busy()">
                          <svg lucideXCircle [size]="13" aria-hidden="true"></svg>
                          <span>Rembourser</span>
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
      [title]="selectedItem()?.referenceTransaction || 'Transaction #' + (selectedItem()?.id ?? '')"
      eyebrow="Transaction simulée ms-paiement"
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
            title: 'Rejouer les événements Outbox de paiement ?',
            message: 'Les événements non synchronisés vers ms-reservation et ms-notification seront rejoués.',
            confirmLabel: 'Rejouer Outbox',
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
