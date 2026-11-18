import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideAward,
  LucideBell,
  LucideCalendar,
  LucideCreditCard,
  LucideLandmark,
  LucideMessageSquare,
  LucidePlus,
  LucideRefreshCw,
  LucideRoute,
  LucideShieldCheck,
  LucideTicket,
  LucideTrash2,
  LucideUsers,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AuthStore, formatRoleLabel } from '../../../../core/auth/auth.store';
import { normalizeHttpError } from '../../../../core/interceptors/http-error.interceptor';
import {
  Avis,
  AvisModerationHistorique,
  CibleAvis,
  SignalementAvis,
  StatutModerationAvis,
  StatutSignalement,
  formatModerationStatusLabel,
  moderationBadgeClass,
} from '../../../../core/models/avis.model';
import {
  Circuit,
  Difficulte,
  Etape,
  MoyenTransport,
  StatutCircuit,
} from '../../../../core/models/circuit.model';
import {
  Evenement,
  StatutEvenement,
  TypeEvenement,
} from '../../../../core/models/evenement.model';
import {
  GuideHistorique,
  GuideProfil,
  StatutValidationGuide,
  formatGuideStatusLabel,
  guideStatusBadgeClass,
} from '../../../../core/models/guide.model';
import {
  NotificationItem,
  StatutNotification,
  formatNotificationEventLabel,
} from '../../../../core/models/notification.model';
import {
  ModePaiement,
  Paiement,
  PaiementStats,
  StatutPaiement,
  formatPaiementStatusLabel,
  paiementStatusBadgeClass,
} from '../../../../core/models/paiement.model';
import {
  CategoriePatrimoine,
  Patrimoine,
  StatutPublication,
  ZoneCasamance,
} from '../../../../core/models/patrimoine.model';
import {
  Reservation,
  ReservationStats,
  StatutReservation,
  TypeReservation,
  formatReservationStatusLabel,
  reservationStatusBadgeClass,
} from '../../../../core/models/reservation.model';
import { RoleUtilisateur, Utilisateur } from '../../../../core/models/utilisateur.model';
import { UiConfirmDialogComponent } from '../../../../shared/components/ui-confirm-dialog/ui-confirm-dialog.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { AvisApiService } from '../../../avis/data-access/avis-api.service';
import { CircuitApiService } from '../../../circuits/data-access/circuit-api.service';
import { CircuitStore } from '../../../circuits/data-access/circuit.store';
import { EvenementApiService } from '../../../evenements/data-access/evenement-api.service';
import { EvenementStore } from '../../../evenements/data-access/evenement.store';
import { GuideApiService } from '../../../guides/data-access/guide-api.service';
import { NotificationApiService } from '../../../notifications/data-access/notification-api.service';
import { PaiementApiService } from '../../../paiements/data-access/paiement-api.service';
import { PatrimoineApiService } from '../../../patrimoines/data-access/patrimoine-api.service';
import { PatrimoineStore } from '../../../patrimoines/data-access/patrimoine.store';
import { ReservationApiService } from '../../../reservations/data-access/reservation-api.service';

type AdminTab =
  | 'patrimoines'
  | 'circuits'
  | 'evenements'
  | 'reservations'
  | 'paiements'
  | 'guides'
  | 'moderation'
  | 'notifications'
  | 'utilisateurs';

