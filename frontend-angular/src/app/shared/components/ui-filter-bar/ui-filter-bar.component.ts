import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideRotateCcw, LucideSearch, LucideSlidersHorizontal, LucideX } from '@lucide/angular';

export interface FilterStatusPill {
  id: string;
  label: string;
  count?: number;
  tone?: 'default' | 'danger' | 'warning' | 'success';
}

export interface ActiveFilterChip {
  key: string;
  label: string;
}

@Component({
  selector: 'app-ui-filter-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    CdkTrapFocus,
    LucideSearch,
    LucideSlidersHorizontal,
    LucideRotateCcw,
    LucideX,
  ],
  template: `
    <div class="ufb-sticky">
      @if (statusPills().length > 0) {
        <div class="ufb-status-row" role="tablist" [attr.aria-label]="statusAriaLabel()">
          @for (pill of statusPills(); track pill.id) {
            <button
              type="button"
              role="tab"
              class="ufb-status-pill"
              [class.ufb-status-pill--active]="activeStatus() === pill.id"
              [class.ufb-status-pill--danger]="pill.tone === 'danger' && (pill.count ?? 0) > 0"
              [attr.aria-selected]="activeStatus() === pill.id"
              (click)="statusChange.emit(pill.id)"
            >
              <span>{{ pill.label }}</span>
              @if (pill.count !== undefined) {
                <span class="ufb-status-count">{{ pill.count }}</span>
              }
            </button>
          }
        </div>
      }

      <div class="ufb-bar">
        @if (showSearch()) {
          <div class="ufb-search-wrap">
            <svg lucideSearch [size]="15" class="ufb-search-icon" aria-hidden="true"></svg>
            <input
              type="search"
              class="ufb-input ufb-input--search"
              [ngModel]="searchValue()"
              (ngModelChange)="onSearchInput($event)"
              [placeholder]="searchPlaceholder()"
              [attr.aria-label]="searchAriaLabel() || searchPlaceholder()"
            />
          </div>
        }

        <div class="ufb-primary">
          <ng-content select="[filter-primary]" />
        </div>

        @if (hasSecondaryFilters()) {
          <div class="ufb-secondary-anchor">
            <button
              type="button"
              class="ufb-btn-filters"
              [class.ufb-btn-filters--active]="panelOpen() || secondaryActiveCount() > 0"
              [attr.aria-expanded]="panelOpen()"
              (click)="panelOpen.set(!panelOpen())"
            >
              <svg lucideSlidersHorizontal [size]="14" aria-hidden="true"></svg>
              <span>Filtres</span>
              @if (secondaryActiveCount() > 0) {
                <span class="ufb-badge">{{ secondaryActiveCount() }}</span>
              }
            </button>

            @if (panelOpen()) {
              <div class="ufb-backdrop" (click)="panelOpen.set(false)" aria-hidden="true"></div>
              <div
                class="ufb-popover"
                role="dialog"
                aria-modal="true"
                aria-label="Filtres secondaires"
                cdkTrapFocus
                [cdkTrapFocusAutoCapture]="true"
              >
                <div class="ufb-popover__head">
                  <strong>Filtres avancés</strong>
                  <button
                    type="button"
                    class="ufb-popover__close"
                    aria-label="Fermer le panneau de filtres"
                    (click)="panelOpen.set(false)"
                  >
                    <svg lucideX [size]="15" aria-hidden="true"></svg>
                  </button>
                </div>
                <div class="ufb-popover__body">
                  <ng-content select="[filter-secondary]" />
                </div>
              </div>
            }
          </div>
        }

        <div class="ufb-right">
          @if (resultsLabel()) {
            <span class="ufb-count tabular-nums">{{ resultsLabel() }}</span>
          }
          <ng-content select="[filter-sort]" />
          @if (hasActiveFilters() || activeChips().length > 0) {
            <button
              type="button"
              class="ufb-btn-reset"
              (click)="reset.emit()"
              title="Réinitialiser tous les filtres"
            >
              <svg lucideRotateCcw [size]="13" aria-hidden="true"></svg>
              <span>Réinitialiser</span>
            </button>
          }
        </div>
      </div>

      <ng-content select="[filter-subrow]" />

      @if (activeChips().length > 0) {
        <div class="ufb-chips" aria-label="Filtres actifs">
          @for (chip of activeChips(); track chip.key) {
            <button
              type="button"
              class="ufb-chip"
              (click)="removeChip.emit(chip.key)"
              [title]="'Retirer ' + chip.label"
            >
              <span>{{ chip.label }}</span>
              <svg lucideX [size]="12" aria-hidden="true"></svg>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 25;
      background-color: var(--surface-canvas);
      padding: 8px 0;
      margin-bottom: 12px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .ufb-sticky {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .ufb-status-row {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      padding-bottom: 2px;
    }

    .ufb-status-row::-webkit-scrollbar {
      display: none;
    }

    .ufb-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      padding: 0 10px;
      border-radius: 999px;
      border: 1px solid var(--border-strong);
      background-color: var(--surface-elevated);
      color: var(--ink-secondary);
      font-family: var(--font-sans);
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      flex-shrink: 0;
      transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
    }

    .ufb-status-pill:hover {
      border-color: var(--brand-primary);
      color: var(--ink-primary);
    }

    .ufb-status-pill--active {
      background-color: var(--brand-primary);
      border-color: var(--brand-primary);
      color: #ffffff;
    }

    .ufb-status-pill--active:hover {
      color: #ffffff;
    }

    .ufb-status-pill--danger {
      border-color: rgba(166, 44, 44, 0.35);
      color: var(--danger);
    }

    .ufb-status-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      background-color: rgba(0, 0, 0, 0.08);
      font-size: 11px;
      font-weight: 700;
    }

    .ufb-status-pill--active .ufb-status-count {
      background-color: rgba(255, 255, 255, 0.22);
      color: #ffffff;
    }

    .ufb-bar {
      display: flex;
      align-items: center;
      flex-wrap: nowrap;
      gap: 8px;
      min-height: 36px;
    }

    .ufb-search-wrap {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1 1 200px;
      min-width: 140px;
    }

    .ufb-search-icon {
      position: absolute;
      left: 11px;
      color: var(--ink-muted);
      pointer-events: none;
    }

    .ufb-input {
      width: 100%;
      height: 36px;
      padding: 0 12px 0 34px;
      border-radius: 8px;
      border: 1px solid var(--border-strong);
      background-color: var(--surface-elevated);
      font-family: var(--font-sans);
      font-size: 13px;
      color: var(--ink-primary);
    }

    .ufb-input:focus {
      outline: 2px solid var(--brand-primary);
      outline-offset: 1px;
    }

    .ufb-primary {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
    }

    .ufb-secondary-anchor {
      position: relative;
      flex-shrink: 0;
    }

    .ufb-btn-filters {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 12px;
      border-radius: 8px;
      border: 1px solid var(--border-strong);
      background-color: var(--surface-elevated);
      color: var(--ink-primary);
      font-family: var(--font-sans);
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
    }

    .ufb-btn-filters--active {
      border-color: var(--brand-primary);
      background-color: var(--brand-soft);
      color: var(--brand-primary);
    }

    .ufb-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      background-color: var(--brand-primary);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
    }

    .ufb-backdrop {
      display: none;
    }

    .ufb-popover {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: 60;
      width: 300px;
      max-width: calc(100vw - 32px);
      padding: 14px;
      border-radius: 12px;
      border: 1px solid var(--border-subtle);
      background-color: var(--surface-elevated);
      box-shadow: var(--shadow-lg);
    }

    .ufb-popover__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 13px;
      color: var(--ink-primary);
    }

    .ufb-popover__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--ink-muted);
      cursor: pointer;
    }

    .ufb-popover__close:hover {
      background-color: var(--surface-canvas);
      color: var(--ink-primary);
    }

    .ufb-popover__body {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .ufb-right {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
      flex-shrink: 0;
    }

    .ufb-count {
      font-size: 13px;
      font-weight: 600;
      color: var(--ink-secondary);
      white-space: nowrap;
    }

    .ufb-btn-reset {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 36px;
      padding: 0 10px;
      border-radius: 8px;
      border: 1px solid var(--border-strong);
      background-color: var(--surface-elevated);
      color: var(--ink-secondary);
      font-family: var(--font-sans);
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
    }

    .ufb-btn-reset:hover {
      color: var(--danger);
      border-color: rgba(166, 44, 44, 0.35);
    }

    .ufb-chips {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }

    .ufb-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 24px;
      padding: 0 8px;
      border-radius: 999px;
      border: 1px solid rgba(36, 91, 70, 0.25);
      background-color: var(--brand-soft);
      color: var(--brand-primary);
      font-family: var(--font-sans);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    @media (max-width: 960px) {
      .ufb-bar {
        flex-wrap: wrap;
      }

      .ufb-search-wrap {
        flex: 1 1 100%;
      }

      .ufb-primary {
        flex-wrap: wrap;
      }
    }

    @media (max-width: 639px) {
      .ufb-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 90;
        background-color: rgba(20, 26, 23, 0.45);
      }

      .ufb-popover {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        top: auto;
        width: 100%;
        max-width: 100%;
        border-radius: 16px 16px 0 0;
        padding: 16px 18px 24px;
        z-index: 100;
      }
    }
  `,
})
export class UiFilterBarComponent implements OnDestroy {
  readonly showSearch = input(true);
  readonly searchValue = input('');
  readonly searchPlaceholder = input('Rechercher...');
  readonly searchAriaLabel = input('');
  readonly hasSecondaryFilters = input(false);
  readonly secondaryActiveCount = input(0);
  readonly resultsLabel = input('');
  readonly hasActiveFilters = input(false);
  readonly activeChips = input<ActiveFilterChip[]>([]);
  readonly statusPills = input<FilterStatusPill[]>([]);
  readonly activeStatus = input('');
  readonly statusAriaLabel = input('Filtrer par statut');

  readonly searchChange = output<string>();
  readonly statusChange = output<string>();
  readonly removeChip = output<string>();
  readonly reset = output<void>();

  protected readonly panelOpen = signal(false);
  private debounceTimer?: ReturnType<typeof setTimeout>;

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.panelOpen()) {
      this.panelOpen.set(false);
    }
  }

  protected onSearchInput(val: string): void {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.searchChange.emit(val);
    }, 300);
  }

  ngOnDestroy(): void {
    clearTimeout(this.debounceTimer);
  }
}
