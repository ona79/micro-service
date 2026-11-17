import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCalendar,
  LucideLandmark,
  LucideMapPin,
  LucideRoute,
  LucideSearch,
  LucideUsers,
} from '@lucide/angular';
import { APP_SITE_CONFIG } from '../../../../core/config/site.config';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiPatrimoineImageComponent } from '../../../../shared/components/ui-patrimoine-image/ui-patrimoine-image.component';
import { UiSkeletonGridComponent } from '../../../../shared/components/ui-skeleton-grid/ui-skeleton-grid.component';
import { isLieuDeMemoire } from '../../../../shared/utils/patrimoine.utils';
import { CircuitStore } from '../../../circuits/data-access/circuit.store';
import { EvenementStore } from '../../../evenements/data-access/evenement.store';
import { PatrimoineStore } from '../../../patrimoines/data-access/patrimoine.store';

@Component({
  selector: 'app-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    LucideArrowRight,
    LucideCalendar,
    LucideLandmark,
    LucideMapPin,
    LucideRoute,
    LucideSearch,
    LucideUsers,
    UiPatrimoineImageComponent,
    UiSkeletonGridComponent,
    UiErrorBannerComponent,
    UiEmptyStateComponent,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent implements OnInit {
  protected readonly config = inject(APP_SITE_CONFIG);
  protected readonly patrimoineStore = inject(PatrimoineStore);
  protected readonly circuitStore = inject(CircuitStore);
  protected readonly evenementStore = inject(EvenementStore);
  private readonly router = inject(Router);

  protected searchQuery = '';
  protected readonly heroImageMissing = signal(false);

  protected readonly featuredLead = computed(() => this.patrimoineStore.items()[0] ?? null);
  protected readonly featuredSecondary = computed(() =>
    this.patrimoineStore.items().slice(1, 3)
  );
  protected readonly isLeadMemorial = computed(() => isLieuDeMemoire(this.featuredLead()));

  ngOnInit(): void {
    void this.patrimoineStore.ensureLoaded();
    void this.circuitStore.ensureLoaded();
    void this.evenementStore.ensureLoaded();
  }

  protected isMemorial(pat: Parameters<typeof isLieuDeMemoire>[0]): boolean {
    return isLieuDeMemoire(pat);
  }

  protected onSearchSubmit(): void {
    const q = this.searchQuery.trim();
    if (q) {
      void this.router.navigate(['/patrimoines'], { queryParams: { q } });
    } else {
      void this.router.navigate(['/patrimoines']);
    }
  }

  protected retryLoad(): void {
    void this.patrimoineStore.reload();
  }
}
