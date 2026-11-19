import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideArchive,
  LucideArrowDown,
  LucideArrowUp,
  LucideCheckCircle2,
  LucideEye,
  LucideMoreHorizontal,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideSend,
  LucideTrash2,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AuthStore } from '../../../../core/auth/auth.store';
import { PermissionService } from '../../../../core/auth/permissions';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import {
  Circuit,
  Difficulte,
  MoyenTransport,
  StatutCircuit,
} from '../../../../core/models/circuit.model';
import { GuideProfil } from '../../../../core/models/guide.model';
import { Patrimoine } from '../../../../core/models/patrimoine.model';
import { CircuitStats } from '../../../../core/models/statistics.model';
import { UiConfirmDialogComponent } from '../../../../shared/components/ui-confirm-dialog/ui-confirm-dialog.component';
import { UiDetailDrawerComponent } from '../../../../shared/components/ui-detail-drawer/ui-detail-drawer.component';
import { UiDrawerComponent } from '../../../../shared/components/ui-drawer/ui-drawer.component';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import {
  FilterStatusPill,
  UiFilterBarComponent,
} from '../../../../shared/components/ui-filter-bar/ui-filter-bar.component';
import { UiKpiCardComponent } from '../../../../shared/components/ui-kpi-card/ui-kpi-card.component';
import { UiPageHeaderComponent } from '../../../../shared/components/ui-page-header/ui-page-header.component';
import { UiPaginationComponent } from '../../../../shared/components/ui-pagination/ui-pagination.component';
import { DurationMinutesPipe } from '../../../../shared/pipes/duration-minutes.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { CircuitApiService } from '../../../circuits/data-access/circuit-api.service';
import { GuideApiService } from '../../../guides/data-access/guide-api.service';
import { PatrimoineApiService } from '../../../patrimoines/data-access/patrimoine-api.service';

