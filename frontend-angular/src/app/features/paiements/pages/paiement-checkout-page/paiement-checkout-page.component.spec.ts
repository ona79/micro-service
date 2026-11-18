import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { apiPrefixInterceptor } from '../../../../core/interceptors/api-prefix.interceptor';
import { httpErrorInterceptor } from '../../../../core/interceptors/http-error.interceptor';
import { PaiementCheckoutPageComponent } from './paiement-checkout-page.component';

describe('PaiementCheckoutPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaiementCheckoutPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiPrefixInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ reservationId: '42' }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('initiates simulated Wave payment and executes ACCEPTER simulation updating reservation status', async () => {
    const fixture = TestBed.createComponent(PaiementCheckoutPageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/reservations/42').flush({
      id: 42,
      referenceReservation: 'RES-P04-0042',
      nomClient: 'Moussa Diop',
      emailClient: 'moussa@uasz.sn',
      telephoneClient: '+221771234567',
      nombrePlaces: 2,
      dateReservation: '2026-11-18T10:00:00',
      typeReservation: 'CIRCUIT',
      statut: 'EN_ATTENTE_PAIEMENT',
      montantTotal: 30000,
      devise: 'XOF',
      circuitId: 1,
      evenementId: null,
      circuit: { id: 1, nomCircuit: 'Boucle Casamance', prix: 15000 },
      evenement: null,
    });
    httpMock.expectOne('/api/paiements/reservation/42').flush([]);

    await new Promise((r) => setTimeout(r, 10));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('SIMULATION DE PAIEMENT P04');
    expect(fixture.nativeElement.textContent).toContain('RES-P04-0042');

    const comp = fixture.componentInstance as unknown as {
      lancerInitiation: () => Promise<void>;
      executerSimulation: (d: 'ACCEPTER' | 'REFUSER') => Promise<void>;
    };

    const initPromise = comp.lancerInitiation();
    const postPay = httpMock.expectOne('/api/paiements');
    expect(postPay.request.method).toBe('POST');
    expect(postPay.request.headers.get('Idempotency-Key')).toBeTruthy();
    expect(postPay.request.body.modePaiement).toBe('WAVE');
    const createdPay = {
      id: 99,
      referenceTransaction: 'PAY-SIM-WAV-99',
      reservationId: 42,
      montant: 30000,
      devise: 'XOF',
      modePaiement: 'WAVE',
      statut: 'EN_COURS',
      datePaiement: '2026-11-18T10:01:00',
      estSimule: true,
      numeroTelephoneMasque: '+221****4567',
      synchroReservationStatut: 'EN_ATTENTE_VALIDATION',
      historique: [],
    };
    postPay.flush(createdPay);

    await new Promise((r) => setTimeout(r, 15));
    httpMock.expectOne('/api/reservations/42').flush({
      id: 42,
      referenceReservation: 'RES-P04-0042',
      nomClient: 'Moussa Diop',
      emailClient: 'moussa@uasz.sn',
      nombrePlaces: 2,
      dateReservation: '2026-11-18T10:00:00',
      typeReservation: 'CIRCUIT',
      statut: 'EN_ATTENTE_PAIEMENT',
      montantTotal: 30000,
      circuitId: 1,
      evenementId: null,
      circuit: null,
      evenement: null,
    });
    httpMock.expectOne('/api/paiements/reservation/42').flush([createdPay]);
    await initPromise;
    fixture.detectChanges();

    const simPromise = comp.executerSimulation('ACCEPTER');
    const simReq = httpMock.expectOne('/api/paiements/99/simuler');
    expect(simReq.request.method).toBe('POST');
    expect(simReq.request.body.decision).toBe('ACCEPTER');
    const acceptedPay = {
      ...createdPay,
      statut: 'ACCEPTE',
      synchroReservationStatut: 'SYNCHRONISEE',
    };
    simReq.flush(acceptedPay);

    await new Promise((r) => setTimeout(r, 15));
    httpMock.expectOne('/api/reservations/42').flush({
      id: 42,
      referenceReservation: 'RES-P04-0042',
      nomClient: 'Moussa Diop',
      emailClient: 'moussa@uasz.sn',
      nombrePlaces: 2,
      dateReservation: '2026-11-18T10:00:00',
      typeReservation: 'CIRCUIT',
      statut: 'CONFIRMEE',
      montantTotal: 30000,
      circuitId: 1,
      evenementId: null,
      circuit: null,
      evenement: null,
    });
    httpMock.expectOne('/api/paiements/reservation/42').flush([acceptedPay]);
    await simPromise;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Justificatif de paiement simulé P04');
    expect(fixture.nativeElement.textContent).toContain('PAY-SIM-WAV-99');
  });
});
