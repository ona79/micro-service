import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { apiPrefixInterceptor } from '../core/interceptors/api-prefix.interceptor';
import { httpErrorInterceptor } from '../core/interceptors/http-error.interceptor';
import { CircuitApiService } from './circuits/data-access/circuit-api.service';
import { EvenementApiService } from './evenements/data-access/evenement-api.service';
import { PatrimoineApiService } from './patrimoines/data-access/patrimoine-api.service';
import { ReservationApiService } from './reservations/data-access/reservation-api.service';

describe('Domain API Services', () => {
  let httpMock: HttpTestingController;
  let patrimoineApi: PatrimoineApiService;
  let circuitApi: CircuitApiService;
  let evenementApi: EvenementApiService;
  let reservationApi: ReservationApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiPrefixInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    patrimoineApi = TestBed.inject(PatrimoineApiService);
    circuitApi = TestBed.inject(CircuitApiService);
    evenementApi = TestBed.inject(EvenementApiService);
    reservationApi = TestBed.inject(ReservationApiService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('calls GET /api/patrimoines and GET /api/patrimoines/:id', async () => {
    const pAll = firstValueFrom(patrimoineApi.getAll());
    httpMock.expectOne('/api/patrimoines').flush([]);
    expect(await pAll).toEqual([]);

    const pOne = firstValueFrom(patrimoineApi.getById(1));
    httpMock.expectOne('/api/patrimoines/1').flush({ id: 1, nomPatrimoine: 'Mémorial du Joola' });
    expect((await pOne).id).toBe(1);
  });

  it('calls P03 search and lifecycle endpoints on PatrimoineApiService', async () => {
    const searchPromise = firstValueFrom(
      patrimoineApi.rechercher({ q: 'Ziguinchor', categorie: 'HISTORIQUE', page: 0, size: 6 })
    );
    const searchReq = httpMock.expectOne(
      (req) =>
        req.url === '/api/patrimoines/recherche' &&
        req.params.get('q') === 'Ziguinchor' &&
        req.params.get('categorie') === 'HISTORIQUE'
    );
    expect(searchReq.request.method).toBe('GET');
    searchReq.flush({ content: [], page: 0, size: 6, totalElements: 0, totalPages: 0, last: true });
    expect((await searchPromise).totalElements).toBe(0);

    const pubPromise = firstValueFrom(patrimoineApi.publier(1));
    const pubReq = httpMock.expectOne('/api/patrimoines/1/publier');
    expect(pubReq.request.method).toBe('PUT');
    pubReq.flush({ id: 1, statutPublication: 'PUBLIE' });
    expect((await pubPromise).statutPublication).toBe('PUBLIE');

    const archPromise = firstValueFrom(patrimoineApi.archiver(1, 'Restauration'));
    const archReq = httpMock.expectOne('/api/patrimoines/1/archiver');
    expect(archReq.request.method).toBe('PUT');
    archReq.flush({ id: 1, statutPublication: 'ARCHIVE' });
    expect((await archPromise).statutPublication).toBe('ARCHIVE');
  });

  it('calls GET /api/circuits, PUT /api/circuits/:id and GET /api/evenements/a-venir', async () => {
    const cAll = firstValueFrom(circuitApi.getAll());
    httpMock.expectOne('/api/circuits').flush([]);
    expect(await cAll).toEqual([]);

    const cUpdate = firstValueFrom(circuitApi.update(2, { nomCircuit: 'Boucle Casamance' }));
    const putCircuit = httpMock.expectOne('/api/circuits/2');
    expect(putCircuit.request.method).toBe('PUT');
    putCircuit.flush({ id: 2, nomCircuit: 'Boucle Casamance' });
    expect((await cUpdate).id).toBe(2);

    const eAll = firstValueFrom(evenementApi.getAll());
    httpMock.expectOne('/api/evenements').flush([]);
    expect(await eAll).toEqual([]);

    const eAVenir = firstValueFrom(evenementApi.getAVenir());
    httpMock.expectOne('/api/evenements/a-venir').flush([]);
    expect(await eAVenir).toEqual([]);

    const eAnnuler = firstValueFrom(evenementApi.annuler(3, 'Météo'));
    const putAnnuler = httpMock.expectOne('/api/evenements/3/annuler');
    expect(putAnnuler.request.method).toBe('PUT');
    putAnnuler.flush({ id: 3, statutEvenement: 'ANNULE' });
    expect((await eAnnuler).statutEvenement).toBe('ANNULE');
  });

  it('calls POST /api/reservations and PUT /api/reservations/:id/annuler', async () => {
    const createdPromise = firstValueFrom(
      reservationApi.create({
        nomClient: 'Aminata Diallo',
        emailClient: 'aminata@uasz.sn',
        telephoneClient: null,
        nombrePlaces: 2,
        typeReservation: 'CIRCUIT',
        circuitId: 1,
        evenementId: null,
      })
    );
    const postReq = httpMock.expectOne('/api/reservations');
    expect(postReq.request.method).toBe('POST');
    postReq.flush({ id: 7, statut: 'CONFIRMEE' });
    expect((await createdPromise).id).toBe(7);

    const cancelPromise = firstValueFrom(reservationApi.cancel(7));
    const putReq = httpMock.expectOne('/api/reservations/7/annuler');
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ id: 7, statut: 'ANNULEE' });
    expect((await cancelPromise).statut).toBe('ANNULEE');
  });
});
