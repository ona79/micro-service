import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type UiCardVariant = 'elevated' | 'bordered' | 'flat' | 'interactive';

@Component({
  selector: 'app-ui-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <article
      [class]="cardClasses()"
      [attr.tabindex]="interactive() ? 0 : null"
      [attr.role]="interactive() ? 'button' : null"
      (click)="handleClick()"
      (keydown.enter)="handleKeydown($event)"
      (keydown.space)="handleKeydown($event)"
    >
      <div class="ui-card__media-slot">
        <ng-content select="[card-media],[slot=media]"></ng-content>
      </div>

      <header class="ui-card__header-slot">
        <ng-content select="[card-header],[slot=header]"></ng-content>
      </header>

      <div class="ui-card__body-slot">
        <ng-content select="[card-body],[slot=body]"></ng-content>
        <ng-content></ng-content>
      </div>

      <footer class="ui-card__footer-slot">
        <ng-content select="[card-footer],[slot=footer]"></ng-content>
      </footer>
    </article>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      max-width: 100%;
    }

    .ui-card {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: var(--surface-elevated, #ffffff);
      border: 1px solid var(--border-subtle, #e5dfd3);
      border-radius: var(--radius-md, 12px);
      overflow: hidden;
      max-width: 100%;
      transition:
        box-shadow var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        transform var(--transition-fast, 150ms ease);
    }

    .ui-card--elevated {
      box-shadow: var(--shadow-sm);
    }

    .ui-card--bordered {
      box-shadow: var(--shadow-xs);
    }

    .ui-card--flat {
      background-color: var(--surface-subtle, #f5f2eb);
      box-shadow: none;
    }

    .ui-card--interactive {
      cursor: pointer;
    }

    .ui-card--interactive:hover {
      border-color: var(--brand-border, #b6d1c3);
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }

    .ui-card__media-slot:empty,
    .ui-card__header-slot:empty,
    .ui-card__footer-slot:empty {
      display: none;
    }

    .ui-card__media-slot {
      overflow: hidden;
    }

    .ui-card__media-slot img {
      width: 100%;
      max-width: 100%;
      object-fit: cover;
      display: block;
    }

    .ui-card__header-slot {
      padding: 12px var(--card-padding, 16px) 0;
    }

    .ui-card__body-slot {
      padding: 10px var(--card-padding, 16px) var(--card-padding, 16px);
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    .ui-card__footer-slot {
      margin-top: auto;
      padding: var(--space-3, 12px) var(--card-padding, 16px);
      border-top: 1px solid var(--border-subtle, #e5dfd3);
      background-color: var(--surface-subtle, #f5f2eb);
    }
  `,
})
export class UiCardComponent {
  readonly variant = input<UiCardVariant>('elevated');
  readonly interactive = input<boolean>(false);

  readonly cardClick = output<void>();

  protected readonly cardClasses = computed(() => {
    const classes = ['ui-card', `ui-card--${this.variant()}`];
    if (this.interactive()) classes.push('ui-card--interactive');
    return classes.join(' ');
  });

  protected handleClick(): void {
    if (this.interactive()) {
      this.cardClick.emit();
    }
  }

  protected handleKeydown(event: Event): void {
    if (this.interactive()) {
      event.preventDefault();
      this.cardClick.emit();
    }
  }
}
