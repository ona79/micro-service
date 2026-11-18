import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideBell,
  LucideCheckCircle2,
  LucideCreditCard,
  LucideEye,
  LucideLogOut,
  LucideShieldCheck,
  LucideStar,
  LucideTicket,
  LucideUser,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AuthStore } from '../../../../core/auth/auth.store';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import { Avis, formatModerationStatusLabel, moderationBadgeClass } from '../../../../core/models/avis.model';
import { NotificationItem, formatNotificationEventLabel } from '../../../../core/models/notification.model';
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
import { SeoService } from '../../../../core/services/seo.service';
import { Billet } from '../../../../core/models/billet.model';
import { UiConfirmDialogComponent } from '../../../../shared/components/ui-confirm-dialog/ui-confirm-dialog.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiTicketViewComponent } from '../../../../shared/components/ui-ticket-view/ui-ticket-view.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { AvisApiService } from '../../../avis/data-access/avis-api.service';
import { NotificationApiService } from '../../../notifications/data-access/notification-api.service';
import { NotificationStore } from '../../../notifications/data-access/notification.store';
import { PaiementStore } from '../../../paiements/data-access/paiement.store';
import { BilletApiService } from '../../../reservations/data-access/billet-api.service';
import { ReservationStore } from '../../../reservations/data-access/reservation.store';

type AccountTab = 'reservations' | 'billets' | 'paiements' | 'avis' | 'notifications' | 'profil';

