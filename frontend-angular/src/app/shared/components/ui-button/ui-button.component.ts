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
  | 'terracotta';

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

    .ui-btn__content {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
      transition: opacity var(--transition-fast, 150ms ease);
    }

    .ui-btn__content--loading {
      opacity: 0.85;
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
    if (this.iconOnly()) classes.push('ui-btn--icon');
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
