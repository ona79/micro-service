import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideClock,
  LucideRoute,
  LucideSearch,
  LucideStar,
  LucideTicket,
  LucideUsers,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import { AvisResume } from '../../../../core/models/avis.model';
import {
  Circuit,
  Difficulte,
  MoyenTransport,
} from '../../../../core/models/circuit.model';
import { Patrimoine, ZoneCasamance } from '../../../../core/models/patrimoine.model';
import { SeoService } from '../../../../core/services/seo.service';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiPatrimoineImageComponent } from '../../../../shared/components/ui-patrimoine-image/ui-patrimoine-image.component';
import { UiSkeletonGridComponent } from '../../../../shared/components/ui-skeleton-grid/ui-skeleton-grid.component';
import { DifficulteLabelPipe } from '../../../../shared/pipes/difficulte-label.pipe';
import { DurationMinutesPipe } from '../../../../shared/pipes/duration-minutes.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { sortEtapes } from '../../../../shared/utils/patrimoine.utils';
import { AvisApiService } from '../../../avis/data-access/avis-api.service';
import { PatrimoineStore } from '../../../patrimoines/data-access/patrimoine.store';
import { CircuitApiService } from '../../data-access/circuit-api.service';

type CircuitSortOption = 'nom_asc' | 'prix_asc' | 'duree_asc' | 'distance_asc';

@Component({
  selector: 'app-circuits-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    LucideSearch,
    LucideClock,
    LucideRoute,
    LucideStar,
    LucideUsers,
    LucideArrowRight,
    LucideTicket,
    UiPatrimoineImageComponent,
    UiSkeletonGridComponent,
    UiErrorBannerComponent,
    UiEmptyStateComponent,
    DurationMinutesPipe,
    DifficulteLabelPipe,
    FcfaPricePipe,
  ],
  templateUrl: './circuits-list-page.component.html',
  styleUrl: './circuits-list-page.component.css',
})
export class CircuitsListPageComponent implements OnInit {
  private readonly api = inject(CircuitApiService);
  private readonly avisApi = inject(AvisApiService);
  private readonly patrimoineStore = inject(PatrimoineStore);
  private readonly seo = inject(SeoService);

  protected readonly search = signal('');
  protected readonly difficulte = signal<Difficulte | ''>('');
  protected readonly moyenTransport = signal<MoyenTransport | ''>('');
  protected readonly zone = signal<ZoneCasamance | ''>('');
  protected readonly dureeMax = signal<number | null>(null);
  protected readonly distanceMax = signal<number | null>(null);
  protected readonly sortBy = signal<CircuitSortOption>('nom_asc');
  protected readonly currentPage = signal(1);
  protected readonly pageSize = 8;

