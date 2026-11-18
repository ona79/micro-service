import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiPrefixInterceptor } from '../../../../core/interceptors/api-prefix.interceptor';
import { httpErrorInterceptor } from '../../../../core/interceptors/http-error.interceptor';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiPrefixInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads Casamance sections, excludes unpublished drafts, and handles memorial badge', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/patrimoines').flush([
      {
        id: 1,
        nomPatrimoine: 'Mémorial de la Tragédie du Joola',
        codePatrimoine: 'PAT-ZIG-001',
        descriptionPatrimoine: 'Lieu de mémoire à Ziguinchor',
        historiquePatrimoine: '2002',
        adressePatrimoine: 'Ziguinchor',
        capacitePatrimoine: 250,
        latitudePatrimoine: 12.58,
        longitudePatrimoine: -16.27,
        statutPublication: 'PUBLIE',
        zoneGeographique: 'BASSE_CASAMANCE',
      },
      {
        id: 2,
        nomPatrimoine: 'Site en brouillon caché',
        codePatrimoine: 'PAT-ZIG-999',
        descriptionPatrimoine: 'Ne doit pas paraître',
        historiquePatrimoine: null,
        adressePatrimoine: 'Ziguinchor',
        capacitePatrimoine: 50,
        latitudePatrimoine: 12.58,
        longitudePatrimoine: -16.27,
        statutPublication: 'BROUILLON',
      },
    ]);
    httpMock.expectOne('/api/circuits').flush([
      {
        id: 10,
        nomCircuit: 'Bolongs de Casamance en pirogue',
        descriptionCircuit: 'Navigation douce entre les villages.',
        difficulte: 'FACILE',
        dureeEstimee: 180,
        distanceTotale: 14.5,
        placesMax: 12,
        prix: 15000,
        statutCircuit: 'PUBLIE',
        etapes: [],
      },
    ]);
    httpMock.expectOne('/api/evenements').flush([
      {
        id: 20,
        nomEvenement: 'Kankourang de Sédhiou',
        descriptionEvenement: 'Cérémonie culturelle.',
        typeEvenement: 'CEREMONIE_TRADITIONNELLE',
        dateDebut: '2026-12-15T09:30:00',
        dateFin: '2026-12-15T18:00:00',
        lieu: 'Sédhiou',
        capaciteMax: 200,
        prix: 0,
        patrimoineId: null,
        patrimoine: null,
        statutEvenement: 'PUBLIE',
      },
    ]);
    httpMock.expectOne('/api/guides').flush([
      {
        id: 5,
        utilisateurId: 50,
        nom: 'Diatta',
        prenom: 'Awa',
        compteActif: true,
        presentationCourte: 'Spécialiste des cases à impluvium.',
        biographie: 'Guide certifiée en Basse-Casamance.',
        languesParlees: 'Français, Diola, Wolof',
        specialites: 'Architecture diola',
        zonesIntervention: 'Basse-Casamance',
        anneesExperience: 7,
        disponible: true,
        visibilitePublique: true,
        statutValidation: 'VALIDE',
      },
    ]);

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    httpMock
      .expectOne('/api/avis/resumes?cibleType=PATRIMOINE&cibleIds=1')
      .flush([{ cibleType: 'PATRIMOINE', cibleId: 1, noteMoyenne: 4.8, totalAvis: 3, repartition: { 5: 3 } }]);
    httpMock
      .expectOne('/api/avis/resumes?cibleType=CIRCUIT&cibleIds=10')
      .flush([]);

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('1 site(s) référencé(s)');
    expect(text).toContain('1 parcours disponible(s)');
    expect(text).toContain('1 événement(s) à venir');
    expect(text).toContain('Mémorial de la Tragédie du Joola');
    expect(text).toContain('Lieu de mémoire');
    expect(text).not.toContain('Site en brouillon caché');
    expect(text).toContain('Bolongs de Casamance en pirogue');
    expect(text).toContain('à vol d’oiseau');
    expect(text).toContain('Kankourang de Sédhiou');
    expect(text).toContain('Awa Diatta');
  });

  it('displays error banner when /api/patrimoines fails', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    httpMock
      .expectOne('/api/patrimoines')
      .flush({ erreur: 'Erreur interne du serveur' }, { status: 500, statusText: 'Error' });
    httpMock.expectOne('/api/circuits').flush([]);
    httpMock.expectOne('/api/evenements').flush([]);
    httpMock.expectOne('/api/guides').flush([]);

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Impossible de charger les patrimoines');
    expect(fixture.nativeElement.textContent).toContain('Erreur interne du serveur');
  });
});
