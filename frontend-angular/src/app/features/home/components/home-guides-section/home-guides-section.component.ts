import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideAward,
  LucideCompass,
  LucideUsers,
} from '@lucide/angular';
import { GuideProfil } from '../../../../core/models/guide.model';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-home-guides-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LucideArrowRight,
    LucideAward,
    LucideCompass,
    LucideUsers,
    ScrollRevealDirective,
  ],
  template: `
    <section class="page-section band-sand guides-human-section" aria-labelledby="guides-home-title">
      <div class="container">
        <div class="section-header section-header--guides-center" appScrollReveal="zoom-in">
          <div class="guides-ornament-top" aria-hidden="true">
            <span class="guides-ornament-line"></span>
            <span class="guides-ornament-kicker">04 · SAVOIR-FAIRE &amp; TRANSMISSION</span>
            <span class="guides-ornament-line"></span>
          </div>
          <h2 id="guides-home-title" class="section-title">
            Guides touristiques <em class="title-serif-forest">agréés</em>
          </h2>
          <a routerLink="/guides" class="section-link">
            <span>Voir tous les guides</span>
            <svg lucideArrowRight [size]="16" aria-hidden="true"></svg>
          </a>
        </div>

        @if (guides().length === 0) {
          <div class="inline-callout" appScrollReveal="fade-up">
            <p>
              Les guides touristiques validés par l’administration apparaissent ici avec leurs
              spécialités, langues et zones d’intervention.
            </p>
            <a routerLink="/guides" class="btn-secondary">Consulter l’annuaire des guides</a>
          </div>
        } @else {
          <div
            class="guides-showcase"
            [class.guides-showcase--single]="guides().length === 1"
            [class.guides-showcase--double]="guides().length === 2"
          >
            @for (g of guides(); track g.id; let i = $index) {
              <article
                class="guide-portrait-card"
                [class.guide-portrait-card--featured]="guides().length === 1"
                appScrollReveal="zoom-in"
                [delayMs]="i * 130"
              >
                <div class="guide-portrait-card__visual">
                  <div class="guide-portrait-ring" aria-hidden="true">
                    <div class="guide-portrait-avatar">
                      <span>{{ g.prenom.slice(0, 1) }}{{ g.nom.slice(0, 1) }}</span>
                    </div>
                  </div>
                  @if (g.anneesExperience) {
                    <span class="guide-exp-chip tabular-nums">{{ g.anneesExperience }} ans d’exp.</span>
                  }
                </div>

                <div class="guide-portrait-card__content">
                  <div class="guide-portrait-card__badges">
                    <span class="ui-badge ui-badge--success">
                      <svg lucideAward [size]="12" aria-hidden="true"></svg>
                      Agrément validé
                    </span>
                    <span
                      class="ui-badge"
                      [class.ui-badge--ochre]="g.disponible"
                      [class.ui-badge--neutral]="!g.disponible"
                    >
                      {{ g.disponible ? 'Disponible' : 'Complet' }}
                    </span>
                  </div>

                  <h3 class="guide-portrait-card__name">{{ g.prenom }} {{ g.nom }}</h3>

                  <p class="guide-portrait-card__pitch">{{ g.presentationCourte }}</p>

                  <!-- Langues parlées en pastilles -->
                  <div class="guide-lang-group">
                    <span class="guide-meta-heading">
                      <svg lucideUsers [size]="13" aria-hidden="true"></svg>
                      <span>Langues :</span>
                    </span>
                    <div class="guide-lang-pills">
                      @for (lang of splitList(g.languesParlees); track lang) {
                        <span class="guide-lang-pill">{{ lang }}</span>
                      }
                    </div>
                  </div>

                  <!-- Zones couvertes -->
                  <div class="guide-zones-row">
                    <svg lucideCompass [size]="14" aria-hidden="true"></svg>
                    <div class="guide-zone-pills">
                      @for (z of splitList(g.zonesIntervention); track z) {
                        <span class="guide-zone-tag">{{ z }}</span>
                      }
                    </div>
                  </div>

                  <div class="guide-portrait-card__footer">
                    @if (g.specialites) {
                      <span class="guide-specialty">{{ g.specialites }}</span>
                    } @else {
                      <span></span>
                    }

                    <a [routerLink]="['/guides', g.id]" class="guide-portrait-card__cta">
                      <span>Voir le profil</span>
                      <svg lucideArrowRight [size]="14" aria-hidden="true"></svg>
                    </a>
                  </div>
                </div>
              </article>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .guides-human-section {
      padding: 52px 0;
      background-color: var(--surface-sand);
      border-top: 1px solid var(--border-subtle);
      border-bottom: 1px solid var(--border-subtle);
    }

    .section-header--guides-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
      margin-bottom: 28px;
    }

    .guides-ornament-top {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .guides-ornament-line {
      width: 36px;
      height: 1px;
      background-color: var(--border-strong);
    }

    .guides-ornament-kicker {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: var(--brand-primary);
    }

    .section-title {
      font-size: clamp(1.7rem, 3vw, 2.35rem);
      margin: 2px 0 0;
      color: var(--ink-primary);
    }

    .title-serif-forest {
      font-family: var(--font-editorial, Georgia, serif);
      font-style: italic;
      font-weight: 700;
      font-size: 1.14em;
      color: var(--brand-primary);
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

    .guides-showcase {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .guides-showcase--double {
      grid-template-columns: repeat(2, 1fr);
      max-width: 940px;
      margin: 0 auto;
    }

    /* When there is only 1 guide: wide centered card instead of half-empty grid */
    .guides-showcase--single {
      grid-template-columns: 1fr;
      max-width: 820px;
      margin: 0 auto;
    }

    .guide-portrait-card {
      background:
        radial-gradient(circle at 100% 0%, rgba(198, 139, 44, 0.08), transparent 45%),
        var(--surface-elevated);
      border: 1px solid var(--border-strong, #dad1c2);
      border-radius: 22px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 16px;
      box-shadow: 0 10px 28px rgba(20, 38, 30, 0.06);
      transition: transform 220ms ease;
    }

    .guide-portrait-card:hover {
      transform: translateY(-3px);
    }

    .guide-portrait-card--featured {
      flex-direction: row;
      align-items: center;
      text-align: left;
      padding: 28px 32px;
      gap: 28px;
    }

    .guide-portrait-card__visual {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .guide-portrait-ring {
      width: 104px;
      height: 104px;
      border-radius: 50%;
      padding: 5px;
      background: linear-gradient(135deg, var(--brand-primary) 0%, #c68b2c 100%);
      box-shadow: 0 10px 24px rgba(23, 61, 46, 0.22);
    }

    .guide-portrait-avatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background:
        radial-gradient(circle at 30% 25%, #2c6d53 0%, #15382a 100%);
      border: 3px solid #faf6f0;
      color: #faf6f0;
      font-family: var(--font-display);
      font-size: 30px;
      font-weight: 700;
      letter-spacing: 0.03em;
      display: grid;
      place-items: center;
    }

    .guide-exp-chip {
      padding: 3px 11px;
      border-radius: 999px;
      background-color: var(--surface-sand);
      border: 1px solid var(--border-strong);
      font-size: 11.5px;
      font-weight: 700;
      color: var(--ink-secondary);
    }

    .guide-portrait-card__content {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
      min-width: 0;
      width: 100%;
    }

    .guide-portrait-card__badges {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 6px;
    }

    .guide-portrait-card--featured .guide-portrait-card__badges {
      justify-content: flex-start;
    }

    .guide-portrait-card__name {
      margin: 0;
      font-family: var(--font-display);
      font-size: 21px;
      color: var(--ink-primary);
    }

    .guide-portrait-card__pitch {
      margin: 0;
      font-size: 13.8px;
      line-height: 1.55;
      color: var(--ink-secondary);
    }

    .guide-lang-group {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .guide-portrait-card--featured .guide-lang-group {
      justify-content: flex-start;
    }

    .guide-meta-heading {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 700;
      color: var(--ink-muted);
    }

    .guide-lang-pills,
    .guide-zone-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .guide-lang-pill {
      padding: 3px 10px;
      border-radius: 999px;
      background-color: var(--brand-soft, #e5efe9);
      color: var(--brand-primary);
      font-size: 11.5px;
      font-weight: 700;
    }

    .guide-zones-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: var(--ink-secondary);
    }

    .guide-portrait-card--featured .guide-zones-row {
      justify-content: flex-start;
    }

    .guide-zone-tag {
      padding: 2px 9px;
      border-radius: 6px;
      background-color: var(--surface-sand);
      border: 1px solid var(--border-subtle);
      font-size: 11.5px;
      font-weight: 600;
      color: var(--ink-secondary);
    }

    .guide-portrait-card__footer {
      margin-top: 4px;
      padding-top: 12px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .guide-specialty {
      font-size: 12px;
      font-style: italic;
      color: var(--ink-muted);
    }

    .guide-portrait-card__cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 999px;
      background-color: var(--brand-primary);
      color: #ffffff;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      transition: transform 160ms ease;
    }

    .guide-portrait-card__cta:hover {
      transform: translateX(3px);
      color: #ffffff;
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

    @media (max-width: 900px) {
      .guides-showcase,
      .guides-showcase--double {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .guide-portrait-card--featured {
        flex-direction: column;
        text-align: center;
        padding: 22px;
      }
      .guide-portrait-card--featured .guide-portrait-card__badges,
      .guide-portrait-card--featured .guide-lang-group,
      .guide-portrait-card--featured .guide-zones-row {
        justify-content: center;
      }
      .guide-portrait-card__footer {
        justify-content: center;
      }
    }
  `,
})
export class HomeGuidesSectionComponent {
  readonly guides = input.required<GuideProfil[]>();

  protected splitList(raw?: string | null): string[] {
    if (!raw) return [];
    return raw
      .split(/[,;·]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
