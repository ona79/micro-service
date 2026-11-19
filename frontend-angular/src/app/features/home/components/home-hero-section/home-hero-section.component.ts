import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideSearch } from '@lucide/angular';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-home-hero-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    LucideSearch,
    LucideArrowRight,
    ScrollRevealDirective,
  ],
  template: `
    <section class="hero-fullscreen">
      <div class="hero-fullscreen__bg" aria-hidden="true">
        <img
          src="/images/hero.webp"
          srcset="/images/hero-640.webp 640w, /images/hero.webp 1200w"
          sizes="100vw"
          width="1200"
          height="800"
          fetchpriority="high"
          alt="Pirogue naviguant au lever du soleil sur les bolongs bordés de palétuviers en Casamance"
          class="hero-fullscreen__img"
        />
        <div class="hero-fullscreen__overlay"></div>
      </div>

      <div class="container hero-fullscreen__inner">
        <div class="hero-fullscreen__content">
          <p class="hero-eyebrow hero-stagger hero-stagger--1">
            Patrimoine culturel &amp; naturel · Casamance, Sénégal
          </p>
          <h1 class="hero-fullscreen__title hero-stagger hero-stagger--2">
            Explorez la <em class="hero-title-accent">mémoire vivante</em> et les terroirs de
            <span class="hero-title-highlight">Casamance</span>
          </h1>
          <p class="hero-fullscreen__lead hero-stagger hero-stagger--3">
            De Ziguinchor à Kolda, en passant par l’île de Carabane, les cases à impluvium d’Enampore,
            les bois sacrés d’Oussouye et le fort de Sédhiou, découvrez les sites publiés, préparez vos
            circuits avec nos guides agréés et réservez vos visites.
          </p>

          <div class="hero-floating-card hero-stagger hero-stagger--4">
            <form class="hero-search" (ngSubmit)="submitSearch()" role="search">
              <svg lucideSearch [size]="18" class="hero-search__icon" aria-hidden="true"></svg>
              <input
                id="hero-search-input"
                type="search"
                name="heroQuery"
                [ngModel]="query()"
                (ngModelChange)="query.set($event)"
                placeholder="Rechercher un site, une localité (Carabane, Enampore, Sédhiou…)"
                aria-label="Rechercher un site patrimonial de Casamance"
                class="hero-search__input"
              />
              <button type="submit" class="hero-search__submit">Rechercher</button>
            </form>

            <div class="hero-topics" aria-label="Recherches rapides thématiques">
              <span class="hero-topics__label">Incontournables :</span>
              <a [routerLink]="['/patrimoines']" [queryParams]="{ q: 'impluvium' }" class="hero-topic-chip">Cases à impluvium</a>
              <a [routerLink]="['/patrimoines']" [queryParams]="{ q: 'Carabane' }" class="hero-topic-chip">Île de Carabane</a>
              <a routerLink="/circuits" class="hero-topic-chip">Bolongs &amp; pirogue</a>
              <a routerLink="/evenements" class="hero-topic-chip">Agenda culturel</a>
            </div>
          </div>

          <div class="hero-actions hero-stagger hero-stagger--5">
            <a routerLink="/patrimoines" class="btn-hero-primary">
              <span>Découvrir les sites</span>
              <svg lucideArrowRight [size]="16" aria-hidden="true"></svg>
            </a>
            <a routerLink="/circuits" class="btn-hero-glass">
              <span>Parcourir les circuits</span>
            </a>
            <a routerLink="/guides" class="btn-hero-glass">
              <span>Guides agréés</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <section
      class="index-strip"
      aria-label="Repères vérifiés du catalogue en ligne"
      appScrollReveal="fade-up"
      (revealed)="onStatsRevealed()"
    >
      <div class="container index-strip__grid">
        <div class="index-item">
          <span class="index-item__label">Patrimoines publiés</span>
          <strong class="index-item__value tabular-nums">
            {{ animatedPatrimoines() }} site(s) référencé(s)
          </strong>
        </div>
        <div class="index-item">
          <span class="index-item__label">Circuits thématiques</span>
          <strong class="index-item__value tabular-nums">
            {{ animatedCircuits() }} parcours disponible(s)
          </strong>
        </div>
        <div class="index-item">
          <span class="index-item__label">Agenda culturel</span>
          <strong class="index-item__value tabular-nums">
            {{ animatedEvenements() }} événement(s) à venir
          </strong>
        </div>
        <div class="index-item">
          <span class="index-item__label">Guides agréés</span>
          <strong class="index-item__value tabular-nums">
            {{ animatedGuides() }} guide(s) validé(s)
          </strong>
        </div>
      </div>
    </section>
  `,
  styles: `
    .hero-fullscreen {
      position: relative;
      min-height: clamp(540px, 78vh, 690px);
      display: flex;
      align-items: center;
      overflow: hidden;
      background-color: #122920;
      color: #faf6f0;
    }

    .hero-fullscreen__bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
    }

    .hero-fullscreen__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      transform: scale(1.02);
      will-change: transform;
      animation: heroSlowZoom 22s ease-in-out infinite alternate;
    }

    @keyframes heroSlowZoom {
      0% {
        transform: scale(1.01) translate3d(0, 0, 0);
      }
      100% {
        transform: scale(1.11) translate3d(-1%, -1%, 0);
      }
    }

    .hero-fullscreen__overlay {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(96deg, rgba(14, 34, 26, 0.88) 0%, rgba(18, 43, 33, 0.72) 55%, rgba(18, 43, 33, 0.42) 100%),
        radial-gradient(circle at 18% 82%, rgba(183, 95, 59, 0.22), transparent 52%);
    }

    .hero-fullscreen__inner {
      position: relative;
      z-index: 1;
      padding-top: 48px;
      padding-bottom: 56px;
      width: 100%;
    }

    .hero-fullscreen__content {
      max-width: 860px;
      margin: 0 auto;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .hero-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 999px;
      background: rgba(250, 246, 240, 0.14);
      border: 1px solid rgba(233, 196, 106, 0.42);
      color: #f8e3b4;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 18px;
    }

    .hero-fullscreen__title {
      font-family: var(--font-sans);
      font-size: clamp(2.35rem, 4.7vw, 3.85rem);
      font-weight: 800;
      line-height: 1.08;
      color: #faf6f0;
      margin: 0 0 18px;
      letter-spacing: -0.02em;
      text-shadow: 0 10px 30px rgba(7, 19, 14, 0.45);
    }

    .hero-title-accent {
      font-family: var(--font-editorial, Georgia, serif);
      font-style: italic;
      font-weight: 700;
      font-size: 1.12em;
      color: #f6cf7e;
      padding: 0 4px;
    }

    .hero-title-highlight {
      position: relative;
      display: inline-block;
      color: #ffffff;
    }

    .hero-title-highlight::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 2px;
      height: 4px;
      border-radius: 999px;
      background: linear-gradient(90deg, #b75f3b 0%, #e9c46a 100%);
      opacity: 0.9;
    }

    .hero-fullscreen__lead {
      font-size: clamp(1rem, 1.35vw, 1.12rem);
      line-height: 1.65;
      color: rgba(250, 246, 240, 0.9);
      margin: 0 auto 26px;
      max-width: 710px;
    }

    /* Staggered fade-in on transform & opacity */
    .hero-stagger {
      opacity: 0;
      transform: translate3d(0, 18px, 0);
      animation: heroFadeUp 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    .hero-stagger--1 { animation-delay: 60ms; }
    .hero-stagger--2 { animation-delay: 160ms; }
    .hero-stagger--3 { animation-delay: 270ms; }
    .hero-stagger--4 { animation-delay: 380ms; }
    .hero-stagger--5 { animation-delay: 490ms; }

    @keyframes heroFadeUp {
      to {
        opacity: 1;
        transform: translate3d(0, 0, 0);
      }
    }

    /* Translucent floating search card */
    .hero-floating-card {
      width: 100%;
      max-width: 720px;
      background: rgba(250, 246, 240, 0.13);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(250, 246, 240, 0.26);
      border-radius: 18px;
      padding: 14px 16px;
      margin-bottom: 24px;
      box-shadow: 0 18px 40px rgba(8, 22, 16, 0.28);
    }

    .hero-topics {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 12px;
    }

    .hero-actions {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .hero-search {
      display: flex;
      align-items: center;
      gap: 10px;
      background-color: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(255, 255, 255, 0.4);
      border-radius: 999px;
      padding: 5px 6px 5px 16px;
      margin-bottom: 12px;
    }

    .hero-search:focus-within {
      box-shadow: 0 0 0 3px rgba(198, 139, 44, 0.45);
    }

    .hero-search__icon {
      color: var(--ink-muted);
      flex-shrink: 0;
    }

    .hero-search__input {
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      font-family: var(--font-sans);
      font-size: 14px;
      color: var(--ink-primary);
      outline: none;
    }

    .hero-search__submit {
      padding: 9px 20px;
      border-radius: 999px;
      border: none;
      background-color: var(--brand-primary);
      color: #ffffff;
      font-family: var(--font-sans);
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 150ms ease, opacity 150ms ease;
    }

    .hero-search__submit:hover {
      transform: translateY(-1px);
    }

    .hero-topics {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 12px;
    }

    .hero-topics__label {
      color: rgba(250, 246, 240, 0.8);
      font-weight: 600;
    }

    .hero-topic-chip {
      display: inline-flex;
      align-items: center;
      padding: 4px 11px;
      background: rgba(250, 246, 240, 0.14);
      border: 1px solid rgba(250, 246, 240, 0.26);
      border-radius: 999px;
      color: #faf6f0;
      text-decoration: none;
      font-weight: 600;
      transition: transform 150ms ease, opacity 150ms ease;
    }

    .hero-topic-chip:hover {
      transform: translateY(-1px);
      color: #ffffff;
      background: rgba(250, 246, 240, 0.25);
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .btn-hero-primary,
    .btn-hero-glass {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 22px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      transition: transform 180ms ease, opacity 180ms ease;
    }

    .btn-hero-primary {
      background-color: var(--accent-terracotta, #b75f3b);
      color: #ffffff;
      box-shadow: 0 8px 20px rgba(183, 95, 59, 0.35);
    }

    .btn-hero-primary:hover {
      transform: translateY(-2px);
      color: #ffffff;
    }

    .btn-hero-glass {
      background: rgba(250, 246, 240, 0.14);
      border: 1px solid rgba(250, 246, 240, 0.32);
      color: #faf6f0;
      backdrop-filter: blur(8px);
    }

    .btn-hero-glass:hover {
      transform: translateY(-2px);
      color: #ffffff;
      background: rgba(250, 246, 240, 0.24);
    }

    /* Stats strip below hero */
    .index-strip {
      position: relative;
      z-index: 2;
      background-color: var(--surface-elevated);
      border-bottom: 1px solid var(--border-subtle);
      box-shadow: 0 8px 24px rgba(20, 38, 30, 0.05);
    }

    .index-strip__grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
    }

    .index-item {
      padding: 20px 18px;
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .index-item:last-child {
      border-right: none;
    }

    .index-item__label {
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ink-muted);
      font-weight: 700;
    }

    .index-item__value {
      font-size: 18px;
      color: var(--brand-primary);
      font-weight: 700;
    }

    @media (prefers-reduced-motion: reduce) {
      .hero-fullscreen__img {
        animation: none !important;
        transform: none !important;
      }
      .hero-stagger {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
      }
    }

    @media (max-width: 900px) {
      .index-strip__grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .hero-fullscreen {
        min-height: 520px;
      }
      .hero-search {
        flex-direction: column;
        align-items: stretch;
        border-radius: 14px;
        padding: 10px;
      }
      .hero-search__icon {
        display: none;
      }
      .index-strip__grid {
        grid-template-columns: 1fr;
      }
      .index-item {
        border-right: none;
        border-bottom: 1px solid var(--border-subtle);
      }
      .index-item:last-child {
        border-bottom: none;
      }
    }
  `,
})
export class HomeHeroSectionComponent implements OnDestroy {
  readonly patrimoinesCount = input<number>(0);
  readonly circuitsCount = input<number>(0);
  readonly evenementsCount = input<number>(0);
  readonly guidesCount = input<number>(0);

