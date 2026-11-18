import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { apiPrefixInterceptor } from '../../../../core/interceptors/api-prefix.interceptor';
import { httpErrorInterceptor } from '../../../../core/interceptors/http-error.interceptor';
import { PatrimoinesListPageComponent } from './patrimoines-list-page.component';

describe('PatrimoinesListPageComponent', () => {
  let httpMock: HttpTestingController;
  let queryParams$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const MOCK_PATRIMOINES = [
    {
      id: 1,
      nomPatrimoine: 'Maison des Esclaves de Gorée',
      codePatrimoine: 'PAT-DKR-001',
      descriptionPatrimoine: 'Monument historique.',
      historiquePatrimoine: '1776',
      adressePatrimoine: 'Île de Gorée, Dakar',
      capacitePatrimoine: 150,
      latitudePatrimoine: 14.6672,
      longitudePatrimoine: -17.399,
    },
    {
      id: 2,
      nomPatrimoine: 'Cathédrale Saint-Antoine de Padoue',
      codePatrimoine: 'PAT-ZIG-003',
      descriptionPatrimoine: 'Édifice religieux.',
      historiquePatrimoine: 'Colonial',
      adressePatrimoine: 'Centre-ville, Ziguinchor',
      capacitePatrimoine: 300,
      latitudePatrimoine: 12.5833,
      longitudePatrimoine: -16.2719,
    },
  ];

  beforeEach(async () => {
    queryParams$ = new BehaviorSubject(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [PatrimoinesListPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiPrefixInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: queryParams$.asObservable() },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads patrimoines and synchronizes search with ?q= query param', async () => {
    const fixture = TestBed.createComponent(PatrimoinesListPageComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/patrimoines');
    req.flush(MOCK_PATRIMOINES);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Maison des Esclaves de Gorée');
    expect(text).toContain('Cathédrale Saint-Antoine de Padoue');

    // Simule navigation vers /patrimoines?q=Ziguinchor
    queryParams$.next(convertToParamMap({ q: 'Ziguinchor' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Maison des Esclaves de Gorée');
    expect(fixture.nativeElement.textContent).toContain('Cathédrale Saint-Antoine de Padoue');

    // Simule retour vers /patrimoines sans ?q= -> doit réinitialiser la recherche
    queryParams$.next(convertToParamMap({}));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Maison des Esclaves de Gorée');
  });
});
