import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiPrefixInterceptor } from '../../../../core/interceptors/api-prefix.interceptor';
import { httpErrorInterceptor } from '../../../../core/interceptors/http-error.interceptor';
import { PatrimoineDetailPageComponent } from './patrimoine-detail-page.component';

describe('PatrimoineDetailPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatrimoineDetailPageComponent],
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

  it('loads detail, renders memorial notice for Gorée, and handles 404 gracefully', async () => {
    const fixture = TestBed.createComponent(PatrimoineDetailPageComponent);
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();

    httpMock.expectOne('/api/patrimoines').flush([]);
    httpMock.expectOne('/api/circuits').flush([]);
    httpMock.expectOne('/api/evenements').flush([]);
    httpMock.expectOne('/api/patrimoines/1').flush({
      id: 1,
      nomPatrimoine: 'Maison des Esclaves de Gorée',
      codePatrimoine: 'PAT-DKR-001',
      descriptionPatrimoine: 'Lieu historique',
      historiquePatrimoine: 'Inscrit UNESCO 1978',
      adressePatrimoine: 'Île de Gorée',
      capacitePatrimoine: 150,
      latitudePatrimoine: 14.6672,
      longitudePatrimoine: -17.399,
    });

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Lieu de recueillement');
    expect(text).toContain('Inscrit UNESCO 1978');

    // Changement d'ID vers un patrimoine inexistant (404)
    fixture.componentRef.setInput('id', '999');
    fixture.detectChanges();
    httpMock
      .expectOne('/api/patrimoines/999')
      .flush({ erreur: 'Patrimoine introuvable avec l’id : 999' }, { status: 404, statusText: 'Not Found' });

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Patrimoine introuvable avec l’id : 999');
  });
});
