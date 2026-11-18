import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideCalendar,
  LucideCheckCircle2,
  LucideClock,
  LucideCreditCard,
  LucideRefreshCw,
  LucideStar,
  LucideTicket,
  LucideUsers,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import { Billet } from '../../../../core/models/billet.model';
import {
  Paiement,
  formatModePaiementLabel,
  formatPaiementStatusLabel,
  paiementStatusBadgeClass,
} from '../../../../core/models/paiement.model';
import {
  Reservation,
  formatReservationStatusLabel,
  reservationStatusBadgeClass,
} from '../../../../core/models/reservation.model';
import { SeoService } from '../../../../core/services/seo.service';
import {
  BreadcrumbItem,
  UiBreadcrumbComponent,
} from '../../../../shared/components/ui-breadcrumb/ui-breadcrumb.component';
import { UiConfirmDialogComponent } from '../../../../shared/components/ui-confirm-dialog/ui-confirm-dialog.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiLoadingStateComponent } from '../../../../shared/components/ui-loading-state/ui-loading-state.component';
import { UiTicketViewComponent } from '../../../../shared/components/ui-ticket-view/ui-ticket-view.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { PaiementApiService } from '../../../paiements/data-access/paiement-api.service';
import { BilletApiService } from '../../data-access/billet-api.service';
import { ReservationApiService } from '../../data-access/reservation-api.service';

