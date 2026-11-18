import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideAward,
  LucideCalendar,
  LucideCompass,
  LucideMapPin,
  LucideRoute,
  LucideSearch,
  LucideShieldCheck,
  LucideStar,
  LucideUsers,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { AvisResume } from '../../../../core/models/avis.model';
import { Circuit } from '../../../../core/models/circuit.model';
import { Evenement } from '../../../../core/models/evenement.model';
import { GuideProfil } from '../../../../core/models/guide.model';
import { Patrimoine } from '../../../../core/models/patrimoine.model';
import { SeoService } from '../../../../core/services/seo.service';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiPatrimoineImageComponent } from '../../../../shared/components/ui-patrimoine-image/ui-patrimoine-image.component';
import { UiSkeletonGridComponent } from '../../../../shared/components/ui-skeleton-grid/ui-skeleton-grid.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { DifficulteLabelPipe } from '../../../../shared/pipes/difficulte-label.pipe';
import { DurationMinutesPipe } from '../../../../shared/pipes/duration-minutes.pipe';
import { EvenementTypePipe } from '../../../../shared/pipes/evenement-type.pipe';
import { FcfaPricePipe } from '../../../../shared/pipes/fcfa-price.pipe';
import { isLieuDeMemoire } from '../../../../shared/utils/patrimoine.utils';
import { AvisApiService } from '../../../avis/data-access/avis-api.service';
import { CircuitStore } from '../../../circuits/data-access/circuit.store';
import { EvenementStore } from '../../../evenements/data-access/evenement.store';
import { GuideApiService } from '../../../guides/data-access/guide-api.service';
import { PatrimoineStore } from '../../../patrimoines/data-access/patrimoine.store';

interface ZoneCasamanceCard {
  code: string;
  titre: string;
  sousTitre: string;
  description: string;
}

const ZONES_CASAMANCE: readonly ZoneCasamanceCard[] = [
  {
    code: 'BASSE_CASAMANCE',
    titre: 'Basse-Casamance',
    sousTitre: 'Ziguinchor · Oussouye · Carabane · Enampore',
    description: 'Cases à impluvium diolas, bois sacrés, bolongs de mangrove et îles estuariennes.',
  },
  {
    code: 'MOYENNE_CASAMANCE',
    titre: 'Moyenne-Casamance',
    sousTitre: 'Sédhiou · Pakao · berges du fleuve',
    description: 'Forts historiques, mémoires mandingues et traversées fluviales paisibles.',
  },
  {
    code: 'HAUTE_CASAMANCE',
    titre: 'Haute-Casamance',
    sousTitre: 'Kolda · Vélingara · Fouladou',
    description: 'Réserves naturelles, traditions pastorales du Fouladou et festivals vivants.',
  },
];

