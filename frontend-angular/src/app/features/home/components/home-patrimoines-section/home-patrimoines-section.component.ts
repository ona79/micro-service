import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideMapPin, LucideStar } from '@lucide/angular';
import { AvisResume } from '../../../../core/models/avis.model';
import { Patrimoine } from '../../../../core/models/patrimoine.model';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiLoadingStateComponent } from '../../../../shared/components/ui-loading-state/ui-loading-state.component';
import { UiPatrimoineImageComponent } from '../../../../shared/components/ui-patrimoine-image/ui-patrimoine-image.component';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';
import { isLieuDeMemoire } from '../../../../shared/utils/patrimoine.utils';

@Component({
  selector: 'app-home-patrimoines-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LucideArrowRight,
    LucideMapPin,
    LucideStar,
    UiLoadingStateComponent,
    UiErrorBannerComponent,
    UiEmptyStateComponent,
    UiPatrimoineImageComponent,
    ScrollRevealDirective,
  ],
  template: `
    <section class="page-section editorial-section" aria-labelledby="featured-sites-title">
      <div class="container">
        <div class="section-header" appScrollReveal="fade-up">
          <div>
            <p class="eyebrow">Sélection éditoriale</p>
            <h2 id="featured-sites-title" class="section-title">Sites patrimoniaux à la une</h2>
          </div>
          <a routerLink="/patrimoines" class="section-link">
            <span>Tout le catalogue</span>
            <svg lucideArrowRight [size]="16" aria-hidden="true"></svg>
          </a>
        </div>

        @if (loading() && patrimoines().length === 0) {
          <app-ui-loading-state label="Chargement des patrimoines de Casamance..." />
        } @else if (error()) {
          <app-ui-error-banner
            title="Impossible de charger les patrimoines"
            [message]="error()!"
            (retry)="retry.emit()"
          />
        } @else if (patrimoines().length === 0) {
          <app-ui-empty-state
            title="Aucun patrimoine publié"
            description="Les fiches publiées par les conservateurs apparaîtront ici dès leur validation."
          />
        } @else {
          <div
            class="magazine-grid"
            [class.magazine-grid--single]="secondaryPatrimoines().length === 0"
          >
            @if (leadPatrimoine(); as leadPat) {
              <article
                class="mag-lead"
                [class.mag-lead--memorial]="isMemorial(leadPat)"
                appScrollReveal="clip-reveal"
              >
                <a
                  [routerLink]="['/patrimoines', leadPat.id]"
                  class="mag-lead__media"
                  [attr.aria-label]="leadPat.nomPatrimoine"
                >
                  <app-ui-patrimoine-image
                    [codePatrimoine]="leadPat.codePatrimoine"
                    [nomPatrimoine]="leadPat.nomPatrimoine"
                    [imageUrl]="leadPat.imageUrl"
                    [sobriete]="isMemorial(leadPat)"
                  />
                  <div class="mag-lead__gradient"></div>
                </a>

                <div class="mag-lead__body">
                  <div class="mag-tags">
                    @if (isMemorial(leadPat)) {
                      <span class="ui-badge ui-badge--memorial">Lieu de mémoire</span>
                    } @else if (leadPat.categoriePatrimoine) {
                      <span class="ui-badge ui-badge--clay">{{ leadPat.categoriePatrimoine }}</span>
                    }
                    <span class="ui-badge ui-badge--neutral">
                      {{ formatZoneLabel(leadPat.zoneGeographique) }}
                    </span>
                    @if (getResume(leadPat.id); as res) {
                      @if (res.totalAvis > 0) {
                        <span class="ui-badge ui-badge--ochre tabular-nums">
                          <svg lucideStar [size]="12" aria-hidden="true"></svg>
                          {{ res.noteMoyenne }}/5 ({{ res.totalAvis }})
                        </span>
                      }
                    }
                  </div>

                  <h3 class="mag-lead__title">
                    <a [routerLink]="['/patrimoines', leadPat.id]">{{ leadPat.nomPatrimoine }}</a>
                  </h3>

                  <p class="mag-lead__meta">
                    <svg lucideMapPin [size]="14" aria-hidden="true"></svg>
                    <span>{{ leadPat.adressePatrimoine || leadPat.localite || 'Casamance' }}</span>
                  </p>

                  <p class="mag-lead__desc">
                    {{ leadPat.descriptionPatrimoine || 'Site patrimonial référencé.' }}
                  </p>

                  <div class="mag-lead__footer">
                    <span class="tabular-nums">{{ leadPat.capacitePatrimoine }} places max</span>
                    <a [routerLink]="['/patrimoines', leadPat.id]" class="mag-link">
                      <span>Lire la fiche</span>
                      <svg lucideArrowRight [size]="14" aria-hidden="true"></svg>
                    </a>
                  </div>
                </div>
              </article>
            }

            @if (secondaryPatrimoines().length > 0) {
              <div class="mag-stack">
                @for (pat of secondaryPatrimoines(); track pat.id; let i = $index) {
                  <article
                    class="mag-side-card"
                    [class.mag-side-card--memorial]="isMemorial(pat)"
                    appScrollReveal="slide-right"
                    [delayMs]="(i + 1) * 140"
                  >
                    <a
                      [routerLink]="['/patrimoines', pat.id]"
                      class="mag-side-card__media"
                      [attr.aria-label]="pat.nomPatrimoine"
                    >
                      <app-ui-patrimoine-image
                        [codePatrimoine]="pat.codePatrimoine"
                        [nomPatrimoine]="pat.nomPatrimoine"
                        [imageUrl]="pat.imageUrl"
                        [sobriete]="isMemorial(pat)"
                      />
                    </a>

                    <div class="mag-side-card__body">
                      <div class="mag-tags">
                        @if (isMemorial(pat)) {
                          <span class="ui-badge ui-badge--memorial">Lieu de mémoire</span>
                        } @else if (pat.categoriePatrimoine) {
                          <span class="ui-badge ui-badge--neutral">{{ pat.categoriePatrimoine }}</span>
                        }
                        @if (getResume(pat.id); as res) {
                          @if (res.totalAvis > 0) {
                            <span class="ui-badge ui-badge--ochre tabular-nums">
                              <svg lucideStar [size]="12" aria-hidden="true"></svg>
                              {{ res.noteMoyenne }}/5
                            </span>
                          }
                        }
                      </div>

                      <h3 class="mag-side-card__title">
                        <a [routerLink]="['/patrimoines', pat.id]">{{ pat.nomPatrimoine }}</a>
                      </h3>

                      <p class="mag-side-card__place">
                        <svg lucideMapPin [size]="13" aria-hidden="true"></svg>
                        <span>{{ pat.adressePatrimoine || pat.localite || 'Casamance' }}</span>
                      </p>

                      <p class="mag-side-card__desc">
                        {{ pat.descriptionPatrimoine || 'Description patrimoniale disponible sur la fiche.' }}
                      </p>

                      <div class="mag-side-card__footer">
                        <a [routerLink]="['/patrimoines', pat.id]" class="mag-link">
                          <span>Voir la fiche</span>
                          <svg lucideArrowRight [size]="14" aria-hidden="true"></svg>
                        </a>
                      </div>
                    </div>
                  </article>
                }
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .editorial-section {
      padding: 48px 0 56px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .section-title {
      font-size: clamp(1.55rem, 2.8vw, 2.1rem);
      margin: 6px 0 0;
      color: var(--ink-primary);
    }

    .section-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 14px;
      color: var(--brand-primary);
      text-decoration: none;
    }

    .section-link:hover {
      text-decoration: underline;
    }

    /* Editorial magazine layout: 1 large feature left + 2 stacked right */
    .magazine-grid {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 20px;
      align-items: stretch;
    }

    .magazine-grid--single {
      grid-template-columns: 1fr;
    }

    .mag-lead {
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 28px rgba(20, 38, 30, 0.06);
      transition: transform 220ms ease;
    }

    .mag-lead--memorial {
      border-color: var(--memorial-border);
      background-color: var(--memorial-bg);
    }

    .mag-lead__media {
      position: relative;
      display: block;
      height: 255px;
      overflow: hidden;
    }

    .mag-lead__body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }

    .mag-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .mag-lead__title {
      margin: 0;
      font-size: clamp(1.25rem, 2vw, 1.55rem);
      line-height: 1.25;
    }

    .mag-lead__title a,
    .mag-side-card__title a {
      color: var(--ink-primary);
      text-decoration: none;
    }

    .mag-lead__title a:hover,
    .mag-side-card__title a:hover {
      color: var(--brand-primary);
    }

    .mag-lead__meta,
    .mag-side-card__place {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      color: var(--ink-secondary);
    }

    .mag-lead__desc {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.55;
      color: var(--ink-secondary);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex: 1;
    }

    .mag-lead__footer {
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12.5px;
      color: var(--ink-muted);
    }

    /* Right column: 2 stacked horizontal cards */
    .mag-stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .mag-side-card {
      flex: 1;
      display: grid;
      grid-template-columns: 195px 1fr;
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 6px 20px rgba(20, 38, 30, 0.05);
      transition: transform 200ms ease;
    }

    .mag-side-card:hover {
      transform: translateY(-2px);
    }

    .mag-side-card--memorial {
      border-color: var(--memorial-border);
      background-color: var(--memorial-bg);
    }

    .mag-side-card__media {
      display: block;
      height: 100%;
      min-height: 165px;
      overflow: hidden;
    }

    .mag-side-card__body {
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }

    .mag-side-card__title {
      margin: 0;
      font-size: 16px;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .mag-side-card__desc {
      margin: 0;
      font-size: 12.8px;
      line-height: 1.45;
      color: var(--ink-secondary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex: 1;
    }

    .mag-side-card__footer {
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      justify-content: flex-end;
    }

    .mag-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
      color: var(--brand-primary);
      text-decoration: none;
    }

    .mag-link svg {
      transition: transform 160ms ease;
    }

    .mag-link:hover svg {
      transform: translateX(3px);
    }

    @media (max-width: 960px) {
      .magazine-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 600px) {
      .mag-side-card {
        grid-template-columns: 1fr;
      }
      .mag-side-card__media {
        height: 155px;
      }
    }
  `,
})
export class HomePatrimoinesSectionComponent {
  readonly patrimoines = input.required<Patrimoine[]>();
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);
  readonly avisMap = input<Map<number, AvisResume>>(new Map());

  readonly retry = output<void>();

  protected readonly leadPatrimoine = computed<Patrimoine | null>(() => {
    const list = this.patrimoines();
    return list.length > 0 ? list[0] : null;
  });

  protected readonly secondaryPatrimoines = computed<Patrimoine[]>(() =>
    this.patrimoines().slice(1, 3)
  );

  protected isMemorial(patrimoine: Patrimoine): boolean {
    return isLieuDeMemoire(patrimoine);
  }

  protected getResume(id: number): AvisResume | null {
    return this.avisMap().get(id) ?? null;
  }

  protected formatZoneLabel(zone?: string | null): string {
    switch (zone) {
      case 'BASSE_CASAMANCE':
        return 'Basse-Casamance';
      case 'MOYENNE_CASAMANCE':
        return 'Moyenne-Casamance';
      case 'HAUTE_CASAMANCE':
        return 'Haute-Casamance';
      default:
        return 'Casamance';
    }
  }
}