@Component({
  selector: 'app-account-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    FcfaPricePipe,
    DateFrPipe,
    UiErrorBannerComponent,
    UiTicketViewComponent,
    LucideShieldCheck,
    LucideTicket,
    LucideCreditCard,
    LucideBell,
    LucideCheckCircle2,
    LucideLogOut,
    LucideStar,
    LucideEye,
    LucideUser,
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
              @if (authStore.isBackOfficeRole()) {
                <a routerLink="/pro/tableau-de-bord" class="btn-admin">
                  <svg lucideShieldCheck [size]="16" aria-hidden="true"></svg>
                  <span>Ouvrir l'Espace Pro ({{ authStore.roleLabel() }})</span>
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

          @if (nextVisit(); as next) {
            <div class="next-visit-card" style="display:flex;align-items:center;justify-content:space-between;padding:1.25rem 1.5rem;background:linear-gradient(135deg, var(--surface-forest) 0%, var(--brand-primary) 100%);color:#ffffff;border-radius:var(--radius-xl);margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
              <div>
                <span class="ui-badge ui-badge--ochre" style="margin-bottom:0.4rem;display:inline-block;">Prochaine visite confirmée</span>
                <h2 style="margin:0 0 0.35rem;font-size:var(--text-xl);color:#ffffff;">
                  {{ next.circuit?.nomCircuit || next.evenement?.nomEvenement || ('Réservation #' + next.id) }}
                </h2>
                <p style="margin:0;font-size:var(--text-sm);opacity:0.9;">
                  @if (next.datePrestation) {
                    {{ next.datePrestation | dateFr: 'date' }}
                    @if (next.creneauPrestation) { · {{ next.creneauPrestation }} }
                  } @else {
                    {{ next.dateReservation | dateFr }}
                  }
                  · {{ next.nombrePlaces }} place(s) réservée(s)
                </p>
              </div>
              <div style="display:flex;gap:0.75rem;align-items:center;">
                <button
                  type="button"
                  class="ui-btn ui-btn--primary"
                  style="background:#ffffff;color:var(--brand-primary);font-weight:700;border:none;cursor:pointer;"
                  (click)="openBilletsTab()"
                >
                  <svg lucideTicket [size]="16" aria-hidden="true"></svg>
                  <span>Afficher mes billets QR</span>
                </button>
              </div>
            </div>
          }

          <nav class="account-tabs" role="tablist" aria-label="Sections de mon espace personnel">
            <button
              type="button"
              role="tab"
              class="account-tab"
              [class.account-tab--active]="activeTab() === 'reservations'"
              [attr.aria-selected]="activeTab() === 'reservations'"
              (click)="activeTab.set('reservations')"
            >
              <svg lucideTicket [size]="15" aria-hidden="true"></svg>
              <span>Réservations ({{ myReservations().length }})</span>
            </button>
            <button
              type="button"
              role="tab"
              class="account-tab"
              [class.account-tab--active]="activeTab() === 'billets'"
              [attr.aria-selected]="activeTab() === 'billets'"
              (click)="openBilletsTab()"
            >
              <svg lucideTicket [size]="15" aria-hidden="true"></svg>
              <span>Mes billets QR ({{ confirmedReservations().length }})</span>
            </button>
            <button
              type="button"
              role="tab"
              class="account-tab"
              [class.account-tab--active]="activeTab() === 'paiements'"
              [attr.aria-selected]="activeTab() === 'paiements'"
              (click)="activeTab.set('paiements')"
            >
              <svg lucideCreditCard [size]="15" aria-hidden="true"></svg>
              <span>Paiements simulés ({{ paiements().length }})</span>
            </button>
            <button
              type="button"
              role="tab"
              class="account-tab"
              [class.account-tab--active]="activeTab() === 'avis'"
              [attr.aria-selected]="activeTab() === 'avis'"
              (click)="activeTab.set('avis')"
            >
              <svg lucideStar [size]="15" aria-hidden="true"></svg>
              <span>Mes avis ({{ mesAvis().length }})</span>
            </button>
            <button
              type="button"
              role="tab"
              class="account-tab"
              [class.account-tab--active]="activeTab() === 'notifications'"
              [attr.aria-selected]="activeTab() === 'notifications'"
              (click)="activeTab.set('notifications')"
            >
              <svg lucideBell [size]="15" aria-hidden="true"></svg>
              <span>Notifications ({{ myNotifications().length }})</span>
            </button>
            <button
              type="button"
              role="tab"
              class="account-tab"
              [class.account-tab--active]="activeTab() === 'profil'"
              [attr.aria-selected]="activeTab() === 'profil'"
              (click)="openProfileTab()"
            >
              <svg lucideUser [size]="15" aria-hidden="true"></svg>
              <span>Profil &amp; coordonnées</span>
            </button>
          </nav>

          @if (activeTab() === 'reservations') {
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
                          <a [routerLink]="['/reservations', res.id]" class="res-title-link">
                            {{
                              res.circuit?.nomCircuit ||
                                res.evenement?.nomEvenement ||
                                (res.typeReservation === 'CIRCUIT'
                                  ? 'Circuit #' + res.circuitId
                                  : 'Événement #' + res.evenementId)
                            }}
                          </a>
                        </h3>
                        <p class="res-row__meta tabular-nums">
                          {{ res.nombrePlaces }} place(s) · Total :
                          <strong>{{ res.montantTotal | fcfaPrice }}</strong> ·
                          {{ res.dateReservation | dateFr }}
                        </p>
                      </div>

                      <div class="res-row__pay">
                        <a [routerLink]="['/reservations', res.id]" class="btn-detail-sm">
                          <svg lucideEye [size]="14" aria-hidden="true"></svg>
                          <span>Détail</span>
                        </a>

                        @if (res.statut === 'CONFIRMEE') {
                          <a [routerLink]="['/reservations', res.id]" class="btn-tickets-sm" title="Voir mes billets électroniques et QR codes">
                            <svg lucideTicket [size]="14" aria-hidden="true"></svg>
                            <span>Billets QR</span>
                          </a>
                        }

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
                          <a [routerLink]="['/paiements', res.id]" class="btn-admin">
                            Suivi paiement
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
          }

          @if (activeTab() === 'billets') {
            <section class="account-card" aria-labelledby="billets-heading">
              <div class="account-card__header">
                <h2 id="billets-heading" class="account-card__title">
                  <svg lucideTicket [size]="18" aria-hidden="true"></svg>
                  <span>Mes billets électroniques &amp; QR Codes ({{ confirmedReservations().length }})</span>
                </h2>
              </div>

              @if (confirmedReservations().length === 0) {
                <div class="empty-box">
                  <p>Aucun billet électronique actif. Vos billets et QR codes d'accès apparaîtront ici dès confirmation de votre réservation.</p>
                  <a routerLink="/reserver" class="btn-primary">Réserver un circuit ou événement</a>
                </div>
              } @else {
                <div class="tickets-container" style="display:grid;gap:1.5rem;">
                  @for (res of confirmedReservations(); track res.id) {
                    <article class="ticket-group-card" style="border:1px solid var(--border-subtle);border-radius:var(--radius-lg);padding:1.25rem;background:var(--surface-elevated);">
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem;">
                        <div>
                          <span class="ui-badge ui-badge--success">Accès confirmé</span>
                          <span class="ui-badge ui-badge--neutral" style="margin-left:0.5rem;">Réf: {{ res.referenceReservation || ('#' + res.id) }}</span>
                          <h3 style="margin:0.35rem 0 0;font-size:var(--text-lg);color:var(--ink-primary);">
                            {{ res.circuit?.nomCircuit || res.evenement?.nomEvenement || ('Réservation #' + res.id) }}
                          </h3>
                        </div>
                        <a [routerLink]="['/reservations', res.id]" class="btn-detail-sm">
                          Consulter la fiche complète
                        </a>
                      </div>

                      <app-ui-ticket-view
                        [billets]="ticketsByReservation()[res.id] || []"
                        [loading]="loadingBillets()"
                      />
                    </article>
                  }
                </div>
              }
            </section>
          }

          @if (activeTab() === 'paiements') {
            <section class="account-card" aria-labelledby="tx-heading">
              <div class="account-card__header">
                <h2 id="tx-heading" class="account-card__title">
                  <svg lucideCreditCard [size]="18" aria-hidden="true"></svg>
                  <span>Transactions simulées ({{ paiements().length }})</span>
                </h2>
              </div>
              <p class="ui-sim-banner" style="margin-bottom: 0.9rem;">
                Mode simulation pédagogique Wave / Orange Money — aucun débit réel.
              </p>
              @if (paiements().length === 0) {
                <p class="sidebar-muted">
                  Aucune transaction simulée enregistrée pour le moment.
                </p>
              } @else {
                <ul class="notif-list">
                  @for (p of paiements(); track p.id) {
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
                        {{ p.modePaiement }} · Réservation {{ p.reservationId }}
                        · <a [routerLink]="['/paiements', p.reservationId]">Reçu &amp; simulation</a>
                        · <a [routerLink]="['/reservations', p.reservationId]">Fiche réservation</a>
                      </p>
                    </li>
                  }
                </ul>
              }
            </section>
          }

          @if (activeTab() === 'avis') {
            <section class="account-card" aria-labelledby="avis-heading">
              <div class="account-card__header">
                <h2 id="avis-heading" class="account-card__title">
                  <svg lucideStar [size]="18" aria-hidden="true"></svg>
                  <span>Mes avis &amp; évaluations vérifiées ({{ mesAvis().length }})</span>
                </h2>
              </div>

              @if (mesAvis().length === 0) {
                <p class="sidebar-muted">
                  Vous n’avez pas encore déposé d’avis. Après une réservation confirmée, rendez-vous
                  sur la fiche du site, circuit ou guide concerné.
                </p>
              } @else {
                <ul class="notif-list">
                  @for (a of mesAvis(); track a.id) {
                    <li class="notif-item">
                      <div class="notif-item__top">
                        <span class="ui-badge ui-badge--ochre">{{ a.cibleType }} · {{ a.note }}/5</span>
                        <span [class]="moderationBadge(a.statutModeration)">
                          {{ formatModerationLabel(a.statutModeration) }}
                        </span>
                      </div>
                      @if (a.cibleNom) {
                        <p class="notif-item__subject">{{ a.cibleNom }}</p>
                      }
                      <p class="notif-item__body">{{ a.commentaire }}</p>
                      @if (a.motifModeration) {
                        <p class="notif-item__date" style="margin-top: 0.35rem;">
                          Note modération : {{ a.motifModeration }}
                        </p>
                      }
                    </li>
                  }
                </ul>
              }
            </section>
          }

          @if (activeTab() === 'notifications') {
            <section class="account-card" aria-labelledby="notif-heading">
              <div class="account-card__header" style="display:flex;justify-content:space-between;align-items:center;">
                <h2 id="notif-heading" class="account-card__title">
                  <svg lucideBell [size]="18" aria-hidden="true"></svg>
                  <span>Notifications reçues ({{ myNotifications().length }})</span>
                </h2>
                <a routerLink="/notifications" class="btn-detail-sm">Ouvrir le centre complet</a>
              </div>

              @if (myNotifications().length === 0) {
                <p class="sidebar-muted">
                  Aucune notification enregistrée pour votre compte pour le moment.
                </p>
              } @else {
                <ul class="notif-list">
                  @for (n of myNotifications(); track n.id) {
                    <li class="notif-item">
                      <div class="notif-item__top">
                        <span class="ui-badge" [class.ui-badge--terracotta]="!n.lue" [class.ui-badge--success]="n.lue">
                          {{ formatEventLabel(n.typeEvenement) }}
                        </span>
                        <span class="notif-item__date">{{ n.dateEnvoi | dateFr }}</span>
                      </div>
                      <p class="notif-item__subject">{{ n.sujet }}</p>
                      <p class="notif-item__body">{{ n.contenu }}</p>
                    </li>
                  }
                </ul>
              }
            </section>
          }

          @if (activeTab() === 'profil') {
            <section class="account-card" aria-labelledby="profile-heading">
              <div class="account-card__header">
                <h2 id="profile-heading" class="account-card__title">
                  <svg lucideUser [size]="18" aria-hidden="true"></svg>
                  <span>Mes informations personnelles</span>
                </h2>
              </div>

              <app-ui-error-banner
                title="Impossible de mettre à jour le profil"
                [message]="profileError()"
              />

              <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="profile-form" novalidate>
                <div class="profile-grid">
                  <div class="profile-field">
                    <label for="prof-prenom" class="profile-label">Prénom *</label>
                    <input
                      id="prof-prenom"
                      type="text"
                      formControlName="prenom"
                      class="profile-input"
                    />
                    @if (profileForm.controls.prenom.invalid && profileForm.controls.prenom.touched) {
                      <span class="profile-error">Le prénom est requis (2 caractères min).</span>
                    }
                  </div>

                  <div class="profile-field">
                    <label for="prof-nom" class="profile-label">Nom *</label>
                    <input
                      id="prof-nom"
                      type="text"
                      formControlName="nom"
                      class="profile-input"
                    />
                    @if (profileForm.controls.nom.invalid && profileForm.controls.nom.touched) {
                      <span class="profile-error">Le nom est requis (2 caractères min).</span>
                    }
                  </div>
                </div>

                <div class="profile-grid">
                  <div class="profile-field">
                    <label for="prof-email" class="profile-label">Adresse e-mail *</label>
                    <input
                      id="prof-email"
                      type="email"
                      formControlName="email"
                      class="profile-input"
                    />
                    @if (profileForm.controls.email.invalid && profileForm.controls.email.touched) {
                      <span class="profile-error">Saisissez une adresse e-mail valide.</span>
                    }
                  </div>

                  <div class="profile-field">
                    <label for="prof-tel" class="profile-label">Téléphone</label>
                    <input
                      id="prof-tel"
                      type="tel"
                      formControlName="telephone"
                      placeholder="+221 77 000 00 00"
                      class="profile-input"
                    />
                  </div>
                </div>

                <div class="profile-field">
                  <label for="prof-pwd" class="profile-label">
                    Nouveau mot de passe (optionnel — laisser vide pour conserver l’actuel)
                  </label>
                  <input
                    id="prof-pwd"
                    type="password"
                    formControlName="motDePasse"
                    autocomplete="new-password"
                    class="profile-input"
                    placeholder="Minimum 6 caractères si modification"
                  />
                  @if (profileForm.controls.motDePasse.invalid && profileForm.controls.motDePasse.touched) {
                    <span class="profile-error">
                      Le nouveau mot de passe doit contenir au moins 6 caractères.
                    </span>
                  }
                </div>

                <div class="profile-actions">
                  <button
                    type="submit"
                    class="btn-primary"
                    [disabled]="savingProfile()"
                  >
                    {{ savingProfile() ? 'Enregistrement...' : 'Enregistrer mes modifications' }}
                  </button>
                </div>
              </form>
            </section>
          }
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
      gap: var(--space-5);
      padding: var(--space-6);
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-sm);
      margin-bottom: var(--space-6);
    }

    .account-hero__identity {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .account-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background-color: var(--brand-primary);
      color: var(--ink-on-dark);
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 700;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .account-hero__badges {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-1);
    }

    .account-hero__name {
      font-size: var(--text-xl);
      margin: 0 0 0.15rem;
    }

    .account-hero__meta {
      font-size: var(--text-sm);
      color: var(--ink-secondary);
      margin: 0;
    }

    .account-hero__actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .account-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-5);
    }

    .account-tab {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 0.6rem 1rem;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-strong);
      background-color: var(--surface-elevated);
      color: var(--ink-secondary);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: 700;
      cursor: pointer;
    }

    .account-tab--active {
      background-color: var(--brand-primary);
      border-color: var(--brand-primary);
      color: var(--ink-on-dark);
    }

    .btn-primary,
    .btn-admin,
    .btn-logout,
    .btn-detail-sm {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 0.58rem 1.05rem;
      border-radius: var(--radius-pill);
      font-size: var(--text-sm);
      font-weight: 700;
      cursor: pointer;
      font-family: var(--font-sans);
      text-decoration: none;
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

    .btn-detail-sm {
      padding: 0.45rem 0.85rem;
      background-color: var(--surface-sand);
      color: var(--ink-primary);
      border: 1px solid var(--border-strong);
      font-size: var(--text-xs);
    }

    .btn-tickets-sm {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.85rem;
      background-color: var(--brand-primary);
      color: #ffffff;
      border: 1px solid var(--brand-primary);
      border-radius: var(--radius-pill);
      font-size: var(--text-xs);
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
    }

    .btn-logout {
      background-color: var(--surface-sand);
      color: var(--danger);
      border: 1px solid rgba(166, 44, 44, 0.25);
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
      margin: 0;
    }

    .res-stack,
    .notif-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      list-style: none;
      margin: 0;
      padding: 0;
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
      margin: 0 0 0.2rem;
    }

    .res-title-link {
      color: var(--ink-primary);
      text-decoration: none;
    }

    .res-title-link:hover {
      color: var(--brand-primary);
      text-decoration: underline;
    }

    .res-row__meta {
      font-size: var(--text-sm);
      color: var(--ink-secondary);
      margin: 0;
    }

    .res-row__pay {
      display: flex;
      flex-wrap: wrap;
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

    .notif-item {
      padding: var(--space-4);
      border-radius: var(--radius-md);
      background-color: var(--surface-sand);
      border: 1px solid var(--border-subtle);
    }

    .notif-item__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.3rem;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .notif-item__date {
      font-size: var(--text-xs);
      color: var(--ink-muted);
    }

    .notif-item__subject {
      font-size: var(--text-sm);
      font-weight: 700;
      color: var(--ink-primary);
      margin: 0 0 0.2rem;
    }

    .notif-item__body {
      font-size: var(--text-xs);
      color: var(--ink-secondary);
      line-height: 1.5;
      margin: 0;
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
      margin: 0;
    }

    .btn-cancel-sm {
      padding: 0.45rem 0.8rem;
      border-radius: var(--radius-pill);
      border: 1px solid var(--status-error-border);
      background: var(--status-error-bg);
      color: var(--status-error-ink);
      font-size: var(--text-xs);
      font-weight: 700;
      cursor: pointer;
    }

    .profile-form {
      display: grid;
      gap: var(--space-4);
      max-width: 720px;
    }

    .profile-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-4);
    }

    @media (max-width: 680px) {
      .profile-grid {
        grid-template-columns: 1fr;
      }
    }

    .profile-field {
      display: grid;
      gap: var(--space-1);
    }

    .profile-label {
      font-size: var(--text-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--ink-muted);
    }

    .profile-input {
      padding: 0.65rem 0.85rem;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: var(--text-sm);
      background-color: var(--surface-canvas);
      color: var(--ink-primary);
    }

    .profile-error {
      font-size: var(--text-xs);
      color: var(--danger);
      font-weight: 600;
    }
  `,
})
export class AccountPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);
  private readonly seo = inject(SeoService);
  protected readonly authStore = inject(AuthStore);
  protected readonly reservationStore = inject(ReservationStore);
  protected readonly paiementStore = inject(PaiementStore);
  private readonly notifApi = inject(NotificationApiService);
  private readonly notifStore = inject(NotificationStore);
  private readonly avisApi = inject(AvisApiService);
  private readonly billetApi = inject(BilletApiService);

  protected readonly activeTab = signal<AccountTab>('reservations');
  protected readonly paiements = computed(() => this.paiementStore.items());
  protected readonly notifications = signal<NotificationItem[]>([]);
  protected readonly mesAvis = signal<Avis[]>([]);
  protected readonly payingId = signal<number | null>(null);
  protected readonly savingProfile = signal<boolean>(false);
  protected readonly profileError = signal<string | null>(null);
  protected readonly selectedModes = signal<Record<number, ModePaiement>>({});
  protected readonly ticketsByReservation = signal<Record<number, Billet[]>>({});
  protected readonly loadingBillets = signal(false);

  protected readonly formatReservationStatusLabel = formatReservationStatusLabel;
  protected readonly reservationStatusBadgeClass = reservationStatusBadgeClass;
  protected readonly formatPaiementStatusLabel = formatPaiementStatusLabel;
  protected readonly paiementStatusBadgeClass = paiementStatusBadgeClass;
  protected readonly formatEventLabel = formatNotificationEventLabel;
  protected readonly formatModerationLabel = formatModerationStatusLabel;
  protected readonly moderationBadge = moderationBadgeClass;

  protected readonly profileForm = this.fb.nonNullable.group({
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    nom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    telephone: [''],
    motDePasse: ['', [Validators.minLength(6)]],
  });

  protected readonly myReservations = computed(() => {
    const user = this.authStore.user();
    const email = user?.email?.toLowerCase();
    const all = this.reservationStore.items();
    if (!email) return [];
    return all.filter(
      (r) =>
        (user?.id != null && r.utilisateurId === user.id) ||
        r.emailClient?.toLowerCase() === email
    );
  });

  protected readonly confirmedReservations = computed(() => {
    return this.myReservations().filter((r) => r.statut === 'CONFIRMEE');
  });

  protected readonly nextVisit = computed<Reservation | null>(() => {
    const list = this.confirmedReservations();
    return list.length > 0 ? list[0] : null;
  });

  protected readonly myNotifications = computed(() => this.notifications());

  ngOnInit(): void {
    this.seo.update({
      title: 'Mon Espace Personnel',
      description: 'Gérez vos réservations, paiements simulés, avis et coordonnées personnelles.',
      canonicalPath: '/mon-espace',
    });
    this.syncProfileForm();
    void this.reservationStore.reload();
    void this.loadTransactionsAndNotifications();
  }

  protected openBilletsTab(): void {
    this.activeTab.set('billets');
    void this.loadConfirmedTickets();
  }

  protected async loadConfirmedTickets(): Promise<void> {
    const list = this.confirmedReservations();
    if (list.length === 0) return;
    this.loadingBillets.set(true);
    try {
      const results = await Promise.all(
        list.map(async (r) => {
          try {
            const b = await firstValueFrom(this.billetApi.getBillets(r.id));
            return { id: r.id, billets: b };
          } catch {
            return { id: r.id, billets: [] as Billet[] };
          }
        })
      );
      const map: Record<number, Billet[]> = {};
      for (const res of results) {
        map[res.id] = res.billets;
      }
      this.ticketsByReservation.set(map);
    } finally {
      this.loadingBillets.set(false);
    }
  }

  protected openProfileTab(): void {
    this.syncProfileForm();
    this.profileError.set(null);
    this.activeTab.set('profil');
  }

  protected async saveProfile(): Promise<void> {
    const user = this.authStore.user();
    if (!user) return;

    this.profileError.set(null);
    const pwdCtrl = this.profileForm.controls.motDePasse;
    if (!pwdCtrl.value.trim()) {
      pwdCtrl.setErrors(null);
    }
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const raw = this.profileForm.getRawValue();
    this.savingProfile.set(true);
    try {
      await this.authStore.updateUser(user.id, {
        prenom: raw.prenom.trim(),
        nom: raw.nom.trim(),
        email: raw.email.trim(),
        telephone: raw.telephone.trim() || null,
        ...(raw.motDePasse.trim() ? { motDePasse: raw.motDePasse.trim() } : {}),
      });
      this.profileForm.patchValue({ motDePasse: '' });
      toast.success('Vos informations personnelles ont été enregistrées.');
    } catch (err) {
      this.profileError.set(extractErrorMessage(err));
    } finally {
      this.savingProfile.set(false);
    }
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
      toast.success(`Réservation ${reservationId} prête pour paiement.`);
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

  private syncProfileForm(): void {
    const u = this.authStore.user();
    if (!u) return;
    this.profileForm.patchValue({
      prenom: u.prenom ?? '',
      nom: u.nom ?? '',
      email: u.email ?? '',
      telephone: u.telephone ?? '',
      motDePasse: '',
    });
  }

  private async loadTransactionsAndNotifications(): Promise<void> {
    await this.paiementStore.reload();
    const [notifPage, avis] = await Promise.all([
      firstValueFrom(this.notifApi.getMesNotifications(0, 15)).catch(() => null),
      firstValueFrom(this.avisApi.getMesAvis()).catch(() => []),
    ]);
    if (notifPage) {
      this.notifications.set(notifPage.content ?? []);
      this.notifStore.setUnreadCount(notifPage.unreadCount ?? 0);
    }
    this.mesAvis.set(avis ?? []);
  }
}
