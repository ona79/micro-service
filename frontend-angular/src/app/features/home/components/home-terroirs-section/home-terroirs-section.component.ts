import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideCompass, LucideMapPin } from '@lucide/angular';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';

export interface ZoneCasamanceCard {
  code: string;
  titre: string;
  sousTitre: string;
  description: string;
  image?: string;
}

@Component({
  selector: 'app-home-terroirs-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LucideArrowRight,
    LucideMapPin,
    LucideCompass,
    ScrollRevealDirective,
  ],
  template: `
    <section class="page-section terroirs-section" aria-labelledby="zones-title">
      <div class="container">
        <div class="section-header" appScrollReveal="fade-up">
          <div>
            <p class="eyebrow">Trois grands ensembles géographiques</p>
            <h2 id="zones-title" class="section-title">Explorer la Casamance par terroir</h2>
          </div>
          <a routerLink="/patrimoines" class="section-link">
            <span>Carte &amp; annuaire complet</span>
            <svg lucideArrowRight [size]="16" aria-hidden="true"></svg>
          </a>
        </div>

        <div class="terroirs-accordion" role="region" aria-label="Panneaux des trois terroirs de Casamance">
          @for (z of zones(); track z.code; let i = $index) {
            <article
              class="terroir-panel"
              [class.terroir-panel--active]="activeIndex() === i"
              appScrollReveal="fade-up"
              [delayMs]="i * 140"
              (mouseenter)="setActive(i)"
              (click)="setActive(i)"
              (keydown.enter)="setActive(i)"
              (keydown.space)="setActive(i); $event.preventDefault()"
              tabindex="0"
              [attr.aria-expanded]="activeIndex() === i"
            >
              <img
                [src]="resolveZoneImage(z, i)"
                [alt]="z.titre + ' — ' + z.sousTitre"
                class="terroir-panel__bg"
                loading="lazy"
              />
              <div class="terroir-panel__veil"></div>

              <!-- État fermé : icône + titre vertical -->
              <div class="terroir-panel__collapsed" aria-hidden="true">
                <span class="terroir-panel__icon">
                  <svg lucideCompass [size]="18"></svg>
                </span>
                <span class="terroir-panel__vertical-title">{{ z.titre }}</span>
              </div>

              <!-- État ouvert : contenu détaillé en fondu depuis le bas -->
              <div class="terroir-panel__expanded">
                <span class="terroir-panel__badge">
                  <svg lucideMapPin [size]="13" aria-hidden="true"></svg>
                  {{ z.titre }}
                </span>
                <h3 class="terroir-panel__subtitle">{{ z.sousTitre }}</h3>
                <p class="terroir-panel__desc">{{ z.description }}</p>
                <a
                  [routerLink]="['/patrimoines']"
                  [queryParams]="{ zone: z.code }"
                  class="terroir-panel__cta"
                  (click)="$event.stopPropagation()"
                >
                  <span>Filtrer cette zone</span>
                  <svg lucideArrowRight [size]="15" aria-hidden="true"></svg>
                </a>
              </div>
            </article>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .terroirs-section {
      padding: 56px 0;
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

    .terroirs-accordion {
      display: flex;
      gap: 14px;
      height: 430px;
      width: 100%;
    }

    .terroir-panel {
      position: relative;
      flex: 1 1 0%;
      min-width: 84px;
      border-radius: 20px;
      overflow: hidden;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-shadow: 0 12px 30px rgba(17, 36, 28, 0.14);
      transition: flex-grow 0.55s cubic-bezier(0.22, 1, 0.36, 1);
      display: flex;
      align-items: flex-end;
      color: #faf6f0;
      background-color: #163327;
    }

    .terroir-panel--active {
      flex-grow: 3.6;
      cursor: default;
    }

    .terroir-panel__bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.04);
      transition: transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .terroir-panel--active .terroir-panel__bg {
      transform: scale(1);
    }

    .terroir-panel__veil {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba(14, 32, 24, 0.25) 0%,
        rgba(14, 32, 24, 0.62) 48%,
        rgba(10, 25, 19, 0.92) 100%
      );
    }

    /* État fermé : titre vertical + icône */
    .terroir-panel__collapsed {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 24px 0 28px;
      opacity: 1;
      transform: translate3d(0, 0, 0);
      transition:
        opacity 0.3s ease,
        transform 0.35s ease;
      pointer-events: none;
    }

    .terroir-panel--active .terroir-panel__collapsed {
      opacity: 0;
      transform: translate3d(0, -12px, 0);
    }

    .terroir-panel__icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(250, 246, 240, 0.16);
      border: 1px solid rgba(250, 246, 240, 0.3);
      display: grid;
      place-items: center;
      color: #faf6f0;
    }

    .terroir-panel__vertical-title {
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(180deg);
      font-family: var(--font-display);
      font-size: 19px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #faf6f0;
      white-space: nowrap;
    }

    /* État ouvert : contenu détaillé */
    .terroir-panel__expanded {
      position: relative;
      z-index: 3;
      width: 100%;
      padding: 28px 30px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      opacity: 0;
      transform: translate3d(0, 22px, 0);
      pointer-events: none;
      transition:
        opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1) 0.08s,
        transform 0.42s cubic-bezier(0.22, 1, 0.36, 1) 0.08s;
    }

    .terroir-panel--active .terroir-panel__expanded {
      opacity: 1;
      transform: translate3d(0, 0, 0);
      pointer-events: auto;
    }

    .terroir-panel__badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      background: rgba(198, 139, 44, 0.25);
      border: 1px solid rgba(233, 196, 106, 0.48);
      color: #f8e3b4;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .terroir-panel__subtitle {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(1.25rem, 2.2vw, 1.65rem);
      color: #ffffff;
      line-height: 1.25;
    }

    .terroir-panel__desc {
      margin: 0;
      font-size: 14px;
      line-height: 1.55;
      color: rgba(250, 246, 240, 0.88);
      max-width: 520px;
    }

    .terroir-panel__cta {
      margin-top: 6px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      border-radius: 999px;
      background-color: var(--accent-terracotta, #b75f3b);
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      transition: transform 160ms ease, opacity 160ms ease;
    }

    .terroir-panel__cta:hover {
      transform: translateX(3px);
      color: #ffffff;
    }

    @media (max-width: 860px) {
      .terroirs-accordion {
        flex-direction: column;
        height: auto;
      }

      .terroir-panel {
        min-height: 76px;
        flex: none;
      }

      .terroir-panel__collapsed {
        flex-direction: row;
        justify-content: flex-start;
        gap: 12px;
        padding: 18px 20px;
      }

      .terroir-panel__vertical-title {
        writing-mode: horizontal-tb;
        transform: none;
        font-size: 16px;
      }

      .terroir-panel__expanded {
        display: none;
        padding: 22px 20px;
      }

      .terroir-panel--active .terroir-panel__expanded {
        display: flex;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .terroir-panel,
      .terroir-panel__bg,
      .terroir-panel__collapsed,
      .terroir-panel__expanded {
        transition: none !important;
      }
    }
  `,
})
export class HomeTerroirsSectionComponent {
  readonly zones = input.required<readonly ZoneCasamanceCard[]>();

  protected readonly activeIndex = signal<number>(0);

  private readonly fallbackImages = [
    '/images/patrimoines/PAT-CAS-005.webp',
    '/images/patrimoines/PAT-CRB-002.webp',
    '/images/patrimoines/PAT-KOL-008.webp',
  ];

  protected setActive(index: number): void {
    this.activeIndex.set(index);
  }

  protected resolveZoneImage(zone: ZoneCasamanceCard, index: number): string {
    return zone.image ?? this.fallbackImages[index % this.fallbackImages.length];
  }
}
