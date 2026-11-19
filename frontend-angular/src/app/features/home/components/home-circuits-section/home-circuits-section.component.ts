import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideChevronLeft,
  LucideChevronRight,
  LucideClock,
  LucideRoute,
  LucideStar,
} from '@lucide/angular';
import { AvisResume } from '../../../../core/models/avis.model';
import { Circuit, Etape } from '../../../../core/models/circuit.model';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';
import { DifficulteLabelPipe } from '../../../../shared/pipes/difficulte-label.pipe';
import { DurationMinutesPipe } from '../../../../shared/pipes/duration-minutes.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';

@Component({
  selector: 'app-home-circuits-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LucideArrowRight,
    LucideChevronLeft,
    LucideChevronRight,
    LucideClock,
    LucideRoute,
    LucideStar,
    DifficulteLabelPipe,
    DurationMinutesPipe,
    FcfaPricePipe,
    ScrollRevealDirective,
  ],
  template: `
    <section class="page-section band-sand circuits-carousel-section" aria-labelledby="circuits-home-title">
      <div class="container">
        <div class="section-header section-header--reverse" appScrollReveal="slide-right">
          <div class="section-header__controls">
            <a routerLink="/circuits" class="section-link-pill">
              <span>Tous les circuits</span>
              <svg lucideArrowRight [size]="16" aria-hidden="true"></svg>
            </a>
            @if (circuits().length > 1) {
              <div class="carousel-controls" aria-label="Navigation du carrousel des circuits">
                <button
                  type="button"
                  class="carousel-arrow"
                  (click)="scrollByStep(-1)"
                  aria-label="Circuit précédent"
                >
                  <svg lucideChevronLeft [size]="18" aria-hidden="true"></svg>
                </button>
                <button
                  type="button"
                  class="carousel-arrow"
                  (click)="scrollByStep(1)"
                  aria-label="Circuit suivant"
                >
                  <svg lucideChevronRight [size]="18" aria-hidden="true"></svg>
                </button>
              </div>
            }
          </div>

          <div class="section-header__title-right">
            <p class="eyebrow">02 · Itinéraires thématiques</p>
            <h2 id="circuits-home-title" class="section-title">
              Circuits entre <em class="title-serif-ochre">bolongs, forêts</em> et mémoires
            </h2>
          </div>
        </div>

        @if (circuits().length === 0) {
          <div class="inline-callout" appScrollReveal="fade-up">
            <p>Aucun circuit publié pour le moment. Consultez le catalogue complet des itinéraires.</p>
            <a routerLink="/circuits" class="btn-secondary">Voir les circuits</a>
          </div>
        } @else {
          <div
            #trackEl
            class="circuits-track"
            (scroll)="onTrackScroll()"
            role="region"
            aria-label="Carrousel des circuits thématiques"
          >
            @for (cir of circuits(); track cir.id; let i = $index) {
              <article
                class="circuit-ticket"
                appScrollReveal="slide-right"
                [delayMs]="i * 110"
              >
                <div class="circuit-ticket__top">
                  <div class="circuit-ticket__pills">
                    <span class="pill-chip pill-chip--duration tabular-nums">
                      <svg lucideClock [size]="12" aria-hidden="true"></svg>
                      {{ cir.dureeEstimee | durationMinutes }}
                    </span>
                    <span class="pill-chip pill-chip--ochre">
                      {{ cir.difficulte | difficulteLabel }}
                    </span>
                    @if (cir.moyenTransport) {
                      <span class="pill-chip pill-chip--transport">
                        {{ cir.moyenTransport }}
                      </span>
                    }
                  </div>

                  @if (getResume(cir.id); as res) {
                    @if (res.totalAvis > 0) {
                      <span class="pill-chip pill-chip--rating tabular-nums">
                        <svg lucideStar [size]="12" aria-hidden="true"></svg>
                        {{ res.noteMoyenne }}/5 ({{ res.totalAvis }})
                      </span>
                    }
                  }
                </div>

                <h3 class="circuit-ticket__title">
                  <a [routerLink]="['/circuits', cir.id]">{{ cir.nomCircuit }}</a>
                </h3>

                <p class="circuit-ticket__desc">
                  {{
                    cir.presentationTouristique ||
                      cir.descriptionCircuit ||
                      'Circuit patrimonial accompagné en Casamance.'
                  }}
                </p>

                <!-- Mini-ligne d'étapes -->
                <div class="circuit-timeline" aria-label="Aperçu de l'itinéraire">
                  @if (sortedEtapes(cir).length > 0) {
                    <div class="circuit-timeline__steps">
                      @for (et of sortedEtapes(cir).slice(0, 3); track et.ordre; let last = $last) {
                        <span class="timeline-node">
                          <span class="timeline-node__dot"></span>
                          <span class="timeline-node__label">
                            {{ et.patrimoine?.nomPatrimoine || et.descriptionEtape || ('Étape ' + et.ordre) }}
                          </span>
                        </span>
                        @if (!last) {
                          <span class="timeline-connector" aria-hidden="true"></span>
                        }
                      }
                    </div>
                  } @else {
                    <div class="circuit-timeline__steps">
                      <span class="timeline-node">
                        <span class="timeline-node__dot"></span>
                        <span class="timeline-node__label">
                          {{ cir.pointDepart || 'Départ Casamance' }}
                        </span>
                      </span>
                      <span class="timeline-connector" aria-hidden="true"></span>
                      <span class="timeline-node">
                        <span class="timeline-node__dot timeline-node__dot--accent"></span>
                        <span class="timeline-node__label tabular-nums" title="Calcul orthodromique indicatif entre étapes">
                          {{ cir.distanceTotale }} km (à vol d’oiseau)
                        </span>
                      </span>
                      @if (cir.pointArrivee) {
                        <span class="timeline-connector" aria-hidden="true"></span>
                        <span class="timeline-node">
                          <span class="timeline-node__dot"></span>
                          <span class="timeline-node__label">{{ cir.pointArrivee }}</span>
                        </span>
                      }
                    </div>
                  }
                </div>

                <div class="circuit-ticket__footer">
                  <div class="circuit-ticket__price-block">
                    <span class="circuit-ticket__price-label">Tarif</span>
                    <strong class="circuit-ticket__price tabular-nums">{{ cir.prix | fcfaPrice }}</strong>
                  </div>

                  <a [routerLink]="['/circuits', cir.id]" class="circuit-ticket__cta">
                    <svg lucideRoute [size]="14" aria-hidden="true"></svg>
                    <span>Découvrir l’itinéraire</span>
                    <svg lucideArrowRight [size]="14" aria-hidden="true"></svg>
                  </a>
                </div>
              </article>
            }
          </div>

          @if (circuits().length > 1) {
            <div class="carousel-progress-wrap" aria-hidden="true">
              <div class="carousel-progress-bar">
                <div
                  class="carousel-progress-fill"
                  [style.transform]="'scaleX(' + scrollProgress() + ')'"
                ></div>
              </div>
              <span class="carousel-progress-count tabular-nums">
                {{ activeSlide() }} / {{ circuits().length }}
              </span>
            </div>
          }
        }
      </div>
    </section>
  `,
  styles: `
    .circuits-carousel-section {
      padding: 52px 0;
      background-color: var(--surface-sand);
      border-top: 1px solid var(--border-subtle);
      border-bottom: 1px solid var(--border-subtle);
    }

    .section-header--reverse {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 26px;
      flex-wrap: wrap-reverse;
    }

    .section-header__controls {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .section-header__title-right {
      text-align: right;
      margin-left: auto;
      padding-right: 16px;
      border-right: 4px solid var(--brand-primary);
    }

    .section-title {
      font-size: clamp(1.65rem, 3vw, 2.25rem);
      margin: 4px 0 0;
      color: var(--ink-primary);
    }

    .title-serif-ochre {
      font-family: var(--font-editorial, Georgia, serif);
      font-style: italic;
      font-weight: 700;
      font-size: 1.12em;
      color: #8f5c14;
    }

    .section-link-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 999px;
      border: 1px solid var(--border-strong);
      background-color: var(--surface-elevated);
      font-weight: 700;
      font-size: 13px;
      color: var(--brand-primary);
      text-decoration: none;
    }

    .carousel-controls {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .carousel-arrow {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      border: 1px solid var(--border-strong);
      background-color: var(--surface-elevated);
      color: var(--ink-primary);
      display: grid;
      place-items: center;
      cursor: pointer;
      transition: transform 150ms ease, opacity 150ms ease;
    }

    .carousel-arrow:hover {
      transform: scale(1.06);
      border-color: var(--brand-primary);
      color: var(--brand-primary);
    }

    /* Horizontal scroll-snap track */
    .circuits-track {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(320px, calc((100% - 36px) / 2.65));
      gap: 18px;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scroll-behavior: smooth;
      padding: 6px 2px 14px;
      scrollbar-width: none;
    }

    .circuits-track::-webkit-scrollbar {
      display: none;
    }

    /* Distinct route ticket card design (different from patrimoine cards) */
    .circuit-ticket {
      scroll-snap-align: start;
      background:
        linear-gradient(180deg, #ffffff 0%, #fcfaf5 100%);
      border: 1px solid var(--border-strong, #d9d0c1);
      border-top: 4px solid var(--brand-primary);
      border-radius: 16px;
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 8px 22px rgba(20, 38, 30, 0.05);
      transition: transform 200ms ease;
    }

    .circuit-ticket:hover {
      transform: translateY(-3px);
    }

    .circuit-ticket__top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .circuit-ticket__pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .pill-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .pill-chip--duration {
      background-color: var(--brand-soft, #e5efe9);
      color: var(--brand-primary);
    }

    .pill-chip--ochre {
      background-color: #f8eed8;
      color: #8f5c14;
    }

    .pill-chip--transport {
      background-color: #f0ece3;
      color: var(--ink-secondary);
    }

    .pill-chip--rating {
      background-color: #e6f5ed;
      color: #15653d;
    }

    .circuit-ticket__title {
      margin: 0;
      font-size: 17px;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .circuit-ticket__title a {
      color: var(--ink-primary);
      text-decoration: none;
    }

    .circuit-ticket__title a:hover {
      color: var(--brand-primary);
    }

    .circuit-ticket__desc {
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--ink-secondary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      flex: 1;
    }

    /* Mini steps timeline */
    .circuit-timeline {
      padding: 10px 12px;
      border-radius: 10px;
      background-color: rgba(240, 235, 224, 0.65);
      border: 1px dashed var(--border-strong, #d8cfc0);
    }

    .circuit-timeline__steps {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;
    }

    .timeline-node {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-width: 0;
      max-width: 48%;
    }

    .timeline-node__dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: var(--brand-primary);
      flex-shrink: 0;
    }

    .timeline-node__dot--accent {
      background-color: var(--accent-terracotta, #b75f3b);
    }

    .timeline-node__label {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--ink-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .timeline-connector {
      flex: 1;
      min-width: 12px;
      height: 1px;
      background-color: var(--border-strong, #c5bba9);
    }

    .circuit-ticket__footer {
      margin-top: auto;
      padding-top: 10px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }

    .circuit-ticket__price-block {
      display: flex;
      flex-direction: column;
    }

    .circuit-ticket__price-label {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ink-muted);
      font-weight: 700;
    }

    .circuit-ticket__price {
      font-size: 15px;
      color: var(--brand-primary);
      font-weight: 800;
    }

    .circuit-ticket__cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 13px;
      border-radius: 999px;
      background-color: var(--brand-soft, #e5efe9);
      color: var(--brand-primary);
      font-size: 12.5px;
      font-weight: 700;
      text-decoration: none;
      white-space: nowrap;
      transition: transform 160ms ease;
    }

    .circuit-ticket__cta:hover {
      transform: translateX(2px);
    }

    /* Progress indicator */
    .carousel-progress-wrap {
      margin-top: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }

    .carousel-progress-bar {
      flex: 1;
      height: 4px;
      border-radius: 999px;
      background-color: rgba(27, 94, 32, 0.14);
      overflow: hidden;
    }

    .carousel-progress-fill {
      width: 100%;
      height: 100%;
      background-color: var(--brand-primary);
      transform-origin: left center;
      transition: transform 180ms ease;
    }

    .carousel-progress-count {
      font-size: 12px;
      font-weight: 700;
      color: var(--ink-muted);
    }

    .inline-callout {
      padding: 20px;
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      padding: 9px 18px;
      border-radius: 999px;
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-strong);
      color: var(--ink-primary);
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
    }

    @media (max-width: 768px) {
      .circuits-track {
        grid-auto-columns: minmax(280px, 88%);
      }
    }
  `,
})
export class HomeCircuitsSectionComponent {
  readonly circuits = input.required<Circuit[]>();
  readonly avisMap = input<Map<number, AvisResume>>(new Map());

