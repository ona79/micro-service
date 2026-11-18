import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ui-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="empty-state" role="status">
      <div class="empty-state__illustration" aria-hidden="true">
        <svg viewBox="0 0 180 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="empty-svg">
          <rect x="18" y="20" width="144" height="86" rx="12" fill="#FFFFFF" stroke="#DDD4C6" stroke-width="1.5"/>
          <path d="M36 92H144" stroke="#B24C29" stroke-width="2" stroke-linecap="round"/>
          <path d="M58 92V56C58 44.9543 66.9543 36 78 36C89.0457 36 98 44.9543 98 56V92" fill="#F4EDE2" stroke="#1F5138" stroke-width="2"/>
          <path d="M68 92V62C68 56.4772 72.4772 52 78 52C83.5228 52 88 56.4772 88 62V92" fill="#FAF6F0" stroke="#B24C29" stroke-width="1.5"/>
          <circle cx="122" cy="54" r="16" fill="#FAF6F0" stroke="#1F5138" stroke-width="1.8"/>
          <path d="M122 42L125 51L134 54L125 57L122 66L119 57L110 54L119 51L122 42Z" fill="#B24C29"/>
          <circle cx="44" cy="44" r="5" fill="#D4A359" fill-opacity="0.45"/>
        </svg>
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

    .empty-state__illustration {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--space-3);
    }

    .empty-svg {
      width: 148px;
      height: 98px;
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