  protected readonly items = signal<Circuit[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly avisResumes = signal<Map<number, AvisResume>>(new Map());

  private loadSeq = 0;
  private filterTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly publishedCircuits = computed(() =>
    this.items().filter((c) => !c.statutCircuit || c.statutCircuit === 'PUBLIE')
  );

  protected readonly hasActiveFilters = computed(
    () =>
      Boolean(this.search().trim()) ||
      Boolean(this.difficulte()) ||
      Boolean(this.moyenTransport()) ||
      Boolean(this.zone()) ||
      (this.dureeMax() !== null && this.dureeMax()! > 0) ||
      (this.distanceMax() !== null && this.distanceMax()! > 0) ||
      this.sortBy() !== 'nom_asc'
  );

  ngOnInit(): void {
    this.seo.update({
      title: 'Circuits Touristiques',
      description:
        'Circuits culturels et excursions fluviales en Casamance : filtrage par zone, difficulté, transport, durée et estimation orthodromique.',
      canonicalPath: '/circuits',
    });
    void this.patrimoineStore.ensureLoaded();
    void this.loadPage();
  }

  protected onSearchChange(val: string): void {
    this.search.set(val);
    this.currentPage.set(1);
    this.scheduleLoad();
  }

  protected onFilterImmediate(): void {
    this.currentPage.set(1);
    void this.loadPage();
  }

  protected onNumericFilterChange(): void {
    this.currentPage.set(1);
    this.scheduleLoad();
  }

  protected goToPage(page: number): void {
    const clamped = Math.max(1, Math.min(this.totalPages(), page));
    if (clamped !== this.currentPage()) {
      this.currentPage.set(clamped);
      void this.loadPage();
    }
  }

  protected resetFilters(): void {
    this.search.set('');
    this.difficulte.set('');
    this.moyenTransport.set('');
    this.zone.set('');
    this.dureeMax.set(null);
    this.distanceMax.set(null);
    this.sortBy.set('nom_asc');
    this.currentPage.set(1);
    void this.loadPage();
  }

  protected reload(): void {
    void this.loadPage();
  }

  protected getOrderedStops(circuit: Circuit) {
    return sortEtapes(circuit.etapes);
  }

  protected getFirstPatrimoine(circuit: Circuit): Patrimoine | null {
    const first = sortEtapes(circuit.etapes)[0];
    if (!first) return null;
    if (first.patrimoine) return first.patrimoine;
    return this.patrimoineStore.byIdMap().get(first.patrimoineId) ?? null;
  }

  protected getStopLabel(patrimoineId: number, inlinePat: Patrimoine | null): string {
    if (inlinePat?.nomPatrimoine) return inlinePat.nomPatrimoine;
    return this.patrimoineStore.byIdMap().get(patrimoineId)?.nomPatrimoine ?? `Site ${patrimoineId}`;
  }

  protected getResume(id: number): AvisResume | null {
    return this.avisResumes().get(id) ?? null;
  }

  private scheduleLoad(): void {
    if (this.filterTimer) clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => {
      void this.loadPage();
    }, 220);
  }

  private resolveSort(): { sortBy: string; sortDir: 'asc' | 'desc' } {
    switch (this.sortBy()) {
      case 'prix_asc':
        return { sortBy: 'prix', sortDir: 'asc' };
      case 'duree_asc':
        return { sortBy: 'dureeEstimee', sortDir: 'asc' };
      case 'distance_asc':
        return { sortBy: 'distanceTotale', sortDir: 'asc' };
      default:
        return { sortBy: 'nomCircuit', sortDir: 'asc' };
    }
  }

  private async loadPage(): Promise<void> {
    const seq = ++this.loadSeq;
    this.loading.set(true);
    this.error.set(null);

    const { sortBy, sortDir } = this.resolveSort();
    const dMax = this.dureeMax();
    const distMax = this.distanceMax();

    try {
      const response = await firstValueFrom(
        this.api.rechercher({
          q: this.search().trim() || undefined,
          difficulte: this.difficulte() || undefined,
          moyenTransport: this.moyenTransport() || undefined,
          zone: this.zone() || undefined,
          dureeMax: dMax && dMax > 0 ? dMax : undefined,
          distanceMax: distMax && distMax > 0 ? distMax : undefined,
          page: Math.max(0, this.currentPage() - 1),
          size: this.pageSize,
          sortBy,
          sortDir,
        })
      );
      if (seq !== this.loadSeq) return;

      const list = (response.content ?? []).filter(
        (c) => !c.statutCircuit || c.statutCircuit === 'PUBLIE'
      );
      this.items.set(list);
      this.totalElements.set(response.totalElements ?? list.length);
      this.totalPages.set(Math.max(1, response.totalPages ?? 1));

      if (list.length > 0) {
        const resumes = await firstValueFrom(
          this.avisApi.getResumesBatch(
            'CIRCUIT',
            list.map((c) => c.id)
          )
        ).catch(() => []);
        if (seq === this.loadSeq) {
          this.avisResumes.set(new Map(resumes.map((r) => [r.cibleId, r])));
        }
      } else {
        this.avisResumes.set(new Map());
      }
    } catch (err) {
      if (seq !== this.loadSeq) return;
      this.error.set(extractErrorMessage(err));
    } finally {
      if (seq === this.loadSeq) {
        this.loading.set(false);
      }
    }
  }
}
