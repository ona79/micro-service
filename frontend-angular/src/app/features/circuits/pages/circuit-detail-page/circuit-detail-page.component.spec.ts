import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiPrefixInterceptor } from '../../../../core/interceptors/api-prefix.interceptor';
import { httpErrorInterceptor } from '../../../../core/interceptors/http-error.interceptor';
import { CircuitDetailPageComponent } from './circuit-detail-page.component';

describe('CircuitDetailPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CircuitDetailPageComponent],
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

  it('sorts unordered steps ascending by ordre and resolves patrimoine details', async () => {
    const fixture = TestBed.createComponent(CircuitDetailPageComponent);
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();

    httpMock.expectOne('/api/circuits').flush([]);
    httpMock.expectOne('/api/patrimoines').flush([]);
    httpMock.expectOne('/api/circuits/1').flush({
      id: 1,
      nomCircuit: 'Parcours Sud-Nord',
      descriptionCircuit: 'Itinéraire test',
      difficulte: 'MOYEN',
      dureeEstimee: 135,
      distanceTotale: 280.5,
      placesMax: 20,
      prix: 12000,
      etapes: [
        {
          id: 2,
          ordre: 2,
          dureeVisite: 60,
          patrimoineId: 3,
          patrimoine: {
            id: 3,
            nomPatrimoine: 'Cathédrale de Ziguinchor',
            codePatrimoine: 'PAT-ZIG-003',
            descriptionPatrimoine: null,
            historiquePatrimoine: null,
            adressePatrimoine: 'Ziguinchor',
            capacitePatrimoine: 300,
            latitudePatrimoine: 12.5833,
            longitudePatrimoine: -16.2719,
          },
        },
        {
          id: 1,
          ordre: 1,
          dureeVisite: 75,
          patrimoineId: 1,
          patrimoine: {
            id: 1,
            nomPatrimoine: 'Maison des Esclaves',
            codePatrimoine: 'PAT-DKR-001',
            descriptionPatrimoine: null,
            historiquePatrimoine: null,
            adressePatrimoine: 'Gorée',
            capacitePatrimoine: 150,
            latitudePatrimoine: 14.6672,
            longitudePatrimoine: -17.399,
          },
        },
      ],
    });

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    httpMock
      .expectOne('/api/avis/resume?cibleType=CIRCUIT&cibleId=1')
      .flush({ cibleType: 'CIRCUIT', cibleId: 1, noteMoyenne: 4.5, totalAvis: 1, repartition: { 5: 1 } });
    httpMock
      .expectOne('/api/avis?cibleType=CIRCUIT&cibleId=1&page=0&size=6')
      .flush({ content: [], page: 0, size: 6, totalElements: 0, totalPages: 0, last: true });

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    const titles = Array.from(
      fixture.nativeElement.querySelectorAll('.timeline-item__title') as NodeListOf<HTMLElement>
    ).map((el) => el.textContent?.trim());

    expect(titles).toEqual(['Maison des Esclaves', 'Cathédrale de Ziguinchor']);
  });

  it('falls back to circuit list when direct /api/circuits/:id returns an error', async () => {
    const fixture = TestBed.createComponent(CircuitDetailPageComponent);
    fixture.componentRef.setInput('id', '2');
    fixture.detectChanges();

    // The store calls getAll and loadById
    httpMock.expectOne('/api/circuits').flush([
      {
        id: 2,
        nomCircuit: 'Trésors de Basse-Casamance',
        descriptionCircuit: 'Immersion au cœur des traditions diolas',
        difficulte: 'FACILE',
        dureeEstimee: 180,
        distanceTotale: 55.0,
        placesMax: 15,
        prix: 15000,
        etapes: [],
      },
    ]);
    httpMock.expectOne('/api/patrimoines').flush([]);
    // Direct call to /circuits/2 fails with 403 (replay attack or feign error)
    httpMock.expectOne('/api/circuits/2').flush(
      { statut: 403, erreur: "Attaque par rejeu détectée sur l'enveloppe Gateway." },
      { status: 403, statusText: 'Forbidden' }
    );

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    httpMock
      .expectOne('/api/avis/resume?cibleType=CIRCUIT&cibleId=2')
      .flush({ cibleType: 'CIRCUIT', cibleId: 2, noteMoyenne: 4.8, totalAvis: 2, repartition: { 5: 2 } });
    httpMock
      .expectOne('/api/avis?cibleType=CIRCUIT&cibleId=2&page=0&size=6')
      .flush({ content: [], page: 0, size: 6, totalElements: 0, totalPages: 0, last: true });

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    const titleEl = fixture.nativeElement.querySelector('.circuit-header__title');
    expect(titleEl?.textContent).toContain('Trésors de Basse-Casamance');
  });
});
