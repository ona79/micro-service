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
  LucideCalendar,
  LucideMapPin,
  LucideSearch,
  LucideStar,
  LucideTicket,
  LucideUsers,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import { AvisResume } from '../../../../core/models/avis.model';
import { Evenement, TypeEvenement } from '../../../../core/models/evenement.model';
import { Patrimoine, ZoneCasamance } from '../../../../core/models/patrimoine.model';
import { SeoService } from '../../../../core/services/seo.service';
import { UiLoadingStateComponent } from '../../../../shared/components/ui-loading-state/ui-loading-state.component';
import { UiPaginationComponent } from '../../../../shared/components/ui-pagination/ui-pagination.component';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiPatrimoineImageComponent } from '../../../../shared/components/ui-patrimoine-image/ui-patrimoine-image.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { EvenementTypePipe } from '../../../../shared/pipes/evenement-type.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { isLieuDeMemoire } from '../../../../shared/utils/patrimoine.utils';
import { AvisApiService } from '../../../avis/data-access/avis-api.service';
import { PatrimoineStore } from '../../../patrimoines/data-access/patrimoine.store';
import { EvenementApiService } from '../../data-access/evenement-api.service';

@Component({
  selector: 'app-evenements-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    LucideSearch,
    LucideCalendar,
    LucideMapPin,
    LucideStar,
    LucideUsers,
    LucideArrowRight,
    LucideTicket,
    UiLoadingStateComponent,
    UiPaginationComponent,
    UiPatrimoineImageComponent,
    UiErrorBannerComponent,
    UiEmptyStateComponent,
    DateFrPipe,
    EvenementTypePipe,
    FcfaPricePipe,
  ],
  templateUrl: './evenements-list-page.component.html',
  styleUrl: './evenements-list-page.component.css',
})
export class EvenementsListPageComponent implements OnInit {
  private readonly api = inject(EvenementApiService);
  private readonly avisApi = inject(AvisApiService);
  protected readonly patrimoineStore = inject(PatrimoineStore);
  private readonly seo = inject(SeoService);

  protected readonly search = signal('');
  protected readonly selectedType = signal<TypeEvenement | ''>('');
  protected readonly selectedZone = signal<ZoneCasamance | ''>('');
  protected readonly fromDate = signal('');
  protected readonly aVenirOnly = signal(false);
  protected readonly sortBy = signal<'dateDebut' | 'prix' | 'nomEvenement'>('dateDebut');
  protected readonly currentPage = signal(1);
  protected readonly pageSize = 8;

  protected readonly items = signal<Evenement[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly avisResumes = signal<Map<number, AvisResume>>(new Map());

  private loadSeq = 0;
  private filterTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly eventTypes: { value: TypeEvenement | ''; label: string }[] = [
    { value: '', label: 'Tous les types' },
    { value: 'VISITE_GUIDEE', label: 'Visites guidées' },
    { value: 'ATELIER', label: 'Ateliers' },
    { value: 'FESTIVAL', label: 'Festivals' },
    { value: 'CEREMONIE_TRADITIONNELLE', label: 'Cérémonies' },
    { value: 'FOIRE_ARTISANALE', label: 'Foires artisanales' },
    { value: 'EXPOSITION', label: 'Expositions' },
    { value: 'CONFERENCE', label: 'Conférences' },
  ];

  protected readonly publishedEvents = computed(() =>
    this.items().filter(
      (ev) => !ev.statutEvenement || ev.statutEvenement === 'PUBLIE' || ev.statutEvenement === 'TERMINE'
    )
  );

  protected readonly hasActiveFilters = computed(
    () =>
      Boolean(this.search().trim()) ||
      Boolean(this.selectedType()) ||
      Boolean(this.selectedZone()) ||
      Boolean(this.fromDate()) ||
      this.aVenirOnly() ||
      this.sortBy() !== 'dateDebut'
  );

  ngOnInit(): void {
    this.seo.update({
      title: 'Agenda Culturel',
      description:
        'Agenda culturel et festivités de Casamance en heure officielle Africa/Dakar : festivals, cérémonies, visites et ateliers.',
      canonicalPath: '/evenements',
    });
    void this.patrimoineStore.ensureLoaded();
    void this.loadPage();
  }

  protected onSearchChange(value: string): void {
    this.search.set(value);
    this.currentPage.set(1);
    if (this.filterTimer) clearTimeout(this.filterTimer);
    this.filterTimer = setTimeout(() => {
      void this.loadPage();
    }, 220);
  }

  protected selectType(type: TypeEvenement | ''): void {
    this.selectedType.set(type);
    this.currentPage.set(1);
    void this.loadPage();
  }

  protected onFilterImmediate(): void {
    this.currentPage.set(1);
    void this.loadPage();
  }

  protected toggleAVenir(): void {
    this.aVenirOnly.set(!this.aVenirOnly());
    this.currentPage.set(1);
    void this.loadPage();
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
    this.selectedType.set('');
    this.selectedZone.set('');
    this.fromDate.set('');
    this.aVenirOnly.set(false);
    this.sortBy.set('dateDebut');
    this.currentPage.set(1);
    void this.loadPage();
  }

  protected reload(): void {
    void this.loadPage();
  }

  protected resolvePatrimoine(ev: Evenement): Patrimoine | null {
    if (ev.patrimoine) return ev.patrimoine;
    if (ev.patrimoineId == null) return null;
    return this.patrimoineStore.byIdMap().get(ev.patrimoineId) ?? null;
  }

  protected isMemorialEvent(ev: Evenement): boolean {
    const pat = this.resolvePatrimoine(ev);
    return isLieuDeMemoire(pat);
  }

  protected isReservable(ev: Evenement): boolean {
    if (ev.ouvertReservation === false) return false;
    return ev.statutEvenement !== 'ANNULE' && ev.statutEvenement !== 'TERMINE' && ev.statutEvenement !== 'ARCHIVE';
  }

  protected getResume(id: number): AvisResume | null {
    return this.avisResumes().get(id) ?? null;
  }

  private async loadPage(): Promise<void> {
    const seq = ++this.loadSeq;
    this.loading.set(true);
    this.error.set(null);

    const dateVal = this.fromDate().trim();
    const dateMin = dateVal ? `${dateVal}T00:00:00` : undefined;

    try {
      const response = await firstValueFrom(
        this.api.rechercher({
          q: this.search().trim() || undefined,
          type: this.selectedType() || undefined,
          zone: this.selectedZone() || undefined,
          dateMin,
          aVenirUniquement: this.aVenirOnly() || undefined,
          page: Math.max(0, this.currentPage() - 1),
          size: this.pageSize,
          sortBy: this.sortBy(),
          sortDir: 'asc',
        })
      );
      if (seq !== this.loadSeq) return;

      const list = (response.content ?? []).filter(
        (ev) => !ev.statutEvenement || ev.statutEvenement === 'PUBLIE' || ev.statutEvenement === 'TERMINE'
      );
      this.items.set(list);
      this.totalElements.set(response.totalElements ?? list.length);
      this.totalPages.set(Math.max(1, response.totalPages ?? 1));

      if (list.length > 0) {
        const resumes = await firstValueFrom(
          this.avisApi.getResumesBatch(
            'EVENEMENT',
            list.map((e) => e.id)
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
