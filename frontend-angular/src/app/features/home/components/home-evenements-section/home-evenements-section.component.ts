import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideClock,
  LucideMapPin,
} from '@lucide/angular';
import { Evenement, TypeEvenement } from '../../../../core/models/evenement.model';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { EvenementTypePipe } from '../../../../shared/pipes/evenement-type.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';

const MONTHS_SHORT_FR = [
  'JAN',
  'FÉV',
  'MAR',
  'AVR',
  'MAI',
  'JUIN',
  'JUIL',
  'AOÛT',
  'SEPT',
  'OCT',
  'NOV',
  'DÉC',
];

@Component({
  selector: 'app-home-evenements-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LucideArrowRight,
    LucideMapPin,
    LucideClock,
    DateFrPipe,
    EvenementTypePipe,
    FcfaPricePipe,
    ScrollRevealDirective,
  ],
  template: `
    <section class="page-section agenda-section" aria-labelledby="events-home-title">
      <div class="container">
        <div class="section-header section-header--agenda-center" appScrollReveal="fade-up">
          <span class="agenda-badge-kicker">03 · RENDEZ-VOUS CULTURELS</span>
          <h2 id="events-home-title" class="section-title">
            Agenda des <em class="title-serif-terracotta">événements</em> en Casamance
          </h2>
          <a routerLink="/evenements" class="section-link">
            <span>Tout l’agenda</span>
            <svg lucideArrowRight [size]="16" aria-hidden="true"></svg>
          </a>
        </div>

        @if (evenements().length === 0) {
          <div class="inline-callout" appScrollReveal="fade-up">
            <p>Aucun événement programmé prochainement dans l’agenda public.</p>
            <a routerLink="/evenements" class="btn-secondary">Ouvrir l’agenda</a>
          </div>
        } @else {
          <div class="agenda-list" role="list">
            @for (ev of evenements(); track ev.id; let i = $index) {
              <article
                class="agenda-row"
                role="listitem"
                appScrollReveal="fade-up"
                [delayMs]="i * 120"
              >
                <div
                  class="agenda-date-block"
                  [class]="dateBlockClass(ev.typeEvenement)"
                >
                  <span class="agenda-date-block__day tabular-nums">{{ formatDay(ev.dateDebut) }}</span>
                  <span class="agenda-date-block__month">{{ formatMonth(ev.dateDebut) }}</span>
                  <span class="agenda-date-block__year tabular-nums">{{ formatYear(ev.dateDebut) }}</span>
                </div>

                <div class="agenda-row__main">
                  <div class="agenda-row__badges">
                    <span class="ui-badge" [class]="typeBadgeClass(ev.typeEvenement)">
                      {{ ev.typeEvenement | evenementType }}
                    </span>
                    <span class="countdown-pill tabular-nums">
                      <svg lucideClock [size]="12" aria-hidden="true"></svg>
                      {{ computeCountdownLabel(ev.dateDebut) }}
                    </span>
                    @if (ev.ouvertReservation !== false) {
                      <span class="ui-badge ui-badge--success">Réservable</span>
                    }
                  </div>

                  <h3 class="agenda-row__title">
                    <a [routerLink]="['/evenements', ev.id]">{{ ev.nomEvenement }}</a>
                  </h3>

                  <p class="agenda-row__desc">
                    {{ ev.descriptionEvenement || 'Événement patrimonial et culturel de Casamance.' }}
                  </p>

                  <div class="agenda-row__meta">
                    <span class="agenda-row__place">
                      <svg lucideMapPin [size]="14" aria-hidden="true"></svg>
                      <span>{{ ev.lieu || ev.localite || 'Casamance' }}</span>
                    </span>
                    <span class="agenda-row__full-date">
                      · {{ ev.dateDebut | dateFr: 'd MMM yyyy' }}
                    </span>
                  </div>
                </div>

                <div class="agenda-row__aside">
                  <div class="agenda-row__price-wrap">
                    <span class="agenda-row__price-label">Tarif d'entrée</span>
                    <strong class="agenda-row__price tabular-nums">{{ ev.prix | fcfaPrice }}</strong>
                  </div>

                  <a [routerLink]="['/evenements', ev.id]" class="agenda-row__cta">
                    <span>Détails</span>
                    <svg lucideArrowRight [size]="15" class="agenda-row__arrow" aria-hidden="true"></svg>
                  </a>
                </div>
              </article>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .agenda-section {
      padding: 52px 0;
    }

    .section-header--agenda-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 8px;
      margin-bottom: 28px;
    }

    .agenda-badge-kicker {
      display: inline-flex;
      padding: 4px 14px;
      border-radius: 999px;
      background-color: var(--accent-terracotta-soft, #f9ece6);
      border: 1px solid var(--accent-terracotta-border, #e5b7a5);
      color: var(--accent-terracotta, #b75f3b);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.1em;
    }

    .section-title {
      font-size: clamp(1.7rem, 3vw, 2.35rem);
      margin: 2px 0 0;
      color: var(--ink-primary);
    }

    .title-serif-terracotta {
      font-family: var(--font-editorial, Georgia, serif);
      font-style: italic;
      font-weight: 700;
      font-size: 1.14em;
      color: var(--accent-terracotta, #b75f3b);
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

    /* Vertical agenda list */
    .agenda-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .agenda-row {
      display: grid;
      grid-template-columns: 112px 1fr auto;
      align-items: stretch;
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 6px 20px rgba(20, 38, 30, 0.04);
      transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .agenda-row:hover {
      transform: translate3d(6px, 0, 0);
      border-color: var(--border-strong);
    }

    /* Colored left date block (expands with transform on row hover) */
    .agenda-date-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px 12px;
      color: #faf6f0;
      text-align: center;
      transform-origin: left center;
      transition: transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .agenda-row:hover .agenda-date-block {
      transform: scaleX(1.06);
    }

    .agenda-date-block--exposition {
      background: linear-gradient(155deg, #173d2e 0%, #245b45 100%);
    }

    .agenda-date-block--atelier {
      background: linear-gradient(155deg, #9d4b2d 0%, #bd6240 100%);
    }

    .agenda-date-block--festival {
      background: linear-gradient(155deg, #8e6118 0%, #c68b2c 100%);
    }

    .agenda-date-block__day {
      font-family: var(--font-display);
      font-size: 28px;
      font-weight: 800;
      line-height: 1;
    }

    .agenda-date-block__month {
      margin-top: 4px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .agenda-date-block__year {
      margin-top: 2px;
      font-size: 11px;
      opacity: 0.82;
    }

    .agenda-row__main {
      padding: 16px 22px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 6px;
      min-width: 0;
    }

    .agenda-row__badges {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }

    .countdown-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 10px;
      border-radius: 999px;
      background-color: var(--surface-sand);
      border: 1px solid var(--border-strong);
      color: var(--ink-primary);
      font-size: 11.5px;
      font-weight: 700;
    }

    .agenda-row__title {
      margin: 0;
      font-size: 17px;
      line-height: 1.3;
    }

    .agenda-row__title a {
      color: var(--ink-primary);
      text-decoration: none;
    }

    .agenda-row__title a:hover {
      color: var(--brand-primary);
    }

    .agenda-row__desc {
      margin: 0;
      font-size: 13px;
      color: var(--ink-secondary);
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .agenda-row__meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      font-size: 12.5px;
      color: var(--ink-secondary);
    }

    .agenda-row__place {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-weight: 600;
    }

    .agenda-row__aside {
      padding: 16px 22px;
      border-left: 1px solid var(--border-subtle);
      background-color: rgba(245, 242, 235, 0.45);
      display: flex;
      align-items: center;
      gap: 18px;
      white-space: nowrap;
    }

    .agenda-row__price-wrap {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .agenda-row__price-label {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ink-muted);
      font-weight: 700;
    }

    .agenda-row__price {
      font-size: 15px;
      color: var(--brand-primary);
      font-weight: 800;
    }

    .agenda-row__cta {
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
      transition: transform 180ms ease;
    }

    .agenda-row__cta:hover {
      color: #ffffff;
    }

    .agenda-row__arrow {
      transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .agenda-row:hover .agenda-row__arrow {
      transform: translate3d(4px, 0, 0);
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

    @media (max-width: 820px) {
      .agenda-row {
        grid-template-columns: 92px 1fr;
      }

      .agenda-row__aside {
        grid-column: 1 / -1;
        border-left: none;
        border-top: 1px solid var(--border-subtle);
        justify-content: space-between;
        padding: 12px 18px;
      }

      .agenda-row__price-wrap {
        align-items: flex-start;
      }
    }
  `,
})
export class HomeEvenementsSectionComponent {
  readonly evenements = input.required<Evenement[]>();

