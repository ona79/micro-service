import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiPrefixInterceptor } from '../../../../core/interceptors/api-prefix.interceptor';
import { httpErrorInterceptor } from '../../../../core/interceptors/http-error.interceptor';
import { EvenementsListPageComponent } from './evenements-list-page.component';

describe('EvenementsListPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvenementsListPageComponent],
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

  it('loads events from server /recherche and filters by event type chip', async () => {
    const fixture = TestBed.createComponent(EvenementsListPageComponent);
    fixture.detectChanges();

    httpMock
      .expectOne(
        (req) => req.url === '/api/evenements/recherche' && req.params.get('sortBy') === 'dateDebut'
      )
      .flush({
        content: [
          {
            id: 1,
            nomEvenement: 'Journées de la Casamance',
            descriptionEvenement: 'Visite guidée',
            typeEvenement: 'VISITE_GUIDEE',
            dateDebut: '2026-12-15T09:30:00',
            dateFin: '2026-12-15T17:00:00',
            lieu: 'Ziguinchor',
            capaciteMax: 80,
            prix: 5000,
            patrimoineId: 3,
            patrimoine: null,
            statutEvenement: 'PUBLIE',
          },
          {
            id: 2,
            nomEvenement: 'Festival de Carabane',
            descriptionEvenement: 'Musique et patrimoine',
            typeEvenement: 'FESTIVAL',
            dateDebut: '2026-12-20T18:00:00',
            dateFin: '2026-12-20T22:00:00',
            lieu: 'Carabane',
            capaciteMax: 120,
            prix: 0,
            patrimoineId: 2,
            patrimoine: null,
            statutEvenement: 'PUBLIE',
          },
        ],
        page: 0,
        size: 8,
        totalElements: 2,
        totalPages: 1,
        last: true,
      });
    httpMock.expectOne('/api/patrimoines').flush([]);

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    httpMock.expectOne('/api/avis/resumes?cibleType=EVENEMENT&cibleIds=1,2').flush([]);
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Journées de la Casamance');
    expect(fixture.nativeElement.textContent).toContain('Festival de Carabane');
    expect(fixture.nativeElement.textContent).toContain('Gratuit');

    const chips = fixture.nativeElement.querySelectorAll('.type-chip-sm') as NodeListOf<HTMLButtonElement>;
    const festivalChip = Array.from(chips).find((b) => b.textContent?.includes('Festivals'));
    festivalChip?.click();
    fixture.detectChanges();

    httpMock
      .expectOne(
        (req) => req.url === '/api/evenements/recherche' && req.params.get('type') === 'FESTIVAL'
      )
      .flush({
        content: [
          {
            id: 2,
            nomEvenement: 'Festival de Carabane',
            descriptionEvenement: 'Musique et patrimoine',
            typeEvenement: 'FESTIVAL',
            dateDebut: '2026-12-20T18:00:00',
            dateFin: '2026-12-20T22:00:00',
            lieu: 'Carabane',
            capaciteMax: 120,
            prix: 0,
            patrimoineId: 2,
            patrimoine: null,
            statutEvenement: 'PUBLIE',
          },
        ],
        page: 0,
        size: 8,
        totalElements: 1,
        totalPages: 1,
        last: true,
      });

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
    httpMock.expectOne('/api/avis/resumes?cibleType=EVENEMENT&cibleIds=2').flush([]);
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Festival de Carabane');
    expect(fixture.nativeElement.textContent).not.toContain('Journées de la Casamance');
  });
});
