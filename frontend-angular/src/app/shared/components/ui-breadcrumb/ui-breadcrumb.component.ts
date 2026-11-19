import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideChevronRight } from '@lucide/angular';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

@Component({
  selector: 'app-ui-breadcrumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucideChevronRight],
  template: `
    @if (items().length > 0) {
      <nav class="breadcrumb" aria-label="Fil d'Ariane">
        <ol class="breadcrumb__list">
          @for (item of items(); track $index) {
            <li class="breadcrumb__item">
              @if (item.to && !$last) {
                <a [routerLink]="item.to" class="breadcrumb__link">{{ item.label }}</a>
              } @else {
                <span class="breadcrumb__current" aria-current="page">{{ item.label }}</span>
              }
              @if (!$last) {
                <svg
                  lucideChevronRight
                  [size]="14"
                  class="breadcrumb__sep"
                  aria-hidden="true"
                ></svg>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
  styles: `
    .breadcrumb {
      margin-bottom: var(--space-5);
      padding: var(--space-2) 0;
    }

    .breadcrumb__list {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
    }

    .breadcrumb__item {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
    }

    .breadcrumb__link {
      color: var(--brand-primary);
      font-weight: 600;
    }

    .breadcrumb__link:hover {
      text-decoration: underline;
    }

    .breadcrumb__sep {
      color: var(--ink-muted);
      flex-shrink: 0;
    }

    .breadcrumb__current {
      color: var(--ink-secondary);
      font-weight: 500;
    }

    @media (max-width: 640px) {
      .breadcrumb {
        margin-bottom: var(--space-3, 12px);
      }

      .breadcrumb__item:not(:last-child) {
        display: none;
      }
    }
  `,
})
export class UiBreadcrumbComponent {
  readonly items = input<readonly BreadcrumbItem[]>([]);
}
