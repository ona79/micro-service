import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideCalendar,
  LucideLandmark,
  LucidePlus,
  LucideRoute,
  LucideShieldCheck,
  LucideTrash2,
  LucideUsers,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AuthStore, formatRoleLabel } from '../../../../core/auth/auth.store';
import { normalizeHttpError } from '../../../../core/interceptors/http-error.interceptor';
import { Patrimoine } from '../../../../core/models/patrimoine.model';
import { RoleUtilisateur, Utilisateur } from '../../../../core/models/utilisateur.model';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { CircuitApiService } from '../../../circuits/data-access/circuit-api.service';
import { CircuitStore } from '../../../circuits/data-access/circuit.store';
import { EvenementApiService } from '../../../evenements/data-access/evenement-api.service';
import { EvenementStore } from '../../../evenements/data-access/evenement.store';
import { PatrimoineApiService } from '../../../patrimoines/data-access/patrimoine-api.service';
import { PatrimoineStore } from '../../../patrimoines/data-access/patrimoine.store';

type AdminTab = 'patrimoines' | 'circuits' | 'evenements' | 'utilisateurs';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    FcfaPricePipe,
    UiErrorBannerComponent,
    LucideLandmark,
    LucideRoute,
    LucideCalendar,
    LucideUsers,
    LucidePlus,
    LucideTrash2,
    LucideShieldCheck,
  ],
  template: `
    <div class="page-section">
      <div class="container">
        <header class="admin-header">
          <div>
            <div class="admin-header__badges">
              <span class="ui-badge ui-badge--terracotta">Back-Office Métier</span>
              <span class="ui-badge ui-badge--success">
                <svg lucideShieldCheck [size]="13" aria-hidden="true"></svg>
                Rôle actif : {{ authStore.roleLabel() }}
              </span>
            </div>
            <h1 class="admin-header__title">Administration du Patrimoine &amp; des Comptes</h1>
            <p class="admin-header__subtitle">
              Gérez les sites patrimoniaux, les parcours touristiques, l’agenda culturel et,
              selon vos habilitations, les utilisateurs de la plateforme.
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
            [class.admin-tab--active]="activeTab() === 'utilisateurs'"
            (click)="switchTab('utilisateurs')"
          >
            <svg lucideUsers [size]="16" aria-hidden="true"></svg>
            <span>Gestion des utilisateurs</span>
          </button>
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
                {{ editingPatrimoineId() ? 'Modifier le patrimoine #' + editingPatrimoineId() : 'Ajouter un site patrimonial' }}
              </h2>
              <form [formGroup]="patrimoineForm" (ngSubmit)="savePatrimoine()" class="admin-form">
                <div class="form-row">
                  <div class="form-field">
                    <label for="pat-nom">Nom du site *</label>
                    <input id="pat-nom" type="text" formControlName="nomPatrimoine" class="form-input" placeholder="Ex: Fort d'Estrées" />
                  </div>
                  <div class="form-field">
                    <label for="pat-code">Code officiel *</label>
                    <input id="pat-code" type="text" formControlName="codePatrimoine" class="form-input" placeholder="Ex: PAT-DKR-007" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="pat-adr">Adresse / Localité *</label>
                    <input id="pat-adr" type="text" formControlName="adressePatrimoine" class="form-input" placeholder="Ex: Île de Gorée, Dakar" />
                  </div>
                  <div class="form-field">
                    <label for="pat-cap">Capacité d'accueil max *</label>
                    <input id="pat-cap" type="number" formControlName="capacitePatrimoine" class="form-input" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="pat-lat">Latitude GPS</label>
                    <input id="pat-lat" type="number" step="0.0001" formControlName="latitudePatrimoine" class="form-input" />
                  </div>
                  <div class="form-field">
                    <label for="pat-lon">Longitude GPS</label>
                    <input id="pat-lon" type="number" step="0.0001" formControlName="longitudePatrimoine" class="form-input" />
                  </div>
                </div>

                <div class="form-field">
                  <label for="pat-desc">Description *</label>
                  <textarea id="pat-desc" rows="2" formControlName="descriptionPatrimoine" class="form-input"></textarea>
                </div>

                <div class="form-field">
                  <label for="pat-hist">Notice historique</label>
                  <textarea id="pat-hist" rows="2" formControlName="historiquePatrimoine" class="form-input"></textarea>
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
                      <th>Code</th>
                      <th>Nom</th>
                      <th>Capacité</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of patrimoineStore.items(); track p.id) {
                      <tr>
                        <td><span class="ui-badge">{{ p.codePatrimoine }}</span></td>
                        <td><strong>{{ p.nomPatrimoine }}</strong><br /><small>{{ p.adressePatrimoine }}</small></td>
                        <td class="tabular-nums">{{ p.capacitePatrimoine }}</td>
                        <td class="table-actions">
                          <button type="button" class="btn-xs" (click)="startEditPatrimoine(p)">Modifier</button>
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
              <h2 class="admin-card__title">Démonstrateur de Communication Inter-Services</h2>
              <p class="card-helper">
                Testez en direct l’appel synchrone entre <code>ms-circuit</code> et
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

              <button type="button" class="btn-primary" (click)="testInterServiceComm()">
                Tester l’appel inter-services
              </button>

              @if (commResult()) {
                <pre class="comm-result">{{ commResult() }}</pre>
              }
            </section>

            <section class="admin-card">
              <h2 class="admin-card__title">Circuits actifs ({{ circuitStore.items().length }})</h2>
              <div class="table-wrap">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Circuit</th>
                      <th>Distance &amp; Durée</th>
                      <th>Tarif</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of circuitStore.items(); track c.id) {
                      <tr>
                        <td><strong>{{ c.nomCircuit }}</strong><br /><small>{{ c.etapes.length }} étape(s)</small></td>
                        <td class="tabular-nums">{{ c.distanceTotale || 0 }} km · {{ c.dureeEstimee }} min</td>
                        <td class="tabular-nums">{{ c.prix | fcfaPrice }}</td>
                        <td>
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
              <h2 class="admin-card__title">Programmer un événement culturel</h2>
              <form [formGroup]="evenementForm" (ngSubmit)="saveEvenement()" class="admin-form">
                <div class="form-field">
                  <label for="evt-nom">Intitulé de l'événement *</label>
                  <input id="evt-nom" type="text" formControlName="nomEvenement" class="form-input" />
                </div>

                <div class="form-row">
                  <div class="form-field">
                    <label for="evt-type">Catégorie *</label>
                    <select id="evt-type" formControlName="typeEvenement" class="form-input">
                      <option value="FESTIVAL">Festival</option>
                      <option value="EXPOSITION">Exposition</option>
                      <option value="VISITE_GUIDEE">Visite guidée</option>
                      <option value="CONFERENCE">Conférence</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label for="evt-pat">Site patrimonial hôte *</label>
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
                    <label for="evt-cap">Capacité max *</label>
                    <input id="evt-cap" type="number" formControlName="capaciteMax" class="form-input" />
                  </div>
                  <div class="form-field">
                    <label for="evt-prix">Tarif (FCFA) *</label>
                    <input id="evt-prix" type="number" formControlName="prix" class="form-input" />
                  </div>
                </div>

                <div class="form-field">
                  <label for="evt-lieu">Lieu précis *</label>
                  <input id="evt-lieu" type="text" formControlName="lieu" class="form-input" />
                </div>

                <div class="form-field">
                  <label for="evt-desc">Description</label>
                  <textarea id="evt-desc" rows="2" formControlName="descriptionEvenement" class="form-input"></textarea>
                </div>

                <button type="submit" class="btn-primary">
                  <svg lucidePlus [size]="15" aria-hidden="true"></svg>
                  <span>Publier l'événement</span>
                </button>
              </form>
            </section>

            <section class="admin-card">
              <h2 class="admin-card__title">Agenda programmé ({{ evenementStore.items().length }})</h2>
              <div class="table-wrap">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>Événement</th>
                      <th>Type</th>
                      <th>Capacité</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (ev of evenementStore.items(); track ev.id) {
                      <tr>
                        <td><strong>{{ ev.nomEvenement }}</strong><br /><small>{{ ev.lieu }}</small></td>
                        <td><span class="ui-badge">{{ ev.typeEvenement }}</span></td>
                        <td class="tabular-nums">{{ ev.capaciteMax }} places</td>
                        <td>
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

        <!-- ONGLET 4 : GESTION DES UTILISATEURS (ADMINISTRATEUR UNIQUEMENT) -->
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

    @media (max-width: 920px) {
      .admin-split,
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AdminDashboardPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly patrimoineApi = inject(PatrimoineApiService);
  private readonly circuitApi = inject(CircuitApiService);
  private readonly evenementApi = inject(EvenementApiService);

  protected readonly authStore = inject(AuthStore);
  protected readonly patrimoineStore = inject(PatrimoineStore);
  protected readonly circuitStore = inject(CircuitStore);
  protected readonly evenementStore = inject(EvenementStore);

  protected readonly activeTab = signal<AdminTab>('patrimoines');
  protected readonly editingPatrimoineId = signal<number | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly users = signal<Utilisateur[]>([]);
  protected readonly commResult = signal<string | null>(null);

  protected commMode: 'feign' | 'resttemplate' | 'webclient' = 'feign';
  protected commPatrimoineId = 1;

  protected readonly currentUserId = computed(() => this.authStore.user()?.id ?? null);

  protected readonly patrimoineForm = this.fb.nonNullable.group({
    nomPatrimoine: ['', [Validators.required]],
    codePatrimoine: ['', [Validators.required]],
    adressePatrimoine: ['', [Validators.required]],
    capacitePatrimoine: [200, [Validators.required, Validators.min(1)]],
    latitudePatrimoine: [14.6672],
    longitudePatrimoine: [-17.399],
    descriptionPatrimoine: ['', [Validators.required]],
    historiquePatrimoine: [''],
  });

  protected readonly evenementForm = this.fb.nonNullable.group({
    nomEvenement: ['', [Validators.required]],
    typeEvenement: ['VISITE_GUIDEE' as const, [Validators.required]],
    patrimoineId: [1, [Validators.required]],
    dateDebut: ['2026-12-20T09:00', [Validators.required]],
    dateFin: ['2026-12-20T17:00', [Validators.required]],
    capaciteMax: [60, [Validators.required, Validators.min(1)]],
    prix: [5000, [Validators.required, Validators.min(0)]],
    lieu: ['Île de Gorée, Dakar', [Validators.required]],
    descriptionEvenement: [''],
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
    if (tab === 'utilisateurs' && this.authStore.isAdmin()) {
      void this.loadUsers();
    }
  }

  protected startEditPatrimoine(p: Patrimoine): void {
    this.editingPatrimoineId.set(p.id);
    this.patrimoineForm.setValue({
      nomPatrimoine: p.nomPatrimoine,
      codePatrimoine: p.codePatrimoine,
      adressePatrimoine: p.adressePatrimoine ?? '',
      capacitePatrimoine: p.capacitePatrimoine,
      latitudePatrimoine: p.latitudePatrimoine,
      longitudePatrimoine: p.longitudePatrimoine,
      descriptionPatrimoine: p.descriptionPatrimoine ?? '',
      historiquePatrimoine: p.historiquePatrimoine ?? '',
    });
  }

  protected cancelEditPatrimoine(): void {
    this.editingPatrimoineId.set(null);
    this.patrimoineForm.reset({
      nomPatrimoine: '',
      codePatrimoine: '',
      adressePatrimoine: '',
      capacitePatrimoine: 200,
      latitudePatrimoine: 14.6672,
      longitudePatrimoine: -17.399,
      descriptionPatrimoine: '',
      historiquePatrimoine: '',
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

  protected async deletePatrimoine(id: number): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.patrimoineApi.delete(id));
      toast.success('Patrimoine supprimé');
      await this.patrimoineStore.reload();
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
    this.actionError.set(null);
    try {
      await firstValueFrom(this.circuitApi.delete(id));
      toast.success('Circuit supprimé');
      await this.circuitStore.reload();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async saveEvenement(): Promise<void> {
    this.actionError.set(null);
    if (this.evenementForm.invalid) {
      this.evenementForm.markAllAsTouched();
      return;
    }
    const raw = this.evenementForm.getRawValue();
    const formatIso = (v: string) => (v.length === 16 ? `${v}:00` : v);
    try {
      await firstValueFrom(
        this.evenementApi.create({
          ...raw,
          dateDebut: formatIso(raw.dateDebut),
          dateFin: formatIso(raw.dateFin),
        })
      );
      toast.success('Événement publié dans l’agenda culturel');
      await this.evenementStore.reload();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }

  protected async deleteEvenement(id: number): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.evenementApi.delete(id));
      toast.success('Événement supprimé');
      await this.evenementStore.reload();
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
    this.actionError.set(null);
    try {
      await this.authStore.deleteUser(id);
      toast.success('Compte utilisateur supprimé');
      await this.loadUsers();
    } catch (err) {
      this.actionError.set(normalizeHttpError(err).message);
    }
  }
}