interface EtapeFormItem {
  ordre: number;
  patrimoineId: number;
  dureeVisite: number;
  descriptionEtape: string;
  moyenTransport: MoyenTransport;
}

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    FcfaPricePipe,
    DateFrPipe,
    UiErrorBannerComponent,
    LucideLandmark,
    LucideRoute,
    LucideCalendar,
    LucideTicket,
    LucideCreditCard,
    LucideRefreshCw,
    LucideUsers,
    LucidePlus,
    LucideTrash2,
    LucideShieldCheck,
    LucideAward,
    LucideMessageSquare,
    LucideBell,
    RouterLink,
  ],
  template: `
    <div class="page-section">
      <div class="container">
        <div class="ui-sim-banner" style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div>
            <strong>ℹ Nouveau Cockpit Professionnel Unifié disponible :</strong>
            <span> Pour une expérience optimisée par rôle avec navigation latérale et fil d'Ariane, accédez au cockpit pro.</span>
          </div>
          <a routerLink="/pro/admin" class="ui-btn ui-btn--sm ui-btn--primary">Basculer vers /pro/admin &rarr;</a>
        </div>

        <header class="admin-header">
          <div>
            <div class="admin-header__badges">
              <span class="ui-badge ui-badge--terracotta">Back-Office Métier Casamance</span>
              <span class="ui-badge ui-badge--success">
                <svg lucideShieldCheck [size]="13" aria-hidden="true"></svg>
                Rôle actif : {{ authStore.roleLabel() }}
              </span>
            </div>
            <h1 class="admin-header__title">Administration du Patrimoine, des Circuits &amp; de l'Agenda</h1>
            <p class="admin-header__subtitle">
              Gérez les fiches patrimoniales, les circuits touristiques, les événements culturels
              et leur cycle de validation/publication selon vos habilitations RBAC.
            </p>
          </div>
        </header>

        <nav class="admin-tabs" aria-label="Rubriques d'administration">
          <button
            type="button"
            class="admin-tab"
            [class.admin-tab--active]="activeTab() === 'patrimoines'"
            (click)="switchTab('patrimoines')"
          >
            <svg lucideLandmark [size]="16" aria-hidden="true"></svg>
            <span>Patrimoines ({{ patrimoineStore.items().length }})</span>
          </button>

          @if (canManageOperations()) {
            <button
              type="button"
              class="admin-tab"
              [class.admin-tab--active]="activeTab() === 'circuits'"
              (click)="switchTab('circuits')"
            >
              <svg lucideRoute [size]="16" aria-hidden="true"></svg>
              <span>Circuits &amp; Inter-Services ({{ circuitStore.items().length }})</span>
            </button>

            <button
              type="button"
              class="admin-tab"
              [class.admin-tab--active]="activeTab() === 'evenements'"
              (click)="switchTab('evenements')"
            >
              <svg lucideCalendar [size]="16" aria-hidden="true"></svg>
              <span>Événements ({{ evenementStore.items().length }})</span>
            </button>

            <button
              type="button"
              class="admin-tab"
              [class.admin-tab--active]="activeTab() === 'reservations'"
              (click)="switchTab('reservations')"
            >
              <svg lucideTicket [size]="16" aria-hidden="true"></svg>
              <span>Réservations</span>
            </button>
          }

          @if (authStore.isAdmin()) {
            <button
              type="button"
              class="admin-tab"
              [class.admin-tab--active]="activeTab() === 'paiements'"
              (click)="switchTab('paiements')"
            >
              <svg lucideCreditCard [size]="16" aria-hidden="true"></svg>
              <span>Paiements Simulés</span>
            </button>
          }

          @if (canValidateGuides()) {
            <button
              type="button"
              class="admin-tab"
              [class.admin-tab--active]="activeTab() === 'guides'"
              (click)="switchTab('guides')"
            >
              <svg lucideAward [size]="16" aria-hidden="true"></svg>
              <span>Validation Guides</span>
            </button>
          }

          @if (canModerateAvis()) {
            <button
              type="button"
              class="admin-tab"
              [class.admin-tab--active]="activeTab() === 'moderation'"
              (click)="switchTab('moderation')"
            >
              <svg lucideMessageSquare [size]="16" aria-hidden="true"></svg>
              <span>Modération Avis</span>
            </button>
          }

          @if (authStore.isAdmin()) {
            <button
              type="button"
              class="admin-tab"
              [class.admin-tab--active]="activeTab() === 'notifications'"
              (click)="switchTab('notifications')"
            >
              <svg lucideBell [size]="16" aria-hidden="true"></svg>
              <span>Notifications Système</span>
            </button>
          }

          @if (authStore.isAdmin()) {
            <button
              type="button"
              class="admin-tab"
              [class.admin-tab--active]="activeTab() === 'utilisateurs'"
              (click)="switchTab('utilisateurs')"
            >
              <svg lucideUsers [size]="16" aria-hidden="true"></svg>
              <span>Gestion des utilisateurs</span>
            </button>
          }
        </nav>

        @if (actionError()) {
          <app-ui-error-banner
            title="Action refusée par le serveur"
            [message]="actionError()"
            [showRetry]="false"
          />
        }

        <!-- ONGLET 1 : PATRIMOINES -->
        @if (activeTab() === 'patrimoines') {
          <div class="admin-split">
            <section class="admin-card">
              <h2 class="admin-card__title">
                {{ editingPatrimoineId() ? 'Modifier le patrimoine #' + editingPatrimoineId() : 'Ajouter un site patrimonial de Casamance' }}
              </h2>
              <form [formGroup]="patrimoineForm" (ngSubmit)="savePatrimoine()" class="admin-form">
                <div class="form-row">
                  <div class="form-field">
                    <label for="pat-nom">Nom du site *</label>
                    <input id="pat-nom" type="text" formControlName="nomPatrimoine" class="form-input" placeholder="Ex: Mémorial du Joola" />
                  </div>
                  <div class="form-field">
                    <label for="pat-code">Code officiel *</label>
                    <input id="pat-code" type="text" formControlName="codePatrimoine" class="form-input" placeholder="Ex: PAT-ZIG-009" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="pat-cat">Catégorie *</label>
                    <select id="pat-cat" formControlName="categoriePatrimoine" class="form-input">
                      <option value="CULTUREL">Patrimoine culturel</option>
                      <option value="HISTORIQUE">Patrimoine historique</option>
                      <option value="ARCHITECTURAL">Patrimoine architectural</option>
                      <option value="NATUREL">Patrimoine naturel</option>
                      <option value="IMMATERIEL">Patrimoine immatériel</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label for="pat-zone">Zone de Casamance *</label>
                    <select id="pat-zone" formControlName="zoneGeographique" class="form-input">
                      <option value="BASSE_CASAMANCE">Basse-Casamance (Ziguinchor / Oussouye)</option>
                      <option value="MOYENNE_CASAMANCE">Moyenne-Casamance (Sédhiou)</option>
                      <option value="HAUTE_CASAMANCE">Haute-Casamance (Kolda)</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="pat-type">Typologie précise</label>
                    <input id="pat-type" type="text" formControlName="typePatrimoine" class="form-input" placeholder="Ex: Habitat vernaculaire à impluvium" />
                  </div>
                  <div class="form-field">
                    <label for="pat-loc">Commune / Localité</label>
                    <input id="pat-loc" type="text" formControlName="localite" class="form-input" placeholder="Ex: Ziguinchor, Oussouye, Sédhiou" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="pat-adr">Adresse complète *</label>
                    <input id="pat-adr" type="text" formControlName="adressePatrimoine" class="form-input" placeholder="Ex: Boucotte, Ziguinchor, Casamance" />
                  </div>
                  <div class="form-field">
                    <label for="pat-cap">Capacité d'accueil max *</label>
                    <input id="pat-cap" type="number" formControlName="capacitePatrimoine" class="form-input" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="pat-lat">Latitude GPS (-90 à 90) *</label>
                    <input id="pat-lat" type="number" step="0.0001" formControlName="latitudePatrimoine" class="form-input" />
                  </div>
                  <div class="form-field">
                    <label for="pat-lon">Longitude GPS (-180 à 180) *</label>
                    <input id="pat-lon" type="number" step="0.0001" formControlName="longitudePatrimoine" class="form-input" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="pat-horaires">Horaires d'ouverture</label>
                    <input id="pat-horaires" type="text" formControlName="horairesOuverture" class="form-input" placeholder="Ex: Mardi - Dimanche : 09h00 - 18h00" />
                  </div>
                  <div class="form-field">
                    <label for="pat-tarif">Tarif indicatif (FCFA)</label>
                    <input id="pat-tarif" type="number" formControlName="tarifEntree" class="form-input" />
                  </div>
                </div>

                <div class="form-field">
                  <label for="pat-desc">Description détaillée *</label>
                  <textarea id="pat-desc" rows="2" formControlName="descriptionPatrimoine" class="form-input"></textarea>
                </div>

                <div class="form-field">
                  <label for="pat-hist">Notice historique</label>
                  <textarea id="pat-hist" rows="2" formControlName="historiquePatrimoine" class="form-input"></textarea>
                </div>

                <div class="form-field">
                  <label for="pat-cult">Informations culturelles &amp; touristiques</label>
                  <textarea id="pat-cult" rows="2" formControlName="informationsCulturelles" class="form-input"></textarea>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="pat-prat">Informations pratiques</label>
                    <input id="pat-prat" type="text" formControlName="informationsPratiques" class="form-input" />
                  </div>
                  <div class="form-field">
                    <label for="pat-statut">Statut de publication</label>
                    <select id="pat-statut" formControlName="statutPublication" class="form-input">
                      <option value="BROUILLON">Brouillon</option>
                      <option value="SOUMIS">Soumis à validation</option>
                      <option value="PUBLIE">Publié</option>
                      <option value="ARCHIVE">Archivé</option>
                    </select>
                  </div>
                </div>

                <div class="form-actions">
                  <button type="submit" class="btn-primary">
                    <svg lucidePlus [size]="15" aria-hidden="true"></svg>
                    <span>{{ editingPatrimoineId() ? 'Enregistrer les modifications' : 'Créer le site patrimonial' }}</span>
                  </button>
                  @if (editingPatrimoineId()) {
                    <button type="button" class="btn-secondary" (click)="cancelEditPatrimoine()">Annuler</button>
                  }
                </div>
              </form>
            </section>

            <section class="admin-card">
              <h2 class="admin-card__title">Catalogue existant ({{ patrimoineStore.items().length }})</h2>
              <div class="table-wrap">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Code &amp; Statut</th>
                      <th>Nom &amp; Catégorie</th>
                      <th>Capacité</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of patrimoineStore.items(); track p.id) {
                      <tr>
                        <td>
                          <span class="ui-badge">{{ p.codePatrimoine }}</span><br />
                          <small>{{ p.statutPublication || 'PUBLIE' }}</small>
                        </td>
                        <td>
                          <strong>{{ p.nomPatrimoine }}</strong><br />
                          <small>{{ p.categoriePatrimoine || 'CULTUREL' }} · {{ p.adressePatrimoine }}</small>
                        </td>
                        <td class="tabular-nums">{{ p.capacitePatrimoine }}</td>
                        <td class="table-actions">
                          <button type="button" class="btn-xs" (click)="startEditPatrimoine(p)">Modifier</button>
                          @if (p.statutPublication !== 'PUBLIE') {
                            <button type="button" class="btn-xs" (click)="publierPatrimoine(p.id)">Publier</button>
                          }
                          @if (p.statutPublication !== 'ARCHIVE') {
                            <button type="button" class="btn-xs" (click)="archiverPatrimoine(p.id)">Archiver</button>
                          }
                          <button type="button" class="btn-xs btn-xs--danger" (click)="deletePatrimoine(p.id)">
                            <svg lucideTrash2 [size]="13" aria-hidden="true"></svg>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        }

        <!-- ONGLET 2 : CIRCUITS & COMMUNICATION INTER-SERVICES -->
        @if (activeTab() === 'circuits') {
          <div class="admin-split">
            <section class="admin-card">
              <h2 class="admin-card__title">
                {{ editingCircuitId() ? 'Modifier le circuit #' + editingCircuitId() : 'Créer un circuit touristique' }}
              </h2>
              <form [formGroup]="circuitForm" (ngSubmit)="saveCircuit()" class="admin-form">
                <div class="form-row">
                  <div class="form-field">
                    <label for="cir-nom">Titre du circuit *</label>
                    <input id="cir-nom" type="text" formControlName="nomCircuit" class="form-input" placeholder="Ex: Boucle Fluviale &amp; Culturelle du Kasa" />
                  </div>
                  <div class="form-field">
                    <label for="cir-diff">Niveau de difficulté *</label>
                    <select id="cir-diff" formControlName="difficulte" class="form-input">
                      <option value="FACILE">Facile</option>
                      <option value="MOYEN">Moyen</option>
                      <option value="DIFFICILE">Difficile</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="cir-trans">Moyen de déplacement *</label>
                    <select id="cir-trans" formControlName="moyenTransport" class="form-input">
                      <option value="MIXTE">Mixte (Terre &amp; Pirogue)</option>
                      <option value="MINIBUS">Minibus</option>
                      <option value="VEHICULE_4X4">Véhicule 4x4</option>
                      <option value="PIROGUE">Pirogue fluviale</option>
                      <option value="VELO">Vélo / VTT</option>
                      <option value="PIED">Marche à pied</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label for="cir-zone">Zone géographique *</label>
                    <select id="cir-zone" formControlName="zoneGeographique" class="form-input">
                      <option value="BASSE_CASAMANCE">Basse-Casamance</option>
                      <option value="MOYENNE_CASAMANCE">Moyenne-Casamance</option>
                      <option value="HAUTE_CASAMANCE">Haute-Casamance</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="cir-dep">Point de départ</label>
                    <input id="cir-dep" type="text" formControlName="pointDepart" class="form-input" placeholder="Ex: Ziguinchor" />
                  </div>
                  <div class="form-field">
                    <label for="cir-arr">Point d'arrivée</label>
                    <input id="cir-arr" type="text" formControlName="pointArrivee" class="form-input" placeholder="Ex: Enampore / Carabane" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="cir-places">Capacité groupe max *</label>
                    <input id="cir-places" type="number" formControlName="placesMax" class="form-input" />
                  </div>
                  <div class="form-field">
                    <label for="cir-prix">Tarif indicatif (FCFA) *</label>
                    <input id="cir-prix" type="number" formControlName="prix" class="form-input" />
                  </div>
                </div>

                <div class="form-field">
                  <label for="cir-desc">Description synthétique *</label>
                  <textarea id="cir-desc" rows="2" formControlName="descriptionCircuit" class="form-input"></textarea>
                </div>

                <div class="form-field">
                  <label for="cir-pres">Présentation touristique &amp; informations pratiques</label>
                  <textarea id="cir-pres" rows="2" formControlName="presentationTouristique" class="form-input"></textarea>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="cir-statut">Statut du circuit</label>
                    <select id="cir-statut" formControlName="statutCircuit" class="form-input">
                      <option value="BROUILLON">Brouillon</option>
                      <option value="SOUMIS">Soumis</option>
                      <option value="PUBLIE">Publié</option>
                      <option value="ARCHIVE">Archivé</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label for="cir-guide">Guide responsable validé (optionnel)</label>
                    <select id="cir-guide" formControlName="guideResponsableId" class="form-input">
                      <option [ngValue]="null">Aucun guide affecté</option>
                      @for (g of guidesCatalog(); track g.utilisateurId) {
                        <option [ngValue]="g.utilisateurId">
                          Guide #{{ g.utilisateurId }} — {{ g.prenom }} {{ g.nom }} ({{ g.zonesIntervention }})
                        </option>
                      }
                    </select>
                  </div>
                </div>

                <div class="form-field">
                  <label>Étapes ordonnées du circuit ({{ circuitEtapes().length }}) *</label>
                  @for (etape of circuitEtapes(); track $index) {
                    <div class="form-row" style="align-items:end;background:var(--surface-canvas);padding:0.5rem;border-radius:var(--radius-sm);">
                      <div class="form-field">
                        <label>Ordre #{{ etape.ordre }} — Site patrimonial</label>
                        <select
                          class="form-input"
                          [ngModel]="etape.patrimoineId"
                          [ngModelOptions]="{ standalone: true }"
                          (ngModelChange)="updateEtapePatrimoine($index, $event)"
                        >
                          @for (p of patrimoineStore.items(); track p.id) {
                            <option [ngValue]="p.id">#{{ p.id }} — {{ p.nomPatrimoine }}</option>
                          }
                        </select>
                      </div>
                      <div class="form-field">
                        <label>Durée (min)</label>
                        <div style="display:flex;gap:0.4rem;">
                          <input
                            type="number"
                            min="15"
                            step="15"
                            class="form-input"
                            [ngModel]="etape.dureeVisite"
                            [ngModelOptions]="{ standalone: true }"
                            (ngModelChange)="updateEtapeDuree($index, $event)"
                          />
                          @if (circuitEtapes().length > 1) {
                            <button type="button" class="btn-xs btn-xs--danger" (click)="removeEtape($index)">Retirer</button>
                          }
                        </div>
                      </div>
                    </div>
                  }
                  <button type="button" class="btn-secondary" style="align-self:flex-start;margin-top:0.35rem;" (click)="addEtape()">
                    + Ajouter une étape au circuit
                  </button>
                </div>

                <div class="form-actions">
                  <button type="submit" class="btn-primary">
                    <svg lucidePlus [size]="15" aria-hidden="true"></svg>
                    <span>{{ editingCircuitId() ? 'Mettre à jour le circuit' : 'Créer le circuit' }}</span>
                  </button>
                  @if (editingCircuitId()) {
                    <button type="button" class="btn-secondary" (click)="cancelEditCircuit()">Annuler</button>
                  }
                </div>
              </form>

              <hr style="margin:1.5rem 0;border:none;border-top:1px solid var(--border-subtle);" />

              <h3 class="admin-card__title">Démonstrateur de Communication Inter-Services</h3>
              <p class="card-helper">
                Testez en direct l’appel synchrone signé entre <code>ms-circuit</code> et
                <code>ms-patrimoine</code> via OpenFeign, RestTemplate ou WebClient.
              </p>

              <div class="form-row">
                <div class="form-field">
                  <label for="comm-mode">Client HTTP Spring</label>
                  <select id="comm-mode" class="form-input" [(ngModel)]="commMode">
                    <option value="feign">OpenFeign (Déclaratif)</option>
                    <option value="resttemplate">RestTemplate (Impératif)</option>
                    <option value="webclient">WebClient (Réactif)</option>
                  </select>
                </div>
                <div class="form-field">
                  <label for="comm-pat">Patrimoine cible</label>
                  <select id="comm-pat" class="form-input" [(ngModel)]="commPatrimoineId">
                    @for (p of patrimoineStore.items(); track p.id) {
                      <option [ngValue]="p.id">#{{ p.id }} — {{ p.nomPatrimoine }}</option>
                    }
                  </select>
                </div>
              </div>

              <button type="button" class="btn-secondary" style="margin-top:0.5rem;" (click)="testInterServiceComm()">
                Tester l’appel inter-services
              </button>

              @if (commResult()) {
                <pre class="comm-result">{{ commResult() }}</pre>
              }
            </section>

            <section class="admin-card">
              <h2 class="admin-card__title">Circuits enregistrés ({{ circuitStore.items().length }})</h2>
              <div class="table-wrap">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Circuit &amp; Statut</th>
                      <th>Distance &amp; Durée</th>
                      <th>Tarif</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of circuitStore.items(); track c.id) {
                      <tr>
                        <td>
                          <strong>{{ c.nomCircuit }}</strong><br />
                          <small>{{ c.statutCircuit || 'PUBLIE' }} · {{ c.etapes.length }} étape(s)</small>
                          @if (c.guideResponsableId) {
                            <br /><small>Guide : {{ guideLabel(c.guideResponsableId) }}</small>
                          }
                          @if (canValidateGuides()) {
                            <div style="margin-top:0.35rem;">
                              <select
                                class="form-input"
                                [ngModel]="c.guideResponsableId ?? ''"
                                [ngModelOptions]="{ standalone: true }"
                                (ngModelChange)="assignGuideToCircuit(c.id, $event)"
                              >
                                <option value="">— Sans guide —</option>
                                @for (g of guidesCatalog(); track g.utilisateurId) {
                                  <option [ngValue]="g.utilisateurId">#{{ g.utilisateurId }} {{ g.prenom }} {{ g.nom }}</option>
                                }
                              </select>
                            </div>
                          }
                        </td>
                        <td class="tabular-nums">~{{ c.distanceTotale || 0 }} km · {{ c.dureeEstimee }} min</td>
                        <td class="tabular-nums">{{ c.prix | fcfaPrice }}</td>
                        <td class="table-actions">
                          <button type="button" class="btn-xs" (click)="startEditCircuit(c)">Modifier</button>
                          @if (c.statutCircuit !== 'PUBLIE') {
                            <button type="button" class="btn-xs" (click)="publierCircuit(c.id)">Publier</button>
                          }
                          @if (c.statutCircuit !== 'ARCHIVE') {
                            <button type="button" class="btn-xs" (click)="archiverCircuit(c.id)">Archiver</button>
                          }
                          <button type="button" class="btn-xs btn-xs--danger" (click)="deleteCircuit(c.id)">
                            <svg lucideTrash2 [size]="13" aria-hidden="true"></svg>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        }

        <!-- ONGLET 3 : ÉVÉNEMENTS -->
        @if (activeTab() === 'evenements') {
          <div class="admin-split">
            <section class="admin-card">
              <h2 class="admin-card__title">
                {{ editingEvenementId() ? 'Modifier l’événement #' + editingEvenementId() : 'Programmer un événement culturel en Casamance' }}
              </h2>
              <form [formGroup]="evenementForm" (ngSubmit)="saveEvenement()" class="admin-form">
                <div class="form-field">
                  <label for="evt-nom">Intitulé de l'événement *</label>
                  <input id="evt-nom" type="text" formControlName="nomEvenement" class="form-input" placeholder="Ex: Festival Culturel de Ziguinchor" />
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="evt-type">Catégorie *</label>
                    <select id="evt-type" formControlName="typeEvenement" class="form-input">
                      <option value="FESTIVAL">Festival</option>
                      <option value="EXPOSITION">Exposition</option>
                      <option value="ATELIER">Atelier culturel</option>
                      <option value="VISITE_GUIDEE">Visite guidée</option>
                      <option value="CONFERENCE">Conférence</option>
                      <option value="CEREMONIE_TRADITIONNELLE">Cérémonie traditionnelle</option>
                      <option value="FOIRE_ARTISANALE">Foire artisanale</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label for="evt-pat">Site patrimonial hôte (optionnel)</label>
                    <select id="evt-pat" formControlName="patrimoineId" class="form-input">
                      @for (p of patrimoineStore.items(); track p.id) {
                        <option [ngValue]="p.id">{{ p.nomPatrimoine }} (max {{ p.capacitePatrimoine }})</option>
                      }
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="evt-debut">Date &amp; heure de début *</label>
                    <input id="evt-debut" type="datetime-local" formControlName="dateDebut" class="form-input" />
                  </div>
                  <div class="form-field">
                    <label for="evt-fin">Date &amp; heure de fin *</label>
                    <input id="evt-fin" type="datetime-local" formControlName="dateFin" class="form-input" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="evt-horaires">Plage horaire</label>
                    <input id="evt-horaires" type="text" formControlName="horaires" class="form-input" placeholder="Ex: 09h00 - 18h00 (UTC+0 Dakar)" />
                  </div>
                  <div class="form-field">
                    <label for="evt-org">Organisateur</label>
                    <input id="evt-org" type="text" formControlName="organisateur" class="form-input" placeholder="Ex: Direction Régionale de la Culture Ziguinchor" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="evt-cap">Capacité max *</label>
                    <input id="evt-cap" type="number" formControlName="capaciteMax" class="form-input" />
                  </div>
                  <div class="form-field">
                    <label for="evt-prix">Tarif (FCFA) *</label>
                    <input id="evt-prix" type="number" formControlName="prix" class="form-input" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="evt-lieu">Lieu précis *</label>
                    <input id="evt-lieu" type="text" formControlName="lieu" class="form-input" placeholder="Ex: Esplanade Saint-Antoine, Ziguinchor" />
                  </div>
                  <div class="form-field">
                    <label for="evt-cond">Conditions d'accès</label>
                    <input id="evt-cond" type="text" formControlName="conditionsAcces" class="form-input" placeholder="Ex: Billet ou réservation obligatoire" />
                  </div>
                </div>

                <div class="form-field">
                  <label for="evt-desc">Description</label>
                  <textarea id="evt-desc" rows="2" formControlName="descriptionEvenement" class="form-input"></textarea>
                </div>

                <label class="checkbox-field">
                  <input type="checkbox" formControlName="ouvertReservation" />
                  <span>Ouvrir explicitement cet événement à la réservation en ligne (P04)</span>
                </label>

                <div class="form-actions">
                  <button type="submit" class="btn-primary">
                    <svg lucidePlus [size]="15" aria-hidden="true"></svg>
                    <span>{{ editingEvenementId() ? 'Mettre à jour l’événement' : 'Publier l\'événement' }}</span>
                  </button>
                  @if (editingEvenementId()) {
                    <button type="button" class="btn-secondary" (click)="cancelEditEvenement()">Annuler</button>
                  }
                </div>
              </form>
            </section>

            <section class="admin-card">
              <h2 class="admin-card__title">Agenda programmé ({{ evenementStore.items().length }})</h2>
              <div class="table-wrap">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Événement &amp; Lieu</th>
                      <th>Type &amp; Statut</th>
                      <th>Capacité</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (ev of evenementStore.items(); track ev.id) {
                      <tr>
                        <td>
                          <strong>{{ ev.nomEvenement }}</strong><br />
                          <small>{{ ev.lieu }}</small>
                        </td>
                        <td>
                          <span class="ui-badge">{{ ev.typeEvenement }}</span><br />
                          <small>{{ ev.statutEvenement || 'PUBLIE' }}</small><br />
                          <span
                            class="ui-badge"
                            [class.ui-badge--success]="ev.ouvertReservation === true"
                            [class.ui-badge--neutral]="ev.ouvertReservation !== true"
                          >
                            {{ ev.ouvertReservation === true ? 'Réservable' : 'Consultation' }}
                          </span>
                        </td>
                        <td class="tabular-nums">{{ ev.capaciteMax }} places</td>
                        <td class="table-actions">
                          <button type="button" class="btn-xs" (click)="startEditEvenement(ev)">Modifier</button>
                          @if (ev.statutEvenement !== 'ANNULE') {
                            <button type="button" class="btn-xs" (click)="annulerEvenement(ev.id)">Annuler</button>
                          }
                          <button type="button" class="btn-xs btn-xs--danger" (click)="deleteEvenement(ev.id)">
                            <svg lucideTrash2 [size]="13" aria-hidden="true"></svg>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        }

        <!-- ONGLET 4 : RÉSERVATIONS (ADMIN & GESTIONNAIRE) -->
        @if (activeTab() === 'reservations') {
          <div class="p04-stack">
            @if (resStats(); as rs) {
              <section class="kpi-grid" aria-label="Statistiques réservations">
                <div class="kpi-card">
                  <span class="kpi-label">Total réservations</span>
                  <strong class="kpi-val tabular-nums">{{ rs.totalReservations }}</strong>
                </div>
                <div class="kpi-card">
                  <span class="kpi-label">En attente paiement</span>
                  <strong class="kpi-val tabular-nums">{{ rs.enAttentePaiement }}</strong>
                </div>
                <div class="kpi-card">
                  <span class="kpi-label">Confirmées</span>
                  <strong class="kpi-val tabular-nums">{{ rs.confirmees }}</strong>
                </div>
                <div class="kpi-card">
                  <span class="kpi-label">Revenu confirmé (serveur)</span>
                  <strong class="kpi-val tabular-nums">{{ rs.montantTotalConfirme | fcfaPrice }}</strong>
                </div>
              </section>
            }

            <section class="admin-card">
              <div class="section-head">
                <h2 class="admin-card__title">Supervision des réservations</h2>
                <button type="button" class="btn-xs" (click)="loadReservationsPage(resPage())">
                  <svg lucideRefreshCw [size]="13" aria-hidden="true"></svg>
                  <span>Actualiser</span>
                </button>
              </div>

              <div class="filter-bar">
                <input
                  type="search"
                  class="form-input"
                  placeholder="Rechercher référence, client, email..."
                  [ngModel]="resSearch()"
                  (ngModelChange)="resSearch.set($event)"
                />
                <select
                  class="form-input"
                  [ngModel]="resStatutFilter()"
                  (ngModelChange)="resStatutFilter.set($event); loadReservationsPage(0)"
                >
                  <option value="">Tous statuts</option>
                  <option value="BROUILLON">Brouillon</option>
                  <option value="EN_ATTENTE_PAIEMENT">En attente paiement</option>
                  <option value="CONFIRMEE">Confirmée</option>
                  <option value="EXPIREE">Expirée</option>
                  <option value="ANNULEE">Annulée</option>
                  <option value="REMBOURSEE">Remboursée</option>
                </select>
                <select
                  class="form-input"
                  [ngModel]="resTypeFilter()"
                  (ngModelChange)="resTypeFilter.set($event); loadReservationsPage(0)"
                >
                  <option value="">Tous types</option>
                  <option value="CIRCUIT">Circuit</option>
                  <option value="EVENEMENT">Événement</option>
                </select>
                <button type="button" class="btn-secondary" (click)="loadReservationsPage(0)">
                  Filtrer
                </button>
              </div>

              <div class="table-wrap">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Visiteur</th>
                      <th>Prestation</th>
                      <th>Places &amp; Total</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of adminReservations(); track r.id) {
                      <tr>
                        <td class="tabular-nums">
                          <strong>{{ r.referenceReservation || ('#' + r.id) }}</strong><br />
                          <small>{{ r.dateReservation | dateFr }}</small>
                        </td>
                        <td>
                          <strong>{{ r.nomClient }}</strong><br />
                          <small>{{ r.emailClient }}</small>
                        </td>
                        <td>
                          {{ r.typeReservation }} ·
                          {{ r.circuit?.nomCircuit || r.evenement?.nomEvenement || ('#' + (r.circuitId ?? r.evenementId)) }}
                        </td>
                        <td class="tabular-nums">
                          {{ r.nombrePlaces }} pl.<br />
                          <strong>{{ r.montantTotal | fcfaPrice }}</strong>
                        </td>
                        <td>
                          <span [class]="reservationStatusBadgeClass(r.statut)">
                            {{ formatReservationStatusLabel(r.statut) }}
                          </span>
                        </td>
                        <td class="table-actions">
                          @if (r.statut === 'EN_ATTENTE_PAIEMENT') {
                            <button type="button" class="btn-xs" (click)="syncAdminReservation(r.id)">
                              Synchro paiement
                            </button>
                          }
                          @if (['BROUILLON', 'EN_ATTENTE_PAIEMENT', 'CONFIRMEE'].includes(r.statut)) {
                            <button type="button" class="btn-xs btn-xs--danger" (click)="cancelAdminReservation(r)">
                              Annuler
                            </button>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6">Aucune réservation trouvée pour ces critères.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (resTotalPages() > 1) {
                <div class="pager">
                  <button type="button" class="btn-xs" [disabled]="resPage() === 0" (click)="loadReservationsPage(resPage() - 1)">
                    Précédent
                  </button>
                  <span class="tabular-nums">Page {{ resPage() + 1 }} / {{ resTotalPages() }} ({{ resTotalElements() }} éléments)</span>
                  <button type="button" class="btn-xs" [disabled]="resPage() + 1 >= resTotalPages()" (click)="loadReservationsPage(resPage() + 1)">
                    Suivant
                  </button>
                </div>
              }
            </section>
          </div>
        }

        <!-- ONGLET 5 : PAIEMENTS SIMULÉS & REMBOURSEMENTS (REMBOURSEMENT = ADMIN UNIQUEMENT) -->
        @if (activeTab() === 'paiements') {
          <div class="p04-stack">
            <div class="ui-sim-banner">
              <strong>P04 Simulation Paiement Wave &amp; Orange Money :</strong> les montants et
              remboursements affichés ici sont strictement simulés en base P04. Seul le rôle
              <code>ADMINISTRATEUR</code> (permission <code>PAIEMENT:REMBOURSER</code>) est autorisé à
              déclencher un remboursement intégral simulé.
            </div>

            @if (payStats(); as ps) {
              <section class="kpi-grid" aria-label="Statistiques paiements simulés">
                <div class="kpi-card">
                  <span class="kpi-label">Transactions simulées</span>
                  <strong class="kpi-val tabular-nums">{{ ps.totalTransactions }} ({{ ps.acceptees }} acc.)</strong>
                </div>
                <div class="kpi-card">
                  <span class="kpi-label">Total Wave (simulé)</span>
                  <strong class="kpi-val tabular-nums">{{ ps.montantWaveSimule | fcfaPrice }}</strong>
                </div>
                <div class="kpi-card">
                  <span class="kpi-label">Total Orange Money (simulé)</span>
                  <strong class="kpi-val tabular-nums">{{ ps.montantOrangeMoneySimule | fcfaPrice }}</strong>
                </div>
                <div class="kpi-card">
                  <span class="kpi-label">Outbox en attente</span>
                  <strong class="kpi-val tabular-nums">{{ ps.outboxEnAttente }}</strong>
                </div>
              </section>
            }

            <section class="admin-card">
              <div class="section-head">
                <h2 class="admin-card__title">Journal des paiements simulés</h2>
                <div class="table-actions">
                  <button type="button" class="btn-xs" (click)="rejouerOutbox()">
                    <svg lucideRefreshCw [size]="13" aria-hidden="true"></svg>
                    <span>Rejouer outbox</span>
                  </button>
                  <button type="button" class="btn-xs" (click)="loadPaiementsPage(payPage())">
                    Actualiser
                  </button>
                </div>
              </div>

              <div class="filter-bar">
                <input
                  type="search"
                  class="form-input"
                  placeholder="Référence transaction, téléphone..."
                  [ngModel]="paySearch()"
                  (ngModelChange)="paySearch.set($event)"
                />
                <select
                  class="form-input"
                  [ngModel]="payStatutFilter()"
                  (ngModelChange)="payStatutFilter.set($event); loadPaiementsPage(0)"
                >
                  <option value="">Tous statuts</option>
                  <option value="EN_COURS">En cours</option>
                  <option value="ACCEPTE">Accepté</option>
                  <option value="REFUSE">Refusé</option>
                  <option value="EXPIRE">Expiré</option>
                  <option value="ANNULE">Annulé</option>
                  <option value="REMBOURSE">Remboursé</option>
                </select>
                <select
                  class="form-input"
                  [ngModel]="payModeFilter()"
                  (ngModelChange)="payModeFilter.set($event); loadPaiementsPage(0)"
                >
                  <option value="">Wave &amp; Orange Money</option>
                  <option value="WAVE">Wave Sénégal</option>
                  <option value="ORANGE_MONEY">Orange Money</option>
                </select>
                <button type="button" class="btn-secondary" (click)="loadPaiementsPage(0)">
                  Filtrer
                </button>
              </div>

              <div class="table-wrap">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Réservation</th>
                      <th>Mode</th>
                      <th>Montant</th>
                      <th>Synchro</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of adminPaiements(); track p.id) {
                      <tr>
                        <td class="tabular-nums">
                          <strong>{{ p.referenceTransaction }}</strong><br />
                          <small>{{ (p.datePaiement || p.dateCreation) | dateFr: 'datetime' }}</small>
                        </td>
                        <td class="tabular-nums">#{{ p.reservationId }}</td>
                        <td>{{ p.modePaiement }}</td>
                        <td class="tabular-nums"><strong>{{ p.montant | fcfaPrice }}</strong></td>
                        <td><small>{{ p.synchroReservationStatut || 'N/A' }}</small></td>
                        <td>
                          <span [class]="paiementStatusBadgeClass(p.statut)">
                            {{ formatPaiementStatusLabel(p.statut) }}
                          </span>
                        </td>
                        <td class="table-actions">
                          @if (authStore.isAdmin() && p.statut === 'ACCEPTE') {
                            <button
                              type="button"
                              class="btn-xs btn-xs--danger"
                              (click)="rembourserAdminPaiement(p)"
                            >
                              Rembourser (simulé)
                            </button>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="7">Aucune transaction simulée pour ces critères.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (payTotalPages() > 1) {
                <div class="pager">
                  <button type="button" class="btn-xs" [disabled]="payPage() === 0" (click)="loadPaiementsPage(payPage() - 1)">
                    Précédent
                  </button>
                  <span class="tabular-nums">Page {{ payPage() + 1 }} / {{ payTotalPages() }} ({{ payTotalElements() }} éléments)</span>
                  <button type="button" class="btn-xs" [disabled]="payPage() + 1 >= payTotalPages()" (click)="loadPaiementsPage(payPage() + 1)">
                    Suivant
                  </button>
                </div>
              }
            </section>
          </div>
        }

        <!-- ONGLET 6 : GESTION DES UTILISATEURS (ADMINISTRATEUR UNIQUEMENT) -->
        @if (activeTab() === 'utilisateurs') {
          @if (!authStore.isAdmin()) {
            <section class="admin-card" role="alert">
              <h2 class="admin-card__title">Section réservée aux Administrateurs</h2>
              <p class="card-helper">
                Votre compte (<strong>{{ authStore.roleLabel() }}</strong>) est habilité à
                gérer le catalogue patrimonial, mais la gestion des comptes et des rôles est
                strictement réservée au rôle <code>ADMINISTRATEUR</code> côté serveur.
              </p>
              <button type="button" class="btn-secondary" (click)="loadUsers()">
                Tester la vérification serveur (Attendu : HTTP 403 Forbidden)
              </button>
            </section>
          } @else {
            <div class="admin-split">
              <section class="admin-card">
                <h2 class="admin-card__title">Créer un compte collaborateur ou visiteur</h2>
                <form [formGroup]="userForm" (ngSubmit)="createUser()" class="admin-form">
                  <div class="form-row">
                    <div class="form-field">
                      <label for="usr-prenom">Prénom *</label>
                      <input id="usr-prenom" type="text" formControlName="prenom" class="form-input" />
                    </div>
                    <div class="form-field">
                      <label for="usr-nom">Nom *</label>
                      <input id="usr-nom" type="text" formControlName="nom" class="form-input" />
                    </div>
                  </div>

                  <div class="form-field">
                    <label for="usr-email">Email *</label>
                    <input id="usr-email" type="email" formControlName="email" class="form-input" />
                  </div>

                  <div class="form-row">
                    <div class="form-field">
                      <label for="usr-pass">Mot de passe initial *</label>
                      <input id="usr-pass" type="password" formControlName="motDePasse" class="form-input" />
                    </div>
                    <div class="form-field">
                      <label for="usr-role">Rôle attribué *</label>
                      <select id="usr-role" formControlName="role" class="form-input">
                        <option value="TOURISTE">Visiteur / Touriste</option>
                        <option value="GUIDE">Guide touristique local</option>
                        <option value="CONSERVATEUR">Conservateur du patrimoine</option>
                        <option value="GESTIONNAIRE_SITE">Gestionnaire de site</option>
                        <option value="ADMINISTRATEUR">Administrateur</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" class="btn-primary">
                    <svg lucidePlus [size]="15" aria-hidden="true"></svg>
                    <span>Créer le compte utilisateur</span>
                  </button>
                </form>
              </section>

              <section class="admin-card">
                <h2 class="admin-card__title">Comptes enregistrés ({{ users().length }})</h2>
                <div class="table-wrap">
                  <table class="admin-table">
                    <thead>
                      <tr>
                        <th>Utilisateur</th>
                        <th>Rôle</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (u of users(); track u.id) {
                        <tr>
                          <td>
                            <strong>{{ u.prenom }} {{ u.nom }}</strong><br />
                            <small>{{ u.email }}</small>
                          </td>
                          <td>
                            <span class="ui-badge ui-badge--ochre">{{ formatRole(u.role) }}</span>
                          </td>
                          <td>
                            <span
                              class="ui-badge"
                              [class.ui-badge--success]="u.actif"
                              [class.ui-badge--danger]="!u.actif"
                            >
                              {{ u.actif ? 'Actif' : 'Désactivé' }}
                            </span>
                          </td>
                          <td class="table-actions">
                            @if (u.id !== currentUserId()) {
                              <button
                                type="button"
                                class="btn-xs btn-xs--danger"
                                (click)="deleteUser(u.id)"
                              >
                                <svg lucideTrash2 [size]="13" aria-hidden="true"></svg>
                              </button>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          }
        }

          <!-- ONGLET P05 : VALIDATION DES GUIDES -->
          @if (activeTab() === 'guides' && canValidateGuides()) {
            <section class="admin-card">
              <div class="section-head">
                <h2 class="admin-card__title" style="margin:0;">Validation &amp; gestion des guides touristiques</h2>
                <button type="button" class="btn-secondary" (click)="loadAdminGuides()">Actualiser</button>
              </div>

              <div class="filter-bar">
                <select
                  class="form-input"
                  [ngModel]="guideStatutFilter()"
                  (ngModelChange)="guideStatutFilter.set($event); loadAdminGuides()"
                >
                  <option value="">Tous les statuts</option>
                  <option value="EN_ATTENTE_VALIDATION">En attente de validation</option>
                  <option value="VALIDE">Validés</option>
                  <option value="REJETE">Rejetés</option>
                  <option value="SUSPENDU">Suspendus</option>
                  <option value="BROUILLON">Brouillons</option>
                  <option value="DESACTIVE">Désactivés</option>
                </select>
                <span>Total : <strong>{{ adminGuides().length }}</strong> dossier(s)</span>
              </div>

              @if (selectedGuideAction(); as pending) {
                <div class="admin-card" style="background:var(--surface-canvas);margin-bottom:var(--space-4);">
                  <h3 class="admin-card__title" style="font-size:var(--text-base);">
                    Confirmer l’action « {{ pending.action }} » sur {{ pending.guide.prenom }} {{ pending.guide.nom }} (#{{ pending.guide.id }})
                  </h3>
                  <div class="form-field">
                    <label for="guide-decision-motif">
                      Motif de la décision
                      {{ pending.action === 'REJETER' || pending.action === 'SUSPENDRE' ? '(obligatoire)' : '(optionnel)' }}
                    </label>
                    <input
                      id="guide-decision-motif"
                      type="text"
                      class="form-input"
                      [(ngModel)]="guideActionMotif"
                      placeholder="Ex: Carte professionnelle et références vérifiées"
                    />
                  </div>
                  <div class="form-actions">
                    <button type="button" class="btn-primary" (click)="submitGuideDecision()">Confirmer</button>
                    <button type="button" class="btn-secondary" (click)="cancelGuideDecision()">Annuler</button>
                  </div>
                </div>
              }

              <div class="table-wrap">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Guide</th>
                      <th>Carte &amp; Zones</th>
                      <th>Langues &amp; Exp.</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (g of adminGuides(); track g.id) {
                      <tr>
                        <td>
                          <strong>#{{ g.id }} · {{ g.prenom }} {{ g.nom }}</strong><br />
                          <small>{{ g.email || 'utilisateur #' + g.utilisateurId }}</small>
                          @if (g.motifDecision) {
                            <br /><small>Motif : {{ g.motifDecision }}</small>
                          }
                        </td>
                        <td>
                          <span>{{ g.numeroCarteProfessionnelle || 'Sans numéro' }}</span><br />
                          <small>{{ g.zonesIntervention || '—' }}</small>
                        </td>
                        <td>
                          <span>{{ g.languesParlees || '—' }}</span><br />
                          <small class="tabular-nums">{{ g.anneesExperience }} an(s)</small>
                        </td>
                        <td>
                          <span [class]="guideStatusBadgeClass(g.statutValidation)">
                            {{ formatGuideStatusLabel(g.statutValidation) }}
                          </span>
                        </td>
                        <td class="table-actions">
                          @if (g.statutValidation === 'EN_ATTENTE_VALIDATION') {
                            <button type="button" class="btn-xs" (click)="openGuideDecision(g, 'VALIDER')">Valider</button>
                            <button type="button" class="btn-xs btn-xs--danger" (click)="openGuideDecision(g, 'REJETER')">Rejeter</button>
                          }
                          @if (g.statutValidation === 'VALIDE') {
                            <button type="button" class="btn-xs btn-xs--danger" (click)="openGuideDecision(g, 'SUSPENDRE')">Suspendre</button>
                            <button type="button" class="btn-xs" (click)="openGuideDecision(g, 'DESACTIVER')">Désactiver</button>
                          }
                          @if (g.statutValidation === 'SUSPENDU' || g.statutValidation === 'DESACTIVE') {
                            <button type="button" class="btn-xs" (click)="openGuideDecision(g, 'REACTIVER')">Réactiver</button>
                          }
                          <button type="button" class="btn-xs" (click)="loadGuideHistorique(g)">Historique</button>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5">Aucun dossier guide ne correspond au filtre sélectionné.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (guideHistoriqueTarget(); as histTarget) {
                <div style="margin-top:var(--space-5);">
                  <div class="section-head">
                    <h3 class="admin-card__title" style="margin:0;font-size:var(--text-base);">
                      Historique d’audit — {{ histTarget.prenom }} {{ histTarget.nom }} (#{{ histTarget.id }})
                    </h3>
                    <button type="button" class="btn-xs" (click)="guideHistoriqueTarget.set(null)">Fermer</button>
                  </div>
                  <div class="table-wrap">
                    <table class="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Transition</th>
                          <th>Acteur</th>
                          <th>Motif</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (h of guideHistorique(); track h.id) {
                          <tr>
                            <td class="tabular-nums">{{ h.dateTransition | dateFr }}</td>
                            <td>{{ h.ancienStatut || 'NOUVEAU' }} → <strong>{{ h.nouveauStatut }}</strong></td>
                            <td>#{{ h.acteurId }} ({{ h.acteurRole }})</td>
                            <td>{{ h.motif || '—' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }
            </section>
          }

          <!-- ONGLET P05 : MODÉRATION DES AVIS & SIGNALEMENTS -->
          @if (activeTab() === 'moderation' && canModerateAvis()) {
            <div class="p04-stack">
              <section class="admin-card">
                <div class="section-head">
                  <h2 class="admin-card__title" style="margin:0;">File de traitement des signalements ({{ moderationSignalements().length }})</h2>
                  <button type="button" class="btn-secondary" (click)="loadModerationData()">Actualiser</button>
                </div>

                <div class="filter-bar">
                  <select
                    class="form-input"
                    [ngModel]="signalementStatutFilter()"
                    (ngModelChange)="signalementStatutFilter.set($event); loadModerationData()"
                  >
                    <option value="OUVERT">Signalements ouverts</option>
                    <option value="VALIDE_CONTENU_RETIRE">Validés (contenu retiré)</option>
                    <option value="REJETE_ABUSIF">Rejetés (abusifs)</option>
                    <option value="">Tous les signalements</option>
                  </select>
                </div>

                @if (selectedSignalementAction(); as sigPending) {
                  <div class="admin-card" style="background:var(--surface-canvas);margin-bottom:var(--space-4);">
                    <h3 class="admin-card__title" style="font-size:var(--text-base);">
                      Traiter signalement #{{ sigPending.signalement.id }} ({{ sigPending.decision }})
                    </h3>
                    <div class="form-field">
                      <label for="sig-decision-comment">Justification de modération *</label>
                      <input
                        id="sig-decision-comment"
                        type="text"
                        class="form-input"
                        [(ngModel)]="signalementDecisionMotif"
                        placeholder="Ex: Propos non conformes à la charte ou signalement non fondé"
                      />
                    </div>
                    <div class="form-actions">
                      <button type="button" class="btn-primary" (click)="submitSignalementDecision()">Enregistrer la décision</button>
                      <button type="button" class="btn-secondary" (click)="selectedSignalementAction.set(null)">Annuler</button>
                    </div>
                  </div>
                }

                <div class="table-wrap">
                  <table class="admin-table">
                    <thead>
                      <tr>
                        <th>Signalement</th>
                        <th>Avis concerné</th>
                        <th>Motif du visiteur</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (s of moderationSignalements(); track s.id) {
                        <tr>
                          <td>
                            <strong>#{{ s.id }} · {{ s.categorie }}</strong><br />
                            <small>Par {{ s.signaleParNom }} le {{ s.dateSignalement | dateFr }}</small>
                          </td>
                          <td>
                            <strong>Avis #{{ s.avisId }}</strong>
                            @if (s.avis) {
                              <span class="tabular-nums"> ({{ s.avis.note }}/5)</span><br />
                              <small>{{ s.avis.commentaire }}</small>
                            }
                          </td>
                          <td>{{ s.motif }}</td>
                          <td>{{ s.statut }}</td>
                          <td class="table-actions">
                            @if (s.statut === 'OUVERT') {
                              <button type="button" class="btn-xs btn-xs--danger" (click)="openSignalementDecision(s, 'VALIDE_CONTENU_RETIRE')">
                                Retirer l’avis
                              </button>
                              <button type="button" class="btn-xs" (click)="openSignalementDecision(s, 'REJETE_ABUSIF')">
                                Rejeter signalement
                              </button>
                            } @else {
                              <small>{{ s.decisionCommentaire || 'Traité' }}</small>
                            }
                          </td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="5">Aucun signalement dans cette file.</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>

              <section class="admin-card">
                <div class="section-head">
                  <h2 class="admin-card__title" style="margin:0;">Catalogue des avis vérifiés ({{ moderationAvis().length }})</h2>
                </div>

                <div class="filter-bar">
                  <select
                    class="form-input"
                    [ngModel]="avisCibleFilter()"
                    (ngModelChange)="avisCibleFilter.set($event); loadModerationData()"
                  >
                    <option value="">Toutes les cibles</option>
                    <option value="PATRIMOINE">Patrimoines</option>
                    <option value="CIRCUIT">Circuits</option>
                    <option value="EVENEMENT">Événements</option>
                    <option value="GUIDE">Guides</option>
                  </select>
                  <select
                    class="form-input"
                    [ngModel]="avisStatutFilter()"
                    (ngModelChange)="avisStatutFilter.set($event); loadModerationData()"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="APPROUVE">Approuvé</option>
                    <option value="EN_ATTENTE">En attente</option>
                    <option value="MASQUE">Masqué</option>
                    <option value="REJETE">Rejeté</option>
                  </select>
                </div>

                @if (selectedAvisAction(); as avisPending) {
                  <div class="admin-card" style="background:var(--surface-canvas);margin-bottom:var(--space-4);">
                    <h3 class="admin-card__title" style="font-size:var(--text-base);">
                      Appliquer « {{ formatModerationStatusLabel(avisPending.decision) }} » à l’avis #{{ avisPending.avis.id }}
                    </h3>
                    <div class="form-field">
                      <label for="avis-decision-motif">Motif obligatoire pour l’audit *</label>
                      <input
                        id="avis-decision-motif"
                        type="text"
                        class="form-input"
                        [(ngModel)]="avisModerationMotif"
                        placeholder="Précisez la justification de modération"
                      />
                    </div>
                    <div class="form-actions">
                      <button type="button" class="btn-primary" (click)="submitAvisModeration()">Appliquer</button>
                      <button type="button" class="btn-secondary" (click)="selectedAvisAction.set(null)">Annuler</button>
                    </div>
                  </div>
                }

                <div class="table-wrap">
                  <table class="admin-table">
                    <thead>
                      <tr>
                        <th>Auteur &amp; Cible</th>
                        <th>Note &amp; Commentaire</th>
                        <th>Statut</th>
                        <th>Modération</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (a of moderationAvis(); track a.id) {
                        <tr>
                          <td>
                            <strong>{{ a.auteurNom }}</strong><br />
                            <small>{{ a.cibleType }} #{{ a.cibleId }} · Rés. #{{ a.reservationId }}</small>
                          </td>
                          <td>
                            <strong class="tabular-nums">{{ a.note }}/5</strong>
                            @if (a.experienceVerifiee) {
                              <span class="ui-badge ui-badge--success">Expérience vérifiée</span>
                            }
                            <br />
                            <small>{{ a.commentaire }}</small>
                          </td>
                          <td>
                            <span [class]="moderationStatusBadgeClass(a.statutModeration)">
                              {{ formatModerationStatusLabel(a.statutModeration) }}
                            </span>
                          </td>
                          <td class="table-actions">
                            @if (a.statutModeration !== 'APPROUVE') {
                              <button type="button" class="btn-xs" (click)="openAvisModeration(a, 'APPROUVE')">Approuver</button>
                            }
                            @if (a.statutModeration !== 'MASQUE') {
                              <button type="button" class="btn-xs btn-xs--danger" (click)="openAvisModeration(a, 'MASQUE')">Masquer</button>
                            }
                            @if (a.statutModeration !== 'REJETE') {
                              <button type="button" class="btn-xs btn-xs--danger" (click)="openAvisModeration(a, 'REJETE')">Rejeter</button>
                            }
                            <button type="button" class="btn-xs" (click)="loadAvisModerationHistorique(a)">Historique</button>
                          </td>
                        </tr>
                      } @empty {
                        <tr>
                          <td colspan="4">Aucun avis trouvé pour ces critères.</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                @if (avisHistoriqueTarget(); as avisHistTarget) {
                  <div style="margin-top:var(--space-5);">
                    <div class="section-head">
                      <h3 class="admin-card__title" style="margin:0;font-size:var(--text-base);">
                        Historique de modération — Avis #{{ avisHistTarget.id }}
                      </h3>
                      <button type="button" class="btn-xs" (click)="avisHistoriqueTarget.set(null)">Fermer</button>
                    </div>
                    <div class="table-wrap">
                      <table class="admin-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Transition</th>
                            <th>Acteur</th>
                            <th>Justification</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (h of avisModerationHistorique(); track h.id) {
                            <tr>
                              <td class="tabular-nums">{{ h.dateDecision | dateFr }}</td>
                              <td>{{ h.ancienStatut || 'NOUVEAU' }} → <strong>{{ h.nouveauStatut }}</strong></td>
                              <td>#{{ h.acteurId }} ({{ h.acteurRole }})</td>
                              <td>{{ h.justification }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                }
              </section>
            </div>
          }

          <!-- ONGLET P05 : NOTIFICATIONS SYSTÈME & RELANCE (ADMIN) -->
          @if (activeTab() === 'notifications' && authStore.isAdmin()) {
            <section class="admin-card">
              <div class="section-head">
                <h2 class="admin-card__title" style="margin:0;">
                  Supervision des notifications ({{ notifAdminTotalElements() }})
                </h2>
                <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">
                  <button type="button" class="btn-secondary" (click)="loadAdminNotifications(notifAdminPage())">
                    Actualiser
                  </button>
                  <button type="button" class="btn-primary" (click)="triggerNotificationsRetrySweep()">
                    Forcer reprise des échecs
                  </button>
                </div>
              </div>

              <div class="filter-bar">
                <select
                  class="form-input"
                  [ngModel]="notifAdminStatutFilter()"
                  (ngModelChange)="notifAdminStatutFilter.set($event); loadAdminNotifications(0)"
                >
                  <option value="">Tous les statuts</option>
                  <option value="ENVOYEE">Envoyées</option>
                  <option value="ECHEC_TEMPORAIRE">Échecs temporaires</option>
                  <option value="ECHEC">Échecs définitifs</option>
                  <option value="EN_ATTENTE">En attente</option>
                </select>
                <input
                  type="text"
                  class="form-input"
                  placeholder="Type événement (ex: AVIS_MODERE)"
                  [ngModel]="notifAdminTypeFilter()"
                  (ngModelChange)="notifAdminTypeFilter.set($event)"
                />
                <button type="button" class="btn-secondary" (click)="loadAdminNotifications(0)">Filtrer</button>
              </div>

              <div class="table-wrap">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Destinataire</th>
                      <th>Événement &amp; Sujet</th>
                      <th>Canal &amp; Statut</th>
                      <th>Tentatives</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (n of adminNotifications(); track n.id) {
                      <tr>
                        <td>
                          <strong>{{ n.destinataire }}</strong><br />
                          <small>Utilisateur #{{ n.utilisateurId ?? '—' }}</small>
                        </td>
                        <td>
                          <strong>{{ formatNotificationEventLabel(n.typeEvenement) }}</strong><br />
                          <small>{{ n.sujet }}</small>
                          @if (n.dernierErreur) {
                            <br /><small style="color:var(--danger);">{{ n.dernierErreur }}</small>
                          }
                        </td>
                        <td>
                          <span>{{ n.canal }}</span> ·
                          <span [class]="notificationStatusBadgeClass(n.statut)">{{ n.statut }}</span>
                        </td>
                        <td class="tabular-nums">{{ n.tentatives ?? 1 }} / {{ n.maxTentatives ?? 4 }}</td>
                        <td class="table-actions">
                          @if (n.statut !== 'ENVOYEE') {
                            <button type="button" class="btn-xs" (click)="retrySingleNotification(n.id)">
                              Relancer
                            </button>
                          } @else {
                            <small class="tabular-nums">{{ n.dateEnvoi | dateFr }}</small>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5">Aucune notification enregistrée pour ces critères.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              @if (notifAdminTotalPages() > 1) {
                <div class="pager">
                  <button
                    type="button"
                    class="btn-xs"
                    [disabled]="notifAdminPage() === 0"
                    (click)="loadAdminNotifications(notifAdminPage() - 1)"
                  >
                    Précédent
                  </button>
                  <span>Page {{ notifAdminPage() + 1 }} / {{ notifAdminTotalPages() }}</span>
                  <button
                    type="button"
                    class="btn-xs"
                    [disabled]="notifAdminPage() + 1 >= notifAdminTotalPages()"
                    (click)="loadAdminNotifications(notifAdminPage() + 1)"
                  >
                    Suivant
                  </button>
                </div>
              }
            </section>
          }
      </div>
    </div>
  `,
  styles: `
    .admin-header {
      margin-bottom: var(--space-6);
    }

    .admin-header__badges {
      display: flex;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }

    .admin-header__title {
      font-size: var(--text-2xl);
      color: var(--ink-primary);
      margin-bottom: var(--space-1);
    }

    .admin-header__subtitle {
      font-size: var(--text-sm);
      color: var(--ink-secondary);
    }

    .admin-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-6);
      padding-bottom: var(--space-3);
      border-bottom: 1px solid var(--border-subtle);
    }

    .admin-tab {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 0.6rem 1.15rem;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-strong);
      background-color: var(--surface-elevated);
      color: var(--ink-secondary);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: 700;
      cursor: pointer;
    }

    .admin-tab--active {
      background-color: var(--brand-primary);
      color: var(--ink-on-dark);
      border-color: var(--brand-primary);
    }

    .admin-split {
      display: grid;
      grid-template-columns: 1fr 1.15fr;
      gap: var(--space-6);
      align-items: start;
    }

    .admin-card {
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      box-shadow: var(--shadow-xs);
    }

    .admin-card__title {
      font-size: var(--text-lg);
      color: var(--ink-primary);
      margin-bottom: var(--space-4);
    }

    .card-helper {
      font-size: var(--text-sm);
      color: var(--ink-secondary);
      margin-bottom: var(--space-4);
      line-height: 1.55;
    }

    .admin-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-3);
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .form-field label {
      font-size: var(--text-xs);
      font-weight: 700;
      color: var(--ink-primary);
    }

    .form-input {
      width: 100%;
      padding: 0.55rem 0.75rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-strong);
      background-color: var(--surface-canvas);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
    }

    .form-actions {
      display: flex;
      gap: var(--space-2);
      margin-top: var(--space-2);
    }

    .btn-primary,
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 0.65rem 1.2rem;
      border-radius: var(--radius-pill);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: 700;
      cursor: pointer;
      border: none;
    }

    .btn-primary {
      background-color: var(--brand-primary);
      color: var(--ink-on-dark);
    }

    .btn-secondary {
      background-color: var(--surface-sand);
      color: var(--ink-primary);
      border: 1px solid var(--border-strong);
    }

    .table-wrap {
      overflow-x: auto;
    }

    .admin-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);
    }

    .admin-table th,
    .admin-table td {
      padding: 0.65rem 0.5rem;
      text-align: left;
      border-bottom: 1px solid var(--border-subtle);
    }

    .admin-table th {
      font-size: var(--text-xs);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ink-muted);
    }

    .table-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .btn-xs {
      padding: 0.3rem 0.6rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-strong);
      background-color: var(--surface-sand);
      font-size: var(--text-xs);
      font-weight: 600;
      cursor: pointer;
    }

    .btn-xs--danger {
      color: var(--danger);
      border-color: rgba(166, 44, 44, 0.25);
    }

    .comm-result {
      margin-top: var(--space-4);
      padding: var(--space-4);
      border-radius: var(--radius-md);
      background-color: var(--surface-ink);
      color: #faf6f0;
      font-size: var(--text-xs);
      overflow-x: auto;
    }

    .p04-stack {
      display: grid;
      gap: var(--space-5);
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: var(--space-4);
    }

    .kpi-card {
      background: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: var(--space-4);
      display: grid;
      gap: 0.35rem;
    }

    .kpi-label {
      font-size: var(--text-xs);
      color: var(--ink-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .kpi-val {
      font-size: var(--text-lg);
      color: var(--brand-primary);
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
    }

    .filter-bar {
      display: grid;
      grid-template-columns: minmax(180px, 2fr) repeat(2, minmax(140px, 1fr)) auto;
      gap: var(--space-2);
      margin-bottom: var(--space-4);
    }

    .pager {
      margin-top: var(--space-3);
      display: flex;
      justify-content: center;
      align-items: center;
      gap: var(--space-3);
      font-size: var(--text-xs);
    }

    .checkbox-field {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--ink-primary);
      cursor: pointer;
    }

    @media (max-width: 920px) {
      .admin-split,
      .form-row,
      .filter-bar {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AdminDashboardPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(Dialog);
  private readonly patrimoineApi = inject(PatrimoineApiService);
  private readonly circuitApi = inject(CircuitApiService);
  private readonly evenementApi = inject(EvenementApiService);
  private readonly reservationApi = inject(ReservationApiService);
  private readonly paiementApi = inject(PaiementApiService);
  private readonly guideApi = inject(GuideApiService);
  private readonly avisApi = inject(AvisApiService);
  private readonly notificationApi = inject(NotificationApiService);

  protected readonly authStore = inject(AuthStore);
  protected readonly patrimoineStore = inject(PatrimoineStore);
  protected readonly circuitStore = inject(CircuitStore);
  protected readonly evenementStore = inject(EvenementStore);

  protected readonly formatReservationStatusLabel = formatReservationStatusLabel;
  protected readonly reservationStatusBadgeClass = reservationStatusBadgeClass;
  protected readonly formatPaiementStatusLabel = formatPaiementStatusLabel;
  protected readonly paiementStatusBadgeClass = paiementStatusBadgeClass;
  protected readonly formatGuideStatusLabel = formatGuideStatusLabel;
  protected readonly guideStatusBadgeClass = guideStatusBadgeClass;
  protected readonly formatModerationStatusLabel = formatModerationStatusLabel;
  protected readonly moderationStatusBadgeClass = moderationBadgeClass;
  protected readonly formatNotificationEventLabel = formatNotificationEventLabel;

  protected readonly canManageOperations = computed(() => {
    const role = this.authStore.user()?.role;
    return this.authStore.isAdmin() || role === 'GESTIONNAIRE_SITE';
  });
  protected readonly canValidateGuides = computed(() => {
    const role = this.authStore.user()?.role;
    return this.authStore.isAdmin() || role === 'GESTIONNAIRE_SITE';
  });
  protected readonly canModerateAvis = computed(() => {
    const role = this.authStore.user()?.role;
    return this.authStore.isAdmin() || role === 'GESTIONNAIRE_SITE';
  });

  protected readonly activeTab = signal<AdminTab>('patrimoines');
  protected readonly editingPatrimoineId = signal<number | null>(null);
  protected readonly editingCircuitId = signal<number | null>(null);
  protected readonly editingEvenementId = signal<number | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly users = signal<Utilisateur[]>([]);
  protected readonly commResult = signal<string | null>(null);

  protected readonly guidesCatalog = signal<GuideProfil[]>([]);
  protected readonly adminGuides = signal<GuideProfil[]>([]);
  protected readonly guideStatutFilter = signal<StatutValidationGuide | ''>('');
  protected readonly guideHistorique = signal<GuideHistorique[]>([]);
  protected readonly guideHistoriqueTarget = signal<GuideProfil | null>(null);
  protected readonly selectedGuideAction = signal<{
    guide: GuideProfil;
    action: 'VALIDER' | 'REJETER' | 'SUSPENDRE' | 'REACTIVER' | 'DESACTIVER';
  } | null>(null);
  protected guideActionMotif = '';

  protected readonly moderationSignalements = signal<SignalementAvis[]>([]);
  protected readonly signalementStatutFilter = signal<StatutSignalement | ''>('OUVERT');
  protected readonly selectedSignalementAction = signal<{
    signalement: SignalementAvis;
    decision: 'VALIDE_CONTENU_RETIRE' | 'REJETE_ABUSIF';
  } | null>(null);
  protected signalementDecisionMotif = '';

  protected readonly moderationAvis = signal<Avis[]>([]);
  protected readonly avisCibleFilter = signal<CibleAvis | ''>('');
  protected readonly avisStatutFilter = signal<StatutModerationAvis | ''>('');
  protected readonly selectedAvisAction = signal<{
    avis: Avis;
    decision: StatutModerationAvis;
  } | null>(null);
  protected avisModerationMotif = '';
  protected readonly avisModerationHistorique = signal<AvisModerationHistorique[]>([]);
  protected readonly avisHistoriqueTarget = signal<Avis | null>(null);

  protected readonly adminNotifications = signal<NotificationItem[]>([]);
  protected readonly notifAdminStatutFilter = signal<StatutNotification | ''>('');
  protected readonly notifAdminTypeFilter = signal('');
  protected readonly notifAdminPage = signal(0);
  protected readonly notifAdminTotalPages = signal(1);
  protected readonly notifAdminTotalElements = signal(0);

  protected readonly adminReservations = signal<Reservation[]>([]);
  protected readonly resStats = signal<ReservationStats | null>(null);
  protected readonly resSearch = signal('');
  protected readonly resStatutFilter = signal<StatutReservation | ''>('');
  protected readonly resTypeFilter = signal<TypeReservation | ''>('');
  protected readonly resPage = signal(0);
  protected readonly resTotalPages = signal(1);
  protected readonly resTotalElements = signal(0);

  protected readonly adminPaiements = signal<Paiement[]>([]);
  protected readonly payStats = signal<PaiementStats | null>(null);
  protected readonly paySearch = signal('');
  protected readonly payStatutFilter = signal<StatutPaiement | ''>('');
  protected readonly payModeFilter = signal<ModePaiement | ''>('');
  protected readonly payPage = signal(0);
  protected readonly payTotalPages = signal(1);
  protected readonly payTotalElements = signal(0);

  protected readonly circuitEtapes = signal<EtapeFormItem[]>([
    {
      ordre: 1,
      patrimoineId: 1,
      dureeVisite: 60,
      descriptionEtape: 'Visite commentée du site patrimonial',
      moyenTransport: 'PIED',
    },
  ]);

  protected commMode: 'feign' | 'resttemplate' | 'webclient' = 'feign';
  protected commPatrimoineId = 1;

  protected readonly currentUserId = computed(() => this.authStore.user()?.id ?? null);

  protected readonly patrimoineForm = this.fb.nonNullable.group({
    nomPatrimoine: ['', [Validators.required]],
    codePatrimoine: ['', [Validators.required]],
    categoriePatrimoine: ['CULTUREL' as CategoriePatrimoine, [Validators.required]],
    typePatrimoine: ['Site culturel de Casamance'],
    zoneGeographique: ['BASSE_CASAMANCE' as ZoneCasamance, [Validators.required]],
    localite: ['Ziguinchor'],
    adressePatrimoine: ['', [Validators.required]],
    capacitePatrimoine: [200, [Validators.required, Validators.min(1)]],
    latitudePatrimoine: [12.5833, [Validators.min(-90), Validators.max(90)]],
    longitudePatrimoine: [-16.2719, [Validators.min(-180), Validators.max(180)]],
    horairesOuverture: ['Mardi au Dimanche : 09h00 - 18h00'],
    tarifEntree: [1000, [Validators.min(0)]],
    descriptionPatrimoine: ['', [Validators.required, Validators.minLength(10)]],
    historiquePatrimoine: [''],
    informationsCulturelles: [''],
    informationsPratiques: [''],
    statutPublication: ['PUBLIE' as StatutPublication, [Validators.required]],
  });

  protected readonly circuitForm = this.fb.nonNullable.group({
    nomCircuit: ['', [Validators.required]],
    descriptionCircuit: ['', [Validators.required]],
    presentationTouristique: [''],
    difficulte: ['FACILE' as Difficulte, [Validators.required]],
    moyenTransport: ['MIXTE' as MoyenTransport, [Validators.required]],
    zoneGeographique: ['BASSE_CASAMANCE', [Validators.required]],
    pointDepart: ['Ziguinchor'],
    pointArrivee: ['Enampore, Basse-Casamance'],
    placesMax: [20, [Validators.required, Validators.min(1)]],
    prix: [15000, [Validators.required, Validators.min(0)]],
    statutCircuit: ['PUBLIE' as StatutCircuit, [Validators.required]],
    guideResponsableId: [null as number | null],
  });

  protected readonly evenementForm = this.fb.nonNullable.group({
    nomEvenement: ['', [Validators.required]],
    typeEvenement: ['VISITE_GUIDEE' as TypeEvenement, [Validators.required]],
    patrimoineId: [1, [Validators.required]],
    dateDebut: ['2026-12-20T09:00', [Validators.required]],
    dateFin: ['2026-12-20T17:00', [Validators.required]],
    horaires: ['09h00 - 17h00'],
    organisateur: ['Direction Régionale de la Culture de Ziguinchor'],
    capaciteMax: [60, [Validators.required, Validators.min(1)]],
    prix: [5000, [Validators.required, Validators.min(0)]],
    lieu: ['Esplanade du Fleuve Casamance, Ziguinchor', [Validators.required]],
    conditionsAcces: ['Inscription préalable recommandée'],
    descriptionEvenement: [''],
    ouvertReservation: [false],
  });

  protected readonly userForm = this.fb.nonNullable.group({
    prenom: ['', [Validators.required]],
    nom: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    motDePasse: ['', [Validators.required, Validators.minLength(6)]],
    role: ['GESTIONNAIRE_SITE' as RoleUtilisateur, [Validators.required]],
  });

  ngOnInit(): void {
    void this.patrimoineStore.ensureLoaded();
    void this.circuitStore.ensureLoaded();
    void this.evenementStore.ensureLoaded();
    if (this.authStore.isAdmin()) {
      void this.loadUsers();
    }
  }

  protected formatRole(role: RoleUtilisateur): string {
    return formatRoleLabel(role);
  }

  protected switchTab(tab: AdminTab): void {
    this.activeTab.set(tab);
    this.actionError.set(null);
    if (tab === 'circuits') {
      void this.loadGuidesCatalog();
    } else if (tab === 'utilisateurs' && this.authStore.isAdmin()) {
      void this.loadUsers();
    } else if (tab === 'reservations') {
      void this.loadReservationsPage(0);
    } else if (tab === 'paiements') {
      void this.loadPaiementsPage(0);
    } else if (tab === 'guides' && this.canValidateGuides()) {
      void this.loadAdminGuides();
    } else if (tab === 'moderation' && this.canModerateAvis()) {
      void this.loadModerationData();
    } else if (tab === 'notifications' && this.authStore.isAdmin()) {
      void this.loadAdminNotifications(0);
    }
  }

  protected startEditPatrimoine(p: Patrimoine): void {
    this.editingPatrimoineId.set(p.id);
    this.patrimoineForm.setValue({
      nomPatrimoine: p.nomPatrimoine,
      codePatrimoine: p.codePatrimoine,
      categoriePatrimoine: p.categoriePatrimoine ?? 'CULTUREL',
      typePatrimoine: p.typePatrimoine ?? '',
      zoneGeographique: p.zoneGeographique ?? 'BASSE_CASAMANCE',
      localite: p.localite ?? '',
      adressePatrimoine: p.adressePatrimoine ?? '',
      capacitePatrimoine: p.capacitePatrimoine,
      latitudePatrimoine: p.latitudePatrimoine,
      longitudePatrimoine: p.longitudePatrimoine,
      horairesOuverture: p.horairesOuverture ?? '',
      tarifEntree: p.tarifEntree ?? 0,
      descriptionPatrimoine: p.descriptionPatrimoine ?? '',
      historiquePatrimoine: p.historiquePatrimoine ?? '',
      informationsCulturelles: p.informationsCulturelles ?? '',
      informationsPratiques: p.informationsPratiques ?? '',
      statutPublication: p.statutPublication ?? 'PUBLIE',
    });
  }

  protected cancelEditPatrimoine(): void {
    this.editingPatrimoineId.set(null);
    this.patrimoineForm.reset({
      nomPatrimoine: '',
      codePatrimoine: '',
      categoriePatrimoine: 'CULTUREL',
      typePatrimoine: 'Site culturel de Casamance',
      zoneGeographique: 'BASSE_CASAMANCE',
      localite: 'Ziguinchor',
      adressePatrimoine: '',
      capacitePatrimoine: 200,
      latitudePatrimoine: 12.5833,
      longitudePatrimoine: -16.2719,
      horairesOuverture: 'Mardi au Dimanche : 09h00 - 18h00',
      tarifEntree: 1000,
      descriptionPatrimoine: '',
      historiquePatrimoine: '',
      informationsCulturelles: '',
      informationsPratiques: '',
      statutPublication: 'PUBLIE',
    });
  }

  protected async savePatrimoine(): Promise<void> {
    this.actionError.set(null);
    if (this.patrimoineForm.invalid) {
      this.patrimoineForm.markAllAsTouched();
      return;
    }
    const raw = this.patrimoineForm.getRawValue();
    try {
      const editId = this.editingPatrimoineId();
      if (editId) {
        await firstValueFrom(this.patrimoineApi.update(editId, raw));
        toast.success('Patrimoine mis à jour avec succès');
      } else {
        await firstValueFrom(this.patrimoineApi.create(raw));
        toast.success('Nouveau site patrimonial ajouté au catalogue');
      }
      this.cancelEditPatrimoine();
      await this.patrimoineStore.reload();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async publierPatrimoine(id: number): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.patrimoineApi.publier(id));
      toast.success('Fiche patrimoine publiée');
      await this.patrimoineStore.reload();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async archiverPatrimoine(id: number): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.patrimoineApi.archiver(id, 'Archivage administratif'));
      toast.success('Fiche patrimoine archivée');
      await this.patrimoineStore.reload();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async deletePatrimoine(id: number): Promise<void> {
    if (!(await this.confirmDialog(`Archiver ou supprimer le patrimoine #${id} ?`, 'Cette action est soumise aux règles d’intégrité référentielle P03/P04.', 'Confirmer'))) {
      return;
    }
    this.actionError.set(null);
    try {
      await firstValueFrom(this.patrimoineApi.delete(id));
      toast.success('Patrimoine supprimé ou archivé');
      await this.patrimoineStore.reload();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected addEtape(): void {
    const current = this.circuitEtapes();
    const nextOrder = current.length + 1;
    const defaultPatId = this.patrimoineStore.items()[0]?.id ?? 1;
    this.circuitEtapes.set([
      ...current,
      {
        ordre: nextOrder,
        patrimoineId: defaultPatId,
        dureeVisite: 60,
        descriptionEtape: '',
        moyenTransport: 'MIXTE',
      },
    ]);
  }

  protected removeEtape(index: number): void {
    const updated = this.circuitEtapes()
      .filter((_, idx) => idx !== index)
      .map((item, idx) => ({ ...item, ordre: idx + 1 }));
    this.circuitEtapes.set(updated);
  }

  protected updateEtapePatrimoine(index: number, patrimoineId: number): void {
    const updated = [...this.circuitEtapes()];
    if (updated[index]) {
      updated[index] = { ...updated[index], patrimoineId: Number(patrimoineId) };
      this.circuitEtapes.set(updated);
    }
  }

  protected updateEtapeDuree(index: number, dureeVisite: number): void {
    const updated = [...this.circuitEtapes()];
    if (updated[index]) {
      updated[index] = { ...updated[index], dureeVisite: Number(dureeVisite) };
      this.circuitEtapes.set(updated);
    }
  }

  protected startEditCircuit(c: Circuit): void {
    void this.loadGuidesCatalog();
    this.editingCircuitId.set(c.id);
    this.circuitForm.setValue({
      nomCircuit: c.nomCircuit,
      descriptionCircuit: c.descriptionCircuit ?? '',
      presentationTouristique: c.presentationTouristique ?? '',
      difficulte: c.difficulte ?? 'FACILE',
      moyenTransport: c.moyenTransport ?? 'MIXTE',
      zoneGeographique: c.zoneGeographique ?? 'BASSE_CASAMANCE',
      pointDepart: c.pointDepart ?? 'Ziguinchor',
      pointArrivee: c.pointArrivee ?? 'Casamance',
      placesMax: c.placesMax,
      prix: c.prix,
      statutCircuit: c.statutCircuit ?? 'PUBLIE',
      guideResponsableId: c.guideResponsableId ?? null,
    });
    if (c.etapes?.length) {
      this.circuitEtapes.set(
        c.etapes.map((e: Etape, i: number) => ({
          ordre: e.ordre ?? i + 1,
          patrimoineId: e.patrimoineId,
          dureeVisite: e.dureeVisite,
          descriptionEtape: e.descriptionEtape ?? '',
          moyenTransport: e.moyenTransport ?? 'MIXTE',
        }))
      );
    }
  }

  protected cancelEditCircuit(): void {
    this.editingCircuitId.set(null);
    this.circuitForm.reset({
      nomCircuit: '',
      descriptionCircuit: '',
      presentationTouristique: '',
      difficulte: 'FACILE',
      moyenTransport: 'MIXTE',
      zoneGeographique: 'BASSE_CASAMANCE',
      pointDepart: 'Ziguinchor',
      pointArrivee: 'Enampore, Basse-Casamance',
      placesMax: 20,
      prix: 15000,
      statutCircuit: 'PUBLIE',
      guideResponsableId: null,
    });
    this.circuitEtapes.set([
      {
        ordre: 1,
        patrimoineId: 1,
        dureeVisite: 60,
        descriptionEtape: 'Visite commentée du site patrimonial',
        moyenTransport: 'PIED',
      },
    ]);
  }

  protected async saveCircuit(): Promise<void> {
    this.actionError.set(null);
    if (this.circuitForm.invalid || this.circuitEtapes().length === 0) {
      this.circuitForm.markAllAsTouched();
      return;
    }
    const raw = this.circuitForm.getRawValue();
    const payload: Partial<Circuit> = {
      ...raw,
      guideResponsableId: raw.guideResponsableId ? Number(raw.guideResponsableId) : null,
      etapes: this.circuitEtapes().map((e, i) => ({
        ordre: i + 1,
        patrimoineId: e.patrimoineId,
        dureeVisite: e.dureeVisite,
        descriptionEtape: e.descriptionEtape,
        moyenTransport: e.moyenTransport,
        patrimoine: null,
      })),
    };
    try {
      const editId = this.editingCircuitId();
      if (editId) {
        await firstValueFrom(this.circuitApi.update(editId, payload));
        toast.success('Circuit touristique mis à jour');
      } else {
        await firstValueFrom(this.circuitApi.create(payload));
        toast.success('Nouveau circuit touristique créé');
      }
      this.cancelEditCircuit();
      await this.circuitStore.reload();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async publierCircuit(id: number): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.circuitApi.publier(id));
      toast.success('Circuit publié');
      await this.circuitStore.reload();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async archiverCircuit(id: number): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.circuitApi.archiver(id, 'Archivage administratif'));
      toast.success('Circuit archivé');
      await this.circuitStore.reload();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async testInterServiceComm(): Promise<void> {
    this.actionError.set(null);
    try {
      const res = await firstValueFrom(
        this.circuitApi.testerCommunication(this.commMode, this.commPatrimoineId)
      );
      this.commResult.set(JSON.stringify(res, null, 2));
      toast.success(`Communication ${this.commMode.toUpperCase()} validée`);
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async deleteCircuit(id: number): Promise<void> {
    if (!(await this.confirmDialog(`Archiver ou supprimer le circuit #${id} ?`, 'Un circuit référencé par des réservations ne sera jamais détruit physiquement.', 'Confirmer'))) {
      return;
    }
    this.actionError.set(null);
    try {
      await firstValueFrom(this.circuitApi.delete(id));
      toast.success('Circuit supprimé ou archivé');
      await this.circuitStore.reload();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected startEditEvenement(ev: Evenement): void {
    this.editingEvenementId.set(ev.id);
    this.evenementForm.setValue({
      nomEvenement: ev.nomEvenement,
      typeEvenement: ev.typeEvenement,
      patrimoineId: ev.patrimoineId ?? 1,
      dateDebut: (ev.dateDebut ?? '').slice(0, 16),
      dateFin: (ev.dateFin ?? '').slice(0, 16),
      horaires: ev.horaires ?? '09h00 - 17h00',
      organisateur: ev.organisateur ?? '',
      capaciteMax: ev.capaciteMax,
      prix: ev.prix,
      lieu: ev.lieu ?? '',
      conditionsAcces: ev.conditionsAcces ?? '',
      descriptionEvenement: ev.descriptionEvenement ?? '',
      ouvertReservation: ev.ouvertReservation === true,
    });
  }

  protected cancelEditEvenement(): void {
    this.editingEvenementId.set(null);
    this.evenementForm.reset({
      nomEvenement: '',
      typeEvenement: 'VISITE_GUIDEE',
      patrimoineId: 1,
      dateDebut: '2026-12-20T09:00',
      dateFin: '2026-12-20T17:00',
      horaires: '09h00 - 17h00',
      organisateur: 'Direction Régionale de la Culture de Ziguinchor',
      capaciteMax: 60,
      prix: 5000,
      lieu: 'Esplanade du Fleuve Casamance, Ziguinchor',
      conditionsAcces: 'Inscription préalable recommandée',
      descriptionEvenement: '',
      ouvertReservation: false,
    });
  }

  protected async saveEvenement(): Promise<void> {
    this.actionError.set(null);
    if (this.evenementForm.invalid) {
      this.evenementForm.markAllAsTouched();
      return;
    }
    const raw = this.evenementForm.getRawValue();
    const formatIso = (v: string) => (v.length === 16 ? `${v}:00` : v);
    const payload: Partial<Evenement> = {
      ...raw,
      dateDebut: formatIso(raw.dateDebut),
      dateFin: formatIso(raw.dateFin),
    };
    try {
      const editId = this.editingEvenementId();
      if (editId) {
        await firstValueFrom(this.evenementApi.update(editId, payload));
        toast.success('Événement mis à jour avec succès');
      } else {
        await firstValueFrom(this.evenementApi.create(payload));
        toast.success('Événement publié dans l’agenda culturel');
      }
      this.cancelEditEvenement();
      await this.evenementStore.reload();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async annulerEvenement(id: number): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(
        this.evenementApi.annuler(id, 'Reporté ou annulé par le gestionnaire')
      );
      toast.success('Événement marqué comme annulé');
      await this.evenementStore.reload();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async deleteEvenement(id: number): Promise<void> {
    if (!(await this.confirmDialog(`Archiver ou supprimer l’événement #${id} ?`, 'Si des réservations sont rattachées à cet événement, il sera protégé ou archivé.', 'Confirmer'))) {
      return;
    }
    this.actionError.set(null);
    try {
      await firstValueFrom(this.evenementApi.delete(id));
      toast.success('Événement supprimé ou archivé');
      await this.evenementStore.reload();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async loadReservationsPage(page: number): Promise<void> {
    this.actionError.set(null);
    try {
      const [paged, stats] = await Promise.all([
        firstValueFrom(
          this.reservationApi.rechercher({
            q: this.resSearch().trim() || undefined,
            statut: this.resStatutFilter(),
            type: this.resTypeFilter(),
            page,
            size: 10,
          })
        ),
        firstValueFrom(this.reservationApi.getStatistiques()),
      ]);
      this.adminReservations.set(paged.content ?? []);
      this.resPage.set(paged.page);
      this.resTotalPages.set(Math.max(1, paged.totalPages));
      this.resTotalElements.set(paged.totalElements);
      this.resStats.set(stats);
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async syncAdminReservation(id: number): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.reservationApi.synchroniser(id));
      toast.success(`Réservation #${id} synchronisée avec ms-paiement`);
      await this.loadReservationsPage(this.resPage());
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async cancelAdminReservation(r: Reservation): Promise<void> {
    if (!(await this.confirmDialog(
      `Annuler la réservation ${r.referenceReservation || '#' + r.id} ?`,
      `Cette action libérera les ${r.nombrePlaces} place(s) de ${r.nomClient}.`,
      'Annuler la réservation'
    ))) {
      return;
    }
    this.actionError.set(null);
    try {
      await firstValueFrom(this.reservationApi.cancel(r.id, 'Annulation administrative'));
      toast.success(`Réservation #${r.id} annulée`);
      await this.loadReservationsPage(this.resPage());
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async loadPaiementsPage(page: number): Promise<void> {
    this.actionError.set(null);
    try {
      const [paged, stats] = await Promise.all([
        firstValueFrom(
          this.paiementApi.rechercher({
            q: this.paySearch().trim() || undefined,
            statut: this.payStatutFilter(),
            modePaiement: this.payModeFilter(),
            page,
            size: 10,
          })
        ),
        firstValueFrom(this.paiementApi.getStatistiques()),
      ]);
      this.adminPaiements.set(paged.content ?? []);
      this.payPage.set(paged.page);
      this.payTotalPages.set(Math.max(1, paged.totalPages));
      this.payTotalElements.set(paged.totalElements);
      this.payStats.set(stats);
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async rembourserAdminPaiement(p: Paiement): Promise<void> {
    if (!(await this.confirmDialog(
      `Rembourser intégralement ${p.referenceTransaction} ?`,
      `Remboursement simulé P04 de ${p.montant} ${p.devise || 'XOF'} pour la réservation #${p.reservationId} (réservé ADMINISTRATEUR).`,
      'Confirmer le remboursement simulé'
    ))) {
      return;
    }
    this.actionError.set(null);
    try {
      await firstValueFrom(this.paiementApi.rembourser(p.id, 'Remboursement intégral validé depuis le back-office'));
      toast.success(`Paiement ${p.referenceTransaction} remboursé (simulé)`);
      await this.loadPaiementsPage(this.payPage());
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async rejouerOutbox(): Promise<void> {
    this.actionError.set(null);
    try {
      const res = await firstValueFrom(this.paiementApi.rejouerOutbox());
      toast.success(`${res.evenementsSynchronises} événement(s) outbox relancé(s)`);
      await this.loadPaiementsPage(this.payPage());
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async loadUsers(): Promise<void> {
    this.actionError.set(null);
    try {
      const list = await this.authStore.getAllUsers();
      this.users.set(list);
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async createUser(): Promise<void> {
    this.actionError.set(null);
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }
    try {
      const created = await this.authStore.createUserByAdmin(this.userForm.getRawValue());
      toast.success(`Compte ${created.email} (${created.role}) créé`);
      this.userForm.reset({
        prenom: '',
        nom: '',
        email: '',
        motDePasse: '',
        role: 'GESTIONNAIRE_SITE',
      });
      await this.loadUsers();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async deleteUser(id: number): Promise<void> {
    if (!(await this.confirmDialog(`Supprimer l’utilisateur #${id} ?`, 'Cette action est irréversible.', 'Supprimer'))) {
      return;
    }
    this.actionError.set(null);
    try {
      await this.authStore.deleteUser(id);
      toast.success('Compte utilisateur supprimé');
      await this.loadUsers();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async loadGuidesCatalog(): Promise<void> {
    try {
      const guides = await firstValueFrom(this.guideApi.getPublicGuides());
      this.guidesCatalog.set(guides);
    } catch {
      this.guidesCatalog.set([]);
    }
  }

  protected guideLabel(guideUtilisateurId: number): string {
    const found = this.guidesCatalog().find((g) => g.utilisateurId === guideUtilisateurId);
    return found ? `${found.prenom} ${found.nom} (#${guideUtilisateurId})` : `#${guideUtilisateurId}`;
  }

  protected async assignGuideToCircuit(circuitId: number, rawGuideId: unknown): Promise<void> {
    this.actionError.set(null);
    const guideId = rawGuideId === '' || rawGuideId == null ? null : Number(rawGuideId);
    try {
      await firstValueFrom(this.circuitApi.affecterGuideResponsable(circuitId, guideId));
      toast.success(guideId ? `Guide #${guideId} affecté au circuit #${circuitId}` : `Affectation guide retirée du circuit #${circuitId}`);
      await this.circuitStore.reload();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async loadAdminGuides(): Promise<void> {
    this.actionError.set(null);
    try {
      const list = await firstValueFrom(this.guideApi.getAllAdmin(this.guideStatutFilter()));
      this.adminGuides.set(list);
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected openGuideDecision(
    guide: GuideProfil,
    action: 'VALIDER' | 'REJETER' | 'SUSPENDRE' | 'REACTIVER' | 'DESACTIVER'
  ): void {
    this.selectedGuideAction.set({ guide, action });
    this.guideActionMotif =
      action === 'VALIDER' || action === 'REACTIVER'
        ? 'Dossier vérifié et conforme'
        : '';
  }

  protected cancelGuideDecision(): void {
    this.selectedGuideAction.set(null);
    this.guideActionMotif = '';
  }

  protected async submitGuideDecision(): Promise<void> {
    const pending = this.selectedGuideAction();
    if (!pending) return;
    const motif = this.guideActionMotif.trim();
    if ((pending.action === 'REJETER' || pending.action === 'SUSPENDRE') && motif.length < 3) {
      this.actionError.set('Un motif explicite (minimum 3 caractères) est obligatoire pour un rejet ou une suspension.');
      return;
    }
    this.actionError.set(null);
    try {
      const id = pending.guide.id;
      if (pending.action === 'VALIDER') {
        await firstValueFrom(this.guideApi.validerProfil(id, motif || undefined));
        toast.success(`Guide #${id} validé et publié dans l'annuaire`);
      } else if (pending.action === 'REJETER') {
        await firstValueFrom(this.guideApi.rejeterProfil(id, motif));
        toast.success(`Dossier guide #${id} rejeté`);
      } else if (pending.action === 'SUSPENDRE') {
        await firstValueFrom(this.guideApi.suspendreProfil(id, motif));
        toast.success(`Guide #${id} suspendu`);
      } else if (pending.action === 'REACTIVER') {
        await firstValueFrom(this.guideApi.reactiverProfil(id, motif || undefined));
        toast.success(`Guide #${id} réactivé`);
      } else {
        await firstValueFrom(this.guideApi.desactiverProfilParAdmin(id, motif || undefined));
        toast.success(`Guide #${id} désactivé`);
      }
      this.cancelGuideDecision();
      await this.loadAdminGuides();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async loadGuideHistorique(guide: GuideProfil): Promise<void> {
    this.actionError.set(null);
    try {
      const list = await firstValueFrom(this.guideApi.getHistorique(guide.id));
      this.guideHistoriqueTarget.set(guide);
      this.guideHistorique.set(list);
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async loadModerationData(): Promise<void> {
    this.actionError.set(null);
    try {
      const [sigs, avis] = await Promise.all([
        firstValueFrom(this.avisApi.getSignalementsModeration(this.signalementStatutFilter())),
        firstValueFrom(this.avisApi.getAvisModeration(this.avisCibleFilter(), this.avisStatutFilter())),
      ]);
      this.moderationSignalements.set(sigs);
      this.moderationAvis.set(avis);
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected openSignalementDecision(
    signalement: SignalementAvis,
    decision: 'VALIDE_CONTENU_RETIRE' | 'REJETE_ABUSIF'
  ): void {
    this.selectedSignalementAction.set({ signalement, decision });
    this.signalementDecisionMotif =
      decision === 'VALIDE_CONTENU_RETIRE'
        ? 'Contenu retiré suite au signalement vérifié'
        : 'Signalement examiné et jugé non fondé';
  }

  protected async submitSignalementDecision(): Promise<void> {
    const pending = this.selectedSignalementAction();
    if (!pending) return;
    const motif = this.signalementDecisionMotif.trim();
    if (motif.length < 3) {
      this.actionError.set('La justification de modération est obligatoire (minimum 3 caractères).');
      return;
    }
    this.actionError.set(null);
    try {
      await firstValueFrom(
        this.avisApi.traiterSignalement(
          pending.signalement.id,
          pending.decision,
          motif,
          pending.decision === 'VALIDE_CONTENU_RETIRE' ? 'MASQUE' : undefined
        )
      );
      toast.success(`Signalement #${pending.signalement.id} traité`);
      this.selectedSignalementAction.set(null);
      await this.loadModerationData();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected openAvisModeration(avis: Avis, decision: StatutModerationAvis): void {
    this.selectedAvisAction.set({ avis, decision });
    this.avisModerationMotif = decision === 'APPROUVE' ? 'Avis vérifié et approuvé' : '';
  }

  protected async submitAvisModeration(): Promise<void> {
    const pending = this.selectedAvisAction();
    if (!pending) return;
    const motif = this.avisModerationMotif.trim();
    if (motif.length < 3) {
      this.actionError.set('Une justification écrite est obligatoire pour toute décision de modération.');
      return;
    }
    this.actionError.set(null);
    try {
      await firstValueFrom(
        this.avisApi.deciderModerationAvis(pending.avis.id, pending.decision, motif)
      );
      toast.success(`Avis #${pending.avis.id} passé au statut ${pending.decision}`);
      this.selectedAvisAction.set(null);
      await this.loadModerationData();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async loadAvisModerationHistorique(avis: Avis): Promise<void> {
    this.actionError.set(null);
    try {
      const list = await firstValueFrom(this.avisApi.getHistoriqueModeration(avis.id));
      this.avisHistoriqueTarget.set(avis);
      this.avisModerationHistorique.set(list);
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async loadAdminNotifications(page: number): Promise<void> {
    this.actionError.set(null);
    try {
      const paged = await firstValueFrom(
        this.notificationApi.getAllAdminPaged(
          page,
          15,
          this.notifAdminStatutFilter(),
          this.notifAdminTypeFilter().trim() || undefined
        )
      );
      this.adminNotifications.set(paged.content ?? []);
      this.notifAdminPage.set(paged.page);
      this.notifAdminTotalPages.set(Math.max(1, paged.totalPages));
      this.notifAdminTotalElements.set(paged.totalElements);
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async retrySingleNotification(id: number): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.notificationApi.relancerNotification(id));
      toast.success(`Relance exécutée pour la notification #${id}`);
      await this.loadAdminNotifications(this.notifAdminPage());
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async triggerNotificationsRetrySweep(): Promise<void> {
    this.actionError.set(null);
    try {
      const res = await firstValueFrom(this.notificationApi.forcerRepriseEchecs());
      toast.success(`${res.notificationsLivrees} notification(s) livrée(s) lors du rattrapage`);
      await this.loadAdminNotifications(this.notifAdminPage());
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected notificationStatusBadgeClass(statut: StatutNotification): string {
    if (statut === 'ENVOYEE') return 'ui-badge ui-badge--success';
    if (statut === 'ECHEC') return 'ui-badge ui-badge--danger';
    if (statut === 'ECHEC_TEMPORAIRE' || statut === 'EN_ATTENTE') return 'ui-badge ui-badge--warning';
    return 'ui-badge ui-badge--neutral';
  }

  private async confirmDialog(title: string, message: string, confirmLabel: string): Promise<boolean> {
    const ref = this.dialog.open<boolean>(UiConfirmDialogComponent, {
      data: {
        title,
        message,
        confirmLabel,
        cancelLabel: 'Annuler',
        variant: 'danger',
      },
    });
    const confirmed = await firstValueFrom(ref.closed);
    return Boolean(confirmed);
  }
}
