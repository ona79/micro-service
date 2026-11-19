import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
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
  LucideXCircle,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { PermissionService } from '../../../../core/auth/permissions';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import {
  Evenement,
  StatutEvenement,
  TypeEvenement,
} from '../../../../core/models/evenement.model';
import { Patrimoine } from '../../../../core/models/patrimoine.model';
import { EvenementStats } from '../../../../core/models/statistics.model';
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
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { EvenementApiService } from '../../../evenements/data-access/evenement-api.service';
import { PatrimoineApiService } from '../../../patrimoines/data-access/patrimoine-api.service';

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const debut = group.get('dateDebut')?.value;
  const fin = group.get('dateFin')?.value;
  if (debut && fin && new Date(fin).getTime() < new Date(debut).getTime()) {
    return { invalidDateRange: true };
  }
  return null;
}

@Component({
  selector: 'app-pro-evenements-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DateFrPipe,
    FcfaPricePipe,
    UiPageHeaderComponent,
    UiDrawerComponent,
    UiPaginationComponent,
    UiDetailDrawerComponent,
    UiEmptyStateComponent,
    UiErrorBannerComponent,
    UiFilterBarComponent,
    LucidePlus,
    LucideMoreHorizontal,
    LucideRefreshCw,
  ],
  template: `
    <app-ui-page-header
      title="Événements"
      subtitle="Planifiez, liez à un site patrimonial et publiez l'agenda."
    >
      <div header-actions>
        <button type="button" class="bo-btn" (click)="loadPage(page())" [disabled]="loading()">
          <svg lucideRefreshCw [size]="14" aria-hidden="true"></svg>
          <span>Actualiser</span>
        </button>
        @if (permissions.has('EVENEMENT:CREER')) {
          <button type="button" class="bo-btn bo-btn--primary" (click)="openCreateForm()">
            <svg lucidePlus [size]="15" aria-hidden="true"></svg>
            <span>Nouvel événement</span>
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
      [title]="editingId() ? 'Modifier événement n° ' + editingId() : 'Créer un événement culturel'"
      [showFooter]="false"
      (closed)="closeForm()"
    >
        <form [formGroup]="form" (ngSubmit)="save()" class="bo-form-grid" novalidate>
          <div class="bo-field">
            <label for="evt-nom" class="bo-label">Intitulé *</label>
            <input id="evt-nom" type="text" class="bo-input" formControlName="nomEvenement" />
          </div>

          <div class="bo-field">
            <label for="evt-type" class="bo-label">Type *</label>
            <select id="evt-type" class="bo-select" formControlName="typeEvenement">
              <option value="FESTIVAL">FESTIVAL</option>
              <option value="EXPOSITION">EXPOSITION</option>
              <option value="ATELIER">ATELIER</option>
              <option value="VISITE_GUIDEE">VISITE_GUIDEE</option>
              <option value="CONFERENCE">CONFERENCE</option>
              <option value="CEREMONIE_TRADITIONNELLE">CEREMONIE_TRADITIONNELLE</option>
              <option value="FOIRE_ARTISANALE">FOIRE_ARTISANALE</option>
            </select>
          </div>

          <div class="bo-field bo-form-span2">
            <label for="evt-desc" class="bo-label">Description *</label>
            <textarea id="evt-desc" class="bo-textarea" rows="2" formControlName="descriptionEvenement"></textarea>
          </div>

          <div class="bo-field">
            <label for="evt-deb" class="bo-label">Date de début *</label>
            <input id="evt-deb" type="datetime-local" class="bo-input" formControlName="dateDebut" />
          </div>

          <div class="bo-field">
            <label for="evt-fin" class="bo-label">Date de fin *</label>
            <input id="evt-fin" type="datetime-local" class="bo-input" formControlName="dateFin" />
            @if (form.hasError('invalidDateRange')) {
              <p class="bo-error">La date de fin doit être postérieure ou égale à la date de début.</p>
            }
          </div>

          <div class="bo-field">
            <label for="evt-pat" class="bo-label">Site patrimonial associé (optionnel)</label>
            <select id="evt-pat" class="bo-select" formControlName="patrimoineId">
              <option [ngValue]="null">-- Aucun site patrimonial lié --</option>
              @for (p of patrimoines(); track p.id) {
                <option [ngValue]="p.id">{{ p.nomPatrimoine }} (Cap. {{ p.capacitePatrimoine }})</option>
              }
            </select>
          </div>

          <div class="bo-field">
            <label for="evt-lieu" class="bo-label">Lieu / Adresse *</label>
            <input id="evt-lieu" type="text" class="bo-input" formControlName="lieu" />
          </div>

          <div class="bo-field">
            <label for="evt-zone" class="bo-label">Zone Casamance</label>
            <select id="evt-zone" class="bo-select" formControlName="zoneGeographique">
              <option value="BASSE_CASAMANCE">BASSE_CASAMANCE</option>
              <option value="MOYENNE_CASAMANCE">MOYENNE_CASAMANCE</option>
              <option value="HAUTE_CASAMANCE">HAUTE_CASAMANCE</option>
            </select>
          </div>

          <div class="bo-field">
            <label for="evt-org" class="bo-label">Organisateur</label>
            <input id="evt-org" type="text" class="bo-input" formControlName="organisateur" />
          </div>

          <div class="bo-field">
            <label for="evt-cap" class="bo-label">Capacité max *</label>
            <input id="evt-cap" type="number" min="1" class="bo-input" formControlName="capaciteMax" />
          </div>

          <div class="bo-field">
            <label for="evt-prix" class="bo-label">Tarif (XOF) *</label>
            <input id="evt-prix" type="number" min="0" step="500" class="bo-input" formControlName="prix" />
          </div>

          <div class="bo-field">
            <label for="evt-statut" class="bo-label">Statut cible</label>
            <select id="evt-statut" class="bo-select" formControlName="statutEvenement">
              <option value="BROUILLON">BROUILLON</option>
              <option value="SOUMIS">SOUMIS</option>
              @if (permissions.has('EVENEMENT:PUBLIER')) {
                <option value="PUBLIE">PUBLIE</option>
              }
            </select>
          </div>

          <div class="bo-field" style="justify-content: flex-end;">
            <label class="bo-btn" style="cursor: pointer;">
              <input type="checkbox" formControlName="ouvertReservation" />
              <span>Ouvert aux réservations</span>
            </label>
          </div>

          <div class="bo-form-span2 bo-actions-cell">
            <button type="submit" class="bo-btn bo-btn--primary" [disabled]="saving()">
              <span>{{ saving() ? 'Enregistrement...' : (editingId() ? 'Mettre à jour' : 'Créer événement') }}</span>
            </button>
            <button type="button" class="bo-btn" (click)="closeForm()">Annuler</button>
          </div>
        </form>
    </app-ui-drawer>

    <section class="bo-panel">
      <app-ui-filter-bar
        [statusPills]="statusPills()"
        [activeStatus]="statutFilter || 'ALL'"
        (statusChange)="statutFilter = $event === 'ALL' ? '' : $any($event); loadPage(0)"
        [searchValue]="q"
        searchPlaceholder="Rechercher nom, lieu, organisateur..."
        searchAriaLabel="Rechercher un événement"
        [resultsLabel]="totalElements() + ' événement(s)'"
        [hasActiveFilters]="!!(q.trim() || statutFilter)"
        (searchChange)="q = $event; loadPage(0)"
        (reset)="q = ''; statutFilter = ''; loadPage(0)"
      />

      @if (error()) {
        <app-ui-error-banner [message]="error()!" (retry)="loadPage(page())" />
      } @else if (loading()) {
        <p class="bo-cell-sub">Chargement de l'agenda culturel...</p>
      } @else if (items().length === 0) {
        <app-ui-empty-state title="Aucun événement" description="Aucun événement ne correspond aux filtres." />
      } @else {
        <div class="bo-table-wrap">
          <table class="bo-table">
            <thead>
              <tr>
                <th>Événement &amp; Dates</th>
                <th>Lieu &amp; Type</th>
                <th>Places &amp; Tarif</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (e of items(); track e.id) {
                <tr>
                  <td>
                    <span class="bo-cell-one bo-cell-title" [title]="e.nomEvenement">{{ e.nomEvenement }}</span>
                  </td>
                  <td>
                    <span class="ui-badge ui-badge--neutral" [title]="e.lieu || e.localite || e.zoneGeographique">{{ e.typeEvenement }}</span>
                  </td>
                  <td class="tabular-nums" [title]="(e.dateDebut | dateFr: 'd MMM yyyy') + ' → ' + (e.dateFin | dateFr: 'd MMM yyyy')">
                    {{ e.prix | fcfaPrice }} · {{ e.capaciteMax }} pl.
                  </td>
                  <td>
                    <span
                      class="ui-badge"
                      [class.ui-badge--success]="e.statutEvenement === 'PUBLIE'"
                      [class.ui-badge--warning]="e.statutEvenement === 'SOUMIS' || e.statutEvenement === 'BROUILLON'"
                      [class.ui-badge--danger]="e.statutEvenement === 'ANNULE'"
                      [class.ui-badge--neutral]="e.statutEvenement === 'ARCHIVE' || e.statutEvenement === 'TERMINE'"
                    >
                      {{ e.statutEvenement || 'PUBLIE' }}
                    </span>
                  </td>
                  <td>
                    <div class="bo-actions-cell">
                      @if (permissions.has('EVENEMENT:PUBLIER') && (e.statutEvenement === 'BROUILLON' || e.statutEvenement === 'SOUMIS' || e.statutEvenement === 'ARCHIVE')) {
                        <button type="button" class="bo-btn bo-btn--sm bo-btn--primary" (click)="publier(e)">
                          Publier
                        </button>
                      } @else if (e.statutEvenement === 'BROUILLON') {
                        <button type="button" class="bo-btn bo-btn--sm bo-btn--primary" (click)="soumettre(e)">
                          Soumettre
                        </button>
                      } @else if (e.statutEvenement !== 'ARCHIVE') {
                        <button type="button" class="bo-btn bo-btn--sm" (click)="openEditForm(e)">
                          Éditer
                        </button>
                      } @else {
                        <button type="button" class="bo-btn bo-btn--sm" (click)="selectedItem.set(e)">
                          Détail
                        </button>
                      }

                      <div class="bo-row-menu">
                        <button
                          type="button"
                          class="bo-btn bo-btn--sm bo-btn--icon"
                          aria-label="Plus d'actions"
                          (click)="toggleRowMenu(e.id)"
                        >
                          <svg lucideMoreHorizontal [size]="15" aria-hidden="true"></svg>
                        </button>
                        @if (openMenuId() === e.id) {
                          <div class="bo-row-menu__dropdown" role="menu">
                            <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openMenuId.set(null); selectedItem.set(e)">
                              Détail
                            </button>
                            @if (e.statutEvenement !== 'ARCHIVE') {
                              <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openMenuId.set(null); openEditForm(e)">
                                Éditer
                              </button>
                            }
                            @if (e.statutEvenement === 'BROUILLON') {
                              <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openMenuId.set(null); soumettre(e)">
                                Soumettre
                              </button>
                            }
                            @if (e.statutEvenement === 'PUBLIE' && permissions.has('EVENEMENT:ANNULER')) {
                              <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openMenuId.set(null); terminer(e)">
                                Terminer
                              </button>
                              <button type="button" class="bo-row-menu__item bo-row-menu__item--danger" role="menuitem" (click)="openMenuId.set(null); annuler(e)">
                                Annuler
                              </button>
                            }
                            @if (permissions.has('EVENEMENT:ARCHIVER') && e.statutEvenement !== 'ARCHIVE') {
                              <button type="button" class="bo-row-menu__item" role="menuitem" (click)="openMenuId.set(null); archiver(e)">
                                Archiver
                              </button>
                            }
                            @if (permissions.has('EVENEMENT:SUPPRIMER') && (e.statutEvenement === 'BROUILLON' || e.statutEvenement === 'ARCHIVE' || e.statutEvenement === 'ANNULE')) {
                              <button type="button" class="bo-row-menu__item bo-row-menu__item--danger" role="menuitem" (click)="openMenuId.set(null); supprimer(e)">
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
      [title]="selectedItem()?.nomEvenement || ''"
      [eyebrow]="selectedItem()?.typeEvenement || null"
      (close)="selectedItem.set(null)"
    >
      @if (selectedItem(); as d) {
        <dl class="bo-kv-list">
          <div class="bo-kv-row"><dt>Statut</dt><dd>{{ d.statutEvenement || 'PUBLIE' }}</dd></div>
          <div class="bo-kv-row"><dt>Fuseau horaire</dt><dd>{{ d.fuseauHoraire || 'Africa/Dakar' }}</dd></div>
          <div class="bo-kv-row"><dt>Dates</dt><dd>{{ d.dateDebut | dateFr: 'd MMM yyyy HH:mm' }} → {{ d.dateFin | dateFr: 'd MMM yyyy HH:mm' }}</dd></div>
          <div class="bo-kv-row"><dt>Lieu</dt><dd>{{ d.lieu || d.localite || d.zoneGeographique }}</dd></div>
          <div class="bo-kv-row"><dt>Organisateur</dt><dd>{{ d.organisateur || '—' }}</dd></div>
          <div class="bo-kv-row"><dt>Description</dt><dd>{{ d.descriptionEvenement || '—' }}</dd></div>
          @if (d.motifAnnulation) {
            <div class="bo-kv-row"><dt>Motif annulation</dt><dd class="bo-error">{{ d.motifAnnulation }}</dd></div>
          }
        </dl>
      }
    </app-ui-detail-drawer>
  `,
})
export class ProEvenementsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(Dialog);
  protected readonly permissions = inject(PermissionService);
  private readonly api = inject(EvenementApiService);
  private readonly patrimoineApi = inject(PatrimoineApiService);

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly stats = signal<EvenementStats | null>(null);
  protected readonly items = signal<Evenement[]>([]);
  protected readonly patrimoines = signal<Patrimoine[]>([]);

  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly totalElements = signal(0);
  protected readonly last = signal(true);

  protected readonly formOpen = signal(false);
  protected readonly editingId = signal<number | null>(null);
  protected readonly selectedItem = signal<Evenement | null>(null);
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
      { id: 'TERMINE', label: 'Terminés' },
      { id: 'ANNULE', label: 'Annulés', count: s?.annules },
      { id: 'ARCHIVE', label: 'Archivés', count: s?.archives },
    ];
  });

  protected q = '';
  protected statutFilter: StatutEvenement | '' = '';

  protected readonly form = this.fb.nonNullable.group(
    {
      nomEvenement: ['', [Validators.required, Validators.minLength(3)]],
      typeEvenement: ['FESTIVAL' as TypeEvenement, [Validators.required]],
      descriptionEvenement: ['', [Validators.required, Validators.minLength(10)]],
      dateDebut: ['', [Validators.required]],
      dateFin: ['', [Validators.required]],
      patrimoineId: [null as number | null],
      lieu: ['Ziguinchor', [Validators.required]],
      zoneGeographique: ['BASSE_CASAMANCE'],
      organisateur: ['Direction Régionale Culture Casamance'],
      capaciteMax: [100, [Validators.required, Validators.min(1)]],
      prix: [0, [Validators.required, Validators.min(0)]],
      ouvertReservation: [true],
      statutEvenement: ['BROUILLON' as StatutEvenement],
    },
    { validators: dateRangeValidator }
  );

  ngOnInit(): void {
    void Promise.all([
      firstValueFrom(this.patrimoineApi.rechercher({ statut: 'PUBLIE', inclureNonPublies: false, size: 50 }))
        .then((res) => this.patrimoines.set(res.content))
        .catch(() => {}),
      this.loadStats(),
      this.loadPage(0),
    ]);
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
    } catch (err) {
      this.error.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.actionError.set(null);
    this.form.patchValue({
      nomEvenement: '',
      typeEvenement: 'FESTIVAL',
      descriptionEvenement: '',
      dateDebut: '2026-12-15T09:00',
      dateFin: '2026-12-15T18:00',
      patrimoineId: null,
      lieu: 'Ziguinchor',
      zoneGeographique: 'BASSE_CASAMANCE',
      organisateur: 'Direction Régionale Culture Casamance',
      capaciteMax: 100,
      prix: 0,
      ouvertReservation: true,
      statutEvenement: 'BROUILLON',
    });
    this.formOpen.set(true);
  }

  openEditForm(e: Evenement): void {
    this.editingId.set(e.id);
    this.actionError.set(null);
    this.form.patchValue({
      nomEvenement: e.nomEvenement,
      typeEvenement: e.typeEvenement,
      descriptionEvenement: e.descriptionEvenement ?? '',
      dateDebut: e.dateDebut ? e.dateDebut.slice(0, 16) : '',
      dateFin: e.dateFin ? e.dateFin.slice(0, 16) : '',
      patrimoineId: e.patrimoineId ?? null,
      lieu: e.lieu ?? '',
      zoneGeographique: e.zoneGeographique ?? 'BASSE_CASAMANCE',
      organisateur: e.organisateur ?? '',
      capaciteMax: e.capaciteMax,
      prix: e.prix,
      ouvertReservation: e.ouvertReservation ?? false,
      statutEvenement: e.statutEvenement ?? 'BROUILLON',
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingId.set(null);
  }

  private normalizeIso(dt: string): string {
    return dt.length === 16 ? `${dt}:00` : dt;
  }

  async save(): Promise<void> {
    this.actionError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      const v = this.form.getRawValue();
      const payload: Partial<Evenement> = {
        nomEvenement: v.nomEvenement.trim(),
        typeEvenement: v.typeEvenement,
        descriptionEvenement: v.descriptionEvenement.trim(),
        dateDebut: this.normalizeIso(v.dateDebut),
        dateFin: this.normalizeIso(v.dateFin),
        patrimoineId: v.patrimoineId,
        lieu: v.lieu.trim(),
        zoneGeographique: v.zoneGeographique,
        organisateur: v.organisateur.trim() || null,
        capaciteMax: Number(v.capaciteMax),
        prix: Number(v.prix),
        ouvertReservation: v.ouvertReservation,
        statutEvenement: v.statutEvenement,
      };
      const id = this.editingId();
      if (id !== null) {
        await firstValueFrom(this.api.update(id, payload));
        toast.success('Événement mis à jour.');
      } else {
        await firstValueFrom(this.api.create(payload));
        toast.success('Événement créé.');
      }
      this.closeForm();
      await Promise.all([this.loadStats(), this.loadPage(this.page())]);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    } finally {
      this.saving.set(false);
    }
  }

  async soumettre(e: Evenement): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.api.soumettre(e.id));
      toast.success(`"${e.nomEvenement}" soumis.`);
      await Promise.all([this.loadStats(), this.loadPage(this.page())]);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }

  async publier(e: Evenement): Promise<void> {
    this.actionError.set(null);
    try {
      await firstValueFrom(this.api.publier(e.id));
      toast.success(`"${e.nomEvenement}" publié.`);
      await Promise.all([this.loadStats(), this.loadPage(this.page())]);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }

  async annuler(e: Evenement): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<boolean>(UiConfirmDialogComponent, {
          data: {
            title: `Annuler l'événement "${e.nomEvenement}" ?`,
            message: 'L’événement apparaîtra comme annulé dans l’agenda culturel.',
            confirmLabel: 'Confirmer l’annulation',
            cancelLabel: 'Conserver',
            variant: 'danger',
          },
        })
        .closed
    );
    if (!ok) return;
    try {
      await firstValueFrom(this.api.annuler(e.id, 'Annulé depuis le back-office Casamance Pro'));
      toast.info('Événement annulé.');
      await Promise.all([this.loadStats(), this.loadPage(this.page())]);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }

  async terminer(e: Evenement): Promise<void> {
    try {
      await firstValueFrom(this.api.terminer(e.id));
      toast.success('Événement marqué terminé.');
      await Promise.all([this.loadStats(), this.loadPage(this.page())]);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }

  async archiver(e: Evenement): Promise<void> {
    try {
      await firstValueFrom(this.api.archiver(e.id, 'Archivé depuis le back-office Casamance Pro'));
      toast.info('Événement archivé.');
      await Promise.all([this.loadStats(), this.loadPage(this.page())]);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }

  async supprimer(e: Evenement): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<boolean>(UiConfirmDialogComponent, {
          data: {
            title: `Supprimer "${e.nomEvenement}" ?`,
            message: 'Suppression physique définitive des brouillons/annulés/archivés.',
            confirmLabel: 'Supprimer',
            cancelLabel: 'Conserver',
            variant: 'danger',
          },
        })
        .closed
    );
    if (!ok) return;
    try {
      await firstValueFrom(this.api.delete(e.id));
      toast.success('Événement supprimé.');
      await Promise.all([this.loadStats(), this.loadPage(this.page())]);
    } catch (err) {
      this.actionError.set(extractErrorMessage(err));
    }
  }
}