@Component({
  selector: 'app-reservation-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DateFrPipe,
    FcfaPricePipe,
    UiBreadcrumbComponent,
    UiLoadingStateComponent,
    UiErrorBannerComponent,
    UiTicketViewComponent,
    LucideArrowLeft,
    LucideArrowRight,
    LucideCalendar,
    LucideCheckCircle2,
    LucideClock,
    LucideCreditCard,
    LucideRefreshCw,
    LucideStar,
    LucideTicket,
    LucideUsers,
  ],
  template: `
    <div class="page-section">
      <div class="container">
        <app-ui-breadcrumb [items]="breadcrumbs()" />

        @if (loading()) {
          <app-ui-loading-state label="Chargement des détails de la réservation..." />
        } @else if (error() || !reservation()) {
          <app-ui-error-banner
            title="Réservation inaccessible"
            [message]="error() || 'Cette réservation est introuvable ou protégée.'"
            [showRetry]="true"
            (retry)="reload()"
          />
          <a routerLink="/mon-espace" class="back-link">
            <svg lucideArrowLeft [size]="15" aria-hidden="true"></svg>
            <span>Retour à mon espace</span>
          </a>
        } @else {
          @let res = reservation()!;
          <header class="detail-header">
            <div>
              <div class="badge-row">
                <span class="ui-badge">{{ res.referenceReservation || ('#' + res.id) }}</span>
                <span class="ui-badge ui-badge--ochre">{{ res.typeReservation }}</span>
                <span [class]="reservationStatusBadgeClass(res.statut)">
                  {{ formatReservationStatusLabel(res.statut) }}
                </span>
              </div>
              <h1 class="detail-title">{{ prestationTitle() }}</h1>
              <p class="detail-subtitle">
                Réservation enregistrée le {{ res.dateReservation | dateFr }} (Africa/Dakar)
              </p>
            </div>

            <div class="header-actions">
              <button
                type="button"
                class="btn-secondary"
                [disabled]="busyAction()"
                (click)="syncReservation()"
              >
                <svg lucideRefreshCw [size]="15" aria-hidden="true"></svg>
                <span>Synchroniser le statut</span>
              </button>

              @if (res.statut === 'BROUILLON') {
                <button
                  type="button"
                  class="btn-primary"
                  [disabled]="busyAction()"
                  (click)="soumettre()"
                >
                  <svg lucideTicket [size]="15" aria-hidden="true"></svg>
                  <span>Soumettre pour paiement</span>
                </button>
              } @else if (res.statut === 'EN_ATTENTE_PAIEMENT') {
                <a [routerLink]="['/paiements', res.id]" class="btn-primary">
                  <svg lucideCreditCard [size]="15" aria-hidden="true"></svg>
                  <span>Procéder au paiement simulé</span>
                </a>
              } @else {
                <a [routerLink]="['/paiements', res.id]" class="btn-secondary">
                  <svg lucideCreditCard [size]="15" aria-hidden="true"></svg>
                  <span>Suivi paiement</span>
                </a>
              }

              @if (canCancel()) {
                <button
                  type="button"
                  class="btn-danger"
                  [disabled]="busyAction()"
                  (click)="annuler()"
                >
                  Annuler
                </button>
              }
            </div>
          </header>

          @if (actionError()) {
            <app-ui-error-banner [message]="actionError()!" />
          }

          @if (res.statut === 'CONFIRMEE') {
            <section class="tickets-wrapper">
              <app-ui-ticket-view
                [billets]="billets()"
                [loading]="billetsLoading()"
              />
            </section>
          }

          <div class="detail-grid">
            <section class="panel-card">
              <h2>Détails de la prestation &amp; tarification serveur</h2>
              <dl class="facts-grid">
                <div>
                  <dt>Prestation réservée</dt>
                  <dd>
                    @if (prestationLink(); as link) {
                      <a [routerLink]="link" class="inline-link">
                        {{ prestationTitle() }}
                        <svg lucideArrowRight [size]="14" aria-hidden="true"></svg>
                      </a>
                    } @else {
                      {{ prestationTitle() }}
                    }
                  </dd>
                </div>
                <div>
                  <dt>Places réservées</dt>
                  <dd class="tabular-nums">
                    <svg lucideUsers [size]="14" aria-hidden="true"></svg>
                    {{ res.nombrePlaces }} place(s)
                  </dd>
                </div>
                @if (res.datePrestation) {
                  <div>
                    <dt>Date souhaitée</dt>
                    <dd>
                      <svg lucideCalendar [size]="14" aria-hidden="true"></svg>
                      {{ res.datePrestation | dateFr: 'date' }}
                    </dd>
                  </div>
                }
                @if (res.creneauPrestation) {
                  <div>
                    <dt>Créneau</dt>
                    <dd>
                      <svg lucideClock [size]="14" aria-hidden="true"></svg>
                      {{ res.creneauPrestation }}
                    </dd>
                  </div>
                }
                <div>
                  <dt>Montant total officiel</dt>
                  <dd class="price-strong tabular-nums">{{ res.montantTotal | fcfaPrice }}</dd>
                </div>
                <div>
                  <dt>Titulaire</dt>
                  <dd>{{ res.nomClient }} ({{ res.emailClient }})</dd>
                </div>
                @if (res.referencePaiement) {
                  <div>
                    <dt>Référence paiement</dt>
                    <dd>{{ res.referencePaiement }}</dd>
                  </div>
                }
                @if (res.motifStatut) {
                  <div>
                    <dt>Précision de statut</dt>
                    <dd>{{ res.motifStatut }}</dd>
                  </div>
                }
              </dl>

              @if (res.participants && res.participants.length > 0) {
                <div class="sub-block">
                  <h3>Participants nominatifs ({{ res.participants.length }})</h3>
                  <ul class="participants-list">
                    @for (p of res.participants; track $index) {
                      <li>
                        <strong>{{ p.nomComplet }}</strong>
                        @if (p.categorie) {
                          <span class="ui-badge ui-badge--neutral">{{ p.categorie }}</span>
                        }
                        @if (p.email) {
                          <span class="muted">· {{ p.email }}</span>
                        }
                      </li>
                    }
                  </ul>
                </div>
              }

              @if (res.statut === 'CONFIRMEE' && prestationLink(); as reviewLink) {
                <div class="verified-callout">
                  <div>
                    <strong>Visite confirmée</strong>
                    <p>
                      Vous pouvez publier un avis vérifié sur cette prestation après votre visite.
                    </p>
                  </div>
                  <a [routerLink]="reviewLink" class="btn-primary">
                    <svg lucideStar [size]="15" aria-hidden="true"></svg>
                    <span>Laisser un avis</span>
                  </a>
                </div>
              }
            </section>

            <aside class="sidebar-stack">
              <section class="panel-card">
                <h2>Transactions associées</h2>
                <p class="ui-sim-banner">Simulation pédagogique Wave / Orange Money (Zéro débit).</p>
                @if (paiements().length === 0) {
                  <p class="muted">Aucune tentative de paiement enregistrée pour le moment.</p>
                } @else {
                  <ul class="timeline-list">
                    @for (p of paiements(); track p.id) {
                      <li>
                        <div class="timeline-head">
                          <span [class]="paiementStatusBadgeClass(p.statut)">
                            <svg lucideCheckCircle2 [size]="12" aria-hidden="true"></svg>
                            {{ formatPaiementStatusLabel(p.statut) }}
                          </span>
                          <span class="muted tabular-nums">{{ p.montant | fcfaPrice }}</span>
                        </div>
                        <p class="timeline-title">
                          {{ p.referenceTransaction }} · {{ formatModePaiementLabel(p.modePaiement) }}
                        </p>
                        @if (p.datePaiement || p.dateCreation) {
                          <p class="timeline-meta">{{ (p.datePaiement || p.dateCreation) | dateFr }}</p>
                        }
                      </li>
                    }
                  </ul>
                }
              </section>

              <section class="panel-card">
                <h2>Historique d’état</h2>
                @if (!res.historique || res.historique.length === 0) {
                  <p class="muted">Aucune transition archivée sur cette réservation.</p>
                } @else {
                  <ul class="timeline-list">
                    @for (h of res.historique; track h.id) {
                      <li>
                        <div class="timeline-head">
                          <strong>{{ formatReservationStatusLabel(h.nouveauStatut) }}</strong>
                          <span class="muted">{{ h.dateTransition | dateFr }}</span>
                        </div>
                        @if (h.motif) {
                          <p class="timeline-meta">{{ h.motif }}</p>
                        }
                      </li>
                    }
                  </ul>
                }
              </section>
            </aside>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.25rem;
      flex-wrap: wrap;
      margin: 1rem 0 1.5rem;
      padding: 1.35rem 1.5rem;
      background: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
    }
    .badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-bottom: 0.5rem;
    }
    .detail-title {
      margin: 0;
      font-size: clamp(1.45rem, 2.6vw, 2rem);
    }
    .detail-subtitle {
      margin: 0.3rem 0 0;
      color: var(--ink-secondary);
      font-size: var(--text-sm);
    }
    .header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
    }
    .btn-primary,
    .btn-secondary,
    .btn-danger {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.6rem 1.05rem;
      border-radius: var(--radius-pill);
      font-weight: 700;
      font-size: var(--text-sm);
      text-decoration: none;
      cursor: pointer;
      border: none;
      font-family: inherit;
    }
    .btn-primary {
      background: var(--brand-primary);
      color: var(--ink-on-dark);
    }
    .btn-secondary {
      background: var(--surface-sand);
      color: var(--ink-primary);
      border: 1px solid var(--border-strong);
    }
    .btn-danger {
      background: var(--status-error-bg);
      color: var(--status-error-ink);
      border: 1px solid var(--status-error-border);
    }
    .tickets-wrapper {
      margin-bottom: 1.5rem;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: 1.45fr 1fr;
      gap: 1.5rem;
      align-items: start;
    }
    @media (max-width: 920px) {
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
    .panel-card {
      background: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 1.35rem;
    }
    .panel-card h2 {
      margin: 0 0 1rem;
      font-size: var(--text-lg);
    }
    .facts-grid {
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 0.9rem;
    }
    .facts-grid dt {
      font-size: var(--text-xs);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--ink-muted);
      font-weight: 700;
    }
    .facts-grid dd {
      margin: 0.25rem 0 0;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--ink-primary);
      font-size: var(--text-sm);
    }
    .inline-link {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      color: var(--brand-primary);
      font-weight: 700;
      text-decoration: none;
    }
    .price-strong {
      font-weight: 800;
      color: var(--brand-primary);
      font-size: var(--text-md);
    }
    .sub-block {
      margin-top: 1.35rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-subtle);
    }
    .sub-block h3 {
      margin: 0 0 0.65rem;
      font-size: var(--text-base);
    }
    .participants-list,
    .timeline-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.65rem;
    }
    .participants-list li,
    .timeline-list li {
      padding: 0.7rem 0.85rem;
      background: var(--surface-sand);
      border-radius: var(--radius-md);
      font-size: var(--text-sm);
    }
    .timeline-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .timeline-title {
      margin: 0.3rem 0 0;
      font-weight: 700;
    }
    .timeline-meta,
    .muted {
      margin: 0.2rem 0 0;
      font-size: var(--text-xs);
      color: var(--ink-muted);
    }
    .sidebar-stack {
      display: grid;
      gap: 1.25rem;
    }
    .verified-callout {
      margin-top: 1.35rem;
      padding: 1rem;
      border-radius: var(--radius-md);
      background: var(--surface-sand);
      border: 1px solid var(--border-strong);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .verified-callout p {
      margin: 0.2rem 0 0;
      font-size: var(--text-xs);
      color: var(--ink-secondary);
    }
    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 1rem;
      font-weight: 700;
      color: var(--brand-primary);
      text-decoration: none;
    }
  `,
})
export class ReservationDetailPageComponent {
  readonly id = input.required<string>();

