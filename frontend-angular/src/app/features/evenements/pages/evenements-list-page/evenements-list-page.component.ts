import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideCalendar,
  LucideMapPin,
  LucideSearch,
  LucideTicket,
  LucideUsers,
} from '@lucide/angular';
import { isValid, parseISO, startOfDay } from 'date-fns';
import { Evenement, TypeEvenement } from '../../../../core/models/evenement.model';
import { Patrimoine } from '../../../../core/models/patrimoine.model';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiPatrimoineImageComponent } from '../../../../shared/components/ui-patrimoine-image/ui-patrimoine-image.component';
import { UiSkeletonGridComponent } from '../../../../shared/components/ui-skeleton-grid/ui-skeleton-grid.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { EvenementTypePipe } from '../../../../shared/pipes/evenement-type.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { isLieuDeMemoire } from '../../../../shared/utils/patrimoine.utils';
import { PatrimoineStore } from '../../../patrimoines/data-access/patrimoine.store';
import { EvenementStore } from '../../data-access/evenement.store';

interface TypeFilterChip {
  readonly value: '' | TypeEvenement;
  readonly label: string;
}

@Component({
  selector: 'app-evenements-list-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    Toolbar,
    ToolbarWidget,
    LucideArrowRight,
    LucideCalendar,
    LucideMapPin,
    LucideSearch,
    LucideTicket,
    LucideUsers,
    UiPatrimoineImageComponent,
    UiSkeletonGridComponent,
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
  protected readonly store = inject(EvenementStore);
  protected readonly patrimoineStore = inject(PatrimoineStore);

  protected readonly search = signal('');
  protected readonly typeFilter = signal<'' | TypeEvenement>('');
  protected readonly dateMin = signal('');
  protected readonly aVenirUniquement = signal(false);

  protected readonly typeChips: readonly TypeFilterChip[] = [
    { value: '', label: 'Tous' },
    { value: 'EXPOSITION', label: 'Expositions' },
    { value: 'ATELIER', label: 'Ateliers' },
    { value: 'VISITE_GUIDEE', label: 'Visites guidées' },
    { value: 'CONFERENCE', label: 'Conférences' },
    { value: 'FESTIVAL', label: 'Festivals' },
  ];

  protected readonly filteredEvenements = computed(() => {
    const q = this.search().trim().toLowerCase();
    const type = this.typeFilter();
    const dateMinStr = this.dateMin().trim();
    const dateMinParsed = dateMinStr ? startOfDay(parseISO(dateMinStr)) : null;
    const onlyUpcoming = this.aVenirUniquement();
    const now = new Date();

    return this.store.items().filter((ev) => {
      if (ev.statutEvenement === 'ARCHIVE' || ev.statutEvenement === 'BROUILLON' || ev.statutEvenement === 'SOUMIS') {
        return false;
      }
      if (onlyUpcoming) {
        if (ev.statutEvenement === 'ANNULE' || ev.statutEvenement === 'TERMINE') {
          return false;
        }
        const end = parseISO(ev.dateFin || ev.dateDebut);
        if (isValid(end) && end < now) {
          return false;
        }
      }
      if (q) {
        const text = `${ev.nomEvenement ?? ''} ${ev.descriptionEvenement ?? ''} ${
          ev.lieu ?? ''
        } ${ev.organisateur ?? ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      if (type && ev.typeEvenement !== type) return false;
      if (dateMinParsed && isValid(dateMinParsed) && ev.dateDebut) {
        const refDate = parseISO(ev.dateFin || ev.dateDebut);
        if (isValid(refDate) && refDate < dateMinParsed) return false;
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
    this.typeFilter.set('');
    this.dateMin.set('');
    this.aVenirUniquement.set(false);
  }

  protected resolvePatrimoine(ev: Evenement): Patrimoine | null {
    if (ev.patrimoine) return ev.patrimoine;
    if (ev.patrimoineId == null) return null;
    return this.patrimoineStore.byIdMap().get(ev.patrimoineId) ?? null;
  }

  protected isMemorial(ev: Evenement): boolean {
    return isLieuDeMemoire(this.resolvePatrimoine(ev));
  }
}
