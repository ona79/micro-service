import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type KpiTone = 'forest' | 'terracotta' | 'ochre' | 'neutral' | 'success' | 'danger';

@Component({
  selector: 'app-ui-kpi-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (link()) {
      <a [routerLink]="link()" [class]="'kpi-card kpi-card--interactive kpi-card--' + tone()" [class.kpi-card--compact]="compact()">
        <span class="kpi-card__label">{{ label() }}</span>
        <strong class="kpi-card__value tabular-nums">{{ value() }}</strong>
        @if (subtitle()) {
          <span class="kpi-card__sub">{{ subtitle() }}</span>
        }
      </a>
    } @else {
      <article [class]="'kpi-card kpi-card--' + tone()" [class.kpi-card--compact]="compact()">
        <span class="kpi-card__label">{{ label() }}</span>
        <strong class="kpi-card__value tabular-nums">{{ value() }}</strong>
        @if (subtitle()) {
          <span class="kpi-card__sub">{{ subtitle() }}</span>
        }
      </article>
    }
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .kpi-card {
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 4px);
      height: 100%;
      padding: var(--space-3, 12px) var(--space-4, 16px);
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-top: 3px solid var(--brand-primary);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-xs);
      color: var(--ink-primary);
      min-width: 0;
    }

    .kpi-card--compact {
      padding: var(--space-2, 8px) var(--space-3, 12px);
      gap: 2px;
    }

    .kpi-card--interactive {
      transition: transform var(--transition-fast), box-shadow var(--transition-fast);
    }

    .kpi-card--interactive:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-sm);
      color: var(--ink-primary);
    }

    .kpi-card--terracotta { border-top-color: var(--accent-terracotta); }
    .kpi-card--ochre { border-top-color: var(--accent-ochre); }
    .kpi-card--neutral { border-top-color: var(--border-strong); }
    .kpi-card--success { border-top-color: var(--status-success-ink); }
    .kpi-card--danger { border-top-color: var(--status-error-ink); }

    .kpi-card__label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ink-muted);
    }

    .kpi-card__value {
      font-family: var(--font-display);
      font-size: clamp(1.2rem, 1.8vw, 1.5rem);
      font-weight: 700;
      line-height: 1.15;
      color: var(--ink-primary);
    }

    .kpi-card--compact .kpi-card__value {
      font-size: 1.25rem;
    }

    .kpi-card__sub {
      margin-top: auto;
      font-size: var(--text-xs);
      color: var(--ink-secondary);
      line-height: 1.3;
    }
  `,
})
export class UiKpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly subtitle = input<string | null>(null);
  readonly tone = input<KpiTone>('forest');
  readonly link = input<string | null>(null);
  readonly compact = input<boolean>(true);
}
