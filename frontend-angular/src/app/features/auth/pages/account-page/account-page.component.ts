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
import { normalizeHttpError } from '../../../../core/interceptors/http-error.interceptor';
import {
  ModePaiement,
  NotificationItem,
  Paiement,
} from '../../../../core/models/utilisateur.model';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
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
                    @let paid = getPaymentForReservation(res.id);
                    <article class="res-row" [class.res-row--cancelled]="res.statut === 'ANNULEE'">
                      <div class="res-row__main">
                        <div class="res-row__badges">
                          <span class="ui-badge">#{{ res.id }}</span>
                          <span class="ui-badge ui-badge--ochre">{{ res.typeReservation }}</span>
                          <span
                            class="ui-badge"
                            [class.ui-badge--success]="res.statut === 'CONFIRMEE'"
                            [class.ui-badge--danger]="res.statut === 'ANNULEE'"
                          >
                            {{ res.statut }}
                          </span>
                          @if (paid) {
                            <span class="ui-badge ui-badge--success">
                              <svg lucideCheckCircle2 [size]="12" aria-hidden="true"></svg>
                              Payé ({{ paid.modePaiement }} · {{ paid.referenceTransaction }})
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

                      @if (res.statut !== 'ANNULEE' && !paid) {
                        <div class="res-row__pay">
                          <label [attr.for]="'pay-mode-' + res.id" class="sr-only">
                            Mode de paiement
                          </label>
                          <select
                            [id]="'pay-mode-' + res.id"
                            class="pay-select"
                            [(ngModel)]="selectedPayMode"
                          >
                            <option value="WAVE">Wave Mobile Money</option>
                            <option value="ORANGE_MONEY">Orange Money</option>
                            <option value="CARTE_BANCAIRE">Carte Bancaire</option>
                            <option value="ESPECES">Espèces sur place</option>
                          </select>
                          <button
                            type="button"
                            class="btn-pay"
                            [disabled]="payingId() === res.id"
                            (click)="payReservation(res.id)"
                          >
                            <svg lucideCreditCard [size]="15" aria-hidden="true"></svg>
                            <span>
                              {{ payingId() === res.id ? 'Traitement...' : 'Régler maintenant' }}
                            </span>
                          </button>
                        </div>
                      }
                    </article>
                  }
                </div>
              }
            </section>

            <!-- Colonne latérale : Notifications & Transactions -->
            <aside class="account-sidebar">
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
  protected readonly authStore = inject(AuthStore);
  protected readonly reservationStore = inject(ReservationStore);

  protected readonly paiements = signal<Paiement[]>([]);
  protected readonly notifications = signal<NotificationItem[]>([]);
  protected readonly payingId = signal<number | null>(null);
  protected selectedPayMode: ModePaiement = 'WAVE';

  protected readonly myReservations = computed(() => {
    const email = this.authStore.user()?.email?.toLowerCase();
    const all = this.reservationStore.items();
    if (!email) return [];
    if (this.authStore.isStaff()) {
      return all;
    }
    return all.filter((r) => r.emailClient?.toLowerCase() === email);
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

  protected getPaymentForReservation(reservationId: number): Paiement | undefined {
    return this.paiements().find(
      (p) => p.reservationId === reservationId && p.statut === 'REUSSI'
    );
  }

  protected async payReservation(reservationId: number): Promise<void> {
    this.payingId.set(reservationId);
    try {
      const created = await firstValueFrom(
        this.http.post<Paiement>(
          '/api/paiements',
          {
            reservationId,
            modePaiement: this.selectedPayMode,
          },
          { withCredentials: true }
        )
      );
      toast.success(`Paiement confirmé (${created.referenceTransaction})`);
      await this.loadTransactionsAndNotifications();
    } catch (err) {
      toast.error(normalizeHttpError(err).message);
    } finally {
      this.payingId.set(null);
    }
  }

  protected async onLogout(): Promise<void> {
    await this.authStore.logout();
    toast.success('Vous avez été déconnecté avec succès.');
    await this.router.navigate(['/connexion']);
  }

  private async loadTransactionsAndNotifications(): Promise<void> {
    try {
      const [payList, notifList] = await Promise.all([
        firstValueFrom(this.http.get<Paiement[]>('/api/paiements', { withCredentials: true })),
        firstValueFrom(
          this.http.get<NotificationItem[]>('/api/notifications', { withCredentials: true })
        ),
      ]);
      this.paiements.set(payList ?? []);
      this.notifications.set(notifList ?? []);
    } catch {
      // Les microservices de paiement/notification restent optionnels en cas de test unitaire isolé
    }
  }
}