  @ViewChild('trackEl') private trackEl?: ElementRef<HTMLElement>;

  protected readonly scrollProgress = signal<number>(0.25);
  protected readonly activeSlide = signal<number>(1);

  protected getResume(id: number): AvisResume | null {
    return this.avisMap().get(id) ?? null;
  }

  protected sortedEtapes(circuit: Circuit): Etape[] {
    if (!Array.isArray(circuit.etapes) || circuit.etapes.length === 0) return [];
    return [...circuit.etapes].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  }

  protected scrollByStep(direction: -1 | 1): void {
    const el = this.trackEl?.nativeElement;
    if (!el) return;
    const stepWidth = Math.max(300, Math.round(el.clientWidth * 0.65));
    el.scrollBy({ left: direction * stepWidth, behavior: 'smooth' });
  }

  protected onTrackScroll(): void {
    const el = this.trackEl?.nativeElement;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const total = Math.max(1, this.circuits().length);
    if (maxScroll <= 0) {
      this.scrollProgress.set(1);
      this.activeSlide.set(total);
      return;
    }
    const ratio = Math.min(1, Math.max(0, el.scrollLeft / maxScroll));
    this.scrollProgress.set(Math.max(1 / total, ratio));
    this.activeSlide.set(Math.min(total, Math.max(1, Math.round(ratio * (total - 1)) + 1)));
  }
}
