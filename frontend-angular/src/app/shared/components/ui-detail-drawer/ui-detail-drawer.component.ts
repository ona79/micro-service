import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';
import { LucideX } from '@lucide/angular';

@Component({
  selector: 'app-ui-detail-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideX],
  template: `
    @if (open()) {
      <div class="drawer-backdrop" (click)="close.emit()" role="presentation">
        <aside
          class="drawer-panel"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          (click)="$event.stopPropagation()"
        >
          <header class="drawer-header">
            <div>
              @if (eyebrow()) {
                <p class="drawer-eyebrow">{{ eyebrow() }}</p>
              }
              <h2 class="drawer-title">{{ title() }}</h2>
            </div>
            <button
              type="button"
              class="drawer-close"
              aria-label="Fermer le panneau détaillé"
              (click)="close.emit()"
            >
              <svg lucideX [size]="18" aria-hidden="true"></svg>
            </button>
          </header>

          <div class="drawer-body">
            <ng-content />
          </div>
        </aside>
      </div>
    }
  `,
  styles: `
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: 950;
      background-color: rgba(23, 61, 45, 0.42);
      display: flex;
      justify-content: flex-end;
    }

    .drawer-panel {
      width: min(96vw, 560px);
      height: 100%;
      background-color: var(--surface-elevated);
      border-left: 1px solid var(--border-strong);
      box-shadow: var(--shadow-lg);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .drawer-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-5) var(--space-6);
      border-bottom: 1px solid var(--border-subtle);
      background-color: var(--surface-canvas);
    }

    .drawer-eyebrow {
      font-size: var(--text-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent-terracotta);
      margin: 0 0 0.25rem;
    }

    .drawer-title {
      font-size: var(--text-lg);
      margin: 0;
    }

    .drawer-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 1px solid var(--border-strong);
      background-color: var(--surface-elevated);
      color: var(--ink-secondary);
      cursor: pointer;
      flex-shrink: 0;
    }

    .drawer-close:hover {
      border-color: var(--brand-primary);
      color: var(--brand-primary);
    }

    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: var(--space-5) var(--space-6);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }
  `,
})
export class UiDetailDrawerComponent {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly eyebrow = input<string | null>(null);
  readonly close = output<void>();

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) {
      this.close.emit();
    }
  }
}
