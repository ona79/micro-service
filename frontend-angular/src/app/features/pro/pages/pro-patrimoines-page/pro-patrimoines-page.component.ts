import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideArchive,
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
import { PermissionService } from '../../../../core/auth/permissions';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import {
  CategoriePatrimoine,
  Patrimoine,
  StatutPublication,
  ZoneCasamance,
} from '../../../../core/models/patrimoine.model';
import { PatrimoineStats } from '../../../../core/models/statistics.model';
import { UiConfirmDialogComponent } from '../../../../shared/components/ui-confirm-dialog/ui-confirm-dialog.component';
import { UiDetailDrawerComponent } from '../../../../shared/components/ui-detail-drawer/ui-detail-drawer.component';
import { UiDrawerComponent } from '../../../../shared/components/ui-drawer/ui-drawer.component';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiHeritageMapComponent } from '../../../../shared/components/ui-heritage-map/ui-heritage-map.component';
import { UiPageHeaderComponent } from '../../../../shared/components/ui-page-header/ui-page-header.component';
import { UiPaginationComponent } from '../../../../shared/components/ui-pagination/ui-pagination.component';
import { UiPatrimoineImageComponent } from '../../../../shared/components/ui-patrimoine-image/ui-patrimoine-image.component';
import {
  FilterStatusPill,
  UiFilterBarComponent,
} from '../../../../shared/components/ui-filter-bar/ui-filter-bar.component';
import { UiTabItem } from '../../../../shared/components/ui-tabs/ui-tabs.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { hasValidCoordinates, isLieuDeMemoire } from '../../../../shared/utils/patrimoine.utils';
import { PatrimoineApiService } from '../../../patrimoines/data-access/patrimoine-api.service';

