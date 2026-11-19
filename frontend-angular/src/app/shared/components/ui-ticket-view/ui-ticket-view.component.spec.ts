import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UiTicketViewComponent } from './ui-ticket-view.component';
import { Billet } from '../../../core/models/billet.model';
import { BilletApiService } from '../../../features/reservations/data-access/billet-api.service';

describe('UiTicketViewComponent', () => {
  let fixture: ComponentFixture<UiTicketViewComponent>;
  let component: UiTicketViewComponent;

  const mockBillets: Billet[] = [
    {
      id: 1,
      reservationId: 10,
      numeroBillet: 'BIL-2026-000001',
      tokenQr: 'test-token-1234567890123456',
      nomBeneficiaire: 'Awa Diop',
      statut: 'VALIDE',
      referenceReservation: 'RES-0010',
      nomPrestation: 'Boucle d\'Oussouye',
      datePrestation: '2026-11-20',
      creneauPrestation: 'Matin (09h00)',
    },
    {
      id: 2,
      reservationId: 10,
      numeroBillet: 'BIL-2026-000002',
      tokenQr: 'test-token-2345678901234567',
      nomBeneficiaire: 'Mamadou Diop',
      statut: 'CONSOMME',
      referenceReservation: 'RES-0010',
      nomPrestation: 'Boucle d\'Oussouye',
      datePrestation: '2026-11-20',
      validePar: 'conservateur@uasz.sn',
      dateUtilisation: '2026-11-20T10:15:00',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiTicketViewComponent],
      providers: [
        BilletApiService,
        provideHttpClient(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UiTicketViewComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('devrait instancier le composant et afficher l\'état vide par défaut', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Aucun billet électronique disponible');
  });

  it('devrait afficher la liste des billets et enrichir avec le QR code', async () => {
    fixture.componentRef.setInput('billets', mockBillets);
    fixture.detectChanges();
    await fixture.whenStable();

    // Attendre que l'effet asynchrone Promise.all résolve les dataUrl de manière robuste
    for (let i = 0; i < 25; i++) {
      if (component.billetsWithQr().length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('BIL-2026-000001');
    expect(el.textContent).toContain('Awa Diop');
    expect(el.textContent).toContain('Mamadou Diop');
    expect(el.textContent).toContain('Boucle d\'Oussouye');

    const qrImgs = el.querySelectorAll<HTMLImageElement>('.ticket-qr-img');
    expect(qrImgs.length).toBe(2);
    expect(qrImgs[0].src).toContain('data:image/png;base64,');
  });

  it('devrait déclencher window.print lors du clic sur imprimer', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    component.imprimer();
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it('devrait dédupliquer les billets identiques et supprimer les # dans les numéros de circuit', async () => {
    const duplicatedWithHash: Billet[] = [
      {
        ...mockBillets[0],
        nomPrestation: 'CIRCUIT #1',
      },
      {
        ...mockBillets[0],
        nomPrestation: 'CIRCUIT #1',
      },
    ];
    fixture.componentRef.setInput('billets', duplicatedWithHash);
    fixture.detectChanges();
    await fixture.whenStable();

    for (let i = 0; i < 25; i++) {
      if (component.billetsWithQr().length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    fixture.detectChanges();

    expect(component.billetsWithQr().length).toBe(1);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Circuit n° 1');
    expect(el.textContent).not.toContain('CIRCUIT #1');
  });
});
