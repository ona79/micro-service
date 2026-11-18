import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthStore } from '../core/auth/auth.store';
import { apiPrefixInterceptor } from '../core/interceptors/api-prefix.interceptor';
import { httpErrorInterceptor } from '../core/interceptors/http-error.interceptor';
import { AccountPageComponent } from './auth/pages/account-page/account-page.component';
import { CircuitsListPageComponent } from './circuits/pages/circuits-list-page/circuits-list-page.component';
import { GuideDetailPageComponent } from './guides/pages/guide-detail-page/guide-detail-page.component';
import { PatrimoinesListPageComponent } from './patrimoines/pages/patrimoines-list-page/patrimoines-list-page.component';
import { ReservationDetailPageComponent } from './reservations/pages/reservation-detail-page/reservation-detail-page.component';

const flush = () => new Promise<void>((r) => setTimeout(r, 15));

describe('P06 PatrimoinesListPage Server Filtering & Draft Isolation', () => {
  let httpMock: HttpTestingController;
  let qp$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(() => {
    qp$ = new BehaviorSubject(convertToParamMap({ zone: 'BASSE_CASAMANCE' }));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiPrefixInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: qp$.asObservable() },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('filters out non-PUBLIE drafts and paginates server results', async () => {
    const fixture = TestBed.createComponent(PatrimoinesListPageComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (r) =>
        r.url === '/api/patrimoines/recherche' &&
        r.params.get('zone') === 'BASSE_CASAMANCE' &&
        r.params.get('page') === '0'
    );
    req.flush({
      content: [
        {
          id: 2,
          nomPatrimoine: 'Île de Carabane',
          codePatrimoine: 'PAT-CRB-002',
          descriptionPatrimoine: 'Comptoir insulaire historique.',
          historiquePatrimoine: null,
          adressePatrimoine: 'Carabane',
          capacitePatrimoine: 200,
          latitudePatrimoine: 12.55,
          longitudePatrimoine: -16.7,
          zoneGeographique: 'BASSE_CASAMANCE',
          statutPublication: 'PUBLIE',
        },
        {
          id: 99,
          nomPatrimoine: 'Site confidentiel non publié',
          codePatrimoine: 'PAT-PRIV-099',
          descriptionPatrimoine: 'Brouillon interne.',
          historiquePatrimoine: null,
          adressePatrimoine: 'Secret',
          capacitePatrimoine: 10,
          latitudePatrimoine: 12.5,
          longitudePatrimoine: -16.5,
          statutPublication: 'BROUILLON',
        },
      ],
      page: 0,
      size: 9,
      totalElements: 12,
      totalPages: 2,
      last: false,
    });

    await flush();
    fixture.detectChanges();

    httpMock.expectOne('/api/avis/resumes?cibleType=PATRIMOINE&cibleIds=2').flush([]);
    await flush();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Île de Carabane');
    expect(text).not.toContain('Site confidentiel non publié');
    expect(text).toContain('Page 1 / 2');
  });
});

describe('P06 Expérience Touristique Publique & Espace Personnel', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiPrefixInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('CircuitsListPageComponent displays indicative orthodromic caveat and review scores', async () => {
    const fixture = TestBed.createComponent(CircuitsListPageComponent);
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url === '/api/circuits/recherche')
      .flush({
        content: [
          {
            id: 5,
            nomCircuit: 'Des Bolongs à Enampore',
            descriptionCircuit: 'Découverte des cases à impluvium.',
            difficulte: 'FACILE',
            moyenTransport: 'PIROGUE',
            dureeEstimee: 180,
            distanceTotale: 24.5,
            placesMax: 15,
            prix: 18000,
            statutCircuit: 'PUBLIE',
            etapes: [],
          },
        ],
        page: 0,
        size: 8,
        totalElements: 1,
        totalPages: 1,
        last: true,
      });
    httpMock.expectOne('/api/patrimoines').flush([]);

    await flush();
    fixture.detectChanges();

    httpMock
      .expectOne('/api/avis/resumes?cibleType=CIRCUIT&cibleIds=5')
      .flush([{ cibleType: 'CIRCUIT', cibleId: 5, noteMoyenne: 4.9, totalAvis: 4, repartition: {} }]);
    await flush();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Des Bolongs à Enampore');
    expect(text).toContain('24.5 km (vol d’oiseau · indicatif)');
    expect(text).toContain('4.9/5 (4)');
  });

  it('GuideDetailPageComponent blocks display of unvalidated or hidden guide profiles', async () => {
    const fixture = TestBed.createComponent(GuideDetailPageComponent);
    fixture.componentRef.setInput('id', '7');
    fixture.detectChanges();

    httpMock.expectOne('/api/circuits').flush([]);
    httpMock.expectOne('/api/guides/7').flush({
      id: 7,
      utilisateurId: 77,
      nom: 'Sagna',
      prenom: 'Oumar',
      compteActif: true,
      presentationCourte: 'En attente',
      biographie: 'Non validé',
      languesParlees: 'Français',
      specialites: 'Culture',
      zonesIntervention: 'Kolda',
      anneesExperience: 2,
      disponible: true,
      visibilitePublique: false,
      statutValidation: 'EN_ATTENTE_VALIDATION',
    });

    await flush();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('n’est pas accessible publiquement');
    expect(fixture.nativeElement.textContent).not.toContain('Oumar Sagna');
  });

  it('ReservationDetailPageComponent displays reservation details, timeline, and handles 403 BOLA gracefully', async () => {
    const fixture = TestBed.createComponent(ReservationDetailPageComponent);
    fixture.componentRef.setInput('id', '42');
    fixture.detectChanges();

    httpMock.expectOne('/api/reservations/42').flush({
      id: 42,
      referenceReservation: 'RES-CAS-042',
      nomClient: 'Moussa Diop',
      emailClient: 'moussa@uasz.sn',
      telephoneClient: '+221771234567',
      nombrePlaces: 2,
      dateReservation: '2026-11-18T10:00:00',
      datePrestation: '2026-12-10',
      creneauPrestation: 'Matin (09h00)',
      typeReservation: 'CIRCUIT',
      statut: 'CONFIRMEE',
      montantTotal: 30000,
      circuitId: 1,
      evenementId: null,
      circuit: { id: 1, nomCircuit: 'Carabane & Bolongs', prix: 15000 },
      evenement: null,
      participants: [{ nomComplet: 'Moussa Diop', categorie: 'ADULTE' }],
      historique: [
        {
          id: 1,
          ancienStatut: 'EN_ATTENTE_PAIEMENT',
          nouveauStatut: 'CONFIRMEE',
          acteurId: 10,
          acteurRole: 'TOURISTE',
          acteurType: 'USER',
          correlationId: null,
          referencePaiement: 'PAY-1',
          motif: 'Paiement simulé validé',
          dateTransition: '2026-11-18T10:05:00',
        },
      ],
    });
    httpMock.expectOne('/api/paiements/reservation/42').flush([]);

    await flush();
    httpMock.expectOne('/api/reservations/42/billets').flush([]);
    await flush();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('RES-CAS-042');
    expect(text).toContain('Carabane & Bolongs');
    expect(text).toContain('Paiement simulé validé');
    expect(text).toContain('Laisser un avis');

    fixture.componentRef.setInput('id', '999');
    fixture.detectChanges();
    httpMock
      .expectOne('/api/reservations/999')
      .flush({ erreur: 'Accès interdit à cette réservation' }, { status: 403, statusText: 'Forbidden' });
    httpMock.expectOne('/api/paiements/reservation/999').flush([]);

    await flush();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Accès interdit');
  });

  it('AccountPageComponent allows authenticated tourist to update profile via PUT /api/utilisateurs/:id', async () => {
    const authStore = TestBed.inject(AuthStore);
    const loginPromise = authStore.login({ email: 'moussa@uasz.sn', motDePasse: 'Pass123!' });
    httpMock.expectOne('/api/utilisateurs/connexion').flush({
      id: 12,
      prenom: 'Moussa',
      nom: 'Diop',
      email: 'moussa@uasz.sn',
      telephone: '+221770000001',
      role: 'TOURISTE',
      actif: true,
      dateInscription: '2026-10-01T09:00:00',
    });
    await loginPromise;

    const fixture = TestBed.createComponent(AccountPageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/reservations').flush([]);
    httpMock.expectOne('/api/paiements').flush([]);
    await flush();

    httpMock
      .expectOne((r) => r.url === '/api/notifications/mes-notifications')
      .flush({ content: [], unreadCount: 0 });
    httpMock.expectOne('/api/avis/mes-avis').flush([]);

    await flush();
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      openProfileTab: () => void;
      profileForm: { patchValue: (v: Record<string, unknown>) => void };
      saveProfile: () => Promise<void>;
    };
    comp.openProfileTab();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mes informations personnelles');
    comp.profileForm.patchValue({ nom: 'Diop-Badji', telephone: '+221779998877' });

    const savePromise = comp.saveProfile();
    const putReq = httpMock.expectOne('/api/utilisateurs/12');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body.nom).toBe('Diop-Badji');
    expect(putReq.request.body.motDePasse).toBeUndefined();
    putReq.flush({
      id: 12,
      prenom: 'Moussa',
      nom: 'Diop-Badji',
      email: 'moussa@uasz.sn',
      telephone: '+221779998877',
      role: 'TOURISTE',
      actif: true,
      dateInscription: '2026-10-01T09:00:00',
    });

    await savePromise;
    fixture.detectChanges();

    expect(authStore.user()?.nom).toBe('Diop-Badji');
  });
});
