import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideAward,
  LucideCompass,
  LucideGlobe,
  LucideMapPin,
  LucideSearch,
  LucideStar,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import { AvisResume } from '../../../../core/models/avis.model';
import { GuideProfil } from '../../../../core/models/guide.model';
import { SeoService } from '../../../../core/services/seo.service';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import {
  ActiveFilterChip,
  UiFilterBarComponent,
} from '../../../../shared/components/ui-filter-bar/ui-filter-bar.component';
import { UiLoadingStateComponent } from '../../../../shared/components/ui-loading-state/ui-loading-state.component';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { AvisApiService } from '../../../avis/data-access/avis-api.service';
import { GuideApiService } from '../../data-access/guide-api.service';

@Component({
  selector: 'app-guides-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    DecimalPipe,
    FcfaPricePipe,
    UiEmptyStateComponent,
    UiErrorBannerComponent,
    UiLoadingStateComponent,
    UiFilterBarComponent,
    UiCardComponent,
    LucideCompass,
    LucideSearch,
    LucideMapPin,
    LucideGlobe,
    LucideAward,
    LucideStar,
    LucideArrowRight,
  ],
  template: `
    <div class="page-section" style="padding-top: 14px;">
      <div class="container">
        <header class="page-head-compact">
          <div class="page-head-compact__left">
            <h1 class="page-head-compact__title">Guides touristiques</h1>
            <span
              class="page-info-tip"
              title="Guides locaux certifiés : écotourisme en bolongs, patrimoine Diola et histoire mémorielle."
              aria-label="Informations"
            >
              i
            </span>
          </div>
        </header>

        <app-ui-filter-bar
          [searchValue]="q()"
          searchPlaceholder="Rechercher un guide, une spécialité..."
          searchAriaLabel="Rechercher un guide"
          [resultsLabel]="guides().length + (guides().length > 1 ? ' guides' : ' guide')"
          [hasActiveFilters]="hasActiveFilters()"
          [activeChips]="activeFilterChips()"
          (searchChange)="q.set($event); onFilterImmediate()"
          (removeChip)="removeFilterChip($event)"
          (reset)="resetFilters()"
        >
          <ng-container filter-primary>
            <input
              type="text"
              class="ui-filter-control"
              style="width: 150px;"
              [ngModel]="zone()"
              (ngModelChange)="onZoneInput($event)"
              aria-label="Zone d'intervention"
              placeholder="Zone (Oussouye...)"
            />
            <input
              type="text"
              class="ui-filter-control"
              style="width: 140px;"
              [ngModel]="langue()"
              (ngModelChange)="onLangueInput($event)"
              aria-label="Langue parlée"
              placeholder="Langue (Diola...)"
            />
            <button
              type="button"
              class="ui-filter-toggle"
              [class.ui-filter-toggle--active]="disponibleOnly()"
              [attr.aria-pressed]="disponibleOnly()"
              (click)="disponibleOnly.set(!disponibleOnly()); onFilterImmediate()"
            >
              Disponibles
            </button>
          </ng-container>
        </app-ui-filter-bar>

        @if (error()) {
          <app-ui-error-banner [message]="error()!" (retry)="loadGuides()" />
        } @else if (loading()) {
          <app-ui-loading-state label="Recherche des guides locaux certifiés en cours..." />
        } @else if (guides().length === 0) {
          <app-ui-empty-state
            title="Aucun guide public correspondant"
            message="Ajustez vos critères de zone ou de langue pour afficher nos guides agréés."
          />
        } @else {
          <div class="catalog-grid">
            @for (guide of pagedGuides(); track guide.id) {
              <app-ui-card [interactive]="true" class="guide-card">
                <div class="guide-card__top">
                  <div class="guide-avatar" aria-hidden="true">
                    {{ guide.prenom.slice(0, 1) }}{{ guide.nom.slice(0, 1) }}
                  </div>
                  <div class="guide-card__identity">
                    <div class="guide-badges">
                      <span class="ui-badge ui-badge--success">
                        <svg lucideAward [size]="12" aria-hidden="true"></svg>
                        Agréé
                      </span>
                      @if (guide.disponible) {
                        <span class="ui-badge ui-badge--ochre">Disponible</span>
                      } @else {
                        <span class="ui-badge ui-badge--neutral">Indisponible</span>
                      }
                    </div>
                    <h2 class="guide-card__name">{{ guide.prenom }} {{ guide.nom }}</h2>
                  </div>
                </div>

                <p class="guide-card__pitch" [title]="guide.presentationCourte">{{ guide.presentationCourte }}</p>

                <div class="guide-meta-compact">
                  <p class="guide-meta-line" [title]="guide.zonesIntervention">
                    <svg lucideMapPin [size]="13" aria-hidden="true"></svg>
                    <span>{{ guide.zonesIntervention }}</span>
                  </p>
                  <p class="guide-meta-line" [title]="guide.languesParlees">
                    <svg lucideGlobe [size]="13" aria-hidden="true"></svg>
                    <span>{{ guide.languesParlees }}</span>
                  </p>
                </div>

                <div class="guide-card__footer">
                  <span class="guide-price tabular-nums">
                    {{
                      guide.tarifJournalierIndicatif != null
                        ? (guide.tarifJournalierIndicatif | fcfaPrice) + '/j'
                        : 'Sur devis'
                    }}
                  </span>
                  <a [routerLink]="['/guides', guide.id]" class="btn-detail">
                    <span>Voir profil</span>
                    <svg lucideArrowRight [size]="14" aria-hidden="true"></svg>
                  </a>
                </div>
              </app-ui-card>
            }
          </div>

          @if (guides().length > visibleLimit()) {
            <div style="display:flex;justify-content:center;margin-top:20px;">
              <button type="button" class="ui-filter-toggle" (click)="visibleLimit.set(visibleLimit() + 24)">
                Charger plus ({{ guides().length - visibleLimit() }} restants)
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: `
    .filters-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
      gap: var(--space-3);
      padding: var(--card-padding);
      background: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      margin-bottom: var(--space-5);
      align-items: end;
      max-width: 100%;
    }
    .filter-field {
      display: grid;
      gap: var(--space-1);
      min-width: 0;
    }
    .filter-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--ink-secondary);
    }
    .filter-input {
      width: 100%;
      min-width: 0;
      height: var(--control-height);
      padding: 0 var(--space-3);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: var(--text-sm);
      background: var(--surface-canvas);
      color: var(--ink-primary);
    }
    .filter-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .btn-filter {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem 1.1rem;
      background: var(--brand-primary);
      color: var(--ink-on-dark);
      border: none;
      border-radius: var(--radius-sm);
      font-weight: 700;
      font-size: var(--text-sm);
      cursor: pointer;
    }
    .btn-reset {
      padding: 0.6rem 0.9rem;
      background: var(--surface-sand);
      color: var(--ink-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: var(--text-sm);
      cursor: pointer;
    }
    .guides-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
      gap: var(--space-4);
    }
    .guide-card {
      background: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: var(--shadow-xs);
    }
    .guide-card__top {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .guide-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--surface-forest);
      color: var(--ink-on-dark);
      display: grid;
      place-items: center;
      font-family: var(--font-sans);
      font-weight: 700;
      font-size: 15px;
      flex-shrink: 0;
    }
    .guide-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 3px;
    }
    .guide-card__name {
      margin: 0;
      font-family: var(--font-sans);
      font-size: 16px;
      font-weight: 600;
      color: var(--ink-primary);
    }
    .guide-card__pitch {
      margin: 0;
      color: var(--ink-secondary);
      font-size: 13px;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .guide-meta-compact {
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 8px 10px;
      background: var(--surface-canvas);
      border-radius: 8px;
      font-size: 12px;
      color: var(--ink-primary);
    }
    .guide-meta-line {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .guide-meta-line svg {
      flex-shrink: 0;
      color: var(--ink-muted);
    }
    .guide-meta-line span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .guide-card__footer {
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }
    .guide-price {
      font-weight: 700;
      color: var(--brand-primary);
      font-size: 13px;
      white-space: nowrap;
    }
    .btn-detail {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 32px;
      padding: 0 12px;
      white-space: nowrap;
      background: var(--accent-terracotta);
      color: var(--ink-on-dark);
      border-radius: var(--radius-sm);
      text-decoration: none;
      font-weight: 700;
      font-size: var(--text-xs);
    }
  `,
})
export class GuidesListPageComponent implements OnInit {
  private readonly guideApi = inject(GuideApiService);
  private readonly avisApi = inject(AvisApiService);
  private readonly seo = inject(SeoService);

  protected readonly guides = signal<GuideProfil[]>([]);
  protected readonly resumesMap = signal<Record<number, AvisResume>>({});
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly q = signal('');
  protected readonly zone = signal('');
  protected readonly langue = signal('');
  protected readonly disponibleOnly = signal(false);
  protected readonly visibleLimit = signal(24);
  private filterTimer?: ReturnType<typeof setTimeout>;

  protected readonly pagedGuides = computed(() =>
    this.guides().slice(0, this.visibleLimit())
  );

  protected readonly hasActiveFilters = computed(() =>
    Boolean(this.q().trim() || this.zone().trim() || this.langue().trim() || this.disponibleOnly())
  );

  protected readonly activeFilterChips = computed<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];
    if (this.q().trim()) chips.push({ key: 'q', label: `Recherche : ${this.q().trim()}` });
    if (this.zone().trim()) chips.push({ key: 'zone', label: `Zone : ${this.zone().trim()}` });
    if (this.langue().trim()) chips.push({ key: 'langue', label: `Langue : ${this.langue().trim()}` });
    if (this.disponibleOnly()) chips.push({ key: 'disp', label: 'Disponibles uniquement' });
    return chips;
  });

  protected onZoneInput(val: string): void {
    this.zone.set(val);
    clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => void this.onFilterImmediate(), 300);
  }

  protected onLangueInput(val: string): void {
    this.langue.set(val);
    clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => void this.onFilterImmediate(), 300);
  }

  protected onFilterImmediate(): void {
    this.visibleLimit.set(24);
    void this.loadGuides();
  }

  protected removeFilterChip(key: string): void {
    if (key === 'q') this.q.set('');
    else if (key === 'zone') this.zone.set('');
    else if (key === 'langue') this.langue.set('');
    else if (key === 'disp') this.disponibleOnly.set(false);
    this.onFilterImmediate();
  }

  ngOnInit(): void {
    this.seo.update({
      title: 'Guides Touristiques Agréés',
      description:
        'Annuaire officiel des guides touristiques validés en Casamance : zones couvertes, langues parlées, spécialités et avis vérifiés.',
      canonicalPath: '/guides',
    });
    void this.loadGuides();
  }

  protected resetFilters(): void {
    this.q.set('');
    this.zone.set('');
    this.langue.set('');
    this.disponibleOnly.set(false);
    this.visibleLimit.set(24);
    void this.loadGuides();
  }

  protected async loadGuides(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await firstValueFrom(
        this.guideApi.getPublicGuides({
          q: this.q().trim() || undefined,
          zone: this.zone().trim() || undefined,
          langue: this.langue().trim() || undefined,
        })
      );
      const safeList = (list ?? []).filter(
        (g) =>
          g.statutValidation === 'VALIDE' &&
          g.visibilitePublique &&
          (!this.disponibleOnly() || g.disponible)
      );
      this.guides.set(safeList);

      const userIds = safeList.map((g) => g.utilisateurId).filter((id) => id != null);
      if (userIds.length > 0) {
        const resumes = await firstValueFrom(this.avisApi.getResumesBatch('GUIDE', userIds)).catch(() => []);
        const map: Record<number, AvisResume> = {};
        for (const r of Array.isArray(resumes) ? resumes : []) {
          map[r.cibleId] = r;
        }
        this.resumesMap.set(map);
      }
    } catch (err) {
      this.error.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
