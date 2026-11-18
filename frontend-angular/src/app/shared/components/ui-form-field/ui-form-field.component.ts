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
    }

    .ui-form-control-slot {
      position: relative;
      width: 100%;
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
