import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
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
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiSkeletonGridComponent } from '../../../../shared/components/ui-skeleton-grid/ui-skeleton-grid.component';
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
    UiSkeletonGridComponent,
    LucideCompass,
    LucideSearch,
    LucideMapPin,
    LucideGlobe,
    LucideAward,
    LucideStar,
    LucideArrowRight,
  ],
  template: `
    <div class="page-section">
      <div class="container">
        <header class="editorial-header">
          <p class="editorial-header__eyebrow">Accompagnateurs certifiés de Casamance</p>
          <h1 class="editorial-header__title">Guides touristiques agréés</h1>
          <p class="editorial-header__lead">
            Découvrez nos guides locaux vérifiés : spécialistes de l'écotourisme en bolongs, du patrimoine
            architectural Diola, de l'histoire mémorielle et des traditions vivantes du Kasa.
          </p>
        </header>

        <form class="filters-bar" (ngSubmit)="loadGuides()">
          <label class="filter-field">
            <span class="filter-label">Recherche</span>
            <input
              type="search"
              class="filter-input"
              [(ngModel)]="q"
              name="q"
              placeholder="Nom, spécialité, Carabane..."
            />
          </label>
          <label class="filter-field">
            <span class="filter-label">Zone d'intervention</span>
            <input
              type="text"
              class="filter-input"
              [(ngModel)]="zone"
              name="zone"
              placeholder="Basse-Casamance, Oussouye..."
            />
          </label>
          <label class="filter-field">
            <span class="filter-label">Langue parlée</span>
            <input
              type="text"
              class="filter-input"
              [(ngModel)]="langue"
              name="langue"
              placeholder="Français, Diola, Wolof..."
            />
          </label>
          <label class="filter-field" style="display:flex;align-items:center;gap:0.5rem;padding-bottom:0.45rem;">
            <input
              type="checkbox"
              [(ngModel)]="disponibleOnly"
              (ngModelChange)="loadGuides()"
              name="disponibleOnly"
            />
            <span class="filter-label" style="margin:0;">Disponibles uniquement</span>
          </label>
          <div class="filter-actions">
            <button type="submit" class="btn-filter">
              <svg lucideSearch [size]="16" aria-hidden="true"></svg>
              <span>Filtrer</span>
            </button>
            <button type="button" class="btn-reset" (click)="resetFilters()">Réinitialiser</button>
          </div>
        </form>

        @if (error()) {
          <app-ui-error-banner [message]="error()!" (retry)="loadGuides()" />
        } @else if (loading()) {
          <app-ui-skeleton-grid [count]="4" />
        } @else if (guides().length === 0) {
          <app-ui-empty-state
            title="Aucun guide public correspondant"
            message="Ajustez vos critères de zone ou de langue pour afficher nos guides agréés."
          />
        } @else {
          <div class="guides-grid">
            @for (guide of guides(); track guide.id) {
              <article class="guide-card">
                <div class="guide-card__top">
                  <div class="guide-avatar" aria-hidden="true">
                    {{ guide.prenom.slice(0, 1) }}{{ guide.nom.slice(0, 1) }}
                  </div>
                  <div class="guide-card__identity">
                    <div class="guide-badges">
                      <span class="ui-badge ui-badge--success">
                        <svg lucideAward [size]="12" aria-hidden="true"></svg>
                        Guide agréé
                      </span>
                      @if (guide.disponible) {
                        <span class="ui-badge ui-badge--ochre">Disponible</span>
                      } @else {
                        <span class="ui-badge ui-badge--neutral">Indisponible</span>
                      }
                    </div>
                    <h2 class="guide-card__name">{{ guide.prenom }} {{ guide.nom }}</h2>
                    @if (resumesMap()[guide.utilisateurId]; as r) {
                      @if (r.totalAvis > 0) {
                        <p class="guide-rating tabular-nums">
                          <svg lucideStar [size]="14" class="star-icon" aria-hidden="true"></svg>
                          <strong>{{ r.noteMoyenne | number: '1.1-2' }} / 5</strong>
                          <span>({{ r.totalAvis }} avis vérifié(s))</span>
                        </p>
                      }
                    }
                  </div>
                </div>

                <p class="guide-card__pitch">{{ guide.presentationCourte }}</p>

                <dl class="guide-meta">
                  <div>
                    <dt><svg lucideMapPin [size]="14" aria-hidden="true"></svg> Zones</dt>
                    <dd>{{ guide.zonesIntervention }}</dd>
                  </div>
                  <div>
                    <dt><svg lucideGlobe [size]="14" aria-hidden="true"></svg> Langues</dt>
                    <dd>{{ guide.languesParlees }}</dd>
                  </div>
                  <div>
                    <dt><svg lucideCompass [size]="14" aria-hidden="true"></svg> Expérience</dt>
                    <dd class="tabular-nums">{{ guide.anneesExperience }} an(s)</dd>
                  </div>
                </dl>

                <div class="guide-card__footer">
                  <span class="guide-price tabular-nums">
                    {{
                      guide.tarifJournalierIndicatif != null
                        ? (guide.tarifJournalierIndicatif | fcfaPrice) + ' / jour'
                        : 'Tarif selon itinéraire'
                    }}
                  </span>
                  <a [routerLink]="['/guides', guide.id]" class="btn-detail">
                    <span>Voir le profil</span>
                    <svg lucideArrowRight [size]="15" aria-hidden="true"></svg>
                  </a>
                </div>
              </article>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .filters-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 0.85rem;
      padding: 1rem 1.25rem;
      background: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      margin-bottom: 1.75rem;
      align-items: end;
    }
    .filter-field {
      display: grid;
      gap: 0.35rem;
    }
    .filter-label {
      font-size: var(--text-xs);
      font-weight: 700;
      color: var(--ink-secondary);
    }
    .filter-input {
      padding: 0.58rem 0.75rem;
      border: 1px solid var(--border-strong);
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
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }
    .guide-card {
      background: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 0.95rem;
      box-shadow: var(--shadow-xs);
    }
    .guide-card__top {
      display: flex;
      gap: 0.9rem;
      align-items: center;
    }
    .guide-avatar {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: var(--surface-forest);
      color: var(--ink-on-dark);
      display: grid;
      place-items: center;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.15rem;
      flex-shrink: 0;
    }
    .guide-badges {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
      margin-bottom: 0.25rem;
    }
    .guide-card__name {
      margin: 0;
      font-family: var(--font-display);
      font-size: var(--text-lg);
      color: var(--ink-primary);
    }
    .guide-rating {
      margin: 0.2rem 0 0;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: var(--text-xs);
      color: var(--ink-secondary);
    }
    .star-icon {
      color: var(--accent-ochre);
      fill: var(--accent-ochre);
    }
    .guide-card__pitch {
      margin: 0;
      color: var(--ink-secondary);
      font-size: var(--text-sm);
      line-height: 1.55;
    }
    .guide-meta {
      margin: 0;
      padding: 0.75rem;
      background: var(--surface-canvas);
      border-radius: var(--radius-md);
      display: grid;
      gap: 0.45rem;
      font-size: var(--text-xs);
    }
    .guide-meta div {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .guide-meta dt {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-weight: 700;
      color: var(--ink-muted);
    }
    .guide-meta dd {
      margin: 0;
      color: var(--ink-primary);
      text-align: right;
    }
    .guide-card__footer {
      margin-top: auto;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }
    .guide-price {
      font-weight: 800;
      color: var(--brand-primary);
      font-size: var(--text-sm);
    }
    .btn-detail {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.5rem 0.9rem;
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

  protected q = '';
  protected zone = '';
  protected langue = '';
  protected disponibleOnly = false;

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
    this.q = '';
    this.zone = '';
    this.langue = '';
    this.disponibleOnly = false;
    void this.loadGuides();
  }

  protected async loadGuides(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await firstValueFrom(
        this.guideApi.getPublicGuides({
          q: this.q.trim() || undefined,
          zone: this.zone.trim() || undefined,
          langue: this.langue.trim() || undefined,
        })
      );
      const safeList = (list ?? []).filter(
        (g) =>
          g.statutValidation === 'VALIDE' &&
          g.visibilitePublique &&
          (!this.disponibleOnly || g.disponible)
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
