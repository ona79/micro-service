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
  LucideChevronDown,
  LucideChevronRight,
  LucideCreditCard,
  LucideEye,
  LucideLogOut,
  LucideMoreHorizontal,
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
import { UiModalComponent } from '../../../../shared/components/ui-modal/ui-modal.component';
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
    UiModalComponent,
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
    LucideChevronDown,
    LucideChevronRight,
    LucideMoreHorizontal,
  ],
  template: `
    <div class="account-page">
      <div class="account-shell">
        @if (authStore.user(); as currentUser) {
          <header class="account-hero">
            <div class="account-hero__identity">
              <div class="account-avatar" aria-hidden="true">
                {{ authStore.initials() }}
              </div>
              <div class="account-hero__info">
                <div class="account-hero__title-row">
                  <h1 class="account-hero__name">
                    {{ currentUser.prenom }} {{ currentUser.nom }}
                  </h1>
                  <span class="ui-badge ui-badge--terracotta">{{ authStore.roleLabel() }}</span>
                </div>
                <p class="account-hero__meta">
                  {{ currentUser.email }}
                  @if (currentUser.telephone) {
                    <span> · {{ currentUser.telephone }}</span>
                  }
                </p>
              </div>
            </div>

            @if (nextVisit(); as next) {
              <div class="next-visit-inline">
                <div class="next-visit-inline__text">
                  <span class="next-visit-inline__label">Prochaine visite</span>
                  <strong class="next-visit-inline__title" [title]="next.circuit?.nomCircuit || next.evenement?.nomEvenement || ('Réservation n° ' + next.id)">
                    {{ next.circuit?.nomCircuit || next.evenement?.nomEvenement || ('Réservation n° ' + next.id) }}
                  </strong>
                  <span class="next-visit-inline__date">
                    @if (next.datePrestation) {
                      {{ next.datePrestation | dateFr: 'date' }}
                    } @else {
                      {{ next.dateReservation | dateFr }}
                    }
                    · {{ next.nombrePlaces }} pl.
                  </span>
                </div>
                <button
                  type="button"
                  class="btn-qr-inline"
                  (click)="openBilletsTab()"
                >
                  <svg lucideTicket [size]="15" aria-hidden="true"></svg>
                  <span>Afficher mes billets QR</span>
                </button>
              </div>
            }

            <div class="account-hero__actions">
              @if (authStore.isBackOfficeRole()) {
                <a routerLink="/pro/tableau-de-bord" class="btn-admin">
                  <svg lucideShieldCheck [size]="15" aria-hidden="true"></svg>
                  <span>Espace Pro</span>
                </a>
              }
              <a routerLink="/reserver" class="btn-primary">
                <svg lucideTicket [size]="15" aria-hidden="true"></svg>
                <span>Nouvelle réservation</span>
              </a>
              <button type="button" class="btn-logout" (click)="onLogout()">
                <svg lucideLogOut [size]="15" aria-hidden="true"></svg>
                <span>Déconnexion</span>
              </button>
            </div>
          </header>

          <nav class="account-tabs" role="tablist" aria-label="Sections de mon espace personnel">
            <button
              type="button"
              role="tab"
              class="account-tab"
              [class.account-tab--active]="activeTab() === 'reservations'"
              [attr.aria-selected]="activeTab() === 'reservations'"
              (click)="activeTab.set('reservations')"
            >
              <span>Réservations</span>
              <span class="tab-count">{{ myReservations().length }}</span>
            </button>
            <button
              type="button"
              role="tab"
              class="account-tab"
              [class.account-tab--active]="activeTab() === 'billets'"
              [attr.aria-selected]="activeTab() === 'billets'"
              (click)="openBilletsTab()"
            >
              <span>Billets QR</span>
              <span class="tab-count">{{ confirmedReservations().length }}</span>
            </button>
            <button
              type="button"
              role="tab"
              class="account-tab"
              [class.account-tab--active]="activeTab() === 'paiements'"
              [attr.aria-selected]="activeTab() === 'paiements'"
              (click)="activeTab.set('paiements')"
            >
              <span>Paiements</span>
              <span class="tab-count">{{ paiements().length }}</span>
            </button>
            <button
              type="button"
              role="tab"
              class="account-tab"
              [class.account-tab--active]="activeTab() === 'avis'"
              [attr.aria-selected]="activeTab() === 'avis'"
              (click)="activeTab.set('avis')"
            >
              <span>Mes avis</span>
              <span class="tab-count">{{ mesAvis().length }}</span>
            </button>
            <button
              type="button"
              role="tab"
              class="account-tab"
              [class.account-tab--active]="activeTab() === 'notifications'"
              [attr.aria-selected]="activeTab() === 'notifications'"
              (click)="activeTab.set('notifications')"
            >
              <span>Notifications</span>
              <span class="tab-count">{{ myNotifications().length }}</span>
            </button>
            <button
              type="button"
              role="tab"
              class="account-tab"
              [class.account-tab--active]="activeTab() === 'profil'"
              [attr.aria-selected]="activeTab() === 'profil'"
              (click)="openProfileTab()"
            >
              <span>Profil</span>
            </button>
          </nav>

          @if (activeTab() === 'reservations') {
            <section class="account-card" aria-labelledby="my-res-heading">
              <div class="account-card__header">
                <h2 id="my-res-heading" class="account-card__title">
                  <span>Mes réservations</span>
                </h2>
              </div>

              @if (myReservations().length === 0) {
                <div class="empty-box">
                  <p>Aucune réservation associée à l’adresse {{ currentUser.email }}.</p>
                  <a routerLink="/reserver" class="btn-primary">Réserver un circuit ou événement</a>
                </div>
              } @else {
                <div class="bo-table-wrap">
                  <table class="bo-table res-compact-table">
                    <thead>
                      <tr>
                        <th>Référence</th>
                        <th>Prestation</th>
                        <th>Date</th>
                        <th>Places</th>
                        <th>Montant</th>
                        <th>Statut</th>
                        <th style="text-align:right;">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (res of pagedReservations(); track res.id) {
                        @let resTitle = res.circuit?.nomCircuit || res.evenement?.nomEvenement || (res.typeReservation === 'CIRCUIT' ? 'Circuit n° ' + res.circuitId : 'Événement n° ' + res.evenementId);
                        <tr>
                          <td class="cell-nowrap tabular-nums" [title]="res.referenceReservation || ('n° ' + res.id)">
                            <a [routerLink]="['/reservations', res.id]" class="res-title-link">
                              {{ res.referenceReservation || ('n° ' + res.id) }}
                            </a>
                          </td>
                          <td class="cell-ellipsis" [title]="resTitle">{{ resTitle }}</td>
                          <td class="cell-nowrap">{{ (res.datePrestation || res.dateReservation) | dateFr: 'date' }}</td>
                          <td class="cell-nowrap tabular-nums">{{ res.nombrePlaces }} pl.</td>
                          <td class="cell-nowrap tabular-nums"><strong>{{ res.montantTotal | fcfaPrice }}</strong></td>
                          <td class="cell-nowrap">
                            <span [class]="reservationStatusBadgeClass(res.statut)">
                              {{ formatReservationStatusLabel(res.statut) }}
                            </span>
                          </td>
                          <td class="cell-nowrap" style="text-align:right;">
                            <div class="bo-actions-cell" style="justify-content:flex-end;">
                              @if (res.statut === 'EN_ATTENTE_PAIEMENT') {
                                <button
                                  type="button"
                                  class="bo-btn bo-btn--sm bo-btn--primary"
                                  [disabled]="payingId() === res.id"
                                  (click)="startSimulatedCheckout(res)"
                                >
                                  {{ payingId() === res.id ? 'Ouverture...' : 'Régler' }}
                                </button>
                              } @else if (res.statut === 'BROUILLON') {
                                <button
                                  type="button"
                                  class="bo-btn bo-btn--sm bo-btn--primary"
                                  (click)="submitDraft(res.id)"
                                >
                                  Soumettre
                                </button>
                              } @else if (res.statut === 'CONFIRMEE') {
                                <button
                                  type="button"
                                  class="bo-btn bo-btn--sm bo-btn--primary"
                                  (click)="openTicketForReservation(res.id)"
                                >
                                  Billets QR
                                </button>
                              } @else {
                                <a [routerLink]="['/reservations', res.id]" class="bo-btn bo-btn--sm">
                                  Détail
                                </a>
                              }

                              <div class="bo-row-menu">
                                <button
                                  type="button"
                                  class="bo-btn bo-btn--sm bo-btn--icon"
                                  aria-label="Plus d'actions"
                                  (click)="toggleRowMenu(res.id)"
                                >
                                  <svg lucideMoreHorizontal [size]="15" aria-hidden="true"></svg>
                                </button>
                                @if (openMenuId() === res.id) {
                                  <div class="bo-row-menu__dropdown" role="menu">
                                    <a [routerLink]="['/reservations', res.id]" class="bo-row-menu__item" role="menuitem" (click)="openMenuId.set(null)">
                                      Détail
                                    </a>
                                    <a [routerLink]="['/paiements', res.id]" class="bo-row-menu__item" role="menuitem" (click)="openMenuId.set(null)">
                                      Suivi paiement
                                    </a>
                                    @if (canCancel(res)) {
                                      <button
                                        type="button"
                                        class="bo-row-menu__item bo-row-menu__item--danger"
                                        role="menuitem"
                                        [disabled]="reservationStore.cancelingId() === res.id"
                                        (click)="openMenuId.set(null); confirmCancel(res)"
                                      >
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

                @if (myReservations().length > resPageSize) {
                  <div class="res-pagination">
                    <span class="res-pagination__info">
                      Affichage {{ resStartIndex() }}–{{ resEndIndex() }} sur {{ myReservations().length }}
                    </span>
                    <div class="res-pagination__btns">
                      <button
                        type="button"
                        class="bo-btn bo-btn--sm"
                        [disabled]="resPage() === 0"
                        (click)="resPage.set(resPage() - 1)"
                      >
                        Précédent
                      </button>
                      <button
                        type="button"
                        class="bo-btn bo-btn--sm"
                        [disabled]="resEndIndex() >= myReservations().length"
                        (click)="resPage.set(resPage() + 1)"
                      >
                        Suivant
                      </button>
                    </div>
                  </div>
                }
              }
            </section>
          }

          @if (activeTab() === 'billets') {
            <section class="account-card" aria-labelledby="billets-heading">
              <div class="account-card__header">
                <h2 id="billets-heading" class="account-card__title">
                  <span>Mes billets électroniques &amp; QR Codes</span>
                </h2>
              </div>

              @if (confirmedReservations().length === 0) {
                <div class="empty-box">
                  <p>Aucun billet électronique actif. Vos billets et QR codes d'accès apparaîtront ici dès confirmation de votre réservation.</p>
                  <a routerLink="/reserver" class="btn-primary">Réserver un circuit ou événement</a>
                </div>
              } @else {
                <div class="tickets-accordion">
                  @for (res of confirmedReservations(); track res.id) {
                    @let isExpanded = expandedTicketResId() === res.id;
                    <article class="ticket-group-card">
                      <button
                        type="button"
                        class="ticket-group-header"
                        [attr.aria-expanded]="isExpanded"
                        (click)="toggleTicketGroup(res.id)"
                      >
                        <div class="ticket-group-header__left">
                          @if (isExpanded) {
                            <svg lucideChevronDown [size]="16" aria-hidden="true"></svg>
                          } @else {
                            <svg lucideChevronRight [size]="16" aria-hidden="true"></svg>
                          }
                          <span class="ui-badge ui-badge--neutral">{{ res.referenceReservation || ('n° ' + res.id) }}</span>
                          <strong class="ticket-group-title">
                            {{ res.circuit?.nomCircuit || res.evenement?.nomEvenement || ('Réservation n° ' + res.id) }}
                          </strong>
                        </div>
                        <div class="ticket-group-header__right">
                          <span class="ticket-group-meta">{{ res.nombrePlaces }} billet(s) · {{ (res.datePrestation || res.dateReservation) | dateFr: 'date' }}</span>
                          <span class="ui-badge ui-badge--success">{{ isExpanded ? 'Masquer QR' : 'Afficher QR' }}</span>
                        </div>
                      </button>

                      @if (isExpanded) {
                        <div class="ticket-group-body">
                          <app-ui-ticket-view
                            [billets]="ticketsByReservation()[res.id] || []"
                            [loading]="loadingBillets()"
                          />
                        </div>
                      }
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
              <div class="account-card__header" style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);">
                <h2 id="profile-heading" class="account-card__title">
                  <svg lucideUser [size]="18" aria-hidden="true"></svg>
                  <span>Mes informations personnelles</span>
                </h2>
                <button type="button" class="bo-btn bo-btn--primary" (click)="editProfileOpen.set(true)">
                  Modifier
                </button>
              </div>

              @if (authStore.user(); as u) {
                <dl class="bo-kv-list">
                  <div class="bo-kv-row"><dt>Prénom</dt><dd>{{ u.prenom }}</dd></div>
                  <div class="bo-kv-row"><dt>Nom</dt><dd>{{ u.nom }}</dd></div>
                  <div class="bo-kv-row"><dt>Adresse e-mail</dt><dd>{{ u.email }}</dd></div>
                  <div class="bo-kv-row"><dt>Téléphone</dt><dd>{{ u.telephone || '—' }}</dd></div>
                  <div class="bo-kv-row"><dt>Rôle</dt><dd>{{ authStore.roleLabel() }}</dd></div>
                </dl>
              }

              <app-ui-modal
                [open]="editProfileOpen()"
                title="Modifier mes coordonnées"
                [showFooter]="false"
                (closed)="editProfileOpen.set(false)"
              >
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

                <div class="profile-actions" style="display: flex; gap: var(--space-2); justify-content: flex-end;">
                  <button type="button" class="bo-btn" (click)="editProfileOpen.set(false)">Annuler</button>
                  <button
                    type="submit"
                    class="btn-primary"
                    [disabled]="savingProfile()"
                  >
                    {{ savingProfile() ? 'Enregistrement...' : 'Enregistrer mes modifications' }}
                  </button>
                </div>
              </form>
              </app-ui-modal>
            </section>
          }
        }
      </div>
    </div>
  `,
  styles: `
    .account-page {
      width: 100%;
    }

    .account-shell {
      width: 100%;
      max-width: 100%;
      padding: 20px 24px;
    }

    .account-hero {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 14px 20px;
      padding: 14px 18px;
      min-height: 92px;
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      margin-bottom: 16px;
    }

    .account-hero__identity {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .account-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background-color: var(--brand-primary);
      color: var(--ink-on-dark);
      font-family: var(--font-sans);
      font-size: 15px;
      font-weight: 700;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .account-hero__title-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .account-hero__name {
      font-family: var(--font-sans);
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    .account-hero__meta {
      font-size: 13px;
      color: var(--ink-secondary);
      margin: 2px 0 0;
    }

    .next-visit-inline {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 10px;
      background-color: var(--brand-soft);
      border: 1px solid rgba(36, 91, 70, 0.2);
      flex-wrap: wrap;
    }

    .next-visit-inline__text {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 4px 8px;
      font-size: 13px;
    }

    .next-visit-inline__label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--brand-primary);
    }

    .next-visit-inline__title {
      color: var(--ink-primary);
      max-width: 240px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .next-visit-inline__date {
      font-size: 12px;
      color: var(--ink-secondary);
    }

    .btn-qr-inline {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 34px;
      padding: 0 12px;
      border-radius: 8px;
      border: none;
      background-color: var(--brand-primary);
      color: #ffffff;
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
    }

    .btn-qr-inline:hover {
      background-color: var(--brand-primary-hover);
    }

    .account-hero__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .account-tabs {
      display: flex;
      flex-wrap: nowrap;
      overflow-x: auto;
      gap: 20px;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 16px;
    }

    .account-tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 2px;
      border: none;
      border-bottom: 2px solid transparent;
      background: transparent;
      color: var(--ink-secondary);
      font-family: var(--font-sans);
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      margin-bottom: -1px;
    }

    .account-tab:hover {
      color: var(--ink-primary);
    }

    .account-tab--active {
      color: var(--brand-primary);
      border-bottom-color: var(--brand-primary);
    }

    .tab-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 999px;
      background-color: var(--surface-sand);
      color: var(--ink-secondary);
      font-size: 11px;
      font-weight: 700;
    }

    .account-tab--active .tab-count {
      background-color: var(--brand-soft);
      color: var(--brand-primary);
    }

    .btn-primary,
    .btn-admin,
    .btn-logout,
    .btn-detail-sm {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      height: 36px;
      padding: 0 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: var(--font-sans);
      text-decoration: none;
      white-space: nowrap;
    }

    .btn-primary {
      background-color: var(--brand-primary);
      color: var(--ink-on-dark);
      border: none;
    }

    .btn-admin {
      background-color: var(--surface-elevated);
      color: var(--ink-primary);
      border: 1px solid var(--border-strong);
    }

    .btn-detail-sm {
      height: 32px;
      padding: 0 10px;
      background-color: var(--surface-sand);
      color: var(--ink-primary);
      border: 1px solid var(--border-strong);
      font-size: 12px;
    }

    .btn-logout {
      background-color: transparent;
      color: var(--danger);
      border: 1px solid rgba(166, 44, 44, 0.28);
    }

    .account-card {
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: var(--shadow-xs);
    }

    .account-card__header {
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .account-card__title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-sans);
      font-size: 16px;
      font-weight: 600;
      color: var(--ink-primary);
      margin: 0;
    }

    .res-compact-table td {
      height: 44px;
      max-height: 44px;
      padding-top: 6px;
      padding-bottom: 6px;
      vertical-align: middle;
    }

    .cell-nowrap {
      white-space: nowrap;
    }

    .cell-ellipsis {
      max-width: 260px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .res-pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 12px;
      font-size: 13px;
      color: var(--ink-secondary);
    }

    .res-pagination__btns {
      display: flex;
      gap: 8px;
    }

    .tickets-accordion {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ticket-group-card {
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      background-color: var(--surface-elevated);
      overflow: hidden;
    }

    .ticket-group-header {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border: none;
      background: transparent;
      cursor: pointer;
      text-align: left;
      font-family: var(--font-sans);
      flex-wrap: wrap;
    }

    .ticket-group-header:hover {
      background-color: var(--surface-canvas);
    }

    .ticket-group-header__left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .ticket-group-title {
      font-size: 14px;
      color: var(--ink-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 340px;
    }

    .ticket-group-header__right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .ticket-group-meta {
      font-size: 12px;
      color: var(--ink-secondary);
      white-space: nowrap;
    }

    .ticket-group-body {
      padding: 14px;
      border-top: 1px solid var(--border-subtle);
      background-color: var(--surface-canvas);
    }

    @media (max-width: 767px) {
      .account-shell {
        padding: 16px;
      }

      .account-hero {
        padding: 12px 14px;
      }
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
  protected readonly editProfileOpen = signal<boolean>(false);
  protected readonly savingProfile = signal<boolean>(false);
  protected readonly profileError = signal<string | null>(null);
  protected readonly selectedModes = signal<Record<number, ModePaiement>>({});
  protected readonly ticketsByReservation = signal<Record<number, Billet[]>>({});
  protected readonly loadingBillets = signal(false);
  protected readonly resPage = signal(0);
  protected readonly resPageSize = 20;
  protected readonly openMenuId = signal<number | null>(null);
  protected readonly expandedTicketResId = signal<number | null>(null);

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

  protected readonly pagedReservations = computed(() => {
    const start = this.resPage() * this.resPageSize;
    return this.myReservations().slice(start, start + this.resPageSize);
  });

  protected readonly resStartIndex = computed(() =>
    this.myReservations().length === 0 ? 0 : this.resPage() * this.resPageSize + 1
  );

  protected readonly resEndIndex = computed(() =>
    Math.min((this.resPage() + 1) * this.resPageSize, this.myReservations().length)
  );

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

  protected openTicketForReservation(resId: number): void {
    this.expandedTicketResId.set(resId);
    this.openBilletsTab();
  }

  protected toggleTicketGroup(resId: number): void {
    this.expandedTicketResId.update((curr) => (curr === resId ? null : resId));
  }

  protected toggleRowMenu(resId: number): void {
    this.openMenuId.update((curr) => (curr === resId ? null : resId));
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
        title: `Annuler la réservation ${res.referenceReservation || 'n° ' + res.id} ?`,
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
