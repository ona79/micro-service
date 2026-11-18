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
        <ng-content select="[card-media]"></ng-content>
      </div>

      <header class="ui-card__header-slot">
        <ng-content select="[card-header]"></ng-content>
      </header>

      <div class="ui-card__body-slot">
        <ng-content select="[card-body]"></ng-content>
        <ng-content></ng-content>
      </div>

      <footer class="ui-card__footer-slot">
        <ng-content select="[card-footer]"></ng-content>
      </footer>
    </article>
  `,
  styles: `
    :host {
      display: block;
    }

    .ui-card__media-slot:empty,
    .ui-card__header-slot:empty,
    .ui-card__footer-slot:empty {
      display: none;
    }

    .ui-card__media-slot img {
      width: 100%;
      object-fit: cover;
      display: block;
    }

    .ui-card__header-slot {
      padding: var(--space-4, 16px) var(--space-5, 20px) 0;
    }

    .ui-card__body-slot {
      padding: var(--space-5, 20px);
    }

    .ui-card__footer-slot {
      padding: var(--space-3, 12px) var(--space-5, 20px);
      border-top: 1px solid var(--color-border-subtle, #e2dac9);
      background-color: var(--color-surface-lin-light, #faf7f0);
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
