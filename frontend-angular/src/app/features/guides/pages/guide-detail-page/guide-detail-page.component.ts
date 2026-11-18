import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideAward,
  LucideCompass,
  LucideGlobe,
  LucideMapPin,
  LucideRoute,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import { Circuit } from '../../../../core/models/circuit.model';
import { GuideProfil, formatGuideStatusLabel } from '../../../../core/models/guide.model';
import { SeoService } from '../../../../core/services/seo.service';
import { UiAvisSectionComponent } from '../../../../shared/components/ui-avis-section/ui-avis-section.component';
import {
  BreadcrumbItem,
  UiBreadcrumbComponent,
} from '../../../../shared/components/ui-breadcrumb/ui-breadcrumb.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiSkeletonGridComponent } from '../../../../shared/components/ui-skeleton-grid/ui-skeleton-grid.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { DurationMinutesPipe } from '../../../../shared/pipes/duration-minutes.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { CircuitStore } from '../../../circuits/data-access/circuit.store';
import { GuideApiService } from '../../data-access/guide-api.service';

@Component({
  selector: 'app-guide-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DateFrPipe,
    DurationMinutesPipe,
    FcfaPricePipe,
    UiBreadcrumbComponent,
    UiErrorBannerComponent,
    UiSkeletonGridComponent,
    UiAvisSectionComponent,
    LucideAward,
    LucideGlobe,
    LucideMapPin,
    LucideCompass,
    LucideRoute,
    LucideArrowRight,
  ],
  template: `
    <div class="page-section">
      <div class="container">
        <app-ui-breadcrumb [items]="breadcrumbs()" />

        @if (loading()) {
          <app-ui-skeleton-grid [count]="2" />
        } @else if (error()) {
          <app-ui-error-banner [message]="error()!" />
        } @else if (guide(); as g) {
          <div class="guide-layout">
            <article class="guide-main">
              <header class="guide-hero">
                <div class="guide-hero__avatar" aria-hidden="true">
                  {{ g.prenom.slice(0, 1) }}{{ g.nom.slice(0, 1) }}
                </div>
                <div>
                  <div class="guide-hero__badges">
                    <span class="ui-badge ui-badge--success">
                      <svg lucideAward [size]="13" aria-hidden="true"></svg>
                      {{ formatGuideStatus(g.statutValidation) }}
                    </span>
                    <span class="ui-badge" [class.ui-badge--ochre]="g.disponible" [class.ui-badge--neutral]="!g.disponible">
                      {{ g.disponible ? 'Disponible pour guidage' : 'Actuellement complet' }}
                    </span>
                  </div>
                  <h1 class="guide-hero__title">{{ g.prenom }} {{ g.nom }}</h1>
                  <p class="guide-hero__pitch">{{ g.presentationCourte }}</p>
                </div>
              </header>

              <section class="guide-section">
                <h2>Biographie &amp; approche patrimoniale</h2>
                <p class="guide-bio">{{ g.biographie }}</p>
              </section>

              <section class="guide-section">
                <h2>Compétences, langues &amp; territoire</h2>
                <dl class="facts-grid">
                  <div>
                    <dt><svg lucideMapPin [size]="15" aria-hidden="true"></svg> Zones d'intervention</dt>
                    <dd>{{ g.zonesIntervention }}</dd>
                  </div>
                  <div>
                    <dt><svg lucideGlobe [size]="15" aria-hidden="true"></svg> Langues parlées</dt>
                    <dd>{{ g.languesParlees }}</dd>
                  </div>
                  <div>
                    <dt><svg lucideCompass [size]="15" aria-hidden="true"></svg> Spécialités</dt>
                    <dd>{{ g.specialites }}</dd>
                  </div>
                  <div>
                    <dt>Expérience déclarée</dt>
                    <dd class="tabular-nums">{{ g.anneesExperience }} année(s)</dd>
                  </div>
                  @if (g.dateValidation) {
                    <div>
                      <dt>Agrément vérifié le</dt>
                      <dd>{{ g.dateValidation | dateFr: 'd MMM yyyy' }}</dd>
                    </div>
                  }
                </dl>
              </section>

              @if (circuitsGuides().length > 0) {
                <section class="guide-section">
                  <h2>
                    <svg lucideRoute [size]="18" aria-hidden="true"></svg>
                    Circuits encadrés par ce guide
                  </h2>
                  <ul class="circuits-list">
                    @for (cir of circuitsGuides(); track cir.id) {
                      <li>
                        <a [routerLink]="['/circuits', cir.id]" class="circuit-link">
                          <div>
                            <strong>{{ cir.nomCircuit }}</strong>
                            <span class="circuit-meta tabular-nums">
                              {{ cir.dureeEstimee | durationMinutes }} · {{ cir.prix | fcfaPrice }}
                            </span>
                          </div>
                          <svg lucideArrowRight [size]="15" aria-hidden="true"></svg>
                        </a>
                      </li>
                    }
                  </ul>
                </section>
              }

              <app-ui-avis-section cibleType="GUIDE" [cibleId]="g.utilisateurId" />
            </article>

            <aside class="guide-sidebar">
              <p class="sidebar-eyebrow">Tarif indicatif d'accompagnement</p>
              <p class="sidebar-price tabular-nums">
                {{
                  g.tarifJournalierIndicatif != null
                    ? (g.tarifJournalierIndicatif | fcfaPrice)
                    : 'Sur devis'
                }}
              </p>
              <p class="sidebar-note">
                Les réservations s'effectuent directement sur les fiches des circuits touristiques
                encadrés par {{ g.prenom }} {{ g.nom }}.
              </p>
              <a routerLink="/circuits" class="btn-explore">Explorer les circuits</a>
            </aside>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .guide-layout {
      display: grid;
      grid-template-columns: 1fr 300px;
      gap: 2rem;
      align-items: start;
      margin-top: 1.25rem;
    }
    @media (max-width: 900px) {
      .guide-layout {
        grid-template-columns: 1fr;
      }
    }
    .guide-main {
      min-width: 0;
    }
    .guide-hero {
      display: flex;
      gap: 1.25rem;
      align-items: center;
      padding: 1.5rem;
      background: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      margin-bottom: 1.5rem;
    }
    .guide-hero__avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: var(--surface-forest);
      color: var(--ink-on-dark);
      display: grid;
      place-items: center;
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 700;
      flex-shrink: 0;
    }
    .guide-hero__badges {
      display: flex;
      gap: 0.45rem;
      flex-wrap: wrap;
      margin-bottom: 0.4rem;
    }
    .guide-hero__title {
      margin: 0 0 0.35rem;
      font-family: var(--font-display);
      font-size: var(--text-2xl);
      color: var(--ink-primary);
    }
    .guide-hero__pitch {
      margin: 0;
      color: var(--ink-secondary);
      font-size: var(--text-base);
    }
    .guide-section {
      padding: 1.35rem;
      background: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      margin-bottom: 1.25rem;
    }
    .guide-section h2 {
      margin: 0 0 0.85rem;
      font-family: var(--font-display);
      font-size: var(--text-lg);
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }
    .guide-bio {
      margin: 0;
      color: var(--ink-secondary);
      line-height: 1.7;
      white-space: pre-line;
    }
    .facts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.85rem;
      margin: 0;
    }
    .facts-grid div {
      padding: 0.85rem;
      background: var(--surface-canvas);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }
    .facts-grid dt {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: var(--text-xs);
      font-weight: 700;
      color: var(--ink-muted);
      margin-bottom: 0.25rem;
    }
    .facts-grid dd {
      margin: 0;
      font-weight: 600;
      color: var(--ink-primary);
      font-size: var(--text-sm);
    }
    .circuits-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.65rem;
    }
    .circuit-link {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1rem;
      background: var(--surface-canvas);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      text-decoration: none;
      color: var(--ink-primary);
    }
    .circuit-link div {
      display: grid;
      gap: 0.2rem;
    }
    .circuit-meta {
      font-size: var(--text-xs);
      color: var(--ink-muted);
    }
    .guide-sidebar {
      padding: 1.35rem;
      background: var(--surface-sand);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      position: sticky;
      top: 5.5rem;
    }
    .sidebar-eyebrow {
      margin: 0 0 0.25rem;
      font-size: var(--text-xs);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
      color: var(--accent-terracotta);
    }
    .sidebar-price {
      margin: 0 0 0.75rem;
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: 700;
      color: var(--brand-primary);
    }
    .sidebar-note {
      margin: 0 0 1rem;
      font-size: var(--text-xs);
      color: var(--ink-secondary);
      line-height: 1.5;
    }
    .btn-explore {
      display: block;
      text-align: center;
      padding: 0.7rem 1rem;
      background: var(--brand-primary);
      color: var(--ink-on-dark);
      border-radius: var(--radius-sm);
      text-decoration: none;
      font-weight: 700;
      font-size: var(--text-sm);
    }
  `,
})
export class GuideDetailPageComponent {
  readonly id = input.required<string>();

