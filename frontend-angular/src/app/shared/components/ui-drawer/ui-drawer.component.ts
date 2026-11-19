import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { LucideX } from '@lucide/angular';
import { UiButtonComponent } from '../ui-button/ui-button.component';

@Component({
  selector: 'app-ui-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, LucideX, UiButtonComponent],
  template: `
    @if (open()) {
      <div class="ui-drawer-backdrop" (click)="onBackdropClick()">
        <aside
          class="ui-drawer"
          [class.ui-drawer--lg]="width() === 'lg'"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'ui-drawer-title'"
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="true"
          (click)="$event.stopPropagation()"
        >
          <header class="ui-drawer__header">
            <div>
              <h2 id="ui-drawer-title" class="ui-drawer__title">{{ title() }}</h2>
              @if (subtitle()) {
                <p class="ui-drawer__subtitle">{{ subtitle() }}</p>
              }
            </div>
            <button
              type="button"
              class="ui-drawer__close"
              (click)="closed.emit()"
              aria-label="Fermer le panneau"
            >
              <svg lucideX [size]="18" aria-hidden="true"></svg>
            </button>
          </header>

          <div class="ui-drawer__body">
            <ng-content></ng-content>
          </div>

          @if (showFooter()) {
            <footer class="ui-drawer__footer">
              <app-ui-button
                variant="secondary"
                size="md"
                [disabled]="submitting()"
                (clicked)="closed.emit()"
              >
                {{ cancelLabel() }}
              </app-ui-button>
              <app-ui-button
                variant="primary"
                size="md"
                [loading]="submitting()"
                [disabled]="submitDisabled()"
                (clicked)="submitted.emit()"
              >
                {{ submitLabel() }}
              </app-ui-button>
            </footer>
          }
        </aside>
      </div>
    }
  `,
  styles: `
    .ui-drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: var(--z-modal, 100);
      background-color: rgba(23, 61, 45, 0.45);
      backdrop-filter: blur(2px);
      display: flex;
      justify-content: flex-end;
    }

    .ui-drawer {
      width: min(560px, 100vw);
      height: 100%;
      display: flex;
      flex-direction: column;
      background-color: var(--surface-elevated, #ffffff);
      border-left: 1px solid var(--border-subtle, #e5dfd3);
      box-shadow: var(--shadow-lg);
    }

    .ui-drawer--lg {
      width: min(720px, 100vw);
    }

    .ui-drawer__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3, 12px);
      padding: var(--space-4, 16px) var(--space-5, 20px);
      border-bottom: 1px solid var(--border-subtle, #e5dfd3);
      background-color: var(--surface-subtle, #f5f2eb);
      flex-shrink: 0;
    }

    .ui-drawer__title {
      font-size: var(--text-lg, 1.125rem);
      margin: 0;
      color: var(--ink-primary, #1c1b18);
    }

    .ui-drawer__subtitle {
      font-size: var(--text-xs, 0.75rem);
      color: var(--ink-muted, #666055);
      margin: 2px 0 0;
    }

    .ui-drawer__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--control-height-sm, 32px);
      height: var(--control-height-sm, 32px);
      border-radius: var(--radius-sm, 8px);
      border: 1px solid var(--border-default, #d6cfc2);
      background-color: var(--surface-elevated, #ffffff);
      color: var(--ink-primary, #1c1b18);
      cursor: pointer;
      flex-shrink: 0;
    }

    .ui-drawer__close:hover {
      background-color: var(--surface-hover, #efe9dc);
    }

    .ui-drawer__body {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-5, 20px);
    }

    .ui-drawer__footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-2, 8px);
      padding: var(--space-3, 12px) var(--space-5, 20px);
      border-top: 1px solid var(--border-subtle, #e5dfd3);
      background-color: var(--surface-subtle, #f5f2eb);
      flex-shrink: 0;
    }

    @media (max-width: 640px) {
      .ui-drawer,
      .ui-drawer--lg {
        width: 100%;
        border-left: none;
      }
    }
  `,
})
export class UiDrawerComponent {
  readonly open = input<boolean>(false);
  readonly title = input<string>('');
  readonly subtitle = input<string | null>(null);
  readonly width = input<'md' | 'lg'>('md');
  readonly cancelLabel = input<string>('Annuler');
  readonly submitLabel = input<string>('Enregistrer');
  readonly submitting = input<boolean>(false);
  readonly submitDisabled = input<boolean>(false);
  readonly showFooter = input<boolean>(true);
  readonly closeOnBackdrop = input<boolean>(true);

  readonly closed = output<void>();
  readonly submitted = output<void>();

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open() && !this.submitting()) {
      this.closed.emit();
    }
  }

  protected onBackdropClick(): void {
    if (this.closeOnBackdrop() && !this.submitting()) {
      this.closed.emit();
    }
  }
}
