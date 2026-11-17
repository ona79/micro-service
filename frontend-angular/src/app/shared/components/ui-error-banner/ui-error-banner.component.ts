import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideAlertCircle, LucideRefreshCw } from '@lucide/angular';

@Component({
  selector: 'app-ui-error-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAlertCircle, LucideRefreshCw],
  template: `
    @if (message()) {
      <div class="error-banner" role="alert" aria-live="assertive">
        <div class="error-banner__icon" aria-hidden="true">
          <svg lucideAlertCircle [size]="22"></svg>
        </div>
        <div class="error-banner__body">
          <h3 class="error-banner__title">{{ title() }}</h3>
          <p class="error-banner__text">{{ message() }}</p>
        </div>
        @if (showRetry()) {
          <button type="button" class="error-banner__retry" (click)="retry.emit()">
            <svg lucideRefreshCw [size]="15" aria-hidden="true"></svg>
            <span>Réessayer</span>
          </button>
        }
      </div>
    }
  `,
  styles: `
    .error-banner {
      display: flex;
      align-items: flex-start;
      gap: var(--space-4);
      padding: var(--space-4) var(--space-5);
      background-color: var(--status-error-bg);
      border: 1px solid var(--status-error-border);
      border-left: 4px solid var(--status-error-ink);
      border-radius: var(--radius-md);
      color: var(--status-error-ink);
      margin-bottom: var(--space-5);
    }

    .error-banner__icon {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .error-banner__body {
      flex: 1;
    }

    .error-banner__title {
      font-family: var(--font-sans);
      font-size: var(--text-base);
      font-weight: 700;
      color: var(--status-error-ink);
      margin-bottom: var(--space-1);
    }

    .error-banner__text {
      font-size: var(--text-sm);
      line-height: 1.5;
    }

    .error-banner__retry {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-sm);
      border: 1px solid var(--status-error-border);
      background-color: var(--surface-elevated);
      color: var(--status-error-ink);
      font-family: var(--font-sans);
      font-size: var(--text-xs);
      font-weight: 700;
      cursor: pointer;
      flex-shrink: 0;
      transition: background-color var(--transition-fast);
    }

    .error-banner__retry:hover {
      background-color: var(--status-error-border);
    }

    @media (max-width: 640px) {
      .error-banner {
        flex-direction: column;
      }
    }
  `,
})
export class UiErrorBannerComponent {
  readonly title = input<string>('Une erreur est survenue');
  readonly message = input<string | null>(null);
  readonly showRetry = input<boolean>(false);
  readonly retry = output<void>();
}
