import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface UiTabItem {
  id: string;
  label: string;
  count?: number | null;
}

@Component({
  selector: 'app-ui-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-tabs" role="tablist" [attr.aria-label]="ariaLabel()">
      @for (tab of tabs(); track tab.id) {
        <button
          type="button"
          role="tab"
          class="ui-tabs__pill"
          [class.ui-tabs__pill--active]="activeId() === tab.id"
          [attr.aria-selected]="activeId() === tab.id"
          (click)="tabChange.emit(tab.id)"
        >
          <span>{{ tab.label }}</span>
          @if (tab.count !== undefined && tab.count !== null) {
            <span class="ui-tabs__count tabular-nums">{{ tab.count }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      max-width: 100%;
    }

    .ui-tabs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1, 4px);
      max-width: 100%;
    }

    .ui-tabs__pill {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
      height: var(--control-height-sm, 32px);
      padding: 0 var(--space-3, 12px);
      border-radius: var(--radius-pill, 9999px);
      border: 1px solid var(--border-default, #d6cfc2);
      background-color: var(--surface-elevated, #ffffff);
      color: var(--ink-secondary, #4a463f);
      font-family: var(--font-sans);
      font-size: var(--text-xs, 0.75rem);
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition:
        background-color var(--transition-fast, 150ms ease),
        border-color var(--transition-fast, 150ms ease),
        color var(--transition-fast, 150ms ease);
    }

    .ui-tabs__pill:hover {
      background-color: var(--surface-hover, #efe9dc);
      color: var(--ink-primary, #1c1b18);
    }

    .ui-tabs__pill--active {
      background-color: var(--brand-primary, #245b45);
      border-color: var(--brand-primary, #245b45);
      color: var(--ink-on-dark, #faf7f0);
    }

    .ui-tabs__pill--active:hover {
      background-color: var(--brand-primary-hover, #194231);
      color: var(--ink-on-dark, #faf7f0);
    }

    .ui-tabs__count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 18px;
      padding: 0 6px;
      border-radius: var(--radius-pill, 9999px);
      background-color: rgba(28, 27, 24, 0.08);
      font-size: 11px;
      font-weight: 800;
    }

    .ui-tabs__pill--active .ui-tabs__count {
      background-color: rgba(250, 247, 240, 0.22);
      color: var(--ink-on-dark, #faf7f0);
    }
  `,
})
export class UiTabsComponent {
  readonly tabs = input.required<UiTabItem[]>();
  readonly activeId = input.required<string>();
  readonly ariaLabel = input<string>('Filtres par statut');

  readonly tabChange = output<string>();
}