  protected dateBlockClass(type?: TypeEvenement | null): string {
    switch (type) {
      case 'ATELIER':
      case 'FOIRE_ARTISANALE':
        return 'agenda-date-block agenda-date-block--atelier';
      case 'FESTIVAL':
      case 'CEREMONIE_TRADITIONNELLE':
        return 'agenda-date-block agenda-date-block--festival';
      case 'EXPOSITION':
      case 'CONFERENCE':
      case 'VISITE_GUIDEE':
      default:
        return 'agenda-date-block agenda-date-block--exposition';
    }
  }

  protected typeBadgeClass(type?: TypeEvenement | null): string {
    switch (type) {
      case 'ATELIER':
      case 'FOIRE_ARTISANALE':
        return 'ui-badge ui-badge--clay';
      case 'FESTIVAL':
      case 'CEREMONIE_TRADITIONNELLE':
        return 'ui-badge ui-badge--ochre';
      default:
        return 'ui-badge ui-badge--neutral';
    }
  }

  protected formatDay(dateStr?: string | null): string {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '--';
    return String(d.getDate()).padStart(2, '0');
  }

  protected formatMonth(dateStr?: string | null): string {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '---';
    return MONTHS_SHORT_FR[d.getMonth()] ?? '---';
  }

  protected formatYear(dateStr?: string | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return String(d.getFullYear());
  }

  protected computeCountdownLabel(dateStr?: string | null): string {
    if (!dateStr) return 'Date à confirmer';
    const target = new Date(dateStr);
    if (Number.isNaN(target.getTime())) return 'Date à confirmer';

    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      return `Dans ${diffDays} jours`;
    }
    if (diffDays === 1) {
      return 'Demain';
    }
    if (diffDays === 0) {
      return "Aujourd'hui";
    }
    return 'En cours / programmé';
  }
}
