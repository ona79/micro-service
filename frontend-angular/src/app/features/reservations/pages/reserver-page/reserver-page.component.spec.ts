import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { apiPrefixInterceptor } from '../../../../core/interceptors/api-prefix.interceptor';
import { httpErrorInterceptor } from '../../../../core/interceptors/http-error.interceptor';
import { ReserverPageComponent } from './reserver-page.component';

describe('ReserverPageComponent', () => {
  let httpMock: HttpTestingController;
  const dialogSpy = {
    open: vi.fn(),
  };

  beforeEach(async () => {
    dialogSpy.open.mockReset();

    await TestBed.configureTestingModule({
      imports: [ReserverPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiPrefixInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: Dialog, useValue: dialogSpy },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushInitialLoads() {
    httpMock.expectOne('/api/reservations').flush([
      {
        id: 10,
        nomClient: 'Moussa Diop',
        emailClient: 'moussa@uasz.sn',
        telephoneClient: null,
        nombrePlaces: 2,
        dateReservation: '2026-11-17T10:00:00',
        typeReservation: 'CIRCUIT',
        statut: 'CONFIRMEE',
        montantTotal: 30000,
        circuitId: 1,
        evenementId: null,
        circuit: null,
        evenement: null,
      },
    ]);
    httpMock.expectOne('/api/circuits').flush([
      {
        id: 1,
        nomCircuit: 'De Gorée à la Casamance',
        descriptionCircuit: 'Parcours',
        difficulte: 'FACILE',
        dureeEstimee: 225,
        distanceTotale: 300,
        placesMax: 25,
        prix: 15000,
        etapes: [],
      },
    ]);
    httpMock.expectOne('/api/evenements').flush([]);
  }

  it('computes live estimate, submits reservation, and keeps form on backend 400 error', async () => {
    const fixture = TestBed.createComponent(ReserverPageComponent);
    fixture.detectChanges();
    flushInitialLoads();
    await fixture.whenStable();
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      form: ReserverPageComponent['form'];
      onSubmit: () => Promise<void>;
    };

    comp.form.patchValue({
      nomClient: 'Aminata Diallo',
      emailClient: 'aminata@uasz.sn',
      nombrePlaces: 3,
      circuitId: '1',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('45');

    const submitPromise = comp.onSubmit();
    const postReq = httpMock.expectOne('/api/reservations');
    expect(postReq.request.body.nombrePlaces).toBe(3);
    postReq.flush(
      { erreur: 'Capacité insuffisante pour le circuit 1' },
      { status: 400, statusText: 'Bad Request' }
    );
    await submitPromise;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Capacité insuffisante pour le circuit 1'
    );
    // Le nom saisi est préservé en cas d'échec
    expect(comp.form.controls.nomClient.value).toBe('Aminata Diallo');
  });

  it('requires CDK confirmation dialog before calling PUT /api/reservations/:id/annuler', async () => {
    const fixture = TestBed.createComponent(ReserverPageComponent);
    fixture.detectChanges();
    flushInitialLoads();
    await fixture.whenStable();
    fixture.detectChanges();

    dialogSpy.open.mockReturnValue({ closed: of(true) });
    const cancelButton: HTMLButtonElement = fixture.nativeElement.querySelector('.cancel-btn');
    cancelButton.click();

    await Promise.resolve();
    expect(dialogSpy.open).toHaveBeenCalledTimes(1);
    const putReq = httpMock.expectOne('/api/reservations/10/annuler');
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({ id: 10, statut: 'ANNULEE' });

    await new Promise((r) => setTimeout(r, 10));
    httpMock.expectOne('/api/reservations').flush([]);
    await fixture.whenStable();
  });
});
