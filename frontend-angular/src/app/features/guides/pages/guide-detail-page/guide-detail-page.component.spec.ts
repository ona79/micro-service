import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { apiPrefixInterceptor } from '../../../../core/interceptors/api-prefix.interceptor';
import { httpErrorInterceptor } from '../../../../core/interceptors/http-error.interceptor';
import { GuideDetailPageComponent } from './guide-detail-page.component';

describe('GuideDetailPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuideDetailPageComponent],
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

  it('loads guide by ID when direct endpoint succeeds', async () => {
    const fixture = TestBed.createComponent(GuideDetailPageComponent);
    fixture.componentRef.setInput('id', '10');
    fixture.detectChanges();

    httpMock.expectOne('/api/circuits').flush([]);
    httpMock.expectOne('/api/guides/10').flush({
      id: 10,
      utilisateurId: 100,
      prenom: 'Fatou',
      nom: 'Badji',
      presentationCourte: 'Spécialiste de la Casamance maritime',
      biographie: '10 ans de guidage en Casamance',
      zonesIntervention: 'Basse-Casamance, Carabane',
      languesParlees: 'Français, Diola, Wolof',
      specialites: 'Écotourisme, histoire locale',
      anneesExperience: 8,
      tarifJournalierIndicatif: 25000,
      disponible: true,
      visibilitePublique: true,
      statutValidation: 'VALIDE',
    });

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    httpMock
      .expectOne('/api/avis/resume?cibleType=GUIDE&cibleId=100')
      .flush({ cibleType: 'GUIDE', cibleId: 100, noteMoyenne: 5, totalAvis: 3, repartition: { 5: 3 } });
    httpMock
      .expectOne('/api/avis?cibleType=GUIDE&cibleId=100&page=0&size=6')
      .flush({ content: [], page: 0, size: 6, totalElements: 0, totalPages: 0, last: true });

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    const titleEl = fixture.nativeElement.querySelector('.guide-hero__title');
    expect(titleEl?.textContent).toContain('Fatou Badji');
  });

  it('falls back to getByUtilisateurId when /guides/:id returns 404', async () => {
    const fixture = TestBed.createComponent(GuideDetailPageComponent);
    fixture.componentRef.setInput('id', '100');
    fixture.detectChanges();

    httpMock.expectOne('/api/circuits').flush([]);
    // Simulate 404 on direct /guides/100
    httpMock.expectOne('/api/guides/100').flush({ message: 'Guide not found' }, { status: 404, statusText: 'Not Found' });

    await new Promise((r) => setTimeout(r, 0));

    // Fallback request to /guides/utilisateur/100
    httpMock.expectOne('/api/guides/utilisateur/100').flush({
      id: 10,
      utilisateurId: 100,
      prenom: 'Fatou',
      nom: 'Badji',
      presentationCourte: 'Spécialiste de la Casamance maritime',
      biographie: '10 ans de guidage en Casamance',
      zonesIntervention: 'Basse-Casamance, Carabane',
      languesParlees: 'Français, Diola, Wolof',
      specialites: 'Écotourisme, histoire locale',
      anneesExperience: 8,
      tarifJournalierIndicatif: 25000,
      disponible: true,
      visibilitePublique: true,
      statutValidation: 'VALIDE',
    });

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    httpMock
      .expectOne('/api/avis/resume?cibleType=GUIDE&cibleId=100')
      .flush({ cibleType: 'GUIDE', cibleId: 100, noteMoyenne: 5, totalAvis: 3, repartition: { 5: 3 } });
    httpMock
      .expectOne('/api/avis?cibleType=GUIDE&cibleId=100&page=0&size=6')
      .flush({ content: [], page: 0, size: 6, totalElements: 0, totalPages: 0, last: true });

    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    const titleEl = fixture.nativeElement.querySelector('.guide-hero__title');
    expect(titleEl?.textContent).toContain('Fatou Badji');
  });
});