@Component({
  selector: 'app-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    LucideArrowRight,
    LucideAward,
    LucideCalendar,
    LucideCompass,
    LucideMapPin,
    LucideRoute,
    LucideSearch,
    LucideShieldCheck,
    LucideStar,
    LucideUsers,
    UiPatrimoineImageComponent,
    UiSkeletonGridComponent,
    UiErrorBannerComponent,
    UiEmptyStateComponent,
    DateFrPipe,
    DifficulteLabelPipe,
    DurationMinutesPipe,
    EvenementTypePipe,
    FcfaPricePipe,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent implements OnInit {
  protected readonly patrimoineStore = inject(PatrimoineStore);
  protected readonly circuitStore = inject(CircuitStore);
  protected readonly evenementStore = inject(EvenementStore);
  private readonly guideApi = inject(GuideApiService);
  private readonly avisApi = inject(AvisApiService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  protected readonly heroQuery = signal('');
  protected readonly guides = signal<GuideProfil[]>([]);
  protected readonly patrimoineAvisMap = signal<Map<number, AvisResume>>(new Map());
  protected readonly circuitAvisMap = signal<Map<number, AvisResume>>(new Map());
  protected readonly zones = ZONES_CASAMANCE;

  protected readonly publishedPatrimoines = computed<Patrimoine[]>(() =>
    this.patrimoineStore
      .items()
      .filter((p) => !p.statutPublication || p.statutPublication === 'PUBLIE')
  );

  protected readonly featuredPatrimoines = computed<Patrimoine[]>(() =>
    this.publishedPatrimoines().slice(0, 4)
  );

  protected readonly publishedCircuits = computed<Circuit[]>(() =>
    this.circuitStore
      .items()
      .filter((c) => !c.statutCircuit || c.statutCircuit === 'PUBLIE')
  );

  protected readonly featuredCircuits = computed<Circuit[]>(() =>
    this.publishedCircuits().slice(0, 3)
  );

  protected readonly upcomingEvenements = computed<Evenement[]>(() => {
    const items = this.evenementStore
      .items()
      .filter((e) => !e.statutEvenement || e.statutEvenement === 'PUBLIE');
    return [...items].sort((a, b) => (a.dateDebut ?? '').localeCompare(b.dateDebut ?? ''));
  });

  protected readonly featuredEvenements = computed<Evenement[]>(() =>
    this.upcomingEvenements().slice(0, 3)
  );

  protected readonly featuredGuides = computed<GuideProfil[]>(() =>
    this.guides()
      .filter((g) => g.statutValidation === 'VALIDE' && g.visibilitePublique)
      .slice(0, 3)
  );

  ngOnInit(): void {
    this.seo.update({
      title: 'Accueil',
      description:
        'Découvrez la Casamance authentique : sites patrimoniaux de Basse, Moyenne et Haute-Casamance, circuits, agenda culturel et guides agréés.',
      canonicalPath: '/',
    });
    void this.loadAllData();
  }

  protected submitHeroSearch(): void {
    const q = this.heroQuery().trim();
    void this.router.navigate(['/patrimoines'], {
      queryParams: q ? { q } : {},
    });
  }

  protected reloadPatrimoines(): void {
    void this.patrimoineStore.reload().then(() => this.loadPatrimoineAvis());
  }

  protected isMemorial(patrimoine: Patrimoine): boolean {
    return isLieuDeMemoire(patrimoine);
  }

  protected formatZoneLabel(zone?: string | null): string {
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

  protected getPatrimoineResume(id: number): AvisResume | null {
    return this.patrimoineAvisMap().get(id) ?? null;
  }

  protected getCircuitResume(id: number): AvisResume | null {
    return this.circuitAvisMap().get(id) ?? null;
  }

  private async loadAllData(): Promise<void> {
    await Promise.all([
      this.patrimoineStore.ensureLoaded(),
      this.circuitStore.ensureLoaded(),
      this.evenementStore.ensureLoaded(),
      firstValueFrom(this.guideApi.getPublicGuides())
        .then((list) => this.guides.set(list))
        .catch(() => this.guides.set([])),
    ]);

    void this.loadPatrimoineAvis();
    void this.loadCircuitAvis();
  }

  private async loadPatrimoineAvis(): Promise<void> {
    const ids = this.featuredPatrimoines().map((p) => p.id);
    if (!ids.length) return;
    const resumes = await firstValueFrom(
      this.avisApi.getResumesBatch('PATRIMOINE', ids)
    ).catch(() => []);
    this.patrimoineAvisMap.set(new Map(resumes.map((r) => [r.cibleId, r])));
  }

  private async loadCircuitAvis(): Promise<void> {
    const ids = this.featuredCircuits().map((c) => c.id);
    if (!ids.length) return;
    const resumes = await firstValueFrom(
      this.avisApi.getResumesBatch('CIRCUIT', ids)
    ).catch(() => []);
    this.circuitAvisMap.set(new Map(resumes.map((r) => [r.cibleId, r])));
  }
}
