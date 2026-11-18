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
  LucideCalendar,
  LucideExternalLink,
  LucideMapPin,
  LucideTicket,
} from '@lucide/angular';
import { APP_SITE_CONFIG } from '../../../../core/config/site.config';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import { Evenement } from '../../../../core/models/evenement.model';
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
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { EvenementTypePipe } from '../../../../shared/pipes/evenement-type.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import {
  buildOsmMapUrl,
  hasValidCoordinates,
  isLieuDeMemoire,
} from '../../../../shared/utils/patrimoine.utils';
import { PatrimoineStore } from '../../../patrimoines/data-access/patrimoine.store';
import { DisponibilitePrestation } from '../../../../core/models/reservation.model';
import { ReservationApiService } from '../../../reservations/data-access/reservation-api.service';
import { firstValueFrom } from 'rxjs';
import { EvenementStore } from '../../data-access/evenement.store';

@Component({
  selector: 'app-evenement-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LucideArrowRight,
    LucideCalendar,
    LucideExternalLink,
    LucideMapPin,
    LucideTicket,
    UiBreadcrumbComponent,
    UiPatrimoineImageComponent,
    UiHeritageMapComponent,
    UiSkeletonGridComponent,
    UiErrorBannerComponent,
    DateFrPipe,
    EvenementTypePipe,
    FcfaPricePipe,
  ],
  templateUrl: './evenement-detail-page.component.html',
  styleUrl: './evenement-detail-page.component.css',
})
export class EvenementDetailPageComponent {
  readonly id = input.required<string>();

  protected readonly store = inject(EvenementStore);
  protected readonly patrimoineStore = inject(PatrimoineStore);
  private readonly reservationApi = inject(ReservationApiService);
  private readonly titleService = inject(Title);
  private readonly config = inject(APP_SITE_CONFIG);

  protected readonly evenement = signal<Evenement | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly disponibilite = signal<DisponibilitePrestation | null>(null);
  protected readonly checkingDispo = signal(false);

  protected readonly patLie = computed<Patrimoine | null>(() => {
    const ev = this.evenement();
    if (!ev) return null;
    if (ev.patrimoine) return ev.patrimoine;
    if (ev.patrimoineId == null) return null;
    return this.patrimoineStore.byIdMap().get(ev.patrimoineId) ?? null;
  });

  protected readonly isMemorial = computed(() => isLieuDeMemoire(this.patLie()));

  protected readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const ev = this.evenement();
    return [
      { label: 'Accueil', to: '/' },
      { label: 'Événements', to: '/evenements' },
      { label: ev ? ev.nomEvenement : 'Événement introuvable' },
    ];
  });

  protected readonly hasCoords = computed(() => {
    const pat = this.patLie();
    return pat ? hasValidCoordinates(pat.latitudePatrimoine, pat.longitudePatrimoine) : false;
  });

  protected readonly mapPoints = computed<HeritageMapPoint[]>(() => {
    const pat = this.patLie();
    if (!pat || !hasValidCoordinates(pat.latitudePatrimoine, pat.longitudePatrimoine)) {
      return [];
    }
    return [
      {
        id: pat.id,
        label: pat.nomPatrimoine,
        subtitle: this.evenement()?.lieu ?? pat.adressePatrimoine ?? undefined,
        latitude: pat.latitudePatrimoine,
        longitude: pat.longitudePatrimoine,
        memorial: isLieuDeMemoire(pat),
      },
    ];
  });

  protected readonly osmUrl = computed(() => {
    const pat = this.patLie();
    return pat ? buildOsmMapUrl(pat.latitudePatrimoine, pat.longitudePatrimoine) : null;
  });

  protected readonly autresEvenements = computed(() => {
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

  protected resolvePat(ev: Evenement): Patrimoine | null {
    if (ev.patrimoine) return ev.patrimoine;
    if (ev.patrimoineId == null) return null;
    return this.patrimoineStore.byIdMap().get(ev.patrimoineId) ?? null;
  }

  protected async checkDisponibilite(ev: Evenement): Promise<void> {
    this.checkingDispo.set(true);
    try {
      const dispo = await firstValueFrom(
        this.reservationApi.getDisponibilite('EVENEMENT', ev.id)
      );
      this.disponibilite.set(dispo);
    } catch {
      this.disponibilite.set(null);
    } finally {
      this.checkingDispo.set(false);
    }
  }

  private async loadDetail(evtId: string): Promise<void> {
    const seq = ++this.loadSeq;
    this.loading.set(true);
    this.error.set(null);
    this.disponibilite.set(null);

    void this.store.ensureLoaded();
    void this.patrimoineStore.ensureLoaded();

    try {
      const detail = await this.store.loadById(evtId);
      if (seq !== this.loadSeq) return;
      this.evenement.set(detail);
      this.titleService.setTitle(`${detail.nomEvenement} — ${this.config.siteName}`);
    } catch (err) {
      if (seq !== this.loadSeq) return;
      this.evenement.set(null);
      this.error.set(extractErrorMessage(err));
    } finally {
      if (seq === this.loadSeq) {
        this.loading.set(false);
      }
    }
  }
}
