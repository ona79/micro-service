import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BreadcrumbItem, UiBreadcrumbComponent } from '../ui-breadcrumb/ui-breadcrumb.component';

@Component({
  selector: 'app-ui-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiBreadcrumbComponent],
  template: `
    <header class="ui-page-header">
      @if (breadcrumbs().length > 0) {
        <app-ui-breadcrumb [items]="breadcrumbs()" />
      }
      <div class="ui-page-header__row">
        <div class="ui-page-header__titles">
          <h1 class="ui-page-header__title">{{ title() }}</h1>
          @if (subtitle()) {
            <span class="ui-page-header__info" [attr.title]="subtitle()" [attr.aria-label]="subtitle()">ⓘ</span>
          }
        </div>
        <div class="ui-page-header__actions">
          <ng-content select="[header-actions]"></ng-content>
        </div>
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
      max-width: 100%;
    }

    .ui-page-header {
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 4px);
      margin-bottom: var(--space-3, 12px);
    }

    .ui-page-header__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3, 12px);
      min-height: 40px;
    }

    .ui-page-header__titles {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
      min-width: 0;
      flex: 1 1 220px;
    }

    .ui-page-header__title {
      font-size: 21px;
      font-weight: 600;
      line-height: 1.2;
      margin: 0;
      color: var(--ink-primary, #1c1b18);
    }

    .ui-page-header__info {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      font-size: 12px;
      color: var(--ink-muted, #666055);
      cursor: help;
      flex-shrink: 0;
    }

    .ui-page-header__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2, 8px);
    }

    .ui-page-header__actions:empty {
      display: none;
    }
  `,
})
export class UiPageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly eyebrow = input<string | null>(null);
  readonly breadcrumbs = input<BreadcrumbItem[]>([]);
}