@Component({
  selector: 'app-pro-patrimoines-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DateFrPipe,
    FcfaPricePipe,
    UiPageHeaderComponent,
    UiFilterBarComponent,
    UiDrawerComponent,
    UiPaginationComponent,
    UiDetailDrawerComponent,
    UiEmptyStateComponent,
    UiErrorBannerComponent,
    UiHeritageMapComponent,
    UiPatrimoineImageComponent,
    LucidePlus,
    LucidePencil,
    LucideTrash2,
    LucideSend,
    LucideCheckCircle2,
    LucideArchive,
    LucideEye,
    LucideMoreHorizontal,
    LucideRefreshCw,
  ],
  template: `
    <app-ui-page-header
      title="Patrimoines"
      [subtitle]="canEdit() ? 'Créez, géolocalisez, soumettez, publiez ou archivez les fiches patrimoniales.' : 'Consultation en lecture seule des fiches patrimoniales publiées.'"
    >
      <div header-actions>
        <button type="button" class="bo-btn" (click)="loadPage(page())" [disabled]="loading()">
          <svg lucideRefreshCw [size]="14" aria-hidden="true"></svg>
          <span>Actualiser</span>
        </button>
        @if (permissions.has('PATRIMOINE:CREER')) {
          <button type="button" class="bo-btn bo-btn--primary" (click)="openCreateForm()">
            <svg lucidePlus [size]="15" aria-hidden="true"></svg>
            <span>Nouveau patrimoine</span>
          </button>
        }
      </div>
    </app-ui-page-header>

    @if (!canEdit()) {
      <p class="bo-notice" style="margin-bottom: var(--space-4);">
        Votre rôle Gestionnaire de site dispose d'un accès en lecture seule sur le patrimoine publié.
        L'édition, la publication et l'archivage relèvent du Conservateur ou de l'Administrateur.
      </p>
    }

    @if (actionError()) {
      <app-ui-error-banner [message]="actionError()!" [showRetry]="false" />
    }

    <app-ui-drawer
      [open]="formOpen() && canEdit()"
      width="lg"
      [title]="editingId() ? 'Modifier la fiche patrimoine n° ' + editingId() : 'Nouvelle fiche patrimoniale'"
      [showFooter]="false"
      (closed)="closeForm()"
    >

        <form [formGroup]="form" (ngSubmit)="savePatrimoine()" class="bo-form-grid" novalidate>
          <div class="bo-field">
            <label for="pat-nom" class="bo-label">Nom du site *</label>
            <input id="pat-nom" type="text" class="bo-input" formControlName="nomPatrimoine" />
            @if (form.controls.nomPatrimoine.touched && form.controls.nomPatrimoine.invalid) {
              <p class="bo-error">Nom obligatoire (3 caractères minimum).</p>
            }
          </div>

          <div class="bo-field">
            <label for="pat-code" class="bo-label">Code officiel *</label>
            <input id="pat-code" type="text" class="bo-input" formControlName="codePatrimoine" placeholder="PAT-ZIG-009" />
          </div>

          <div class="bo-field">
            <label for="pat-cat" class="bo-label">Catégorie *</label>
            <select id="pat-cat" class="bo-select" formControlName="categoriePatrimoine">
              <option value="CULTUREL">CULTUREL</option>
              <option value="HISTORIQUE">HISTORIQUE</option>
              <option value="ARCHITECTURAL">ARCHITECTURAL</option>
              <option value="NATUREL">NATUREL</option>
              <option value="IMMATERIEL">IMMATERIEL</option>
            </select>
          </div>

          <div class="bo-field">
            <label for="pat-zone" class="bo-label">Zone Casamance *</label>
            <select id="pat-zone" class="bo-select" formControlName="zoneGeographique">
              <option value="BASSE_CASAMANCE">BASSE_CASAMANCE</option>
              <option value="MOYENNE_CASAMANCE">MOYENNE_CASAMANCE</option>
              <option value="HAUTE_CASAMANCE">HAUTE_CASAMANCE</option>
            </select>
          </div>

          <div class="bo-field">
            <label for="pat-loc" class="bo-label">Localité / Commune</label>
            <input id="pat-loc" type="text" class="bo-input" formControlName="localite" placeholder="Ziguinchor, Oussouye..." />
          </div>

          <div class="bo-field">
            <label for="pat-adr" class="bo-label">Adresse géographique *</label>
            <input id="pat-adr" type="text" class="bo-input" formControlName="adressePatrimoine" />
          </div>

          <div class="bo-field bo-form-span2">
            <label for="pat-desc" class="bo-label">Description détaillée (10 caractères min. pour publication) *</label>
            <textarea id="pat-desc" class="bo-textarea" formControlName="descriptionPatrimoine"></textarea>
          </div>

          <div class="bo-field bo-form-span2">
            <label for="pat-hist" class="bo-label">Historique &amp; contexte mémoriel</label>
            <textarea id="pat-hist" class="bo-textarea" rows="2" formControlName="historiquePatrimoine"></textarea>
          </div>

          <div class="bo-field">
            <label for="pat-lat" class="bo-label">Latitude GPS * (-90..90)</label>
            <input id="pat-lat" type="number" step="0.0001" class="bo-input" formControlName="latitudePatrimoine" />
          </div>

          <div class="bo-field">
            <label for="pat-lon" class="bo-label">Longitude GPS * (-180..180)</label>
            <input id="pat-lon" type="number" step="0.0001" class="bo-input" formControlName="longitudePatrimoine" />
          </div>

          <div class="bo-field">
            <label for="pat-cap" class="bo-label">Capacité d'accueil *</label>
            <input id="pat-cap" type="number" min="0" class="bo-input" formControlName="capacitePatrimoine" />
          </div>

          <div class="bo-field">
            <label for="pat-tarif" class="bo-label">Tarif d'entrée (XOF)</label>
            <input id="pat-tarif" type="number" min="0" step="100" class="bo-input" formControlName="tarifEntree" />
          </div>

          <div class="bo-field">
            <label for="pat-horaires" class="bo-label">Horaires d'ouverture</label>
            <input id="pat-horaires" type="text" class="bo-input" formControlName="horairesOuverture" placeholder="09h00 - 18h00" />
          </div>

          <div class="bo-field">
            <label for="pat-img" class="bo-label">URL / Chemin image principale</label>
            <input id="pat-img" type="text" class="bo-input" formControlName="imageUrl" placeholder="/images/patrimoines/PAT-CRB-002.webp" />
          </div>

          <div class="bo-field">
            <label for="pat-statut" class="bo-label">Statut cible</label>
            <select id="pat-statut" class="bo-select" formControlName="statutPublication">
              <option value="BROUILLON">BROUILLON</option>
              <option value="SOUMIS">SOUMIS</option>
              @if (permissions.has('PATRIMOINE:PUBLIER')) {
                <option value="PUBLIE">PUBLIE</option>
              }
            </select>
          </div>

          <div class="bo-field">
            <label for="pat-infos" class="bo-label">Informations pratiques</label>
            <input id="pat-infos" type="text" class="bo-input" formControlName="informationsPratiques" />
          </div>

          <div class="bo-form-span2 bo-actions-cell">
            <button type="submit" class="bo-btn bo-btn--primary" [disabled]="saving()">
              <span>{{ saving() ? 'Enregistrement...' : (editingId() ? 'Mettre à jour la fiche' : 'Créer la fiche') }}</span>
            </button>
            <button type="button" class="bo-btn" (click)="closeForm()">Annuler</button>
          </div>
        </form>
    </app-ui-drawer>

    <section class="bo-panel">
      <app-ui-filter-bar
        [statusPills]="statusTabs()"
        [activeStatus]="statutFilter || 'ALL'"
        (statusChange)="onStatusTabChange($event)"
        [searchValue]="q"
        searchPlaceholder="Rechercher nom, code, localité..."
        searchAriaLabel="Rechercher un patrimoine"
        [resultsLabel]="totalElements() + ' fiche(s)'"
        [hasActiveFilters]="!!(q.trim() || categorieFilter || zoneFilter || statutFilter)"
        (searchChange)="q = $event; loadPage(0)"
        (reset)="q = ''; categorieFilter = ''; zoneFilter = ''; statutFilter = ''; loadPage(0)"
      >
        <ng-container filter-primary>
          <select id="pat-fcat" aria-label="Catégorie" class="ui-filter-control" [(ngModel)]="categorieFilter" (ngModelChange)="loadPage(0)">
            <option value="">Catégorie : Toutes</option>
            <option value="CULTUREL">CULTUREL</option>
            <option value="HISTORIQUE">HISTORIQUE</option>
            <option value="ARCHITECTURAL">ARCHITECTURAL</option>
            <option value="NATUREL">NATUREL</option>
            <option value="IMMATERIEL">IMMATERIEL</option>
          </select>
          <select id="pat-fzone" aria-label="Zone géographique" class="ui-filter-control" [(ngModel)]="zoneFilter" (ngModelChange)="loadPage(0)">
            <option value="">Zone : Toutes</option>
            <option value="BASSE_CASAMANCE">BASSE_CASAMANCE</option>
            <option value="MOYENNE_CASAMANCE">MOYENNE_CASAMANCE</option>
            <option value="HAUTE_CASAMANCE">HAUTE_CASAMANCE</option>
          </select>
        </ng-container>
      </app-ui-filter-bar>

      @if (error()) {
        <app-ui-error-banner [message]="error()!" (retry)="loadPage(page())" />
      } @else if (loading()) {
        <p class="bo-cell-sub">Chargement du catalogue patrimonial...</p>
      } @else if (items().length === 0) {
        <app-ui-empty-state
          title="Aucun site patrimonial trouvé"
          description="Aucun patrimoine ne correspond à ces critères."
        />
      } @else {
        <div class="bo-table-wrap">
          <table class="bo-table">
            <thead>
              <tr>
                <th>Code &amp; Site</th>
                <th>Catégorie &amp; Zone</th>
                <th>Tarif / Capacité</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (p of items(); track p.id) {
                <tr>
                  <td>
                    <span class="bo-cell-one bo-cell-title" [title]="p.nomPatrimoine + ' (' + p.codePatrimoine + ')'">
                      {{ p.nomPatrimoine }}
                    </span>
                  </td>
                  <td>
                    <span class="ui-badge ui-badge--neutral" [title]="(p.zoneGeographique || 'BASSE_CASAMANCE') + ' · ' + (p.localite || '')">
                      {{ p.categoriePatrimoine || 'CULTUREL' }}
                    </span>
                  </td>
                  <td class="tabular-nums" [title]="((p.tarifEntree ?? 0) | fcfaPrice) + ' · Cap. ' + p.capacitePatrimoine + ' pers.'">
                    {{ (p.tarifEntree ?? 0) | fcfaPrice }} · {{ p.capacitePatrimoine }} pl.
                  </td>
                  <td>
                    <span
                      class="ui-badge"
                      [class.ui-badge--success]="p.statutPublication === 'PUBLIE'"
                      [class.ui-badge--warning]="p.statutPublication === 'SOUMIS' || p.statutPublication === 'BROUILLON'"
                      [class.ui-badge--neutral]="p.statutPublication === 'ARCHIVE'"
                    >
                      {{ p.statutPublication || 'PUBLIE' }}
                    </span>
                  </td>
                  <td>
                    <div class="bo-actions-cell">
                      @if (permissions.has('PATRIMOINE:PUBLIER') && (p.statutPublication === 'BROUILLON' || p.statutPublication === 'SOUMIS' || p.statutPublication === 'ARCHIVE')) {
                        <button type="button" class="bo-btn bo-btn--sm bo-btn--primary" (click)="publier(p)">
                          Publier
                        </button>
                      } @else if (permissions.has('PATRIMOINE:MODIFIER') && p.statutPublication === 'BROUILLON') {
                        <button type="button" class="bo-btn bo-btn--sm bo-btn--primary" (click)="soumettre(p)">
                          Soumettre
                        </button>
                      } @else if (permissions.has('PATRIMOINE:MODIFIER') && p.statutPublication !== 'ARCHIVE') {
                        <button type="button" class="bo-btn bo-btn--sm" (click)="openEditForm(p)">
                          Éditer
                        </button>
                      } @else {
                        <button type="button" class="bo-btn bo-btn--sm" (click)="selectedItem.set(p)">
                          Détail
                        </button>
                      }

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
                            <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openMenuId.set(null); selectedItem.set(p)">
                              Détail
                            </button>
                            @if (permissions.has('PATRIMOINE:MODIFIER') && p.statutPublication !== 'ARCHIVE') {
                              <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openMenuId.set(null); openEditForm(p)">
                                Éditer
                              </button>
                              @if (p.statutPublication === 'BROUILLON') {
                                <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openMenuId.set(null); soumettre(p)">
                                  Soumettre
                                </button>
                              }
                            }
                            @if (permissions.has('PATRIMOINE:ARCHIVER') && p.statutPublication !== 'ARCHIVE') {
                              <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openMenuId.set(null); openArchivePrompt(p)">
                                Archiver
                              </button>
                            }
                            @if (permissions.has('PATRIMOINE:SUPPRIMER') && (p.statutPublication === 'BROUILLON' || p.statutPublication === 'ARCHIVE')) {
                              <button type="button" class="bo-row-menu__item bo-row-menu__item--danger" role="menuitem" (click)="openMenuId.set(null); supprimer(p)">
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
      [title]="selectedItem()?.nomPatrimoine || ''"
      [eyebrow]="selectedItem()?.codePatrimoine || null"
      (close)="selectedItem.set(null)"
    >
      @if (selectedItem(); as d) {
        <div style="height: 180px; border-radius: var(--radius-md); overflow: hidden;">
          <app-ui-patrimoine-image
            [codePatrimoine]="d.codePatrimoine"
            [nomPatrimoine]="d.nomPatrimoine"
            [imageUrl]="d.imageUrl"
            [sobriete]="isMemorial(d)"
          />
        </div>

        @if (hasGps(d)) {
          <app-ui-heritage-map
            [points]="[{ id: d.id, label: d.nomPatrimoine, latitude: d.latitudePatrimoine, longitude: d.longitudePatrimoine, memorial: isMemorial(d) }]"
            [height]="190"
            ariaLabel="Localisation du site patrimonial"
          />
        }

        <dl class="bo-kv-list">
          <div class="bo-kv-row"><dt>Statut</dt><dd>{{ d.statutPublication || 'PUBLIE' }}</dd></div>
          <div class="bo-kv-row"><dt>Zone / Localité</dt><dd>{{ d.zoneGeographique }} · {{ d.localite || d.adressePatrimoine }}</dd></div>
          <div class="bo-kv-row"><dt>Description</dt><dd>{{ d.descriptionPatrimoine || '—' }}</dd></div>
          <div class="bo-kv-row"><dt>Historique</dt><dd>{{ d.historiquePatrimoine || '—' }}</dd></div>
          <div class="bo-kv-row"><dt>Tarif / Capacité</dt><dd>{{ (d.tarifEntree ?? 0) | fcfaPrice }} · {{ d.capacitePatrimoine }} places</dd></div>
          <div class="bo-kv-row"><dt>GPS</dt><dd class="tabular-nums">{{ d.latitudePatrimoine }}, {{ d.longitudePatrimoine }}</dd></div>
          @if (d.datePublication) {
            <div class="bo-kv-row"><dt>Date publication</dt><dd>{{ d.datePublication | dateFr: 'd MMM yyyy HH:mm' }}</dd></div>
          }
          @if (d.dateArchivage) {
            <div class="bo-kv-row"><dt>Date archivage</dt><dd>{{ d.dateArchivage | dateFr: 'd MMM yyyy HH:mm' }}</dd></div>
          }
          @if (d.motifStatut) {
            <div class="bo-kv-row"><dt>Motif statut</dt><dd>{{ d.motifStatut }}</dd></div>
          }
        </dl>

        @if (archivingTarget()?.id === d.id && permissions.has('PATRIMOINE:ARCHIVER')) {
          <div class="bo-panel" style="margin: 0;">
            <label for="archive-motif" class="bo-label">Motif d'archivage</label>
            <input id="archive-motif" type="text" class="bo-input" [(ngModel)]="archiveMotif" />
            <div class="bo-actions-cell" style="margin-top: var(--space-3);">
              <button type="button" class="bo-btn bo-btn--danger" (click)="confirmArchive(d)">Confirmer l'archivage</button>
              <button type="button" class="bo-btn" (click)="archivingTarget.set(null)">Annuler</button>
            </div>
          </div>
        }
      }
    </app-ui-detail-drawer>
  `,
})
export class ProPatrimoinesPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(Dialog);
  protected readonly permissions = inject(PermissionService);
  private readonly api = inject(PatrimoineApiService);

  protected readonly canEdit = computed(
    () => this.permissions.has('PATRIMOINE:CREER') || this.permissions.has('PATRIMOINE:MODIFIER')
  );

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly stats = signal<PatrimoineStats | null>(null);
  protected readonly items = signal<Patrimoine[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);
  protected readonly last = signal(true);

  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly selectedItem = signal<Patrimoine | null>(null);
  protected readonly archivingTarget = signal<Patrimoine | null>(null);
  protected readonly openMenuId = signal<number | null>(null);
  private searchTimer?: ReturnType<typeof setTimeout>;

  protected onSearchInput(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.loadPage(0), 250);
  }

  protected toggleRowMenu(id: number): void {
    this.openMenuId.update((curr) => (curr === id ? null : id));
  }

  protected q = '';
  protected categorieFilter: CategoriePatrimoine | '' = '';
  protected zoneFilter: ZoneCasamance | '' = '';
  protected statutFilter: StatutPublication | '' = '';
  protected archiveMotif = 'Archivage administratif de la fiche patrimoniale';

  protected readonly form = this.fb.nonNullable.group({
    nomPatrimoine: ['', [Validators.required, Validators.minLength(3)]],
    codePatrimoine: ['', [Validators.required, Validators.minLength(3)]],
    categoriePatrimoine: ['CULTUREL' as CategoriePatrimoine, [Validators.required]],
    zoneGeographique: ['BASSE_CASAMANCE' as ZoneCasamance, [Validators.required]],
    localite: [''],
    adressePatrimoine: ['', [Validators.required]],
    descriptionPatrimoine: ['', [Validators.required, Validators.minLength(10)]],
    historiquePatrimoine: [''],
    latitudePatrimoine: [12.5833, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitudePatrimoine: [-16.2719, [Validators.required, Validators.min(-180), Validators.max(180)]],
    capacitePatrimoine: [60, [Validators.required, Validators.min(0)]],
    tarifEntree: [1000, [Validators.required, Validators.min(0)]],
    horairesOuverture: ['09h00 - 18h00'],
    imageUrl: [''],
    informationsPratiques: [''],
    statutPublication: ['BROUILLON' as StatutPublication],
  });

  protected readonly statusTabs = computed<UiTabItem[]>(() => {
    const s = this.stats();
    if (!s) return [{ id: 'ALL', label: 'Tous' }];
    const items: UiTabItem[] = [
      { id: 'ALL', label: 'Tous', count: s.total },
      { id: 'PUBLIE', label: 'Publiés', count: s.publies },
    ];
    if (this.canEdit()) {
      items.push(
        { id: 'BROUILLON', label: 'Brouillons', count: s.brouillons },
        { id: 'SOUMIS', label: 'Soumis', count: s.soumis },
        { id: 'ARCHIVE', label: 'Archivés', count: s.archives }
      );
    }
    return items;
  });

  protected onStatusTabChange(id: string): void {
    this.statutFilter = id === 'ALL' ? '' : (id as StatutPublication);
    void this.loadPage(0);
  }

  ngOnInit(): void {
    void Promise.all([this.loadStats(), this.loadPage(0)]);
  }

  protected isMemorial(p: Patrimoine): boolean {
    return isLieuDeMemoire(p);
  }

  protected hasGps(p: Patrimoine): boolean {
    return hasValidCoordinates(p.latitudePatrimoine, p.longitudePatrimoine);
  }

  async loadStats(): Promise<void> {
    try {
      this.stats.set(await firstValueFrom(this.api.getStatistiques()));
    } catch {
      // Silencieux si statistiques indisponibles
    }
  }

  async loadPage(page = 0): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const res = await firstValueFrom(
        this.api.rechercher({
          q: this.q.trim() || undefined,
          categorie: this.categorieFilter || undefined,
          zone: this.zoneFilter || undefined,
          statut: this.canEdit() ? this.statutFilter || undefined : 'PUBLIE',
          inclureNonPublies: this.canEdit(),
          page,
          size: 10,
          sortBy: 'nom',
          sortDir: 'asc',
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

  openCreateForm(): void {
    this.editingId.set(null);
    this.actionError.set(null);
    this.form.reset({
      nomPatrimoine: '',
      codePatrimoine: '',
      categoriePatrimoine: 'CULTUREL',
      zoneGeographique: 'BASSE_CASAMANCE',
      localite: '',
      adressePatrimoine: '',
      descriptionPatrimoine: '',
      historiquePatrimoine: '',
      latitudePatrimoine: 12.5833,
      longitudePatrimoine: -16.2719,
      capacitePatrimoine: 60,
      tarifEntree: 1000,
      horairesOuverture: '09h00 - 18h00',
      imageUrl: '',
      informationsPratiques: '',
      statutPublication: 'BROUILLON',
    });
    this.formOpen.set(true);
  }

  openEditForm(p: Patrimoine): void {
    this.editingId.set(p.id);
    this.actionError.set(null);
    this.form.patchValue({
      nomPatrimoine: p.nomPatrimoine,
      codePatrimoine: p.codePatrimoine,
      categoriePatrimoine: p.categoriePatrimoine ?? 'CULTUREL',
      zoneGeographique: p.zoneGeographique ?? 'BASSE_CASAMANCE',
      localite: p.localite ?? '',
      adressePatrimoine: p.adressePatrimoine ?? '',
      descriptionPatrimoine: p.descriptionPatrimoine ?? '',
      historiquePatrimoine: p.historiquePatrimoine ?? '',
      latitudePatrimoine: p.latitudePatrimoine ?? 12.5833,
      longitudePatrimoine: p.longitudePatrimoine ?? -16.2719,
      capacitePatrimoine: p.capacitePatrimoine ?? 0,
      tarifEntree: p.tarifEntree ?? 0,
      horairesOuverture: p.horairesOuverture ?? '',
      imageUrl: p.imageUrl ?? '',
      informationsPratiques: p.informationsPratiques ?? '',
      statutPublication: p.statutPublication ?? 'BROUILLON',
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
  }

  async savePatrimoine(): Promise<void> {
    this.actionError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const v = this.form.getRawValue();
      const payload: Omit<Patrimoine, 'id'> = {
        nomPatrimoine: v.nomPatrimoine.trim(),
        codePatrimoine: v.codePatrimoine.trim().toUpperCase(),
        categoriePatrimoine: v.categoriePatrimoine,
        zoneGeographique: v.zoneGeographique,
        localite: v.localite.trim() || null,
        adressePatrimoine: v.adressePatrimoine.trim(),
        descriptionPatrimoine: v.descriptionPatrimoine.trim(),
        historiquePatrimoine: v.historiquePatrimoine.trim() || null,
        latitudePatrimoine: Number(v.latitudePatrimoine),
        longitudePatrimoine: Number(v.longitudePatrimoine),
        capacitePatrimoine: Number(v.capacitePatrimoine),
        tarifEntree: Number(v.tarifEntree),
        horairesOuverture: v.horairesOuverture.trim() || null,
        imageUrl: v.imageUrl.trim() || null,
        informationsPratiques: v.informationsPratiques.trim() || null,
        statutPublication: v.statutPublication,
      };
      const id = this.editingId();
      if (id !== null) {
        await firstValueFrom(this.api.update(id, payload));
        toast.success('Fiche patrimoniale mise à jour.');
      } else {
        await firstValueFrom(this.api.create(payload));
        toast.success('Fiche patrimoniale créée.');
      }
      this.closeForm();
      await Promise.all([this.loadStats(), this.loadPage(this.page())]);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  async soumettre(p: Patrimoine): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.api.soumettre(p.id));
      toast.success(`"${p.nomPatrimoine}" soumise à publication.`);
      await Promise.all([this.loadStats(), this.loadPage(this.page())]);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }

  async publier(p: Patrimoine): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.api.publier(p.id));
      toast.success(`"${p.nomPatrimoine}" publiée sur le catalogue public.`);
      await Promise.all([this.loadStats(), this.loadPage(this.page())]);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }

  openArchivePrompt(p: Patrimoine): void {
    this.selectedItem.set(p);
    this.archivingTarget.set(p);
  }

  async confirmArchive(p: Patrimoine): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.api.archiver(p.id, this.archiveMotif.trim() || undefined));
      this.archivingTarget.set(null);
      this.selectedItem.set(null);
      toast.info(`"${p.nomPatrimoine}" archivée.`);
      await Promise.all([this.loadStats(), this.loadPage(this.page())]);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }

  async supprimer(p: Patrimoine): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<boolean>(UiConfirmDialogComponent, {
          data: {
            title: `Supprimer "${p.nomPatrimoine}" ?`,
            message: 'Cette suppression physique est définitive (seules les fiches en brouillon ou archivées sont supprimables).',
            confirmLabel: 'Supprimer',
            cancelLabel: 'Conserver',
            variant: 'danger',
          },
        })
        .closed
    );
    if (!ok) return;

    this.actionError.set(null);
    try {
      await firstValueFrom(this.api.delete(p.id));
      toast.success('Fiche patrimoniale supprimée.');
      await Promise.all([this.loadStats(), this.loadPage(this.page())]);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }
}
