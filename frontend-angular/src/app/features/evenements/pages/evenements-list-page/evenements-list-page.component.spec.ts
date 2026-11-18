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

  it('loads events and filters by event type chip', async () => {
    const fixture = TestBed.createComponent(EvenementsListPageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/evenements').flush([
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
      },
      {
        id: 2,
        nomEvenement: 'Festival de Gorée',
        descriptionEvenement: 'Musique et patrimoine',
        typeEvenement: 'FESTIVAL',
        dateDebut: '2026-12-20T18:00:00',
        dateFin: '2026-12-20T22:00:00',
        lieu: 'Gorée',
        capaciteMax: 120,
        prix: 0,
        patrimoineId: 1,
        patrimoine: null,
      },
    ]);
    httpMock.expectOne('/api/patrimoines').flush([]);

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Journées de la Casamance');
    expect(fixture.nativeElement.textContent).toContain('Festival de Gorée');
    expect(fixture.nativeElement.textContent).toContain('Gratuit');

    const chips = fixture.nativeElement.querySelectorAll('.type-chip') as NodeListOf<HTMLButtonElement>;
    const festivalChip = Array.from(chips).find((b) => b.textContent?.includes('Festivals'));
    festivalChip?.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Festival de Gorée');
    expect(fixture.nativeElement.textContent).not.toContain('Journées de la Casamance');
  });
});
