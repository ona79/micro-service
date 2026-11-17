import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-ui-skeleton-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton-wrap" role="status" aria-live="polite" [attr.aria-label]="label()">
      <span class="sr-only">{{ label() }}</span>
      <div class="skeleton-grid" [class.skeleton-grid--rows]="variant() === 'rows'">
        @for (item of items(); track item) {
          <div class="skeleton-card" aria-hidden="true">
            @if (variant() === 'cards') {
              <div class="skeleton-block skeleton-block--media"></div>
            }
            <div class="skeleton-card__body">
              <div class="skeleton-block skeleton-block--pill"></div>
              <div class="skeleton-block skeleton-block--title"></div>
              <div class="skeleton-block skeleton-block--line"></div>
              <div class="skeleton-block skeleton-block--line short"></div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: var(--space-5);
    }

    .skeleton-grid--rows {
      grid-template-columns: 1fr;
    }

    .skeleton-card {
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .skeleton-card__body {
      padding: var(--space-5);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .skeleton-block {
      background: linear-gradient(
        90deg,
        var(--surface-sand) 25%,
        var(--surface-tinted) 50%,
        var(--surface-sand) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite linear;
      border-radius: var(--radius-xs);
    }

    .skeleton-block--media {
      height: 190px;
      border-radius: 0;
    }

    .skeleton-block--pill {
      width: 92px;
      height: 20px;
      border-radius: var(--radius-pill);
    }

    .skeleton-block--title {
      width: 72%;
      height: 24px;
    }

    .skeleton-block--line {
      width: 100%;
      height: 14px;
    }

    .skeleton-block--line.short {
      width: 58%;
    }

    @keyframes shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
  `,
})
export class UiSkeletonGridComponent {
  readonly count = input<number>(3);
  readonly variant = input<'cards' | 'rows'>('cards');
  readonly label = input<string>('Chargement des données en cours...');
  protected readonly items = computed(() =>
    Array.from({ length: this.count() }, (_, index) => index)
  );
}
