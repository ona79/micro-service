import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideShieldAlert } from '@lucide/angular';
import { AuthStore } from '../../auth/auth.store';

@Component({
  selector: 'app-forbidden-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucideShieldAlert, LucideArrowRight],
  template: `
    <div class="page-section">
      <div class="container">
        <article class="forbidden-card" role="alert">
          <div class="forbidden-card__icon" aria-hidden="true">
            <svg lucideShieldAlert [size]="32"></svg>
          </div>
          <span class="ui-badge ui-badge--danger">Accès restreint (403)</span>
          <h1 class="forbidden-card__title">Autorisation insuffisante pour cette section</h1>
          <p class="forbidden-card__desc">
            Votre compte actuel (<strong>{{ authStore.roleLabel() }}</strong>) ne dispose pas
            des privilèges requis pour accéder à cet espace d’administration ou à cette action.
          </p>
          <div class="forbidden-card__actions">
            <a routerLink="/mon-espace" class="btn-primary">
              <span>Retourner à mon espace</span>
              <svg lucideArrowRight [size]="16" aria-hidden="true"></svg>
            </a>
            <a routerLink="/" class="btn-secondary">Retourner à l’accueil</a>
          </div>
        </article>
      </div>
    </div>
  `,
  styles: `
    .forbidden-card {
      max-width: 600px;
      margin: var(--space-8) auto;
      padding: var(--space-8);
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4);
    }

    .forbidden-card__icon {
      width: 64px;
      height: 64px;
      border-radius: var(--radius-pill);
      background-color: var(--danger-soft);
      color: var(--danger);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .forbidden-card__title {
      font-size: var(--text-2xl);
      color: var(--ink-primary);
    }

    .forbidden-card__desc {
      font-size: var(--text-base);
      color: var(--ink-secondary);
      line-height: 1.65;
    }

    .forbidden-card__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-3);
      margin-top: var(--space-2);
    }

    .btn-primary,
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 0.7rem 1.35rem;
      border-radius: var(--radius-pill);
      font-weight: 700;
      font-size: var(--text-sm);
    }

    .btn-primary {
      background-color: var(--brand-primary);
      color: var(--ink-on-dark);
    }

    .btn-secondary {
      background-color: var(--surface-sand);
      color: var(--ink-primary);
      border: 1px solid var(--border-strong);
    }
  `,
})
export class ForbiddenPageComponent {
  protected readonly authStore = inject(AuthStore);
}
