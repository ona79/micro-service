import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideGrid,
  LucideMap,
  LucideMapPin,
  LucideSearch,
  LucideUsers,
} from '@lucide/angular';
import { map } from 'rxjs';
import {
  CategoriePatrimoine,
  Patrimoine,
  ZoneCasamance,
} from '../../../../core/models/patrimoine.model';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import {
  HeritageMapPoint,
  UiHeritageMapComponent,
} from '../../../../shared/components/ui-heritage-map/ui-heritage-map.component';
import { UiPatrimoineImageComponent } from '../../../../shared/components/ui-patrimoine-image/ui-patrimoine-image.component';
import { UiSkeletonGridComponent } from '../../../../shared/components/ui-skeleton-grid/ui-skeleton-grid.component';
import { hasValidCoordinates, isLieuDeMemoire } from '../../../../shared/utils/patrimoine.utils';
import { PatrimoineStore } from '../../data-access/patrimoine.store';

type TriPatrimoine = 'nom_asc' | 'capacite_desc' | 'capacite_asc' | 'tarif_asc';
type ViewMode = 'grid' | 'map';

const CATEGORIE_LABELS: Record<CategoriePatrimoine, string> = {
  NATUREL: 'Patrimoine naturel',
  CULTUREL: 'Patrimoine culturel',
  HISTORIQUE: 'Patrimoine historique',
  ARCHITECTURAL: 'Patrimoine architectural',
  IMMATERIEL: 'Patrimoine immatériel',
};

const ZONE_LABELS: Record<ZoneCasamance, string> = {
  BASSE_CASAMANCE: 'Basse-Casamance (Ziguinchor / Oussouye / Bignona)',
  MOYENNE_CASAMANCE: 'Moyenne-Casamance (Sédhiou)',
  HAUTE_CASAMANCE: 'Haute-Casamance (Kolda / Vélingara)',
};

@Component({
  selector: 'app-patrimoines-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    Toolbar,
    ToolbarWidget,
    LucideArrowRight,
    LucideGrid,
    LucideMap,
    LucideMapPin,
    LucideSearch,
    LucideUsers,
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
  protected readonly store = inject(PatrimoineStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly urlQuery = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('q') ?? '')),
    { initialValue: '' }
  );

  protected readonly categorie = signal<'' | CategoriePatrimoine>('');
  protected readonly zone = signal<'' | ZoneCasamance>('');
  protected readonly capaciteMin = signal<string>('');
  protected readonly tri = signal<TriPatrimoine>('nom_asc');
  protected readonly viewMode = signal<ViewMode>('grid');
  protected readonly selectedMapPatrimoineId = signal<number | null>(null);
  protected readonly currentPage = signal<number>(1);
  protected readonly pageSize = 6;

  protected readonly filteredPatrimoines = computed(() => {
    const query = this.urlQuery().trim().toLowerCase();
    const cat = this.categorie();
    const zn = this.zone();
    const minCapRaw = String(this.capaciteMin() ?? '').trim();
    const minCap = minCapRaw !== '' ? Number(minCapRaw) : null;

    const filtered = this.store.items().filter((p) => {
      if (p.statutPublication && p.statutPublication !== 'PUBLIE') {
        return false;
      }
      if (cat && p.categoriePatrimoine !== cat) {
        return false;
      }
      if (zn && p.zoneGeographique !== zn) {
        return false;
      }
      if (query) {
        const haystack = `${p.nomPatrimoine ?? ''} ${p.codePatrimoine ?? ''} ${
          p.adressePatrimoine ?? ''
        } ${p.localite ?? ''} ${p.descriptionPatrimoine ?? ''} ${
          p.typePatrimoine ?? ''
        }`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (minCap !== null && !Number.isNaN(minCap)) {
        if ((p.capacitePatrimoine ?? 0) < minCap) return false;
      }
      return true;
    });

    const sortMode = this.tri();
    return [...filtered].sort((a, b) => {
      if (sortMode === 'capacite_desc') {
        return (b.capacitePatrimoine ?? 0) - (a.capacitePatrimoine ?? 0);
      }
      if (sortMode === 'capacite_asc') {
        return (a.capacitePatrimoine ?? 0) - (b.capacitePatrimoine ?? 0);
      }
      if (sortMode === 'tarif_asc') {
        return (a.tarifEntree ?? 0) - (b.tarifEntree ?? 0);
      }
      return (a.nomPatrimoine ?? '').localeCompare(b.nomPatrimoine ?? '', 'fr');
    });
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredPatrimoines().length / this.pageSize))
  );

  protected readonly pagedPatrimoines = computed(() => {
    const all = this.filteredPatrimoines();
    const safePage = Math.min(Math.max(1, this.currentPage()), this.totalPages());
    const start = (safePage - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  });

  protected readonly mapPoints = computed<HeritageMapPoint[]>(() =>
    this.filteredPatrimoines()
      .filter((p) => hasValidCoordinates(p.latitudePatrimoine, p.longitudePatrimoine))
      .map((p) => ({
        id: p.id,
        label: p.nomPatrimoine,
        subtitle: p.adressePatrimoine ?? p.codePatrimoine,
        latitude: p.latitudePatrimoine,
        longitude: p.longitudePatrimoine,
        memorial: isLieuDeMemoire(p),
      }))
  );

  protected readonly selectedMapPatrimoine = computed<Patrimoine | null>(() => {
    const id = this.selectedMapPatrimoineId();
    if (id === null) return this.filteredPatrimoines()[0] ?? null;
    return (
      this.filteredPatrimoines().find((p) => p.id === id) ??
      this.filteredPatrimoines()[0] ??
      null
    );
  });

  ngOnInit(): void {
    void this.store.ensureLoaded();
  }

  protected isMemorial(pat: Patrimoine): boolean {
    return isLieuDeMemoire(pat);
  }

  protected formatCategorie(cat?: CategoriePatrimoine): string {
    if (!cat) return 'Patrimoine culturel';
    return CATEGORIE_LABELS[cat] ?? cat;
  }

  protected formatZone(zn?: ZoneCasamance): string {
    if (!zn) return 'Casamance';
    return ZONE_LABELS[zn] ?? zn;
  }

  protected onSearchChange(value: string): void {
    this.currentPage.set(1);
    const trimmed = value.trim();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: trimmed ? value : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected resetFilters(): void {
    this.categorie.set('');
    this.zone.set('');
    this.capaciteMin.set('');
    this.tri.set('nom_asc');
    this.currentPage.set(1);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  protected goToPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  protected onMapPointSelected(point: HeritageMapPoint): void {
    this.selectedMapPatrimoineId.set(point.id);
  }
}
