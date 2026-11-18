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
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCalendar,
  LucideExternalLink,
  LucideMapPin,
  LucideRoute,
  LucideTicket,
} from '@lucide/angular';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import { Patrimoine } from '../../../../core/models/patrimoine.model';
import { SeoService } from '../../../../core/services/seo.service';
import {
  BreadcrumbItem,
  UiBreadcrumbComponent,
} from '../../../../shared/components/ui-breadcrumb/ui-breadcrumb.component';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';
import { UiLoadingStateComponent } from '../../../../shared/components/ui-loading-state/ui-loading-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import {
  HeritageMapPoint,
  UiHeritageMapComponent,
} from '../../../../shared/components/ui-heritage-map/ui-heritage-map.component';
import { UiPatrimoineImageComponent } from '../../../../shared/components/ui-patrimoine-image/ui-patrimoine-image.component';
import { UiSkeletonGridComponent } from '../../../../shared/components/ui-skeleton-grid/ui-skeleton-grid.component';
import { UiAvisSectionComponent } from '../../../../shared/components/ui-avis-section/ui-avis-section.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { DurationMinutesPipe } from '../../../../shared/pipes/duration-minutes.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import {
  buildOsmMapUrl,
  hasValidCoordinates,
  isLieuDeMemoire,
} from '../../../../shared/utils/patrimoine.utils';
import { CircuitStore } from '../../../circuits/data-access/circuit.store';
import { EvenementStore } from '../../../evenements/data-access/evenement.store';
import { PatrimoineStore } from '../../data-access/patrimoine.store';

@Component({
  selector: 'app-patrimoine-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LucideArrowRight,
    LucideCalendar,
    LucideExternalLink,
    LucideMapPin,
    LucideRoute,
    LucideTicket,
    UiBreadcrumbComponent,
    UiCardComponent,
    UiLoadingStateComponent,
    UiPatrimoineImageComponent,
    UiHeritageMapComponent,
    UiErrorBannerComponent,
    UiAvisSectionComponent,
    DateFrPipe,
    DurationMinutesPipe,
    FcfaPricePipe,
  ],
  templateUrl: './patrimoine-detail-page.component.html',
  styleUrl: './patrimoine-detail-page.component.css',
})
export class PatrimoineDetailPageComponent {
  readonly id = input.required<string>();

  protected readonly store = inject(PatrimoineStore);
  private readonly circuitStore = inject(CircuitStore);
  private readonly evenementStore = inject(EvenementStore);
  private readonly seo = inject(SeoService);

  protected readonly patrimoine = signal<Patrimoine | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly isMemorial = computed(() => isLieuDeMemoire(this.patrimoine()));

  protected readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const pat = this.patrimoine();
    return [
      { label: 'Accueil', to: '/' },
      { label: 'Patrimoines', to: '/patrimoines' },
      { label: pat ? pat.nomPatrimoine : 'Fiche introuvable' },
    ];
  });

  protected readonly hasCoords = computed(() => {
    const pat = this.patrimoine();
    return pat ? hasValidCoordinates(pat.latitudePatrimoine, pat.longitudePatrimoine) : false;
  });

  protected readonly osmUrl = computed(() => {
    const pat = this.patrimoine();
    return pat ? buildOsmMapUrl(pat.latitudePatrimoine, pat.longitudePatrimoine) : null;
  });

  protected readonly mapPoints = computed<HeritageMapPoint[]>(() => {
    const pat = this.patrimoine();
    if (!pat || !hasValidCoordinates(pat.latitudePatrimoine, pat.longitudePatrimoine)) {
      return [];
    }
    return [
      {
        id: pat.id,
        label: pat.nomPatrimoine,
        subtitle: pat.adressePatrimoine ?? pat.codePatrimoine,
        latitude: pat.latitudePatrimoine,
        longitude: pat.longitudePatrimoine,
        memorial: isLieuDeMemoire(pat),
      },
    ];
  });

  protected readonly relatedCircuits = computed(() => {
    const currentId = Number(this.id());
    return this.circuitStore
      .items()
      .filter(
        (c) =>
          (!c.statutCircuit || c.statutCircuit === 'PUBLIE') &&
          c.etapes?.some((e) => e.patrimoineId === currentId)
      );
  });

  protected readonly relatedEvenements = computed(() => {
    const currentId = Number(this.id());
    return this.evenementStore
      .items()
      .filter(
        (ev) =>
          (!ev.statutEvenement || ev.statutEvenement === 'PUBLIE') &&
          ev.patrimoineId === currentId
      );
  });

  protected readonly autresPatrimoines = computed(() => {
    const currentId = String(this.id());
    return this.store
      .items()
      .filter(
        (item) =>
          String(item.id) !== currentId &&
          (!item.statutPublication || item.statutPublication === 'PUBLIE')
      )
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

  protected isPatMemorial(pat: Patrimoine): boolean {
    return isLieuDeMemoire(pat);
  }

  private async loadDetail(patId: string): Promise<void> {
    const seq = ++this.loadSeq;
    this.loading.set(true);
    this.error.set(null);

    void this.store.ensureLoaded();
    void this.circuitStore.ensureLoaded();
    void this.evenementStore.ensureLoaded();

    try {
      const detail = await this.store.loadById(patId);
      if (seq !== this.loadSeq) return;
      this.patrimoine.set(detail);
      this.seo.update({
        title: detail.nomPatrimoine,
        description:
          detail.descriptionPatrimoine ??
          `Découvrez ${detail.nomPatrimoine} (${detail.codePatrimoine}) en Casamance.`,
        canonicalPath: `/patrimoines/${detail.id}`,
      });
    } catch (err) {
      if (seq !== this.loadSeq) return;
      this.patrimoine.set(null);
      this.error.set(extractErrorMessage(err));
    } finally {
      if (seq === this.loadSeq) {
        this.loading.set(false);
      }
    }
  }
}
