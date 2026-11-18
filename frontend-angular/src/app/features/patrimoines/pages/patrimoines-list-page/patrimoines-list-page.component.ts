import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideGrid,
  LucideMap,
  LucideMapPin,
  LucideSearch,
  LucideStar,
  LucideUsers,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import { AvisResume } from '../../../../core/models/avis.model';
import {
  CategoriePatrimoine,
  Patrimoine,
  ZoneCasamance,
} from '../../../../core/models/patrimoine.model';
import { SeoService } from '../../../../core/services/seo.service';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import {
  HeritageMapPoint,
  UiHeritageMapComponent,
} from '../../../../shared/components/ui-heritage-map/ui-heritage-map.component';
import { UiPatrimoineImageComponent } from '../../../../shared/components/ui-patrimoine-image/ui-patrimoine-image.component';
import { UiSkeletonGridComponent } from '../../../../shared/components/ui-skeleton-grid/ui-skeleton-grid.component';
import {
  hasValidCoordinates,
  isLieuDeMemoire,
} from '../../../../shared/utils/patrimoine.utils';
import { AvisApiService } from '../../../avis/data-access/avis-api.service';
import { PatrimoineApiService } from '../../data-access/patrimoine-api.service';

type SortOption = 'nom_asc' | 'capacite_desc' | 'tarif_asc' | 'date_desc';
type ViewMode = 'grid' | 'map';

@Component({
  selector: 'app-patrimoines-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    Toolbar,
    ToolbarWidget,
    LucideSearch,
    LucideGrid,
    LucideMap,
    LucideMapPin,
    LucideStar,
    LucideUsers,
    LucideArrowRight,
    UiPatrimoineImageComponent,
    UiHeritageMapComponent,
    UiSkeletonGridComponent,
    UiErrorBannerComponent,
    UiEmptyStateComponent,
  ],
  templateUrl: './patrimoines-list-page.component.html',
  styleUrl: './patrimoines-list-page.component.css',
})
export class PatrimoinesListPageComponent implements OnInit {
  private readonly api = inject(PatrimoineApiService);
  private readonly avisApi = inject(AvisApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  protected readonly searchTerm = signal('');
  protected readonly selectedCategorie = signal<CategoriePatrimoine | ''>('');
  protected readonly selectedZone = signal<ZoneCasamance | ''>('');
  protected readonly sortBy = signal<SortOption>('nom_asc');
  protected readonly viewMode = signal<ViewMode>('grid');
  protected readonly currentPage = signal<number>(1);
  protected readonly pageSize = 9;

  protected readonly items = signal<Patrimoine[]>([]);
  protected readonly totalElements = signal<number>(0);
  protected readonly totalPages = signal<number>(1);
  protected readonly loading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);
  protected readonly avisResumes = signal<Map<number, AvisResume>>(new Map());
  protected readonly selectedMapPatrimoine = signal<Patrimoine | null>(null);

  private loadSeq = 0;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly breadcrumbs = [
    { label: 'Accueil', to: '/' },
    { label: 'Patrimoines' },
  ];

  protected readonly categories: { value: CategoriePatrimoine | ''; label: string }[] = [
    { value: '', label: 'Toutes les catégories' },
    { value: 'HISTORIQUE', label: 'Historique & mémoriel' },
    { value: 'CULTUREL', label: 'Culturel & cultuel' },
    { value: 'ARCHITECTURAL', label: 'Architectural' },
    { value: 'NATUREL', label: 'Naturel' },
    { value: 'IMMATERIEL', label: 'Immatériel' },
  ];

  protected readonly zones: { value: ZoneCasamance | ''; label: string }[] = [
    { value: '', label: 'Toute la Casamance' },
    { value: 'BASSE_CASAMANCE', label: 'Basse-Casamance' },
    { value: 'MOYENNE_CASAMANCE', label: 'Moyenne-Casamance' },
    { value: 'HAUTE_CASAMANCE', label: 'Haute-Casamance' },
  ];

  protected readonly publishedItems = computed<Patrimoine[]>(() =>
    this.items().filter((p) => !p.statutPublication || p.statutPublication === 'PUBLIE')
  );

  protected readonly mapPoints = computed<HeritageMapPoint[]>(() =>
    this.publishedItems()
      .filter((p) => hasValidCoordinates(p.latitudePatrimoine, p.longitudePatrimoine))
      .map((p) => ({
        id: p.id,
        label: p.nomPatrimoine,
        subtitle: p.adressePatrimoine ?? p.localite ?? undefined,
        latitude: p.latitudePatrimoine,
        longitude: p.longitudePatrimoine,
        memorial: isLieuDeMemoire(p),
      }))
  );

  protected readonly hasActiveFilters = computed(
    () =>
      Boolean(this.searchTerm().trim()) ||
      Boolean(this.selectedCategorie()) ||
      Boolean(this.selectedZone()) ||
      this.sortBy() !== 'nom_asc'
  );

  ngOnInit(): void {
    this.seo.update({
      title: 'Sites & Monuments Patrimoniaux',
      description:
        'Catalogue filtrable des sites culturels, mémoriels et naturels publiés de Basse, Moyenne et Haute-Casamance.',
      canonicalPath: '/patrimoines',
    });

    this.route.queryParamMap.subscribe((params) => {
      this.searchTerm.set(params.get('q') ?? '');
      this.selectedZone.set((params.get('zone') as ZoneCasamance | null) ?? '');
      this.selectedCategorie.set(
        (params.get('categorie') as CategoriePatrimoine | null) ?? ''
      );
      const sort = params.get('sort') as SortOption | null;
      this.sortBy.set(
        sort && ['nom_asc', 'capacite_desc', 'tarif_asc', 'date_desc'].includes(sort)
          ? sort
          : 'nom_asc'
      );
      const pageParam = Number(params.get('page') ?? '1');
      this.currentPage.set(Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1);
      void this.loadPage();
    });
  }

