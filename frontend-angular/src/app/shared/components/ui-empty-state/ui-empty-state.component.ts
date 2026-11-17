import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCompass } from '@lucide/angular';

@Component({
  selector: 'app-ui-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucideCompass],
  template: `
    <div class="empty-state" role="status">
      <div class="empty-state__icon" aria-hidden="true">
        <svg lucideCompass [size]="28"></svg>
      </div>
      <h3 class="empty-state__title">{{ title() }}</h3>
      <p class="empty-state__description">{{ description() }}</p>
      @if (actionTo()) {
        <a [routerLink]="actionTo()" class="empty-state__btn">{{ actionLabel() }}</a>
      } @else if (hasAction()) {
        <button type="button" class="empty-state__btn" (click)="action.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: `
    .empty-state {
      text-align: center;
      padding: var(--space-10) var(--space-6);
      background-color: var(--surface-sand);
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius-lg);
      margin: var(--space-4) 0;
    }

    .empty-state__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: var(--radius-pill);
      background-color: var(--surface-elevated);
      color: var(--brand-primary);
      border: 1px solid var(--border-subtle);
      margin-bottom: var(--space-4);
    }

    .empty-state__title {
      font-size: var(--text-lg);
      color: var(--ink-primary);
      margin-bottom: var(--space-2);
    }

    .empty-state__description {
      font-size: var(--text-sm);
      color: var(--ink-secondary);
      max-width: 480px;
      margin: 0 auto var(--space-5);
    }

    .empty-state__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-2) var(--space-5);
      border-radius: var(--radius-pill);
      background-color: var(--brand-primary);
      color: var(--ink-on-dark);
      border: none;
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: 700;
      cursor: pointer;
      transition: background-color var(--transition-fast);
    }

    .empty-state__btn:hover {
      background-color: var(--brand-primary-hover);
      color: var(--ink-on-dark);
    }
  `,
})
export class UiEmptyStateComponent {
  readonly title = input<string>('Aucun élément trouvé');
  readonly description = input<string>(
    'Aucun contenu ne correspond actuellement à votre recherche.'
  );
  readonly actionLabel = input<string>('Voir tout');
  readonly actionTo = input<string | null>(null);
  readonly hasAction = input<boolean>(false);
  readonly action = output<void>();
}
