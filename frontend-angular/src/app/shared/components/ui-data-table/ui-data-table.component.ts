import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { LucideArrowDown, LucideArrowUp, LucideMoreHorizontal } from '@lucide/angular';
import { UiEmptyStateComponent } from '../ui-empty-state/ui-empty-state.component';
import { UiLoadingStateComponent } from '../ui-loading-state/ui-loading-state.component';
import { UiPaginationComponent } from '../ui-pagination/ui-pagination.component';

export interface UiTableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => string;
}

export interface UiTableRowAction<T = Record<string, unknown>> {
  id: string;
  label: string;
  tone?: 'default' | 'danger';
  visible?: (row: T) => boolean;
}

@Component({
  selector: 'app-ui-data-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideArrowUp,
    LucideArrowDown,
    LucideMoreHorizontal,
    UiEmptyStateComponent,
    UiLoadingStateComponent,
    UiPaginationComponent,
  ],
  template: `
    <div class="ui-dt">
      @if (loading()) {
        <app-ui-loading-state [message]="loadingMessage()" />
      } @else if (rows().length === 0) {
        <app-ui-empty-state [title]="emptyTitle()" [description]="emptyDescription()" />
      } @else {
        <!-- Vue Tableau Desktop / Tablette -->
        <div class="ui-dt__wrap">
          <table class="ui-dt__table">
            <thead>
              <tr>
                @if (selectable()) {
                  <th class="ui-dt__check-col">
                    <input
                      type="checkbox"
                      aria-label="Tout sélectionner"
                      [checked]="allSelected()"
                      (change)="toggleAll($any($event.target).checked)"
                    />
                  </th>
                }
                @for (col of columns(); track col.key) {
                  <th
                    [style.text-align]="col.align || 'left'"
                    [class.ui-dt__th--sortable]="col.sortable"
                    (click)="col.sortable ? onSort(col.key) : null"
                  >
                    <span class="ui-dt__th-inner">
                      <span>{{ col.label }}</span>
                      @if (col.sortable && sortKey() === col.key) {
                        @if (sortDir() === 'asc') {
                          <svg lucideArrowUp [size]="12" aria-hidden="true"></svg>
                        } @else {
                          <svg lucideArrowDown [size]="12" aria-hidden="true"></svg>
                        }
                      }
                    </span>
                  </th>
                }
                @if (primaryActionLabel() || menuActions().length > 0) {
                  <th class="ui-dt__actions-col">Actions</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track trackRow($index, row)) {
                <tr>
                  @if (selectable()) {
                    <td class="ui-dt__check-col">
                      <input
                        type="checkbox"
                        [attr.aria-label]="'Sélectionner la ligne ' + ($index + 1)"
                        [checked]="isRowSelected(row)"
                        (change)="toggleRow(row, $any($event.target).checked)"
                      />
                    </td>
                  }
                  @for (col of columns(); track col.key) {
                    <td [style.text-align]="col.align || 'left'">
                      {{ getCellValue(row, col) }}
                    </td>
                  }
                  @if (primaryActionLabel() || menuActions().length > 0) {
                    <td class="ui-dt__actions-cell">
                      @if (primaryActionLabel()) {
                        <button
                          type="button"
                          class="ui-dt__primary-btn"
                          (click)="rowAction.emit({ action: 'primary', row })"
                        >
                          {{ primaryActionLabel() }}
                        </button>
                      }
                      @if (visibleMenuActions(row).length > 0) {
                        <div class="ui-dt__menu-wrap">
                          <button
                            type="button"
                            class="ui-dt__more-btn"
                            aria-label="Plus d'actions"
                            (click)="toggleMenu($index)"
                          >
                            <svg lucideMoreHorizontal [size]="15" aria-hidden="true"></svg>
                          </button>
                          @if (openMenuIndex() === $index) {
                            <div class="ui-dt__menu" role="menu">
                              @for (act of visibleMenuActions(row); track act.id) {
                                <button
                                  type="button"
                                  role="menuitem"
                                  class="ui-dt__menu-item"
                                  [class.ui-dt__menu-item--danger]="act.tone === 'danger'"
                                  (click)="triggerMenuAction(act.id, row)"
                                >
                                  {{ act.label }}
                                </button>
                              }
                            </div>
                          }
                        </div>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Vue Cartes empilées Mobile (< 640px) -->
        <div class="ui-dt__cards">
          @for (row of rows(); track trackRow($index, row)) {
            <article class="ui-dt__card">
              @for (col of columns(); track col.key) {
                <div class="ui-dt__card-row">
                  <span class="ui-dt__card-label">{{ col.label }}</span>
                  <span class="ui-dt__card-val">{{ getCellValue(row, col) }}</span>
                </div>
              }
              @if (primaryActionLabel() || visibleMenuActions(row).length > 0) {
                <div class="ui-dt__card-actions">
                  @if (primaryActionLabel()) {
                    <button
                      type="button"
                      class="ui-dt__primary-btn"
                      (click)="rowAction.emit({ action: 'primary', row })"
                    >
                      {{ primaryActionLabel() }}
                    </button>
                  }
                  @for (act of visibleMenuActions(row); track act.id) {
                    <button
                      type="button"
                      class="ui-dt__secondary-btn"
                      [class.ui-dt__menu-item--danger]="act.tone === 'danger'"
                      (click)="triggerMenuAction(act.id, row)"
                    >
                      {{ act.label }}
                    </button>
                  }
                </div>
              }
            </article>
          }
        </div>

        <!-- Pied : Affichage x–y sur N + pagination serveur -->
        <footer class="ui-dt__footer">
          <span class="ui-dt__range tabular-nums">{{ rangeLabel() }}</span>
          @if (totalPages() > 1) {
            <app-ui-pagination
              [page]="page()"
              [totalPages]="totalPages()"
              [totalElements]="totalElements()"
              [last]="page() + 1 >= totalPages()"
              (pageChange)="pageChange.emit($event)"
            />
          }
        </footer>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      max-width: 100%;
    }

    .ui-dt {
      display: flex;
      flex-direction: column;
      gap: var(--space-3, 12px);
      max-width: 100%;
    }

    .ui-dt__wrap {
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      border: 1px solid var(--border-subtle, #e5dfd3);
      border-radius: var(--radius-md, 12px);
      background-color: var(--surface-elevated, #ffffff);
      box-shadow: var(--shadow-xs);
    }

    .ui-dt__table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm, 0.875rem);
      min-width: 620px;
    }

    .ui-dt__table th {
      position: sticky;
      top: 0;
      z-index: 2;
      height: var(--table-row-height, 42px);
      padding: 0 var(--space-3, 12px);
      background-color: var(--surface-subtle, #f5f2eb);
      color: var(--ink-secondary, #4a463f);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid var(--border-default, #d6cfc2);
      white-space: nowrap;
    }

    .ui-dt__th--sortable {
      cursor: pointer;
      user-select: none;
    }

    .ui-dt__th--sortable:hover {
      color: var(--ink-primary, #1c1b18);
    }

    .ui-dt__th-inner {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .ui-dt__table td {
      height: var(--table-row-height, 42px);
      padding: var(--space-1, 4px) var(--space-3, 12px);
      border-bottom: 1px solid var(--border-subtle, #e5dfd3);
      color: var(--ink-primary, #1c1b18);
      vertical-align: middle;
    }

    .ui-dt__table tbody tr:last-child td {
      border-bottom: none;
    }

    .ui-dt__table tbody tr:hover {
      background-color: var(--surface-hover, #efe9dc);
    }

    .ui-dt__check-col {
      width: 38px;
      text-align: center;
    }

    .ui-dt__actions-col {
      text-align: right;
      width: 1%;
    }

    .ui-dt__actions-cell {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-1, 4px);
      white-space: nowrap;
    }

    .ui-dt__primary-btn,
    .ui-dt__secondary-btn {
      height: 30px;
      padding: 0 var(--space-2, 8px);
      border-radius: var(--radius-sm, 8px);
      border: 1px solid var(--border-default, #d6cfc2);
      background-color: var(--surface-elevated, #ffffff);
      color: var(--brand-primary, #245b45);
      font-family: var(--font-sans);
      font-size: var(--text-xs, 0.75rem);
      font-weight: 700;
      cursor: pointer;
    }

    .ui-dt__primary-btn:hover,
    .ui-dt__secondary-btn:hover {
      background-color: var(--brand-soft, #e4efe9);
      border-color: var(--brand-primary, #245b45);
    }

    .ui-dt__menu-wrap {
      position: relative;
    }

    .ui-dt__more-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: var(--radius-sm, 8px);
      border: 1px solid var(--border-default, #d6cfc2);
      background-color: var(--surface-elevated, #ffffff);
      color: var(--ink-secondary, #4a463f);
      cursor: pointer;
    }

    .ui-dt__more-btn:hover {
      background-color: var(--surface-hover, #efe9dc);
    }

    .ui-dt__menu {
      position: absolute;
      right: 0;
      top: calc(100% + 4px);
      z-index: var(--z-dropdown, 60);
      min-width: 150px;
      padding: 4px;
      border-radius: var(--radius-sm, 8px);
      border: 1px solid var(--border-default, #d6cfc2);
      background-color: var(--surface-elevated, #ffffff);
      box-shadow: var(--shadow-md);
      display: flex;
      flex-direction: column;
    }

    .ui-dt__menu-item {
      text-align: left;
      padding: 6px 10px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--ink-primary, #1c1b18);
      font-family: var(--font-sans);
      font-size: var(--text-xs, 0.75rem);
      font-weight: 600;
      cursor: pointer;
    }

    .ui-dt__menu-item:hover {
      background-color: var(--surface-hover, #efe9dc);
    }

    .ui-dt__menu-item--danger {
      color: var(--status-error-ink, #921f18);
    }

    .ui-dt__cards {
      display: none;
    }

    .ui-dt__footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2, 8px);
    }

    .ui-dt__range {
      font-size: var(--text-xs, 0.75rem);
      color: var(--ink-muted, #666055);
      font-weight: 600;
    }

    @media (max-width: 640px) {
      .ui-dt__wrap {
        display: none;
      }

      .ui-dt__cards {
        display: flex;
        flex-direction: column;
        gap: var(--space-3, 12px);
      }

      .ui-dt__card {
        background-color: var(--surface-elevated, #ffffff);
        border: 1px solid var(--border-subtle, #e5dfd3);
        border-radius: var(--radius-md, 12px);
        padding: var(--space-3, 12px);
        display: flex;
        flex-direction: column;
        gap: var(--space-2, 8px);
      }

      .ui-dt__card-row {
        display: flex;
        justify-content: space-between;
        gap: var(--space-2, 8px);
        font-size: var(--text-sm, 0.875rem);
      }

      .ui-dt__card-label {
        color: var(--ink-muted, #666055);
        font-size: var(--text-xs, 0.75rem);
        font-weight: 700;
      }

      .ui-dt__card-val {
        color: var(--ink-primary, #1c1b18);
        font-weight: 600;
        text-align: right;
      }

      .ui-dt__card-actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2, 8px);
        padding-top: var(--space-2, 8px);
        border-top: 1px solid var(--border-subtle, #e5dfd3);
      }

      .ui-dt__primary-btn,
      .ui-dt__secondary-btn {
        height: 44px;
        padding: 0 var(--space-3, 12px);
      }
    }
  `,
})
export class UiDataTableComponent<T = Record<string, unknown>> {
  readonly columns = input.required<UiTableColumn<T>[]>();
  readonly rows = input.required<T[]>();
  readonly loading = input<boolean>(false);
  readonly loadingMessage = input<string>('Chargement des données...');
  readonly emptyTitle = input<string>('Aucun résultat');
  readonly emptyDescription = input<string>('Aucun élément ne correspond aux critères.');
  readonly selectable = input<boolean>(false);
  readonly primaryActionLabel = input<string | null>(null);
  readonly menuActions = input<UiTableRowAction<T>[]>([]);
  readonly page = input<number>(0);
  readonly pageSize = input<number>(12);
  readonly totalElements = input<number>(0);
  readonly totalPages = input<number>(1);
  readonly sortKey = input<string>('');
  readonly sortDir = input<'asc' | 'desc'>('asc');