  protected readonly formatGuideStatus = formatGuideStatusLabel;
  private readonly guideApi = inject(GuideApiService);
  private readonly circuitStore = inject(CircuitStore);
  private readonly seo = inject(SeoService);

  protected readonly guide = signal<GuideProfil | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const g = this.guide();
    return [
      { label: 'Accueil', to: '/' },
      { label: 'Guides', to: '/guides' },
      { label: g ? `${g.prenom} ${g.nom}` : 'Profil introuvable' },
    ];
  });

  protected readonly circuitsGuides = computed<Circuit[]>(() => {
    const g = this.guide();
    if (!g) return [];
    return this.circuitStore.items().filter((c: Circuit) => c.guideResponsableId === g.utilisateurId);
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        void this.circuitStore.ensureLoaded();
        void this.loadGuide(id);
      });
    });
  }

  private async loadGuide(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const g = await firstValueFrom(this.guideApi.getById(id));
      if (g.statutValidation !== 'VALIDE' || !g.visibilitePublique) {
        this.guide.set(null);
        this.error.set('Ce profil de guide n’est pas accessible publiquement.');
        return;
      }
      this.guide.set(g);
      this.seo.update({
        title: `${g.prenom} ${g.nom} — Guide agréé`,
        description:
          g.presentationCourte ||
          `Guide touristique agréé en Casamance (${g.zonesIntervention}). Langues : ${g.languesParlees}.`,
        canonicalPath: `/guides/${g.id}`,
      });
    } catch (err) {
      this.error.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }
}
