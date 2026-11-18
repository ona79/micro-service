import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideClock,
  LucideRoute,
  LucideSearch,
  LucideTicket,
  LucideUsers,
} from '@lucide/angular';
import { Circuit, Difficulte } from '../../../../core/models/circuit.model';
import { Patrimoine } from '../../../../core/models/patrimoine.model';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiPatrimoineImageComponent } from '../../../../shared/components/ui-patrimoine-image/ui-patrimoine-image.component';
import { UiSkeletonGridComponent } from '../../../../shared/components/ui-skeleton-grid/ui-skeleton-grid.component';
import { DifficulteLabelPipe } from '../../../../shared/pipes/difficulte-label.pipe';
import { DurationMinutesPipe } from '../../../../shared/pipes/duration-minutes.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { sortEtapes } from '../../../../shared/utils/patrimoine.utils';
import { PatrimoineStore } from '../../../patrimoines/data-access/patrimoine.store';
import { CircuitStore } from '../../data-access/circuit.store';

@Component({
  selector: 'app-circuits-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    LucideArrowRight,
    LucideClock,
    LucideRoute,
    LucideSearch,
    LucideTicket,
    LucideUsers,
    UiPatrimoineImageComponent,
    UiSkeletonGridComponent,
    UiErrorBannerComponent,
    UiEmptyStateComponent,
    DifficulteLabelPipe,
    DurationMinutesPipe,
    FcfaPricePipe,
  ],
  templateUrl: './circuits-list-page.component.html',
  styleUrl: './circuits-list-page.component.css',
})
export class CircuitsListPageComponent implements OnInit {
  protected readonly store = inject(CircuitStore);
  protected readonly patrimoineStore = inject(PatrimoineStore);

  protected readonly search = signal('');
  protected readonly difficulte = signal<'' | Difficulte>('');
  protected readonly dureeMax = signal('');
  protected readonly distanceMax = signal('');

  protected readonly filteredCircuits = computed(() => {
    const q = this.search().trim().toLowerCase();
    const diff = this.difficulte();
    const maxDuree = this.dureeMax().trim() !== '' ? Number(this.dureeMax()) : null;
    const maxDist = this.distanceMax().trim() !== '' ? Number(this.distanceMax()) : null;

    return this.store.items().filter((c) => {
      if (q) {
        const text = `${c.nomCircuit ?? ''} ${c.descriptionCircuit ?? ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      if (diff && c.difficulte !== diff) return false;
      if (maxDuree !== null && !Number.isNaN(maxDuree) && (c.dureeEstimee ?? 0) > maxDuree) {
        return false;
      }
      if (maxDist !== null && !Number.isNaN(maxDist) && (c.distanceTotale ?? 0) > maxDist) {
        return false;
      }
      return true;
    });
  });

  ngOnInit(): void {
    void this.store.ensureLoaded();
    void this.patrimoineStore.ensureLoaded();
  }

  protected resetFilters(): void {
    this.search.set('');
    this.difficulte.set('');
    this.dureeMax.set('');
    this.distanceMax.set('');
  }

  protected getOrderedStops(circuit: Circuit) {
    return sortEtapes(circuit.etapes);
  }

  protected getFirstPatrimoine(circuit: Circuit): Patrimoine | null {
    const first = sortEtapes(circuit.etapes)[0];
    if (!first) return null;
    return first.patrimoine ?? this.patrimoineStore.byIdMap().get(first.patrimoineId) ?? null;
  }

  protected getStopLabel(patrimoineId: number, patrimoine: Patrimoine | null): string {
    const resolved = patrimoine ?? this.patrimoineStore.byIdMap().get(patrimoineId);
    return resolved?.nomPatrimoine ?? `Site #${patrimoineId}`;
  }
}
