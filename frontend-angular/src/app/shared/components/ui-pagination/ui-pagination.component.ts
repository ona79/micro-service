import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

@Component({
  selector: 'app-ui-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideChevronLeft, LucideChevronRight],
  template: `
    @if (totalElements() > 0) {
      <nav class="pagination-bar" aria-label="Pagination des résultats">
        <p class="pagination-bar__info tabular-nums">
          Page {{ page() + 1 }} / {{ Math.max(1, totalPages()) }} · {{ totalElements() }} élément(s)
        </p>
        @if (totalPages() > 1) {
          <div class="pagination-bar__actions">
            <button
              type="button"
              class="pg-btn"
              [disabled]="page() <= 0 || disabled()"
              (click)="pageChange.emit(page() - 1)"
            >
              <svg lucideChevronLeft [size]="15" aria-hidden="true"></svg>
              <span>Précédent</span>
            </button>
            <button
              type="button"
              class="pg-btn"
              [disabled]="last() || page() + 1 >= totalPages() || disabled()"
              (click)="pageChange.emit(page() + 1)"
            >
              <span>Suivant</span>
              <svg lucideChevronRight [size]="15" aria-hidden="true"></svg>
            </button>
          </div>
        }
      </nav>
    }
  `,
  styles: `
    .pagination-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding-top: var(--space-4);
      margin-top: var(--space-4);
      border-top: 1px solid var(--border-subtle);
    }

    .pagination-bar__info {
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--ink-secondary);
      margin: 0;
    }

    .pagination-bar__actions {
      display: inline-flex;
      gap: var(--space-2);
    }

    .pg-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.85rem;
      border-radius: var(--radius-pill);
      border: 1px solid var(--border-strong);
      background-color: var(--surface-elevated);
      color: var(--ink-primary);
      font-family: var(--font-sans);
      font-size: var(--text-xs);
      font-weight: 700;
      cursor: pointer;
    }

    .pg-btn:hover:not(:disabled) {
      border-color: var(--brand-primary);
      color: var(--brand-primary);
    }

    .pg-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  `,
})
export class UiPaginationComponent {
  protected readonly Math = Math;

  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly last = input<boolean>(false);
  readonly disabled = input<boolean>(false);

  readonly pageChange = output<number>();
}
