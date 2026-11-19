import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AvisResume } from '../../../../core/models/avis.model';
import { Circuit } from '../../../../core/models/circuit.model';
import { Evenement } from '../../../../core/models/evenement.model';
import { GuideProfil } from '../../../../core/models/guide.model';
import { Patrimoine } from '../../../../core/models/patrimoine.model';
import { SeoService } from '../../../../core/services/seo.service';
import { AvisApiService } from '../../../avis/data-access/avis-api.service';
import { CircuitStore } from '../../../circuits/data-access/circuit.store';
import { EvenementStore } from '../../../evenements/data-access/evenement.store';
import { GuideApiService } from '../../../guides/data-access/guide-api.service';
import { PatrimoineStore } from '../../../patrimoines/data-access/patrimoine.store';
import { HomeCircuitsSectionComponent } from '../../components/home-circuits-section/home-circuits-section.component';
import { HomeCtaBannerSectionComponent } from '../../components/home-cta-banner-section/home-cta-banner-section.component';
import { HomeEvenementsSectionComponent } from '../../components/home-evenements-section/home-evenements-section.component';
import { HomeGuidesSectionComponent } from '../../components/home-guides-section/home-guides-section.component';
import { HomeHeroSectionComponent } from '../../components/home-hero-section/home-hero-section.component';
import { HomePatrimoinesSectionComponent } from '../../components/home-patrimoines-section/home-patrimoines-section.component';
import {
  HomeTerroirsSectionComponent,
  ZoneCasamanceCard,
} from '../../components/home-terroirs-section/home-terroirs-section.component';

const ZONES_CASAMANCE: readonly ZoneCasamanceCard[] = [
  {
    code: 'BASSE_CASAMANCE',
    titre: 'Basse-Casamance',
    sousTitre: 'Ziguinchor · Oussouye · Carabane · Enampore',
    description: 'Cases à impluvium diolas, bois sacrés, bolongs de mangrove et îles estuariennes.',
    image: '/images/patrimoines/PAT-CAS-005.webp',
  },
  {
    code: 'MOYENNE_CASAMANCE',
    titre: 'Moyenne-Casamance',
    sousTitre: 'Sédhiou · Pakao · berges du fleuve',
    description: 'Forts historiques, mémoires mandingues et traversées fluviales paisibles.',
    image: '/images/patrimoines/PAT-CRB-002.webp',
  },
  {
    code: 'HAUTE_CASAMANCE',
    titre: 'Haute-Casamance',
    sousTitre: 'Kolda · Vélingara · Fouladou',
    description: 'Réserves naturelles, traditions pastorales du Fouladou et festivals vivants.',
    image: '/images/patrimoines/PAT-KOL-008.webp',
  },
];

@Component({
  selector: 'app-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HomeHeroSectionComponent,
    HomeTerroirsSectionComponent,
    HomePatrimoinesSectionComponent,
    HomeCircuitsSectionComponent,
    HomeEvenementsSectionComponent,
    HomeGuidesSectionComponent,
    HomeCtaBannerSectionComponent,
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
    this.publishedPatrimoines().slice(0, 3)
  );

  protected readonly publishedCircuits = computed<Circuit[]>(() =>
    this.circuitStore
      .items()
      .filter((c) => !c.statutCircuit || c.statutCircuit === 'PUBLIE')
  );

  protected readonly featuredCircuits = computed<Circuit[]>(() =>
    this.publishedCircuits().slice(0, 6)
  );

  protected readonly upcomingEvenements = computed<Evenement[]>(() => {
    const items = this.evenementStore
      .items()
      .filter((e) => !e.statutEvenement || e.statutEvenement === 'PUBLIE');
    return [...items].sort((a, b) => (a.dateDebut ?? '').localeCompare(b.dateDebut ?? ''));
  });

  protected readonly featuredEvenements = computed<Evenement[]>(() =>
    this.upcomingEvenements().slice(0, 4)
  );

  protected readonly featuredGuides = computed<GuideProfil[]>(() =>
    this.guides()
      .filter((g) => g.statutValidation === 'VALIDE' && g.visibilitePublique)
      .slice(0, 3)
  );

  protected readonly totalGuidesCount = computed<number>(() =>
    this.featuredGuides().length > 0 || this.guides().length > 0 ? this.guides().length : 0
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

  protected submitHeroSearch(q: string): void {
    const trimmed = q.trim();
    void this.router.navigate(['/patrimoines'], {
      queryParams: trimmed ? { q: trimmed } : {},
    });
  }

  protected reloadPatrimoines(): void {
    void this.patrimoineStore.reload().then(() => this.loadPatrimoineAvis());
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
