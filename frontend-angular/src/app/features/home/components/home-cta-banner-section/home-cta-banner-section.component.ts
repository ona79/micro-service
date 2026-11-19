import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideShieldCheck } from '@lucide/angular';
import { ScrollRevealDirective } from '../../../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-home-cta-banner-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucideShieldCheck, ScrollRevealDirective],
  template: `
    <section #bannerEl class="final-cta-section" aria-label="Préservation et réservation responsable">
      <div class="container">
        <div class="final-cta-banner" appScrollReveal="fade-up">
          <div class="final-cta-banner__bg" aria-hidden="true">
            <img
              src="/images/evenements-banner.webp"
              srcset="/images/evenements-banner-640.webp 640w, /images/evenements-banner.webp 1200w"
              sizes="100vw"
              width="1200"
              height="675"
              loading="lazy"
              alt="Kora traditionnelle mandingue symbole du patrimoine musical casamançais"
              class="final-cta-banner__img"
              [style.transform]="'translate3d(0, ' + parallaxOffset() + 'px, 0) scale(1.12)'"
            />
            <div class="final-cta-banner__veil"></div>
          </div>

          <div class="final-cta-banner__content">
            <p class="final-cta-banner__eyebrow">Tourisme culturel responsable</p>
            <h2 class="final-cta-banner__title">Préparer votre venue en Casamance</h2>
            <p class="final-cta-banner__lead">
              Réservez directement vos visites de circuits et événements culturels, consultez les
              disponibilités calculées côté serveur et laissez des avis vérifiés après votre passage.
            </p>
            <div class="final-cta-banner__actions">
              <a routerLink="/reserver" class="btn-cta-terracotta">
                <svg lucideShieldCheck [size]="17" aria-hidden="true"></svg>
                <span>Planifier une réservation</span>
              </a>
              <a routerLink="/inscription" class="btn-cta-outline">Créer un compte visiteur</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .final-cta-section {
      padding: 40px 0 68px;
    }

    .final-cta-banner {
      position: relative;
      border-radius: 26px;
      overflow: hidden;
      background-color: #143326;
      color: #faf6f0;
      border: 1px solid rgba(250, 246, 240, 0.18);
      box-shadow: 0 22px 48px rgba(14, 34, 25, 0.22);
      min-height: 320px;
      display: flex;
      align-items: center;
    }

    .final-cta-banner__bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      overflow: hidden;
    }

    .final-cta-banner__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      will-change: transform;
      transition: transform 120ms linear;
    }

    .final-cta-banner__veil {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(100deg, rgba(16, 42, 31, 0.94) 0%, rgba(20, 52, 39, 0.84) 55%, rgba(20, 52, 39, 0.55) 100%),
        radial-gradient(circle at 85% 20%, rgba(198, 139, 44, 0.25), transparent 50%);
    }

    .final-cta-banner__content {
      position: relative;
      z-index: 1;
      padding: 44px 48px;
      max-width: 680px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 14px;
    }

    .final-cta-banner__eyebrow {
      margin: 0;
      padding: 4px 12px;
      border-radius: 999px;
      background: rgba(198, 139, 44, 0.25);
      border: 1px solid rgba(233, 196, 106, 0.45);
      color: #f8e3b4;
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .final-cta-banner__title {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(1.65rem, 3vw, 2.35rem);
      line-height: 1.15;
      color: #faf6f0;
    }

    .final-cta-banner__lead {
      margin: 0;
      font-size: 14.5px;
      line-height: 1.6;
      color: rgba(250, 246, 240, 0.88);
    }

    .final-cta-banner__actions {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .btn-cta-terracotta,
    .btn-cta-outline {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      transition: transform 180ms ease, opacity 180ms ease;
    }

    .btn-cta-terracotta {
      background-color: var(--accent-terracotta, #b75f3b);
      color: #ffffff;
      box-shadow: 0 10px 24px rgba(183, 95, 59, 0.35);
    }

    .btn-cta-terracotta:hover {
      transform: translateY(-2px);
      color: #ffffff;
    }

    .btn-cta-outline {
      background: rgba(250, 246, 240, 0.12);
      border: 1px solid rgba(250, 246, 240, 0.32);
      color: #faf6f0;
      backdrop-filter: blur(6px);
    }

    .btn-cta-outline:hover {
      transform: translateY(-2px);
      color: #ffffff;
      background: rgba(250, 246, 240, 0.22);
    }

    @media (max-width: 640px) {
      .final-cta-banner__content {
        padding: 32px 24px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .final-cta-banner__img {
        transform: none !important;
        transition: none !important;
      }
    }
  `,
})
export class HomeCtaBannerSectionComponent {
  @ViewChild('bannerEl') private bannerEl?: ElementRef<HTMLElement>;

  protected readonly parallaxOffset = signal<number>(0);

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      this.parallaxOffset.set(0);
      return;
    }

    const el = this.bannerEl?.nativeElement;
    if (!el || typeof window === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const viewportH = window.innerHeight || 800;
    if (rect.bottom < 0 || rect.top > viewportH) return;

    const centerDelta = (rect.top + rect.height / 2 - viewportH / 2) / viewportH;
    this.parallaxOffset.set(Math.max(-24, Math.min(24, Math.round(centerDelta * -32))));
  }
}