@Component({
  selector: 'app-pro-circuits-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    FcfaPricePipe,
    UiPageHeaderComponent,
    UiDrawerComponent,
    UiPaginationComponent,
    UiDetailDrawerComponent,
    UiEmptyStateComponent,
    UiErrorBannerComponent,
    UiFilterBarComponent,
    LucidePlus,
    LucideRefreshCw,
    LucideArrowUp,
    LucideArrowDown,
    LucideMoreHorizontal,
  ],
  template: `
    <app-ui-page-header
      [title]="authStore.isGuide() ? 'Mes circuits' : 'Circuits'"
      subtitle="Gérez les étapes, les guides affectés et la publication des circuits."
    >
      <div header-actions>
        <button type="button" class="bo-btn" (click)="load()" [disabled]="loading()">
          <svg lucideRefreshCw [size]="14" aria-hidden="true"></svg>
          <span>Actualiser</span>
        </button>
        @if (permissions.has('CIRCUIT:CREER')) {
          <button type="button" class="bo-btn bo-btn--primary" (click)="openCreateForm()">
            <svg lucidePlus [size]="15" aria-hidden="true"></svg>
            <span>Nouveau circuit</span>
          </button>
        }
      </div>
    </app-ui-page-header>

    @if (actionError()) {
      <app-ui-error-banner [message]="actionError()!" [showRetry]="false" />
    }

    <app-ui-drawer
      [open]="formOpen()"
      width="lg"
      [title]="editingId() ? 'Modifier le circuit n° ' + editingId() : 'Créer un circuit Casamance'"
      [showFooter]="false"
      (closed)="closeForm()"
    >
        <form [formGroup]="form" (ngSubmit)="saveCircuit()" class="bo-form-grid" novalidate>
          <div class="bo-field">
            <label for="cir-nom" class="bo-label">Titre du circuit *</label>
            <input id="cir-nom" type="text" class="bo-input" formControlName="nomCircuit" />
          </div>

          <div class="bo-field">
            <label for="cir-zone" class="bo-label">Zone géographique *</label>
            <select id="cir-zone" class="bo-select" formControlName="zoneGeographique">
              <option value="BASSE_CASAMANCE">BASSE_CASAMANCE</option>
              <option value="MOYENNE_CASAMANCE">MOYENNE_CASAMANCE</option>
              <option value="HAUTE_CASAMANCE">HAUTE_CASAMANCE</option>
            </select>
          </div>

          <div class="bo-field bo-form-span2">
            <label for="cir-desc" class="bo-label">Description du parcours *</label>
            <textarea id="cir-desc" class="bo-textarea" rows="2" formControlName="descriptionCircuit"></textarea>
          </div>

          <div class="bo-field">
            <label for="cir-diff" class="bo-label">Difficulté *</label>
            <select id="cir-diff" class="bo-select" formControlName="difficulte">
              <option value="FACILE">FACILE</option>
              <option value="MOYEN">MOYEN</option>
              <option value="DIFFICILE">DIFFICILE</option>
            </select>
          </div>

          <div class="bo-field">
            <label for="cir-tr" class="bo-label">Moyen de transport principal *</label>
            <select id="cir-tr" class="bo-select" formControlName="moyenTransport">
              <option value="PIED">PIED</option>
              <option value="PIROGUE">PIROGUE</option>
              <option value="VELO">VELO</option>
              <option value="VEHICULE_4X4">VEHICULE_4X4</option>
              <option value="MINIBUS">MINIBUS</option>
              <option value="MIXTE">MIXTE</option>
            </select>
          </div>

          <div class="bo-field">
            <label for="cir-dep" class="bo-label">Point de départ</label>
            <input id="cir-dep" type="text" class="bo-input" formControlName="pointDepart" />
          </div>

          <div class="bo-field">
            <label for="cir-arr" class="bo-label">Point d'arrivée</label>
            <input id="cir-arr" type="text" class="bo-input" formControlName="pointArrivee" />
          </div>

          <div class="bo-field">
            <label for="cir-places" class="bo-label">Places maximum *</label>
            <input id="cir-places" type="number" min="1" class="bo-input" formControlName="placesMax" />
          </div>

          <div class="bo-field">
            <label for="cir-prix" class="bo-label">Prix (XOF) *</label>
            <input id="cir-prix" type="number" min="0" step="500" class="bo-input" formControlName="prix" />
          </div>

          @if (!authStore.isGuide()) {
            <div class="bo-field">
              <label for="cir-guide" class="bo-label">Guide responsable affecté</label>
              <select id="cir-guide" class="bo-select" formControlName="guideResponsableId">
                <option [ngValue]="null">-- Aucun guide affecté --</option>
                @for (g of guidesValides(); track g.utilisateurId) {
                  <option [ngValue]="g.utilisateurId">
                    {{ g.prenom }} {{ g.nom }} ({{ g.zonesIntervention }})
                  </option>
                }
              </select>
            </div>

            <div class="bo-field">
              <label for="cir-statut" class="bo-label">Statut cible</label>
              <select id="cir-statut" class="bo-select" formControlName="statutCircuit">
                <option value="BROUILLON">BROUILLON</option>
                <option value="SOUMIS">SOUMIS</option>
                @if (permissions.has('CIRCUIT:PUBLIER')) {
                  <option value="PUBLIE">PUBLIE</option>
                }
              </select>
            </div>
          }

          <div class="bo-form-span2">
            <div class="bo-panel__head" style="margin-bottom: var(--space-2);">
              <span class="bo-label">Étapes ordonnées du circuit ({{ etapesArray.length }}) *</span>
              <button type="button" class="bo-btn bo-btn--sm" (click)="addEtape()">
                <svg lucidePlus [size]="13" aria-hidden="true"></svg>
                <span>Ajouter une étape</span>
              </button>
            </div>

            <div formArrayName="etapes" style="display: grid; gap: var(--space-3);">
              @for (grp of etapesArray.controls; track $index) {
                <div
                  [formGroupName]="$index"
                  style="padding: var(--space-3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); background: var(--surface-canvas); display: grid; gap: var(--space-2);"
                >
                  <div class="bo-panel__head" style="margin: 0;">
                    <strong style="font-size: var(--text-xs);">Étape {{ $index + 1 }}</strong>
                    <div class="bo-actions-cell">
                      <button type="button" class="bo-btn bo-btn--sm" [disabled]="$index === 0" (click)="moveEtape($index, -1)" aria-label="Monter étape">
                        <svg lucideArrowUp [size]="12" aria-hidden="true"></svg>
                      </button>
                      <button type="button" class="bo-btn bo-btn--sm" [disabled]="$index === etapesArray.length - 1" (click)="moveEtape($index, 1)" aria-label="Descendre étape">
                        <svg lucideArrowDown [size]="12" aria-hidden="true"></svg>
                      </button>
                      <button type="button" class="bo-btn bo-btn--sm bo-btn--danger" [disabled]="etapesArray.length <= 1" (click)="removeEtape($index)">
                        Retirer
                      </button>
                    </div>
                  </div>
                  <div class="bo-form-grid">
                    <div class="bo-field">
                      <label class="bo-label">Patrimoine *</label>
                      <select class="bo-select" formControlName="patrimoineId" [attr.aria-label]="'Patrimoine de l étape ' + ($index + 1)">
                        <option [ngValue]="0">-- Choisir un patrimoine --</option>
                        @for (pat of patrimoinesDisponibles(); track pat.id) {
                          <option [ngValue]="pat.id">{{ pat.codePatrimoine }} — {{ pat.nomPatrimoine }}</option>
                        }
                      </select>
                    </div>
                    <div class="bo-field">
                      <label class="bo-label">Durée visite (min) *</label>
                      <input type="number" min="5" class="bo-input" formControlName="dureeVisite" [attr.aria-label]="'Durée de visite en minutes pour l étape ' + ($index + 1)" />
                    </div>
                    <div class="bo-field">
                      <label class="bo-label">Transport étape</label>
                      <select class="bo-select" formControlName="moyenTransport" [attr.aria-label]="'Moyen de transport pour l étape ' + ($index + 1)">
                        <option value="PIED">PIED</option>
                        <option value="PIROGUE">PIROGUE</option>
                        <option value="VELO">VELO</option>
                        <option value="VEHICULE_4X4">VEHICULE_4X4</option>
                        <option value="MINIBUS">MINIBUS</option>
                        <option value="MIXTE">MIXTE</option>
                      </select>
                    </div>
                    <div class="bo-field">
                      <label class="bo-label">Description étape</label>
                      <input type="text" class="bo-input" formControlName="descriptionEtape" [attr.aria-label]="'Consignes et description pour l étape ' + ($index + 1)" placeholder="Accueil et médiation culturelle..." />
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="bo-form-span2 bo-actions-cell">
            <button type="submit" class="bo-btn bo-btn--primary" [disabled]="saving()">
              <span>{{ saving() ? 'Enregistrement...' : (editingId() ? 'Enregistrer les modifications' : 'Créer le circuit') }}</span>
            </button>
            <button type="button" class="bo-btn" (click)="closeForm()">Annuler</button>
          </div>
        </form>
    </app-ui-drawer>

    <section class="bo-panel">
      @if (!authStore.isGuide()) {
        <app-ui-filter-bar
          [statusPills]="statusPills()"
          [activeStatus]="statutFilter || 'ALL'"
          (statusChange)="statutFilter = $event === 'ALL' ? '' : $any($event); loadPage(0)"
          [searchValue]="q"
          searchPlaceholder="Rechercher nom, point de départ..."
          searchAriaLabel="Rechercher un circuit"
          [resultsLabel]="totalElements() + ' circuit(s)'"
          [hasActiveFilters]="!!(q.trim() || statutFilter || diffFilter)"
          (searchChange)="q = $event; loadPage(0)"
          (reset)="q = ''; statutFilter = ''; diffFilter = ''; loadPage(0)"
        >
          <ng-container filter-primary>
            <select id="cir-fdiff" aria-label="Difficulté" class="ui-filter-control" [(ngModel)]="diffFilter" (ngModelChange)="loadPage(0)">
              <option value="">Difficulté : Toutes</option>
              <option value="FACILE">FACILE</option>
              <option value="MOYEN">MOYEN</option>
              <option value="DIFFICILE">DIFFICILE</option>
            </select>
          </ng-container>
        </app-ui-filter-bar>
      }

      @if (error()) {
        <app-ui-error-banner [message]="error()!" (retry)="load()" />
      } @else if (loading()) {
        <p class="bo-cell-sub">Chargement des circuits...</p>
      } @else if (items().length === 0) {
        <app-ui-empty-state
          title="Aucun circuit trouvé"
          description="Aucun circuit ne correspond au filtre ou à votre périmètre actuel."
        />
      } @else {
        <div class="bo-table-wrap">
          <table class="bo-table">
            <thead>
              <tr>
                <th>Circuit &amp; Étapes</th>
                <th>Métriques calculées</th>
                <th>Guide affecté</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (c of items(); track c.id) {
                <tr>
                  <td>
                    <span class="bo-cell-one bo-cell-title" [title]="c.nomCircuit + ' · ' + c.etapes.length + ' étape(s)'">
                      {{ c.nomCircuit }}
                    </span>
                  </td>
                  <td class="tabular-nums" [title]="(c.prix | fcfaPrice) + ' · ' + c.placesMax + ' pl. · ' + c.distanceTotale + ' km'">
                    {{ c.prix | fcfaPrice }} · {{ c.placesMax }} pl.
                  </td>
                  <td>
                    @if (c.guideResponsableId) {
                      <span class="ui-badge ui-badge--success">Guide {{ c.guideResponsableId }}</span>
                    } @else {
                      <span class="ui-badge ui-badge--neutral">Non affecté</span>
                    }
                  </td>
                  <td>
                    <span
                      class="ui-badge"
                      [class.ui-badge--success]="c.statutCircuit === 'PUBLIE'"
                      [class.ui-badge--warning]="c.statutCircuit === 'SOUMIS' || c.statutCircuit === 'BROUILLON'"
                      [class.ui-badge--neutral]="c.statutCircuit === 'ARCHIVE'"
                    >
                      {{ c.statutCircuit || 'PUBLIE' }}
                    </span>
                  </td>
                  <td>
                    <div class="bo-actions-cell">
                      @if (permissions.has('CIRCUIT:PUBLIER') && (c.statutCircuit === 'BROUILLON' || c.statutCircuit === 'SOUMIS' || c.statutCircuit === 'ARCHIVE')) {
                        <button type="button" class="bo-btn bo-btn--sm bo-btn--primary" (click)="publier(c)">
                          Publier
                        </button>
                      } @else if (canEditCircuit(c) && c.statutCircuit === 'BROUILLON') {
                        <button type="button" class="bo-btn bo-btn--sm bo-btn--primary" (click)="soumettre(c)">
                          Soumettre
                        </button>
                      } @else if (canEditCircuit(c)) {
                        <button type="button" class="bo-btn bo-btn--sm" (click)="openEditForm(c)">
                          Éditer
                        </button>
                      } @else {
                        <button type="button" class="bo-btn bo-btn--sm" (click)="selectedItem.set(c)">
                          Détail
                        </button>
                      }

                      <div class="bo-row-menu">
                        <button
                          type="button"
                          class="bo-btn bo-btn--sm bo-btn--icon"
                          aria-label="Plus d'actions"
                          (click)="toggleRowMenu(c.id)"
                        >
                          <svg lucideMoreHorizontal [size]="15" aria-hidden="true"></svg>
                        </button>
                        @if (openMenuId() === c.id) {
                          <div class="bo-row-menu__dropdown" role="menu">
                            <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openMenuId.set(null); selectedItem.set(c)">
                              Détail
                            </button>
                            @if (canEditCircuit(c)) {
                              <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openMenuId.set(null); openEditForm(c)">
                                Éditer
                              </button>
                              @if (c.statutCircuit === 'BROUILLON') {
                                <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openMenuId.set(null); soumettre(c)">
                                  Soumettre
                                </button>
                              }
                            }
                            @if (permissions.has('CIRCUIT:ARCHIVER') && c.statutCircuit !== 'ARCHIVE') {
                              <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openMenuId.set(null); archiver(c)">
                                Archiver
                              </button>
                            }
                            @if (permissions.has('CIRCUIT:SUPPRIMER') && (c.statutCircuit === 'BROUILLON' || c.statutCircuit === 'ARCHIVE')) {
                              <button type="button" class="bo-row-menu__item bo-row-menu__item--danger" role="menuitem" (click)="openMenuId.set(null); supprimer(c)">
                                Supprimer
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

        @if (!authStore.isGuide()) {
          <app-ui-pagination
            [page]="page()"
            [totalPages]="totalPages()"
            [totalElements]="totalElements()"
            [last]="last()"
            (pageChange)="loadPage($event)"
          />
        }
      }
    </section>

    <app-ui-detail-drawer
      [open]="selectedItem() !== null"
      [title]="selectedItem()?.nomCircuit || ''"
      [eyebrow]="'Circuit n° ' + (selectedItem()?.id ?? '')"
      (close)="selectedItem.set(null)"
    >
      @if (selectedItem(); as d) {
        <dl class="bo-kv-list">
          <div class="bo-kv-row"><dt>Statut</dt><dd>{{ d.statutCircuit || 'PUBLIE' }}</dd></div>
          <div class="bo-kv-row"><dt>Zone</dt><dd>{{ d.zoneGeographique || 'BASSE_CASAMANCE' }}</dd></div>
          <div class="bo-kv-row"><dt>Calcul distance</dt><dd>{{ d.distanceTotale }} km ({{ d.modeCalculDistance || 'ESTIMATION_ORTHODROMIQUE_INDICATIVE' }})</dd></div>
          <div class="bo-kv-row"><dt>Description</dt><dd>{{ d.descriptionCircuit || '—' }}</dd></div>
        </dl>

        @if (!authStore.isGuide() && permissions.has('CIRCUIT:PUBLIER')) {
          <div class="bo-panel" style="margin: 0;">
            <label for="drawer-assign-guide" class="bo-label">Affecter / Réaffecter un guide agréé</label>
            <div class="bo-actions-cell" style="margin-top: var(--space-2);">
              <select id="drawer-assign-guide" class="bo-select" [(ngModel)]="assignGuideId" style="flex: 1;">
                <option [ngValue]="null">-- Retirer affectation --</option>
                @for (g of guidesValides(); track g.utilisateurId) {
                  <option [ngValue]="g.utilisateurId">{{ g.prenom }} {{ g.nom }} ({{ g.utilisateurId }})</option>
                }
              </select>
              <button type="button" class="bo-btn bo-btn--primary" (click)="assignerGuide(d)">Affecter</button>
            </div>
          </div>

          <div class="bo-panel" style="margin: 0;">
            <p class="bo-label" style="margin-bottom: var(--space-2);">Vérification liaison site patrimonial</p>
            <div class="bo-actions-cell">
              <button type="button" class="bo-btn bo-btn--sm" (click)="testerComm('feign', d)">OpenFeign</button>
              <button type="button" class="bo-btn bo-btn--sm" (click)="testerComm('resttemplate', d)">RestTemplate</button>
              <button type="button" class="bo-btn bo-btn--sm" (click)="testerComm('webclient', d)">WebClient</button>
            </div>
            @if (tp2Result()) {
              <p class="bo-cell-sub" style="margin-top: var(--space-2);">{{ tp2Result() }}</p>
            }
          </div>
        }
      }
    </app-ui-detail-drawer>
  `,
})
export class ProCircuitsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(Dialog);
  protected readonly authStore = inject(AuthStore);
  protected readonly permissions = inject(PermissionService);
  private readonly api = inject(CircuitApiService);
  private readonly patrimoineApi = inject(PatrimoineApiService);
  private readonly guideApi = inject(GuideApiService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly stats = signal<CircuitStats | null>(null);
  protected readonly items = signal<Circuit[]>([]);
  protected readonly patrimoinesDisponibles = signal<Patrimoine[]>([]);
  protected readonly guidesValides = signal<GuideProfil[]>([]);

  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);
  protected readonly last = signal(true);

  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly selectedItem = signal<Circuit | null>(null);
  protected readonly tp2Result = signal<string | null>(null);
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
      { id: 'PUBLIE', label: 'Publiés', count: s?.publies },
      { id: 'BROUILLON', label: 'Brouillons', count: s?.brouillons },
      { id: 'SOUMIS', label: 'Soumis', count: s?.soumis },
      { id: 'ARCHIVE', label: 'Archivés', count: s?.archives },
    ];
  });

  protected q = '';
  protected statutFilter: StatutCircuit | '' = '';
  protected diffFilter: Difficulte | '' = '';
  protected assignGuideId: number | null = null;

  protected readonly form = this.fb.nonNullable.group({
    nomCircuit: ['', [Validators.required, Validators.minLength(3)]],
    descriptionCircuit: ['', [Validators.required, Validators.minLength(10)]],
    zoneGeographique: ['BASSE_CASAMANCE'],
    difficulte: ['FACILE' as Difficulte],
    moyenTransport: ['MIXTE' as MoyenTransport],
    pointDepart: [''],
    pointArrivee: [''],
    placesMax: [15, [Validators.required, Validators.min(1)]],
    prix: [15000, [Validators.required, Validators.min(0)]],
    guideResponsableId: [null as number | null],
    statutCircuit: ['BROUILLON' as StatutCircuit],
    etapes: this.fb.array([this.createEtapeGroup()]),
  });

  get etapesArray(): FormArray {
    return this.form.controls.etapes;
  }

  private createEtapeGroup(data?: {
    patrimoineId?: number;
    dureeVisite?: number;
    descriptionEtape?: string | null;
    moyenTransport?: MoyenTransport | null;
  }) {
    return this.fb.nonNullable.group({
      patrimoineId: [data?.patrimoineId ?? 0, [Validators.required, Validators.min(1)]],
      dureeVisite: [data?.dureeVisite ?? 60, [Validators.required, Validators.min(5)]],
      descriptionEtape: [data?.descriptionEtape ?? ''],
      moyenTransport: [(data?.moyenTransport ?? 'PIED') as MoyenTransport],
    });
  }

  ngOnInit(): void {
    void this.load();
  }

  protected canEditCircuit(c: Circuit): boolean {
    if (!this.permissions.has('CIRCUIT:MODIFIER') || c.statutCircuit === 'ARCHIVE') {
      return false;
    }
    if (this.authStore.isGuide()) {
      return c.guideResponsableId != null && c.guideResponsableId === this.authStore.user()?.id;
    }
    return true;
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const jobs: Promise<unknown>[] = [
        firstValueFrom(this.api.getStatistiques()).then((s) => this.stats.set(s)).catch(() => {}),
        firstValueFrom(this.patrimoineApi.rechercher({ statut: 'PUBLIE', inclureNonPublies: false, size: 50 })).then(
          (res) => this.patrimoinesDisponibles.set(res.content)
        ),
      ];
      if (!this.authStore.isGuide()) {
        jobs.push(
          firstValueFrom(this.guideApi.getAllAdmin('VALIDE'))
            .then((g) => this.guidesValides.set(g))
            .catch(() => {})
        );
      }
      await Promise.all(jobs);
      await this.loadPage(0);
    } catch (err) {
      this.error.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async loadPage(page = 0): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      if (this.authStore.isGuide()) {
        const list = await firstValueFrom(this.api.getMesCircuitsGuide());
        this.items.set(list);
      } else {
        const res = await firstValueFrom(
          this.api.rechercher({
            q: this.q.trim() || undefined,
            statut: this.statutFilter || undefined,
            difficulte: this.diffFilter || undefined,
            inclureNonPublies: true,
            page,
            size: 10,
          })
        );
        this.items.set(res.content);
        this.page.set(res.page);
        this.totalPages.set(res.totalPages);
        this.totalElements.set(res.totalElements);
        this.last.set(res.last);
      }
    } catch (err) {
      this.error.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  addEtape(): void {
    const firstPat = this.patrimoinesDisponibles()[0]?.id ?? 0;
    this.etapesArray.push(this.createEtapeGroup({ patrimoineId: firstPat }));
  }

  removeEtape(idx: number): void {
    if (this.etapesArray.length > 1) {
      this.etapesArray.removeAt(idx);
    }
  }

  moveEtape(idx: number, delta: -1 | 1): void {
    const target = idx + delta;
    if (target < 0 || target >= this.etapesArray.length) return;
    const ctrl = this.etapesArray.at(idx);
    this.etapesArray.removeAt(idx);
    this.etapesArray.insert(target, ctrl);
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.actionError.set(null);
    this.etapesArray.clear();
    this.addEtape();
    this.form.patchValue({
      nomCircuit: '',
      descriptionCircuit: '',
      zoneGeographique: 'BASSE_CASAMANCE',
      difficulte: 'FACILE',
      moyenTransport: 'MIXTE',
      pointDepart: '',
      pointArrivee: '',
      placesMax: 15,
      prix: 15000,
      guideResponsableId: null,
      statutCircuit: 'BROUILLON',
    });
    this.formOpen.set(true);
  }

  openEditForm(c: Circuit): void {
    this.editingId.set(c.id);
    this.actionError.set(null);
    this.etapesArray.clear();
    const sorted = [...c.etapes].sort((a, b) => a.ordre - b.ordre);
    if (sorted.length === 0) {
      this.addEtape();
    } else {
      for (const e of sorted) {
        this.etapesArray.push(
          this.createEtapeGroup({
            patrimoineId: e.patrimoineId,
            dureeVisite: e.dureeVisite,
            descriptionEtape: e.descriptionEtape,
            moyenTransport: e.moyenTransport,
          })
        );
      }
    }
    this.form.patchValue({
      nomCircuit: c.nomCircuit,
      descriptionCircuit: c.descriptionCircuit ?? '',
      zoneGeographique: c.zoneGeographique ?? 'BASSE_CASAMANCE',
      difficulte: c.difficulte ?? 'FACILE',
      moyenTransport: c.moyenTransport ?? 'MIXTE',
      pointDepart: c.pointDepart ?? '',
      pointArrivee: c.pointArrivee ?? '',
      placesMax: c.placesMax,
      prix: c.prix,
      guideResponsableId: c.guideResponsableId ?? null,
      statutCircuit: c.statutCircuit ?? 'BROUILLON',
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
  }

  async saveCircuit(): Promise<void> {
    this.actionError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const v = this.form.getRawValue();
      const payload: Partial<Circuit> = {
        nomCircuit: v.nomCircuit.trim(),
        descriptionCircuit: v.descriptionCircuit.trim(),
        zoneGeographique: v.zoneGeographique,
        difficulte: v.difficulte,
        moyenTransport: v.moyenTransport,
        pointDepart: v.pointDepart.trim() || null,
        pointArrivee: v.pointArrivee.trim() || null,
        placesMax: Number(v.placesMax),
        prix: Number(v.prix),
        ...(!this.authStore.isGuide()
          ? {
              guideResponsableId: v.guideResponsableId,
              statutCircuit: v.statutCircuit,
            }
          : {}),
        etapes: v.etapes.map((e, idx) => ({
          ordre: idx + 1,
          patrimoineId: Number(e.patrimoineId),
          dureeVisite: Number(e.dureeVisite),
          descriptionEtape: e.descriptionEtape?.trim() || null,
          moyenTransport: e.moyenTransport,
          patrimoine: null,
        })),
      };
      const id = this.editingId();
      if (id !== null) {
        await firstValueFrom(this.api.update(id, payload));
        toast.success('Circuit mis à jour.');
      } else {
        await firstValueFrom(this.api.create(payload));
        toast.success('Circuit créé.');
      }
      this.closeForm();
      await this.load();
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  async assignerGuide(c: Circuit): Promise<void> {
    this.actionError.set(null);
    try {
      const updated = await firstValueFrom(this.api.affecterGuideResponsable(c.id, this.assignGuideId));
      this.selectedItem.set(updated);
      toast.success('Affectation du guide enregistrée.');
      await this.load();
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }

  async soumettre(c: Circuit): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.api.soumettre(c.id));
      toast.success(`Circuit "${c.nomCircuit}" soumis pour publication.`);
      await this.load();
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }

  async publier(c: Circuit): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.api.publier(c.id));
      toast.success(`Circuit "${c.nomCircuit}" publié.`);
      await this.load();
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }

  async archiver(c: Circuit): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.api.archiver(c.id, 'Archivage gestionnaire depuis Back-Office'));
      toast.info(`Circuit "${c.nomCircuit}" archivé.`);
      await this.load();
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }

  async supprimer(c: Circuit): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<boolean>(UiConfirmDialogComponent, {
          data: {
            title: `Supprimer "${c.nomCircuit}" ?`,
            message: 'Seuls les circuits en brouillon ou archivés peuvent être supprimés physiquement.',
            confirmLabel: 'Supprimer',
            cancelLabel: 'Conserver',
            variant: 'danger',
          },
        })
        .closed
    );
    if (!ok) return;
    try {
      await firstValueFrom(this.api.delete(c.id));
      toast.success('Circuit supprimé.');
      await this.load();
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }

  async testerComm(mode: 'feign' | 'resttemplate' | 'webclient', c: Circuit): Promise<void> {
    const patId = c.etapes[0]?.patrimoineId ?? 1;
    this.tp2Result.set('Test en cours...');
    try {
      const res = await firstValueFrom(this.api.testerCommunication(mode, patId));
      this.tp2Result.set(`Succès ${String(res['clientUtilise'])} sur patrimoine ${patId}`);
    } catch (err) {
      this.tp2Result.set(`Échec ${mode}: ${extractErrorMessage(err)}`);
    }
  }
}
