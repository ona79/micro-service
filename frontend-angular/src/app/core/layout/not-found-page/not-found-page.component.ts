import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiEmptyStateComponent } from '../../../shared/components/ui-empty-state/ui-empty-state.component';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiEmptyStateComponent],
  template: `
    <div class="page-section">
      <div class="container">
        <app-ui-empty-state
          title="Page introuvable (404)"
          description="La page que vous recherchez n'existe pas ou a été déplacée."
          actionLabel="Retourner à l'accueil"
          actionTo="/"
        />
      </div>
    </div>
  `,
})
export class NotFoundPageComponent {}
