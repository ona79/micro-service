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
      nomPatrimoine: 'Mémorial de la Tragédie du Joola',
      codePatrimoine: 'PAT-ZIG-001',
      descriptionPatrimoine: 'Lieu de mémoire.',
      historiquePatrimoine: '2002',
      adressePatrimoine: 'Ziguinchor',
      capacitePatrimoine: 250,
      latitudePatrimoine: 12.583,
      longitudePatrimoine: -16.271,
      zoneGeographique: 'BASSE_CASAMANCE',
      statutPublication: 'PUBLIE',
    },
    {
      id: 2,
      nomPatrimoine: 'Fort de Sédhiou',
      codePatrimoine: 'PAT-SED-006',
      descriptionPatrimoine: 'Fort historique.',
      historiquePatrimoine: 'Colonial',
      adressePatrimoine: 'Sédhiou',
      capacitePatrimoine: 150,
      latitudePatrimoine: 12.708,
      longitudePatrimoine: -15.556,
      zoneGeographique: 'MOYENNE_CASAMANCE',
      statutPublication: 'PUBLIE',
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

  it('calls server /recherche and synchronizes ?q= query param', async () => {
    const fixture = TestBed.createComponent(PatrimoinesListPageComponent);
    fixture.detectChanges();

    httpMock
      .expectOne(
        (req) =>
          req.url === '/api/patrimoines/recherche' &&
          req.params.get('sortBy') === 'nom' &&
          req.params.get('page') === '0'
      )
      .flush({
        content: MOCK_PATRIMOINES,
        page: 0,
        size: 9,
        totalElements: 2,
        totalPages: 1,
        last: true,
      });

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    httpMock.expectOne('/api/avis/resumes?cibleType=PATRIMOINE&cibleIds=1,2').flush([]);
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Mémorial de la Tragédie du Joola');
    expect(text).toContain('Fort de Sédhiou');

    // Navigation vers /patrimoines?q=Sédhiou
    queryParams$.next(convertToParamMap({ q: 'Sédhiou' }));
    fixture.detectChanges();

    httpMock
      .expectOne(
        (req) =>
          req.url === '/api/patrimoines/recherche' && req.params.get('q') === 'Sédhiou'
      )
      .flush({
        content: [MOCK_PATRIMOINES[1]],
        page: 0,
        size: 9,
        totalElements: 1,
        totalPages: 1,
        last: true,
      });

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    httpMock.expectOne('/api/avis/resumes?cibleType=PATRIMOINE&cibleIds=2').flush([]);
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Mémorial de la Tragédie du Joola');
    expect(fixture.nativeElement.textContent).toContain('Fort de Sédhiou');
  });

  it('charge les sites de proximité via getProximite et affiche le badge distance', async () => {
    const fixture = TestBed.createComponent(PatrimoinesListPageComponent);
    fixture.detectChanges();

    // Rejet de la première requête initiale standard
    httpMock.expectOne((req) => req.url.startsWith('/api/patrimoines/recherche')).flush({
      content: [],
      page: 0,
      size: 9,
      totalElements: 0,
      totalPages: 1,
      last: true,
    });
    await new Promise((r) => setTimeout(r, 0));

    // Simulation de l'appel direct à loadProximite
    const proxItem = {
      ...MOCK_PATRIMOINES[0],
      distanceKm: 8.5,
    };
    void (fixture.componentInstance as any).loadProximite(12.58, -16.27);

    const proxReq = httpMock.expectOne(
      (req) => req.url === '/api/patrimoines/proximite' && req.params.get('lat') === '12.58'
    );
    proxReq.flush([proxItem]);

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    httpMock.expectOne('/api/avis/resumes?cibleType=PATRIMOINE&cibleIds=1').flush([]);
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Mémorial de la Tragédie du Joola');
    expect(text).toContain('8.5 km');
  });
});
