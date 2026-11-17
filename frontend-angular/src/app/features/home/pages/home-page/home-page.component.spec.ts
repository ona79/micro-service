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

  it('loads featured patrimoines, displays real API counts, and handles memorial badge', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/patrimoines').flush([
      {
        id: 1,
        nomPatrimoine: 'Maison des Esclaves de Gorée',
        codePatrimoine: 'PAT-DKR-001',
        descriptionPatrimoine: 'Site UNESCO',
        historiquePatrimoine: '1776',
        adressePatrimoine: 'Gorée',
        capacitePatrimoine: 150,
        latitudePatrimoine: 14.6672,
        longitudePatrimoine: -17.399,
      },
    ]);
    httpMock.expectOne('/api/circuits').flush([]);
    httpMock.expectOne('/api/evenements').flush([]);

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('1 site(s) référencé(s)');
    expect(text).toContain('0 parcours disponible(s)');
    expect(text).toContain('Maison des Esclaves de Gorée');
    expect(text).toContain('Lieu de mémoire');
  });

  it('displays error banner when /api/patrimoines fails', async () => {
    const fixture = TestBed.createComponent(HomePageComponent);
    fixture.detectChanges();

    httpMock
      .expectOne('/api/patrimoines')
      .flush({ erreur: 'Erreur interne du serveur' }, { status: 500, statusText: 'Error' });
    httpMock.expectOne('/api/circuits').flush([]);
    httpMock.expectOne('/api/evenements').flush([]);

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Impossible de charger les patrimoines');
    expect(fixture.nativeElement.textContent).toContain('Erreur interne du serveur');
  });
});
