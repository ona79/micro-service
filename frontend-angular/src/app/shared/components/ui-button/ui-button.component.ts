import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type UiButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'terracotta'
  | 'icon';

export type UiButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-ui-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <button
      [type]="type()"
      [disabled]="isDisabled()"
      [attr.aria-busy]="loading() ? 'true' : null"
      [attr.aria-label]="ariaLabel() || null"
      [class]="buttonClasses()"
      (click)="handleClick($event)"
    >
      @if (loading()) {
        <span class="ui-btn__spinner" aria-hidden="true"></span>
      }
      <span class="ui-btn__content" [class.ui-btn__content--loading]="loading()">
        <ng-content></ng-content>
      </span>
    </button>
  `,
  styles: `
    :host {
      display: inline-block;
    }

    .ui-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2, 8px);
      height: var(--control-height, 36px);
      padding: 0 var(--space-3, 12px);
      border-radius: var(--radius-sm, 8px);
      border: 1px solid transparent;
      font-family: var(--font-sans);
      font-size: var(--text-sm, 0.875rem);
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      white-space: nowrap;
      transition:
        background-color var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        color var(--transition-fast, 150ms ease);
    }

    .ui-btn--sm {
      height: var(--control-height-sm, 32px);
      padding: 0 var(--space-3, 12px);
      font-size: var(--text-xs, 0.75rem);
    }

    .ui-btn--lg {
      height: calc(var(--control-height, 36px) + 6px);
      padding: 0 var(--space-5, 20px);
      font-size: var(--text-base, 1rem);
    }

    .ui-btn--primary {
      background-color: var(--brand-primary, #245b45);
      border-color: var(--brand-primary, #245b45);
      color: var(--ink-on-dark, #faf7f0);
    }

    .ui-btn--primary:hover:not(:disabled) {
      background-color: var(--brand-primary-hover, #194231);
      border-color: var(--brand-primary-hover, #194231);
    }

    .ui-btn--primary:active:not(:disabled) {
      background-color: var(--brand-primary-active, #123124);
    }

    .ui-btn--secondary,
    .ui-btn--outline {
      background-color: var(--surface-elevated, #ffffff);
      border-color: var(--border-default, #d6cfc2);
      color: var(--ink-primary, #1c1b18);
    }

    .ui-btn--secondary:hover:not(:disabled),
    .ui-btn--outline:hover:not(:disabled) {
      background-color: var(--surface-hover, #efe9dc);
      border-color: var(--brand-primary, #245b45);
      color: var(--brand-primary, #245b45);
    }

    .ui-btn--secondary:active:not(:disabled),
    .ui-btn--outline:active:not(:disabled) {
      background-color: var(--surface-active, #e4ddd0);
    }

    .ui-btn--ghost {
      background-color: transparent;
      border-color: transparent;
      color: var(--ink-secondary, #4a463f);
    }

    .ui-btn--ghost:hover:not(:disabled) {
      background-color: var(--surface-hover, #efe9dc);
      color: var(--ink-primary, #1c1b18);
    }

    .ui-btn--ghost:active:not(:disabled) {
      background-color: var(--surface-active, #e4ddd0);
    }

    .ui-btn--danger {
      background-color: var(--status-error-bg, #fcebe9);
      border-color: var(--status-error-border, #e8b4ae);
      color: var(--status-error-ink, #921f18);
    }

    .ui-btn--danger:hover:not(:disabled) {
      background-color: #f8d8d4;
      border-color: var(--status-error-ink, #921f18);
    }

    .ui-btn--terracotta {
      background-color: var(--accent-terracotta, #b75f3b);
      border-color: var(--accent-terracotta, #b75f3b);
      color: #ffffff;
    }

    .ui-btn--terracotta:hover:not(:disabled) {
      background-color: var(--accent-terracotta-hover, #964b2c);
      border-color: var(--accent-terracotta-hover, #964b2c);
    }

    .ui-btn--icon {
      width: var(--control-height, 36px);
      height: var(--control-height, 36px);
      padding: 0;
      background-color: var(--surface-elevated, #ffffff);
      border-color: var(--border-default, #d6cfc2);
      color: var(--ink-secondary, #4a463f);
    }

    .ui-btn--icon.ui-btn--sm {
      width: var(--control-height-sm, 32px);
      height: var(--control-height-sm, 32px);
    }

    .ui-btn--icon:hover:not(:disabled) {
      background-color: var(--surface-hover, #efe9dc);
      border-color: var(--brand-primary, #245b45);
      color: var(--brand-primary, #245b45);
    }

    .ui-btn:disabled {
      opacity: 0.52;
      cursor: not-allowed;
    }

    .ui-btn__spinner {
      width: 14px;
      height: 14px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: ui-btn-spin 0.65s linear infinite;
    }

    .ui-btn__content {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
    }

    .ui-btn__content--loading {
      opacity: 0.85;
    }

    @keyframes ui-btn-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class UiButtonComponent {
  readonly variant = input<UiButtonVariant>('primary');
  readonly size = input<UiButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly iconOnly = input<boolean>(false);
  readonly ariaLabel = input<string>('');

  readonly clicked = output<MouseEvent>();

  protected readonly isDisabled = computed(() => this.disabled() || this.loading());

  protected readonly buttonClasses = computed(() => {
    const classes = ['ui-btn', `ui-btn--${this.variant()}`, `ui-btn--${this.size()}`];
    if (this.iconOnly() || this.variant() === 'icon') classes.push('ui-btn--icon');
    if (this.loading()) classes.push('ui-btn--loading');
    if (this.disabled()) classes.push('ui-btn--disabled');
    return classes.join(' ');
  });

  protected handleClick(event: MouseEvent): void {
    if (!this.isDisabled()) {
      this.clicked.emit(event);
    } else {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