  protected onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.currentPage.set(1);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      void this.syncUrlAndLoad();
    }, 220);
  }

  protected onSearchSubmit(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.currentPage.set(1);
    void this.syncUrlAndLoad();
  }

  protected onCategorieChange(value: string): void {
    this.selectedCategorie.set((value as CategoriePatrimoine) || '');
    this.currentPage.set(1);
    void this.syncUrlAndLoad();
  }

  protected onZoneChange(value: string): void {
    this.selectedZone.set((value as ZoneCasamance) || '');
    this.currentPage.set(1);
    void this.syncUrlAndLoad();
  }

  protected onSortChange(value: string): void {
    this.sortBy.set(value as SortOption);
    this.currentPage.set(1);
    void this.syncUrlAndLoad();
  }

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    if (mode === 'map') {
      const current = this.publishedItems();
      if (!this.selectedMapPatrimoine() && current.length > 0) {
        this.selectedMapPatrimoine.set(current[0]);
      }
      void this.loadPage();
    }
  }

  protected onMapPointSelected(point: HeritageMapPoint): void {
    const found = this.publishedItems().find((p) => p.id === point.id) ?? null;
    this.selectedMapPatrimoine.set(found);
  }

  protected goToPage(page: number): void {
    const clamped = Math.max(1, Math.min(this.totalPages(), page));
    if (clamped !== this.currentPage()) {
      this.currentPage.set(clamped);
      void this.syncUrlAndLoad();
    }
  }

  protected resetFilters(): void {
    this.searchTerm.set('');
    this.selectedCategorie.set('');
    this.selectedZone.set('');
    this.sortBy.set('nom_asc');
    this.currentPage.set(1);
    void this.syncUrlAndLoad();
  }

  protected reload(): void {
    void this.loadPage();
  }

  protected isMemorial(patrimoine: Patrimoine): boolean {
    return isLieuDeMemoire(patrimoine);
  }

  protected formatCategorie(cat?: CategoriePatrimoine): string {
    switch (cat) {
      case 'HISTORIQUE':
        return 'Historique';
      case 'CULTUREL':
        return 'Culturel';
      case 'ARCHITECTURAL':
        return 'Architectural';
      case 'NATUREL':
        return 'Naturel';
      case 'IMMATERIEL':
        return 'Immatériel';
      default:
        return 'Patrimoine';
    }
  }

  protected formatZone(zone?: ZoneCasamance | null): string {
    switch (zone) {
      case 'BASSE_CASAMANCE':
        return 'Basse-Casamance';
      case 'MOYENNE_CASAMANCE':
        return 'Moyenne-Casamance';
      case 'HAUTE_CASAMANCE':
        return 'Haute-Casamance';
      default:
        return 'Casamance';
    }
  }

  protected getResume(id: number): AvisResume | null {
    return this.avisResumes().get(id) ?? null;
  }

  private async syncUrlAndLoad(): Promise<void> {
    const queryParams: Record<string, string | null> = {
      q: this.searchTerm().trim() || null,
      zone: this.selectedZone() || null,
      categorie: this.selectedCategorie() || null,
      sort: this.sortBy() !== 'nom_asc' ? this.sortBy() : null,
      page: this.currentPage() > 1 ? String(this.currentPage()) : null,
    };
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
    // Fallback direct si ActivatedRoute est mocké dans les tests unitaires
    await this.loadPage();
  }

  private resolveSortParams(): { sortBy: string; sortDir: 'asc' | 'desc' } {
    switch (this.sortBy()) {
      case 'capacite_desc':
        return { sortBy: 'capacite', sortDir: 'desc' };
      case 'tarif_asc':
        return { sortBy: 'tarif', sortDir: 'asc' };
      case 'date_desc':
        return { sortBy: 'date', sortDir: 'desc' };
      default:
        return { sortBy: 'nom', sortDir: 'asc' };
    }
  }

  private async loadPage(): Promise<void> {
    const seq = ++this.loadSeq;
    this.loading.set(true);
    this.error.set(null);

    const { sortBy, sortDir } = this.resolveSortParams();
    const isMap = this.viewMode() === 'map';

    try {
      const response = await firstValueFrom(
        this.api.rechercher({
          q: this.searchTerm().trim() || undefined,
          categorie: this.selectedCategorie() || undefined,
          zone: this.selectedZone() || undefined,
          page: isMap ? 0 : Math.max(0, this.currentPage() - 1),
          size: isMap ? 50 : this.pageSize,
          sortBy,
          sortDir,
        })
      );
      if (seq !== this.loadSeq) return;

      const list = (response.content ?? []).filter(
        (p) => !p.statutPublication || p.statutPublication === 'PUBLIE'
      );
      this.items.set(list);
      this.totalElements.set(response.totalElements ?? list.length);
      this.totalPages.set(Math.max(1, response.totalPages ?? 1));
      if (isMap && !this.selectedMapPatrimoine() && list.length > 0) {
        this.selectedMapPatrimoine.set(list[0]);
      }

      if (list.length > 0) {
        const resumes = await firstValueFrom(
          this.avisApi.getResumesBatch(
            'PATRIMOINE',
            list.map((p) => p.id)
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
