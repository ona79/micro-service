import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProControleAccesPageComponent } from './pro-controle-acces-page.component';
import { BilletApiService } from '../../../reservations/data-access/billet-api.service';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ValidationBilletResponse } from '../../../../core/models/billet.model';

describe('ProControleAccesPageComponent', () => {
  let fixture: ComponentFixture<ProControleAccesPageComponent>;
  let component: ProControleAccesPageComponent;
  let billetApi: BilletApiService;

  const mockAuthStore = {
    user: () => ({
      id: 5,
      prenom: 'Moussa',
      nom: 'Sagna',
      email: 'moussa.sagna@uasz.sn',
      role: 'GESTIONNAIRE_SITE',
    }),
    roleLabel: () => 'Gestionnaire de site',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProControleAccesPageComponent],
      providers: [
        BilletApiService,
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProControleAccesPageComponent);
    component = fixture.componentInstance;
    billetApi = TestBed.inject(BilletApiService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('devrait instancier le composant avec le titre et les KPIs', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Contrôle d\'accès & Validation des Billets');
    expect(el.textContent).toContain('Moussa Sagna');
    expect(el.textContent).toContain('Gestionnaire de site');
  });

  it('devrait exécuter une validation manuelle autorisée', async () => {
    const mockSuccessResponse: ValidationBilletResponse = {
      valide: true,
      message: 'Billet validé avec succès. Entrée autorisée.',
      billet: {
        id: 12,
        reservationId: 42,
        referenceReservation: 'RES-0042',
        numeroBillet: 'BIL-2026-000012',
        tokenQr: 'token-valid-abc',
        nomBeneficiaire: 'Ousmane Sonko',
        statut: 'CONSOMME',
        nomPrestation: 'Circuit Karabane',
        validePar: 'moussa.sagna@uasz.sn',
      },
    };

    vi.spyOn(billetApi, 'validerBillet').mockReturnValue(of(mockSuccessResponse));

    fixture.detectChanges();
    component.manualToken = 'token-valid-abc';
    await component.onValiderManuel();
    fixture.detectChanges();

    expect(component.dernierResultat()).toEqual(mockSuccessResponse);
    expect(component.totalSucces()).toBe(1);
    expect(component.totalRejets()).toBe(0);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('ACCÈS AUTORISÉ');
    expect(el.textContent).toContain('Ousmane Sonko');
    expect(el.textContent).toContain('BIL-2026-000012');
  });

  it('devrait enregistrer un rejet en cas d\'erreur 409 (Double scan)', async () => {
    vi.spyOn(billetApi, 'validerBillet').mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'Ce billet a déjà été utilisé le 18/11/2026 à 14:30 par un autre agent.' },
      }))
    );

    fixture.detectChanges();
    component.manualToken = 'token-already-used';
    await component.onValiderManuel();
    fixture.detectChanges();

    expect(component.dernierResultat()).toBeNull();
    expect(component.dernierErreur()).toContain('Ce billet a déjà été utilisé');
    expect(component.totalSucces()).toBe(0);
    expect(component.totalRejets()).toBe(1);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('REJET DU CONTRÔLE');
  });

  it('devrait vider l\'historique de session lors du clic', () => {
    component['enregistrerHistorique']({
      id: '1',
      timestamp: new Date(),
      success: true,
      action: 'VALIDATION',
      message: 'Test',
    });
    expect(component.scanHistory().length).toBe(1);

    component.viderHistorique();
    expect(component.scanHistory().length).toBe(0);
  });
});
