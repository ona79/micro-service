import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ui-form-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="ui-form-group" [class.ui-form-group--error]="!!error()">
      @if (label()) {
        <label
          [attr.for]="forId() || null"
          class="ui-form-label"
          [class.ui-form-label--required]="required()"
        >
          {{ label() }}
        </label>
      }

      <div class="ui-form-control-slot">
        <ng-content></ng-content>
      </div>

      @if (error()) {
        <p [id]="errorId()" class="ui-form-error" role="alert" aria-live="polite">
          <span aria-hidden="true">⚠</span>
          <span>{{ error() }}</span>
        </p>
      } @else if (hint()) {
        <p [id]="hintId()" class="ui-form-hint">
          {{ hint() }}
        </p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      min-width: 0;
    }

    .ui-form-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 4px);
      width: 100%;
    }

    .ui-form-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--ink-secondary, #4a463f);
      line-height: 1.3;
    }

    .ui-form-label--required::after {
      content: ' *';
      color: var(--status-error-ink, #921f18);
    }

    .ui-form-control-slot {
      position: relative;
      width: 100%;
    }

    .ui-form-control-slot ::ng-deep input:not([type='checkbox']):not([type='radio']),
    .ui-form-control-slot ::ng-deep select {
      width: 100%;
      height: var(--control-height, 36px);
      padding: 0 var(--space-3, 12px);
      border-radius: var(--radius-sm, 8px);
      border: 1px solid var(--border-default, #d6cfc2);
      background-color: var(--surface-elevated, #ffffff);
      color: var(--ink-primary, #1c1b18);
      font-family: var(--font-sans);
      font-size: var(--text-sm, 0.875rem);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }

    .ui-form-control-slot ::ng-deep textarea {
      width: 100%;
      min-height: 76px;
      padding: var(--space-2, 8px) var(--space-3, 12px);
      border-radius: var(--radius-sm, 8px);
      border: 1px solid var(--border-default, #d6cfc2);
      background-color: var(--surface-elevated, #ffffff);
      color: var(--ink-primary, #1c1b18);
      font-family: var(--font-sans);
      font-size: var(--text-sm, 0.875rem);
      resize: vertical;
    }

    .ui-form-group--error .ui-form-control-slot ::ng-deep input,
    .ui-form-group--error .ui-form-control-slot ::ng-deep select,
    .ui-form-group--error .ui-form-control-slot ::ng-deep textarea {
      border-color: var(--status-error-ink, #921f18);
    }

    .ui-form-error {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: var(--text-xs, 0.75rem);
      font-weight: 600;
      color: var(--status-error-ink, #921f18);
      margin: 0;
    }

    .ui-form-hint {
      font-size: var(--text-xs, 0.75rem);
      color: var(--ink-muted, #666055);
      margin: 0;
    }
  `,
})
export class UiFormFieldComponent {
  readonly label = input<string>('');
  readonly forId = input<string>('');
  readonly hint = input<string>('');
  readonly error = input<string | null>(null);
  readonly required = input<boolean>(false);

  protected readonly errorId = computed(() => (this.forId() ? `${this.forId()}-error` : undefined));
  protected readonly hintId = computed(() => (this.forId() ? `${this.forId()}-hint` : undefined));
}