  readonly sortChange = output<{ key: string; dir: 'asc' | 'desc' }>();
  readonly pageChange = output<number>();
  readonly selectionChange = output<T[]>();
  readonly rowAction = output<{ action: string; row: T }>();

  protected readonly openMenuIndex = signal<number | null>(null);
  protected readonly selectedRows = signal<T[]>([]);

  protected readonly allSelected = computed(
    () => this.rows().length > 0 && this.selectedRows().length === this.rows().length
  );

  protected readonly rangeLabel = computed(() => {
    const total = this.totalElements() || this.rows().length;
    if (total === 0) return 'Affichage 0 sur 0';
    const start = this.page() * this.pageSize() + 1;
    const end = Math.min(start + this.rows().length - 1, total);
    return `Affichage ${start}–${end} sur ${total}`;
  });

  protected trackRow(index: number, row: T): unknown {
    const rec = row as Record<string, unknown>;
    return rec['id'] ?? index;
  }

  protected getCellValue(row: T, col: UiTableColumn<T>): string {
    if (col.render) return col.render(row);
    const rec = row as Record<string, unknown>;
    const val = rec[col.key];
    return val === null || val === undefined ? '—' : String(val);
  }

  protected visibleMenuActions(row: T): UiTableRowAction<T>[] {
    return this.menuActions().filter((a) => (a.visible ? a.visible(row) : true));
  }

  protected onSort(key: string): void {
    const nextDir = this.sortKey() === key && this.sortDir() === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ key, dir: nextDir });
  }

  protected toggleMenu(index: number): void {
    this.openMenuIndex.set(this.openMenuIndex() === index ? null : index);
  }

  protected triggerMenuAction(action: string, row: T): void {
    this.openMenuIndex.set(null);
    this.rowAction.emit({ action, row });
  }

  protected isRowSelected(row: T): boolean {
    return this.selectedRows().includes(row);
  }

  protected toggleAll(checked: boolean): void {
    const next = checked ? [...this.rows()] : [];
    this.selectedRows.set(next);
    this.selectionChange.emit(next);
  }

  protected toggleRow(row: T, checked: boolean): void {
    const current = this.selectedRows();
    const next = checked ? [...current, row] : current.filter((r) => r !== row);
    this.selectedRows.set(next);
    this.selectionChange.emit(next);
  }
}