  readonly searchSubmit = output<string>();

  protected readonly query = signal<string>('');
  protected readonly animatedPatrimoines = signal<number>(0);
  protected readonly animatedCircuits = signal<number>(0);
  protected readonly animatedEvenements = signal<number>(0);
  protected readonly animatedGuides = signal<number>(0);

  private readonly statsRevealed = signal<boolean>(false);
  private rafId: number | null = null;

  constructor() {
    effect(() => {
      const p = this.patrimoinesCount();
      const c = this.circuitsCount();
      const e = this.evenementsCount();
      const g = this.guidesCount();

      const isVitest =
        typeof navigator !== 'undefined' && /jsdom|HappyDOM/i.test(navigator.userAgent);
      const prefersReduced =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (isVitest || prefersReduced || !this.statsRevealed()) {
        this.animatedPatrimoines.set(p);
        this.animatedCircuits.set(c);
        this.animatedEvenements.set(e);
        this.animatedGuides.set(g);
      } else {
        this.runCountUp(p, c, e, g);
      }
    });
  }

  protected submitSearch(): void {
    this.searchSubmit.emit(this.query().trim());
  }

  protected onStatsRevealed(): void {
    if (this.statsRevealed()) return;
    this.statsRevealed.set(true);
    const p = this.patrimoinesCount();
    const c = this.circuitsCount();
    const e = this.evenementsCount();
    const g = this.guidesCount();

    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReduced && (p > 0 || c > 0 || e > 0 || g > 0)) {
      this.runCountUp(p, c, e, g);
    }
  }

  private runCountUp(p: number, c: number, e: number, g: number): void {
    if (typeof requestAnimationFrame === 'undefined') {
      this.animatedPatrimoines.set(p);
      this.animatedCircuits.set(c);
      this.animatedEvenements.set(e);
      this.animatedGuides.set(g);
      return;
    }

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    const duration = 850;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.animatedPatrimoines.set(Math.round(p * eased));
      this.animatedCircuits.set(Math.round(c * eased));
      this.animatedEvenements.set(Math.round(e * eased));
      this.animatedGuides.set(Math.round(g * eased));

      if (progress < 1) {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.animatedPatrimoines.set(p);
        this.animatedCircuits.set(c);
        this.animatedEvenements.set(e);
        this.animatedGuides.set(g);
        this.rafId = null;
      }
    };

    this.rafId = requestAnimationFrame(step);
  }

  ngOnDestroy(): void {
    if (this.rafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafId);
    }
  }
}
