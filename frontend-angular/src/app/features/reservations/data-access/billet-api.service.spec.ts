import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { apiPrefixInterceptor } from '../../../core/interceptors/api-prefix.interceptor';
import { BilletApiService } from './billet-api.service';
import { Billet, ValidationBilletResponse } from '../../../core/models/billet.model';

describe('BilletApiService', () => {
  let service: BilletApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BilletApiService,
        provideHttpClient(withInterceptors([apiPrefixInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(BilletApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('devrait appeler GET /api/reservations/{id}/billets', () => {
    const mockBillets: Billet[] = [
      {
        id: 1,
        reservationId: 10,
        numeroBillet: 'BIL-2026-000001',
        tokenQr: 'qr-token-test-1234567890123456',
        nomBeneficiaire: 'Fatou Sow',
        statut: 'VALIDE',
        referenceReservation: 'RES-0010',
        nomPrestation: 'Boucle d\'Oussouye',
      },
    ];

    service.getBillets(10).subscribe((billets) => {
      expect(billets).toHaveLength(1);
      expect(billets[0].numeroBillet).toBe('BIL-2026-000001');
    });

    const req = httpMock.expectOne('/api/reservations/10/billets');
    expect(req.request.method).toBe('GET');
    req.flush(mockBillets);
  });

  it('devrait appeler POST /api/visites/valider pour consommer un billet', () => {
    const mockResp: ValidationBilletResponse = {
      valide: true,
      message: 'Accès autorisé',
      billet: {
        id: 1,
        reservationId: 10,
        referenceReservation: 'RES-0010',
        numeroBillet: 'BIL-2026-000001',
        tokenQr: 'token-abc',
        nomBeneficiaire: 'Amadou Fall',
        statut: 'CONSOMME',
        validePar: 'conservateur@uasz.sn',
      },
    };

    service.validerBillet('token-abc').subscribe((res) => {
      expect(res.valide).toBe(true);
      expect(res.billet.statut).toBe('CONSOMME');
    });

    const req = httpMock.expectOne('/api/visites/valider');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ tokenQr: 'token-abc' });
    req.flush(mockResp);
  });

  it('devrait appeler GET /api/visites/verifier pour vérifier sans consommer', () => {
    const mockBillet: Billet = {
      id: 1,
      reservationId: 10,
      referenceReservation: 'RES-0010',
      numeroBillet: 'BIL-2026-000001',
      tokenQr: 'token-check',
      nomBeneficiaire: 'Amadou Fall',
      statut: 'VALIDE',
    };

    service.verifierBillet('token-check').subscribe((res) => {
      expect(res.statut).toBe('VALIDE');
      expect(res.nomBeneficiaire).toBe('Amadou Fall');
    });

    const req = httpMock.expectOne((r) => r.url === '/api/visites/verifier' && r.params.get('tokenQr') === 'token-check');
    expect(req.request.method).toBe('GET');
    req.flush(mockBillet);
  });

  it('devrait générer un QR Code sous forme de Data URL base64', async () => {
    const dataUrl = await service.generateQrCodeDataUrl('CASAMANCE-TOKEN-TEST');
    expect(dataUrl).toContain('data:image/png;base64,');
  });
});
