import { Dialog } from '@angular/cdk/dialog';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideBell,
  LucideCheckCircle2,
  LucideCreditCard,
  LucideLogOut,
  LucideShieldCheck,
  LucideTicket,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AuthStore } from '../../../../core/auth/auth.store';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import {
  ModePaiement,
  Paiement,
  formatPaiementStatusLabel,
  paiementStatusBadgeClass,
} from '../../../../core/models/paiement.model';
import {
  Reservation,
  formatReservationStatusLabel,
  reservationStatusBadgeClass,
} from '../../../../core/models/reservation.model';
import { NotificationItem } from '../../../../core/models/utilisateur.model';
import { UiConfirmDialogComponent } from '../../../../shared/components/ui-confirm-dialog/ui-confirm-dialog.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { PaiementStore } from '../../../paiements/data-access/paiement.store';
import { ReservationStore } from '../../../reservations/data-access/reservation.store';

@Component({
  selector: 'app-account-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    FcfaPricePipe,
    DateFrPipe,
    LucideShieldCheck,
    LucideTicket,
    LucideCreditCard,
    LucideBell,
    LucideCheckCircle2,
    LucideLogOut,
  ],
  template: `
    <div class="page-section">
      <div class="container">
        @if (authStore.user(); as currentUser) {
          <header class="account-hero">
            <div class="account-hero__identity">
              <div class="account-avatar" aria-hidden="true">
                {{ authStore.initials() }}
              </div>
              <div>
                <div class="account-hero__badges">
                  <span class="ui-badge ui-badge--terracotta">{{ authStore.roleLabel() }}</span>
                  <span class="ui-badge ui-badge--success">
                    <svg lucideShieldCheck [size]="13" aria-hidden="true"></svg>
                    Session HttpOnly active
                  </span>
                </div>
                <h1 class="account-hero__name">
                  {{ currentUser.prenom }} {{ currentUser.nom }}
                </h1>
                <p class="account-hero__meta">
                  {{ currentUser.email }}
                  @if (currentUser.telephone) {
                    <span> · {{ currentUser.telephone }}</span>
                  }
                </p>
              </div>
            </div>

            <div class="account-hero__actions">
              @if (authStore.isStaff()) {
                <a routerLink="/administration" class="btn-admin">
                  Accéder au Back-Office ({{ authStore.roleLabel() }})
                </a>
              }
              <a routerLink="/reserver" class="btn-primary">
                <svg lucideTicket [size]="16" aria-hidden="true"></svg>
                <span>Nouvelle réservation</span>
              </a>
              <button type="button" class="btn-logout" (click)="onLogout()">
                <svg lucideLogOut [size]="16" aria-hidden="true"></svg>
                <span>Se déconnecter</span>
              </button>
            </div>
          </header>

          <div class="account-grid">
            <!-- Colonne principale : Réservations & Paiements -->
            <section class="account-card" aria-labelledby="my-res-heading">
              <div class="account-card__header">
                <h2 id="my-res-heading" class="account-card__title">
                  <svg lucideTicket [size]="18" aria-hidden="true"></svg>
                  <span>Mes réservations ({{ myReservations().length }})</span>
                </h2>
              </div>

              @if (myReservations().length === 0) {
                <div class="empty-box">
                  <p>Aucune réservation associée à l’adresse {{ currentUser.email }}.</p>
                  <a routerLink="/reserver" class="btn-primary">Réserver un circuit ou événement</a>
                </div>
              } @else {
                <div class="res-stack">
                  @for (res of myReservations(); track res.id) {
                    @let latestPay = getPaymentForReservation(res.id);
                    <article
                      class="res-row"
                      [class.res-row--cancelled]="res.statut === 'ANNULEE' || res.statut === 'EXPIREE'"
                    >
                      <div class="res-row__main">
                        <div class="res-row__badges">
                          <span class="ui-badge">{{ res.referenceReservation || ('#' + res.id) }}</span>
                          <span class="ui-badge ui-badge--ochre">{{ res.typeReservation }}</span>
                          <span [class]="reservationStatusBadgeClass(res.statut)">
                            {{ formatReservationStatusLabel(res.statut) }}
                          </span>
                          @if (latestPay) {
                            <span [class]="paiementStatusBadgeClass(latestPay.statut)">
                              <svg lucideCheckCircle2 [size]="12" aria-hidden="true"></svg>
                              {{ latestPay.modePaiement }} · {{ latestPay.referenceTransaction }}
                              ({{ formatPaiementStatusLabel(latestPay.statut) }})
                            </span>
                          }
                        </div>

                        <h3 class="res-row__title">
                          {{
                            res.circuit?.nomCircuit ||
                              res.evenement?.nomEvenement ||
                              (res.typeReservation === 'CIRCUIT'
                                ? 'Circuit #' + res.circuitId
                                : 'Événement #' + res.evenementId)
                          }}
                        </h3>
                        <p class="res-row__meta tabular-nums">
                          {{ res.nombrePlaces }} place(s) · Total :
                          <strong>{{ res.montantTotal | fcfaPrice }}</strong> ·
                          {{ res.dateReservation | dateFr }}
                        </p>
                      </div>

                      <div class="res-row__pay">
                        @if (res.statut === 'EN_ATTENTE_PAIEMENT') {
                          <label [attr.for]="'pay-mode-' + res.id" class="sr-only">
                            Portefeuille simulé
                          </label>
                          <select
                            [id]="'pay-mode-' + res.id"
                            class="pay-select"
                            [ngModel]="getSelectedMode(res.id)"
                            (ngModelChange)="setSelectedMode(res.id, $event)"
                          >
                            <option value="WAVE">Wave Sénégal (Simulé)</option>
                            <option value="ORANGE_MONEY">Orange Money (Simulé)</option>
                          </select>
                          <button
                            type="button"
                            class="btn-pay"
                            [disabled]="payingId() === res.id"
                            (click)="startSimulatedCheckout(res)"
                          >
                            <svg lucideCreditCard [size]="15" aria-hidden="true"></svg>
                            <span>
                              {{ payingId() === res.id ? 'Ouverture...' : 'Régler (Simulé)' }}
                            </span>
                          </button>
                        } @else if (res.statut === 'BROUILLON') {
                          <button
                            type="button"
                            class="btn-admin"
                            (click)="submitDraft(res.id)"
                          >
                            Soumettre
                          </button>
                        } @else {
                          <a
                            [routerLink]="['/paiements', res.id]"
                            class="btn-admin"
                          >
                            Voir reçu / suivi
                          </a>
                        }

                        @if (canCancel(res)) {
                          <button
                            type="button"
                            class="btn-cancel-sm"
                            [disabled]="reservationStore.cancelingId() === res.id"
                            (click)="confirmCancel(res)"
                          >
                            Annuler
                          </button>
                        }
                      </div>
                    </article>
                  }
                </div>
              }
            </section>

            <!-- Colonne latérale : Transactions Simulées & Notifications -->
            <aside class="account-sidebar">
              <section class="account-card" aria-labelledby="tx-heading">
                <div class="account-card__header">
                  <h2 id="tx-heading" class="account-card__title">
                    <svg lucideCreditCard [size]="18" aria-hidden="true"></svg>
                    <span>Transactions simulées ({{ paiements().length }})</span>
                  </h2>
                </div>
                <p class="ui-sim-banner" style="margin-bottom: 0.75rem;">
                  Mode simulation Wave / Orange Money — aucun débit réel.
                </p>
                @if (paiements().length === 0) {
                  <p class="sidebar-muted">
                    Aucune transaction simulée enregistrée pour le moment.
                  </p>
                } @else {
                  <ul class="notif-list">
                    @for (p of paiements().slice(0, 6); track p.id) {
                      <li class="notif-item">
                        <div class="notif-item__top">
                          <span [class]="paiementStatusBadgeClass(p.statut)">
                            {{ formatPaiementStatusLabel(p.statut) }}
                          </span>
                          <span class="notif-item__date">{{ (p.datePaiement || p.dateCreation) | dateFr }}</span>
                        </div>
                        <p class="notif-item__subject">
                          {{ p.referenceTransaction }} · {{ p.montant | fcfaPrice }}
                        </p>
                        <p class="notif-item__body">
                          {{ p.modePaiement }} · Réservation #{{ p.reservationId }}
                          <a [routerLink]="['/paiements', p.reservationId]">Détails</a>
                        </p>
                      </li>
                    }
                  </ul>
                }
              </section>

              <section class="account-card" aria-labelledby="notif-heading">
                <div class="account-card__header">
                  <h2 id="notif-heading" class="account-card__title">
                    <svg lucideBell [size]="18" aria-hidden="true"></svg>
                    <span>Notifications reçues ({{ myNotifications().length }})</span>
                  </h2>
                </div>

                @if (myNotifications().length === 0) {
                  <p class="sidebar-muted">
                    Aucune notification enregistrée pour votre adresse email pour le moment.
                  </p>
                } @else {
                  <ul class="notif-list">
                    @for (n of myNotifications(); track n.id) {
                      <li class="notif-item">
                        <div class="notif-item__top">
                          <span class="ui-badge ui-badge--success">{{ n.canal }}</span>
                          <span class="notif-item__date">{{ n.dateEnvoi | dateFr }}</span>
                        </div>
                        <p class="notif-item__subject">{{ n.sujet }}</p>
                        <p class="notif-item__body">{{ n.contenu }}</p>
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
    .account-hero {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-6);
      padding: var(--space-6) var(--space-8);
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-sm);
      margin-bottom: var(--space-8);
    }

    .account-hero__identity {
      display: flex;
      align-items: center;
      gap: var(--space-5);
    }

    .account-avatar {
      width: 68px;
      height: 68px;
      border-radius: var(--radius-pill);
      background: linear-gradient(135deg, var(--brand-primary) 0%, var(--accent-terracotta) 100%);
      color: #ffffff;
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .account-hero__badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }

    .account-hero__name {
      font-size: var(--text-2xl);
      color: var(--ink-primary);
      margin-bottom: 0.15rem;
    }

    .account-hero__meta {
      font-size: var(--text-sm);
      color: var(--ink-secondary);
    }

    .account-hero__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .btn-primary,
    .btn-admin,
    .btn-logout {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 0.65rem 1.2rem;
      border-radius: var(--radius-pill);
      font-size: var(--text-sm);
      font-weight: 700;
      cursor: pointer;
      font-family: var(--font-sans);
    }

    .btn-primary {
      background-color: var(--brand-primary);
      color: var(--ink-on-dark);
      border: none;
    }

    .btn-admin {
      background-color: var(--accent-terracotta);
      color: #ffffff;
      border: none;
    }

    .btn-logout {
      background-color: var(--surface-sand);
      color: var(--danger);
      border: 1px solid rgba(166, 44, 44, 0.25);
    }

    .account-grid {
      display: grid;
      grid-template-columns: 1.55fr 1fr;
      gap: var(--space-6);
      align-items: start;
    }

    .account-card {
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      box-shadow: var(--shadow-xs);
    }

    .account-card__header {
      margin-bottom: var(--space-5);
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--border-subtle);
    }

    .account-card__title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-lg);
      color: var(--ink-primary);
    }

    .res-stack {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .res-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-4);
      border-radius: var(--radius-md);
      background-color: var(--surface-canvas);
      border: 1px solid var(--border-subtle);
    }

    .res-row--cancelled {
      opacity: 0.65;
    }

    .res-row__badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }

    .res-row__title {
      font-size: var(--text-base);
      color: var(--ink-primary);
      margin-bottom: 0.2rem;
    }

    .res-row__meta {
      font-size: var(--text-sm);
      color: var(--ink-secondary);
    }

    .res-row__pay {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .pay-select {
      padding: 0.5rem 0.75rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-strong);
      background-color: var(--surface-elevated);
      font-size: var(--text-xs);
      font-weight: 600;
    }

    .btn-pay {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.52rem 0.95rem;
      border-radius: var(--radius-pill);
      border: none;
      background-color: var(--accent-terracotta);
      color: #ffffff;
      font-size: var(--text-xs);
      font-weight: 700;
      cursor: pointer;
    }

    .notif-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .notif-item {
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      background-color: var(--surface-sand);
      border: 1px solid var(--border-subtle);
    }

    .notif-item__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.3rem;
    }

    .notif-item__date {
      font-size: var(--text-xs);
      color: var(--ink-muted);
    }

    .notif-item__subject {
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--ink-primary);
      margin-bottom: 0.2rem;
    }

    .notif-item__body {
      font-size: var(--text-xs);
      color: var(--ink-secondary);
      line-height: 1.5;
    }

    .empty-box {
      padding: var(--space-6);
      text-align: center;
      background-color: var(--surface-sand);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-3);
    }

    .sidebar-muted {
      font-size: var(--text-sm);
      color: var(--ink-secondary);
    }

    .account-sidebar {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .btn-cancel-sm {
      padding: 0.4rem 0.75rem;
      border-radius: var(--radius-pill);
      border: 1px solid var(--status-error-border);
      background: var(--status-error-bg);
      color: var(--status-error-ink);
      font-size: var(--text-xs);
      font-weight: 700;
      cursor: pointer;
    }

    @media (max-width: 920px) {
      .account-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AccountPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);
  protected readonly authStore = inject(AuthStore);
  protected readonly reservationStore = inject(ReservationStore);
  protected readonly paiementStore = inject(PaiementStore);

  protected readonly paiements = computed(() => this.paiementStore.items());
  protected readonly notifications = signal<NotificationItem[]>([]);
  protected readonly payingId = signal<number | null>(null);
  protected readonly selectedModes = signal<Record<number, ModePaiement>>({});

  protected readonly formatReservationStatusLabel = formatReservationStatusLabel;
  protected readonly reservationStatusBadgeClass = reservationStatusBadgeClass;
  protected readonly formatPaiementStatusLabel = formatPaiementStatusLabel;
  protected readonly paiementStatusBadgeClass = paiementStatusBadgeClass;

  protected readonly myReservations = computed(() => {
    const user = this.authStore.user();
    const email = user?.email?.toLowerCase();
    const all = this.reservationStore.items();
    if (!email) return [];
    if (this.authStore.isStaff()) {
      return all;
    }
    return all.filter(
      (r) =>
        (user?.id != null && r.utilisateurId === user.id) ||
        r.emailClient?.toLowerCase() === email
    );
  });

  protected readonly myNotifications = computed(() => {
    const email = this.authStore.user()?.email?.toLowerCase();
    const all = this.notifications();
    if (!email) return [];
    if (this.authStore.isStaff()) {
      return all;
    }
    return all.filter((n) => n.destinataire?.toLowerCase() === email);
  });

  ngOnInit(): void {
    void this.reservationStore.reload();
    void this.loadTransactionsAndNotifications();
  }

  protected getSelectedMode(reservationId: number): ModePaiement {
    return this.selectedModes()[reservationId] ?? 'WAVE';
  }

  protected setSelectedMode(reservationId: number, mode: ModePaiement): void {
    this.selectedModes.update((curr) => ({ ...curr, [reservationId]: mode }));
  }

  protected getPaymentForReservation(reservationId: number): Paiement | undefined {
    const matches = this.paiements().filter((p) => p.reservationId === reservationId);
    return (
      matches.find((p) => p.statut === 'ACCEPTE') ??
      matches.find((p) => p.statut === 'EN_COURS' || p.statut === 'INITIE') ??
      matches[0]
    );
  }

  protected canCancel(res: Reservation): boolean {
    return ['BROUILLON', 'EN_ATTENTE_PAIEMENT', 'CONFIRMEE'].includes(res.statut);
  }

  protected async submitDraft(reservationId: number): Promise<void> {
    try {
      await this.reservationStore.soumettreReservation(reservationId);
      toast.success(`Réservation #${reservationId} prête pour paiement.`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  }

  protected async startSimulatedCheckout(res: Reservation): Promise<void> {
    this.payingId.set(res.id);
    try {
      const existing = this.getPaymentForReservation(res.id);
      if (!existing || !['EN_COURS', 'INITIE', 'ACCEPTE'].includes(existing.statut)) {
        await this.paiementStore.initierPaiement({
          reservationId: res.id,
          modePaiement: this.getSelectedMode(res.id),
          numeroTelephoneSimule: this.authStore.user()?.telephone || null,
        });
      }
      await this.router.navigate(['/paiements', res.id]);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      this.payingId.set(null);
    }
  }

  protected async confirmCancel(res: Reservation): Promise<void> {
    const ref = this.dialog.open<boolean>(UiConfirmDialogComponent, {
      data: {
        title: `Annuler la réservation ${res.referenceReservation || '#' + res.id} ?`,
        message: `Voulez-vous annuler cette réservation de ${res.nombrePlaces} place(s) ?`,
        confirmLabel: 'Confirmer l’annulation',
        cancelLabel: 'Conserver',
        variant: 'danger',
      },
    });
    const confirmed = await firstValueFrom(ref.closed);
    if (!confirmed) return;

    try {
      await this.reservationStore.cancelReservation(res.id);
      toast.success('Réservation annulée.');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  }

  protected async onLogout(): Promise<void> {
    await this.authStore.logout();
    toast.success('Vous avez été déconnecté avec succès.');
    await this.router.navigate(['/connexion']);
  }

  private async loadTransactionsAndNotifications(): Promise<void> {
    await this.paiementStore.reload();
    try {
      const notifList = await firstValueFrom(this.http.get<NotificationItem[]>('/notifications'));
      this.notifications.set(notifList ?? []);
    } catch {
      // Les notifications peuvent être indisponibles en environnement isolé
    }
  }
}
