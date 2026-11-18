import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface ChartDatum {
  label: string;
  value: number;
  tone?: 'forest' | 'terracotta' | 'ochre' | 'neutral' | 'success' | 'danger';
  displayValue?: string;
}

@Component({
  selector: 'app-ui-bar-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="chart-card" [attr.aria-label]="title()">
      <header class="chart-card__header">
        <div>
          <h3 class="chart-card__title">{{ title() }}</h3>
          @if (subtitle()) {
            <p class="chart-card__sub">{{ subtitle() }}</p>
          }
        </div>
        <span class="chart-card__total tabular-nums">{{ totalLabel() }}</span>
      </header>

      @if (normalized().length === 0) {
        <p class="chart-empty">Aucune donnée disponible pour cette répartition.</p>
      } @else {
        <ul class="bar-list">
          @for (item of normalized(); track item.label) {
            <li class="bar-row">
              <div class="bar-row__meta">
                <span class="bar-row__label">{{ item.label }}</span>
                <span class="bar-row__value tabular-nums">
                  {{ item.displayValue ?? item.value }} ({{ item.sharePct }}%)
                </span>
              </div>
              <div class="bar-track" role="img" [attr.aria-label]="item.label + ': ' + item.value">
                <svg
                  class="bar-svg"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <rect x="0" y="0" width="100" height="10" rx="5" fill="var(--surface-sand)" />
                  <rect
                    x="0"
                    y="0"
                    [attr.width]="item.widthPct"
                    height="10"
                    rx="5"
                    [attr.fill]="item.fill"
                  />
                </svg>
              </div>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    .chart-card {
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: var(--space-5);
      box-shadow: var(--shadow-xs);
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .chart-card__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--space-3);
      border-bottom: 1px solid var(--border-subtle);
      padding-bottom: var(--space-3);
    }

    .chart-card__title {
      font-size: var(--text-base);
      margin: 0;
    }

    .chart-card__sub {
      font-size: var(--text-xs);
      color: var(--ink-muted);
      margin: 0.2rem 0 0;
    }

    .chart-card__total {
      font-size: var(--text-xs);
      font-weight: 700;
      color: var(--brand-primary);
      background-color: var(--brand-soft);
      border: 1px solid var(--brand-border);
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-pill);
      white-space: nowrap;
    }

    .chart-empty {
      font-size: var(--text-sm);
      color: var(--ink-muted);
      margin: 0;
    }

    .bar-list {
      list-style: none;
      display: grid;
      gap: var(--space-3);
    }

    .bar-row {
      display: grid;
      gap: 0.3rem;
    }

    .bar-row__meta {
      display: flex;
      justify-content: space-between;
      gap: var(--space-2);
      font-size: var(--text-xs);
    }

    .bar-row__label {
      font-weight: 600;
      color: var(--ink-primary);
    }

    .bar-row__value {
      color: var(--ink-secondary);
      font-weight: 600;
    }

    .bar-track {
      width: 100%;
      height: 10px;
      border-radius: var(--radius-pill);
      overflow: hidden;
    }

    .bar-svg {
      display: block;
      width: 100%;
      height: 10px;
    }
  `,
})
export class UiBarChartComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly data = input.required<readonly ChartDatum[]>();

  private readonly palette: Record<NonNullable<ChartDatum['tone']>, string> = {
    forest: 'var(--brand-primary)',
    terracotta: 'var(--accent-terracotta)',
    ochre: 'var(--accent-ochre)',
    neutral: '#6c665c',
    success: 'var(--status-success-ink)',
    danger: 'var(--status-error-ink)',
  };

  protected readonly totalValue = computed(() =>
    this.data().reduce((acc, d) => acc + Math.max(0, d.value), 0)
  );

  protected readonly totalLabel = computed(() => `Total : ${this.totalValue()}`);

  protected readonly normalized = computed(() => {
    const items = this.data();
    const maxVal = items.reduce((m, d) => Math.max(m, d.value), 0);
    const total = this.totalValue();
    return items.map((item, idx) => {
      const safeVal = Math.max(0, item.value);
      const widthPct = maxVal > 0 ? Math.max(safeVal > 0 ? 4 : 0, Math.round((safeVal / maxVal) * 100)) : 0;
      const sharePct = total > 0 ? Math.round((safeVal / total) * 100) : 0;
      const defaultTone: NonNullable<ChartDatum['tone']> =
        idx % 3 === 0 ? 'forest' : idx % 3 === 1 ? 'terracotta' : 'ochre';
      return {
        ...item,
        widthPct,
        sharePct,
        fill: this.palette[item.tone ?? defaultTone],
      };
    });
  });
}
