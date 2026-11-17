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
    httpMock.expectOne('/api/patrimoines/1').flush({ id: 1, nomPatrimoine: 'Gorée' });
    expect((await pOne).id).toBe(1);
  });

  it('calls GET /api/circuits and GET /api/evenements', async () => {
    const cAll = firstValueFrom(circuitApi.getAll());
    httpMock.expectOne('/api/circuits').flush([]);
    expect(await cAll).toEqual([]);

    const eAll = firstValueFrom(evenementApi.getAll());
    httpMock.expectOne('/api/evenements').flush([]);
    expect(await eAll).toEqual([]);
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
