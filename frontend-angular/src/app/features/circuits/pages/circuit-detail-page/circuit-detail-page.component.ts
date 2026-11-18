import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideClock,
  LucideExternalLink,
  LucideMapPin,
  LucideTicket,
} from '@lucide/angular';
import { APP_SITE_CONFIG } from '../../../../core/config/site.config';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import { Circuit } from '../../../../core/models/circuit.model';
import { Patrimoine } from '../../../../core/models/patrimoine.model';
import {
  BreadcrumbItem,
  UiBreadcrumbComponent,
} from '../../../../shared/components/ui-breadcrumb/ui-breadcrumb.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import {
  HeritageMapPoint,
  UiHeritageMapComponent,
} from '../../../../shared/components/ui-heritage-map/ui-heritage-map.component';
import { UiPatrimoineImageComponent } from '../../../../shared/components/ui-patrimoine-image/ui-patrimoine-image.component';
import { UiSkeletonGridComponent } from '../../../../shared/components/ui-skeleton-grid/ui-skeleton-grid.component';
import { DifficulteLabelPipe } from '../../../../shared/pipes/difficulte-label.pipe';
import { DurationMinutesPipe } from '../../../../shared/pipes/duration-minutes.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import {
  buildOsmMapUrl,
  hasValidCoordinates,
  sortEtapes,
} from '../../../../shared/utils/patrimoine.utils';
import { PatrimoineStore } from '../../../patrimoines/data-access/patrimoine.store';
import { CircuitStore } from '../../data-access/circuit.store';

@Component({
  selector: 'app-circuit-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LucideArrowRight,
    LucideClock,
    LucideExternalLink,
    LucideMapPin,
    LucideTicket,
    UiBreadcrumbComponent,
    UiPatrimoineImageComponent,
    UiHeritageMapComponent,
    UiSkeletonGridComponent,
    UiErrorBannerComponent,
    DifficulteLabelPipe,
    DurationMinutesPipe,
    FcfaPricePipe,
  ],
  templateUrl: './circuit-detail-page.component.html',
  styleUrl: './circuit-detail-page.component.css',
})
export class CircuitDetailPageComponent {
  readonly id = input.required<string>();

  protected readonly store = inject(CircuitStore);
  protected readonly patrimoineStore = inject(PatrimoineStore);
  private readonly titleService = inject(Title);
  private readonly config = inject(APP_SITE_CONFIG);

  protected readonly circuit = signal<Circuit | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const cir = this.circuit();
    return [
      { label: 'Accueil', to: '/' },
      { label: 'Circuits', to: '/circuits' },
      { label: cir ? cir.nomCircuit : 'Circuit introuvable' },
    ];
  });

  protected readonly orderedStops = computed(() => {
    const cir = this.circuit();
    if (!cir) return [];
    return sortEtapes(cir.etapes).map((etape) => ({
      ...etape,
      resolvedPatrimoine:
        etape.patrimoine ?? this.patrimoineStore.byIdMap().get(etape.patrimoineId) ?? null,
    }));
  });

  protected readonly mainPatrimoine = computed<Patrimoine | null>(() => {
    return this.orderedStops()[0]?.resolvedPatrimoine ?? null;
  });

  protected readonly routeMapPoints = computed<HeritageMapPoint[]>(() => {
    return this.orderedStops()
      .filter(
        (stop) =>
          stop.resolvedPatrimoine &&
          hasValidCoordinates(
            stop.resolvedPatrimoine.latitudePatrimoine,
            stop.resolvedPatrimoine.longitudePatrimoine
          )
      )
      .map((stop) => ({
        id: stop.resolvedPatrimoine!.id,
        label: stop.resolvedPatrimoine!.nomPatrimoine,
        subtitle: stop.resolvedPatrimoine!.adressePatrimoine ?? undefined,
        latitude: stop.resolvedPatrimoine!.latitudePatrimoine,
        longitude: stop.resolvedPatrimoine!.longitudePatrimoine,
        stepOrder: stop.ordre,
      }));
  });

  protected readonly osmStartUrl = computed(() => {
    const pat = this.mainPatrimoine();
    return pat ? buildOsmMapUrl(pat.latitudePatrimoine, pat.longitudePatrimoine) : null;
  });

  protected readonly autresCircuits = computed(() => {
    const currentId = String(this.id());
    return this.store
      .items()
      .filter((item) => String(item.id) !== currentId)
      .slice(0, 3);
  });

  private loadSeq = 0;

  constructor() {
    effect(() => {
      const currentId = this.id();
      untracked(() => {
        void this.loadDetail(currentId);
      });
    });
  }

  protected reload(): void {
    void this.loadDetail(this.id());
  }

  protected getFirstPatrimoine(circuit: Circuit): Patrimoine | null {
    const first = sortEtapes(circuit.etapes)[0];
    if (!first) return null;
    return first.patrimoine ?? this.patrimoineStore.byIdMap().get(first.patrimoineId) ?? null;
  }

  private async loadDetail(circuitId: string): Promise<void> {
    const seq = ++this.loadSeq;
    this.loading.set(true);
    this.error.set(null);

    void this.store.ensureLoaded();
    void this.patrimoineStore.ensureLoaded();

    try {
      const detail = await this.store.loadById(circuitId);
      if (seq !== this.loadSeq) return;
      this.circuit.set(detail);
      this.titleService.setTitle(`${detail.nomCircuit} — ${this.config.siteName}`);
    } catch (err) {
      if (seq !== this.loadSeq) return;
      this.circuit.set(null);
      this.error.set(extractErrorMessage(err));
    } finally {
      if (seq === this.loadSeq) {
        this.loading.set(false);
      }
    }
  }
}
