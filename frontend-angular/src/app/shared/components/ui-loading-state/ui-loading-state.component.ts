import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type UiLoadingSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-ui-loading-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div
      [class]="containerClasses()"
      role="status"
      aria-live="polite"
    >
      <div class="ui-loading__spinner" [class]="spinnerClasses()" aria-hidden="true"></div>
      @if (message()) {
        <p class="ui-loading__text">{{ message() }}</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .ui-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-3, 12px);
      padding: var(--space-8, 32px) var(--space-4, 16px);
      text-align: center;
    }

    .ui-loading--fullscreen {
      min-height: 50vh;
    }

    .ui-loading__spinner {
      border-radius: var(--radius-pill, 9999px);
      border: 3px solid var(--color-brand-forest-soft, #e8f2ed);
      border-top-color: var(--color-brand-forest, #28634b);
      animation: ui-loading-rotate 0.75s linear infinite;
    }

    .ui-spinner--sm {
      width: 24px;
      height: 24px;
      border-width: 2.5px;
    }

    .ui-spinner--md {
      width: 40px;
      height: 40px;
      border-width: 3.5px;
    }

    .ui-spinner--lg {
      width: 56px;
      height: 56px;
      border-width: 4.5px;
    }

    .ui-loading__text {
      font-family: var(--font-sans);
      font-size: var(--text-sm, 14px);
      font-weight: var(--font-weight-medium, 500);
      color: var(--color-text-secondary, #3d4942);
      margin: 0;
    }

    @keyframes ui-loading-rotate {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class UiLoadingStateComponent {
  readonly message = input<string>('Chargement des données en cours...');
  readonly size = input<UiLoadingSize>('md');
  readonly fullscreen = input<boolean>(false);

  protected readonly containerClasses = computed(() => {
    const classes = ['ui-loading'];
    if (this.fullscreen()) classes.push('ui-loading--fullscreen');
    return classes.join(' ');
  });

  protected readonly spinnerClasses = computed(() => {
    return `ui-spinner--${this.size()}`;
  });
}
