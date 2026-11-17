import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAlertCircle, LucideX } from '@lucide/angular';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

@Component({
  selector: 'app-ui-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAlertCircle, LucideX],
  template: `
    <div class="dialog-panel">
      <div class="dialog-panel__header">
        <div class="dialog-panel__heading">
          <span
            class="dialog-panel__icon"
            [class.dialog-panel__icon--danger]="data.variant !== 'primary'"
            aria-hidden="true"
          >
            <svg lucideAlertCircle [size]="20"></svg>
          </span>
          <h2 id="dialog-title" class="dialog-panel__title">{{ data.title }}</h2>
        </div>
        <button
          type="button"
          class="dialog-panel__close"
          aria-label="Fermer la fenêtre"
          (click)="dialogRef.close(false)"
        >
          <svg lucideX [size]="18" aria-hidden="true"></svg>
        </button>
      </div>

      <p class="dialog-panel__message">{{ data.message }}</p>

      <div class="dialog-panel__actions">
        <button
          type="button"
          class="dialog-btn dialog-btn--ghost"
          (click)="dialogRef.close(false)"
        >
          {{ data.cancelLabel ?? 'Conserver' }}
        </button>
        <button
          type="button"
          class="dialog-btn"
          [class.dialog-btn--danger]="data.variant !== 'primary'"
          [class.dialog-btn--primary]="data.variant === 'primary'"
          (click)="dialogRef.close(true)"
        >
          {{ data.confirmLabel ?? 'Confirmer' }}
        </button>
      </div>
    </div>
  `,
  styles: `
    .dialog-panel {
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: var(--space-6);
      width: min(92vw, 460px);
    }

    .dialog-panel__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-3);
      margin-bottom: var(--space-3);
    }

    .dialog-panel__heading {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .dialog-panel__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--radius-pill);
      background-color: var(--brand-soft);
      color: var(--brand-primary);
      flex-shrink: 0;
    }

    .dialog-panel__icon--danger {
      background-color: var(--status-error-bg);
      color: var(--status-error-ink);
    }

    .dialog-panel__title {
      font-size: var(--text-lg);
      color: var(--ink-primary);
    }

    .dialog-panel__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      background: transparent;
      color: var(--ink-muted);
      cursor: pointer;
    }

    .dialog-panel__close:hover {
      background-color: var(--surface-sand);
      color: var(--ink-primary);
    }

    .dialog-panel__message {
      font-size: var(--text-sm);
      color: var(--ink-secondary);
      line-height: 1.6;
      margin-bottom: var(--space-6);
    }

    .dialog-panel__actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-3);
    }

    .dialog-btn {
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-pill);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: 700;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background-color var(--transition-fast);
    }

    .dialog-btn--ghost {
      background-color: var(--surface-sand);
      color: var(--ink-primary);
      border-color: var(--border-strong);
    }

    .dialog-btn--ghost:hover {
      background-color: var(--surface-tinted);
    }

    .dialog-btn--danger {
      background-color: var(--status-error-ink);
      color: var(--ink-on-dark);
    }

    .dialog-btn--danger:hover {
      background-color: #741610;
    }

    .dialog-btn--primary {
      background-color: var(--brand-primary);
      color: var(--ink-on-dark);
    }
  `,
})
export class UiConfirmDialogComponent {
  protected readonly dialogRef = inject(DialogRef<boolean>);
  protected readonly data = inject<ConfirmDialogData>(DIALOG_DATA);
}