  private readonly reservationApi = inject(ReservationApiService);
  private readonly paiementApi = inject(PaiementApiService);
  private readonly billetApi = inject(BilletApiService);
  private readonly dialog = inject(Dialog);
  private readonly seo = inject(SeoService);

  protected readonly reservation = signal<Reservation | null>(null);
  protected readonly paiements = signal<Paiement[]>([]);
  protected readonly billets = signal<Billet[]>([]);
  protected readonly billetsLoading = signal<boolean>(false);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly busyAction = signal(false);

  protected readonly formatReservationStatusLabel = formatReservationStatusLabel;
  protected readonly reservationStatusBadgeClass = reservationStatusBadgeClass;
  protected readonly formatPaiementStatusLabel = formatPaiementStatusLabel;
  protected readonly paiementStatusBadgeClass = paiementStatusBadgeClass;
  protected readonly formatModePaiementLabel = formatModePaiementLabel;

  protected readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const r = this.reservation();
    return [
      { label: 'Accueil', to: '/' },
      { label: 'Mon Espace', to: '/mon-espace' },
      { label: r?.referenceReservation ?? `Réservation ${this.id()}` },
    ];
  });

  protected readonly prestationTitle = computed(() => {
    const r = this.reservation();
    if (!r) return 'Réservation';
    if (r.typeReservation === 'CIRCUIT') {
      return r.circuit?.nomCircuit ?? `Circuit ${r.circuitId}`;
    }
    return r.evenement?.nomEvenement ?? `Événement ${r.evenementId}`;
  });

  protected readonly prestationLink = computed<unknown[] | null>(() => {
    const r = this.reservation();
    if (!r) return null;
    if (r.typeReservation === 'CIRCUIT' && r.circuitId) {
      return ['/circuits', r.circuitId];
    }
    if (r.typeReservation === 'EVENEMENT' && r.evenementId) {
      return ['/evenements', r.evenementId];
    }
    return null;
  });

  protected readonly canCancel = computed(() => {
    const r = this.reservation();
    return r ? ['BROUILLON', 'EN_ATTENTE_PAIEMENT', 'CONFIRMEE'].includes(r.statut) : false;
  });

  private loadSeq = 0;

  constructor() {
    effect(() => {
      const currentId = this.id();
      untracked(() => {
        void this.loadDetail(currentId);
      });
    });
  }

  protected reload(): void {
    void this.loadDetail(this.id());
  }

  protected async soumettre(): Promise<void> {
    const r = this.reservation();
    if (!r) return;
    this.busyAction.set(true);
    this.actionError.set(null);
    try {
      const updated = await firstValueFrom(this.reservationApi.soumettre(r.id));
      this.reservation.set(updated);
      toast.success('Réservation soumise pour paiement simulé.');
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busyAction.set(false);
    }
  }

  protected async syncReservation(): Promise<void> {
    const r = this.reservation();
    if (!r) return;
    this.busyAction.set(true);
    this.actionError.set(null);
    try {
      const updated = await firstValueFrom(this.reservationApi.synchroniser(r.id));
      this.reservation.set(updated);
      const pays = await firstValueFrom(this.paiementApi.getByReservation(r.id)).catch(() => []);
      this.paiements.set(pays ?? []);
      if (updated.statut === 'CONFIRMEE') {
        void this.loadBillets(updated.id);
      } else {
        this.billets.set([]);
      }
      toast.success('Statut synchronisé avec le service de paiement.');
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busyAction.set(false);
    }
  }

  protected async annuler(): Promise<void> {
    const r = this.reservation();
    if (!r) return;
    const ref = this.dialog.open<boolean>(UiConfirmDialogComponent, {
      data: {
        title: `Annuler ${r.referenceReservation || '#' + r.id} ?`,
        message: `Voulez-vous annuler cette réservation (${r.nombrePlaces} place(s)) ?`,
        confirmLabel: 'Confirmer l’annulation',
        cancelLabel: 'Conserver',
        variant: 'danger',
      },
    });
    const confirmed = await firstValueFrom(ref.closed);
    if (!confirmed) return;

    this.busyAction.set(true);
    this.actionError.set(null);
    try {
      const updated = await firstValueFrom(this.reservationApi.cancel(r.id));
      this.reservation.set(updated);
      toast.success('Réservation annulée.');
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.busyAction.set(false);
    }
  }

  private async loadDetail(resId: string): Promise<void> {
    const seq = ++this.loadSeq;
    this.loading.set(true);
    this.error.set(null);
    this.actionError.set(null);
    try {
      const [detail, pays] = await Promise.all([
        firstValueFrom(this.reservationApi.getById(resId)),
        firstValueFrom(this.paiementApi.getByReservation(resId)).catch(() => []),
      ]);
      if (seq !== this.loadSeq) return;
      this.reservation.set(detail);
      this.paiements.set(pays ?? []);
      if (detail.statut === 'CONFIRMEE') {
        void this.loadBillets(detail.id);
      } else {
        this.billets.set([]);
      }
      this.seo.update({
        title: `Réservation ${detail.referenceReservation || '#' + detail.id}`,
        description: `Suivi détaillé de la réservation ${detail.referenceReservation || '#' + detail.id}.`,
        canonicalPath: `/reservations/${detail.id}`,
      });
    } catch (err) {
      if (seq !== this.loadSeq) return;
      this.reservation.set(null);
      this.error.set(extractErrorMessage(err));
    } finally {
      if (seq === this.loadSeq) {
        this.loading.set(false);
      }
    }
  }

  private async loadBillets(resId: number | string): Promise<void> {
    this.billetsLoading.set(true);
    try {
      const list = await firstValueFrom(this.billetApi.getBillets(resId));
      this.billets.set(list ?? []);
    } catch {
      this.billets.set([]);
    } finally {
      this.billetsLoading.set(false);
    }
  }
}
