import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthStore } from '../../../../core/auth/auth.store';
import { apiPrefixInterceptor } from '../../../../core/interceptors/api-prefix.interceptor';
import { httpErrorInterceptor } from '../../../../core/interceptors/http-error.interceptor';
import { AdminDashboardPageComponent } from './admin-dashboard-page.component';

const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 15));

describe('AdminDashboardPageComponent (P04)', () => {
  let httpMock: HttpTestingController;
  let isAdminSignal: ReturnType<typeof signal<boolean>>;
  let roleLabelSignal: ReturnType<typeof signal<string>>;
  const dialogSpy = { open: vi.fn() };

  beforeEach(async () => {
    isAdminSignal = signal(true);
    roleLabelSignal = signal('Administrateur');
    dialogSpy.open.mockReset();

    const authStub = {
      user: signal({
        id: 1,
        prenom: 'Admin',
        nom: 'Casamance',
        email: 'admin@uasz.sn',
        telephone: null,
        role: 'ADMINISTRATEUR',
        actif: true,
        dateInscription: null,
      }),
      isAdmin: isAdminSignal.asReadonly(),
      roleLabel: roleLabelSignal.asReadonly(),
      getAllUsers: vi.fn().mockResolvedValue([]),
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboardPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiPrefixInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthStore, useValue: authStub },
        { provide: Dialog, useValue: dialogSpy },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function flushInitialCatalogs() {
    httpMock.expectOne('/api/patrimoines').flush([]);
    httpMock.expectOne('/api/circuits').flush([]);
    httpMock.expectOne('/api/evenements').flush([]);
  }

  it('loads simulated payments in paiements tab and allows ADMINISTRATEUR refund after confirmation', async () => {
    const fixture = TestBed.createComponent(AdminDashboardPageComponent);
    fixture.detectChanges();
    flushInitialCatalogs();

    const comp = fixture.componentInstance as unknown as {
      switchTab: (tab: 'paiements' | 'reservations') => void;
    };
    comp.switchTab('paiements');

    httpMock.expectOne((r) => r.url === '/api/paiements/recherche').flush({
      content: [
        {
          id: 55,
          referenceTransaction: 'PAY-SIM-WAV-55',
          reservationId: 12,
          montant: 30000,
          devise: 'XOF',
          modePaiement: 'WAVE',
          statut: 'ACCEPTE',
          datePaiement: '2026-11-18T10:00:00',
          estSimule: true,
          synchroReservationStatut: 'SYNCHRONISEE',
        },
      ],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });
    httpMock.expectOne('/api/paiements/statistiques').flush({
      totalTransactions: 1,
      enCours: 0,
      acceptees: 1,
      refusees: 0,
      expirees: 0,
      annulees: 0,
      remboursees: 0,
      montantTotalAccepteSimule: 30000,
      montantTotalRembourseSimule: 0,
      montantWaveSimule: 30000,
      montantOrangeMoneySimule: 0,
      outboxEnAttente: 0,
      devise: 'XOF',
      estSimule: true,
    });

    await flushMicrotasks();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('PAY-SIM-WAV-55');
    const refundBtn: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'button.btn-xs--danger'
    );
    expect(refundBtn?.textContent).toContain('Rembourser');

    dialogSpy.open.mockReturnValue({ closed: of(true) });
    refundBtn!.click();
    await flushMicrotasks();

    const refundReq = httpMock.expectOne('/api/paiements/55/rembourser');
    expect(refundReq.request.method).toBe('POST');
    refundReq.flush({ id: 55, statut: 'REMBOURSE', referenceTransaction: 'PAY-SIM-WAV-55' });

    await flushMicrotasks();
    httpMock
      .expectOne((r) => r.url === '/api/paiements/recherche')
      .flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 1, last: true });
    httpMock.expectOne('/api/paiements/statistiques').flush({
      totalTransactions: 1,
      enCours: 0,
      acceptees: 0,
      refusees: 0,
      expirees: 0,
      annulees: 0,
      remboursees: 1,
      montantTotalAccepteSimule: 0,
      montantTotalRembourseSimule: 30000,
      montantWaveSimule: 0,
      montantOrangeMoneySimule: 0,
      outboxEnAttente: 0,
      devise: 'XOF',
      estSimule: true,
    });
  });

  it('hides refund button for non-ADMINISTRATEUR staff in paiements tab', async () => {
    isAdminSignal.set(false);
    roleLabelSignal.set('Gestionnaire de site');

    const fixture = TestBed.createComponent(AdminDashboardPageComponent);
    fixture.detectChanges();
    flushInitialCatalogs();

    const comp = fixture.componentInstance as unknown as {
      switchTab: (tab: 'paiements') => void;
    };
    comp.switchTab('paiements');

    httpMock.expectOne((r) => r.url === '/api/paiements/recherche').flush({
      content: [
        {
          id: 56,
          referenceTransaction: 'PAY-SIM-OM-56',
          reservationId: 13,
          montant: 15000,
          devise: 'XOF',
          modePaiement: 'ORANGE_MONEY',
          statut: 'ACCEPTE',
          datePaiement: '2026-11-18T10:00:00',
          estSimule: true,
          synchroReservationStatut: 'SYNCHRONISEE',
        },
      ],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });
    httpMock.expectOne('/api/paiements/statistiques').flush({
      totalTransactions: 1,
      enCours: 0,
      acceptees: 1,
      refusees: 0,
      expirees: 0,
      annulees: 0,
      remboursees: 0,
      montantTotalAccepteSimule: 15000,
      montantTotalRembourseSimule: 0,
      montantWaveSimule: 0,
      montantOrangeMoneySimule: 15000,
      outboxEnAttente: 0,
      devise: 'XOF',
      estSimule: true,
    });

    await flushMicrotasks();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('PAY-SIM-OM-56');
    expect(fixture.nativeElement.textContent).not.toContain('Rembourser (simulé)');
  });

  it('loads P05 guides, moderation & notifications tabs and executes guide validation + notification retry', async () => {
    const fixture = TestBed.createComponent(AdminDashboardPageComponent);
    fixture.detectChanges();
    flushInitialCatalogs();

    const comp = fixture.componentInstance as unknown as {
      switchTab: (tab: 'guides' | 'moderation' | 'notifications') => void;
      openGuideDecision: (g: { id: number; prenom: string; nom: string }, action: 'VALIDER') => void;
      submitGuideDecision: () => Promise<void>;
      retrySingleNotification: (id: number) => Promise<void>;
    };

    comp.switchTab('guides');
    httpMock.expectOne('/api/guides/admin/tous').flush([
      {
        id: 2,
        utilisateurId: 9,
        nom: 'Sagna',
        prenom: 'Binta',
        email: 'binta.sagna@casamance.sn',
        compteActif: true,
        presentationCourte: 'Guide nature et mangroves',
        biographie: '10 ans expérience',
        languesParlees: 'Français, Wolof, Diola',
        specialites: 'Écotourisme',
        zonesIntervention: 'Basse-Casamance',
        anneesExperience: 10,
        numeroCarteProfessionnelle: 'CG-2026-099',
        disponible: true,
        visibilitePublique: true,
        statutValidation: 'EN_ATTENTE_VALIDATION',
      },
    ]);
    await flushMicrotasks();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Binta Sagna');

    comp.openGuideDecision({ id: 2, prenom: 'Binta', nom: 'Sagna' }, 'VALIDER');
    const decisionPromise = comp.submitGuideDecision();
    const valReq = httpMock.expectOne('/api/guides/2/valider');
    expect(valReq.request.method).toBe('POST');
    valReq.flush({ id: 2, statutValidation: 'VALIDE' });
    await flushMicrotasks();
    httpMock.expectOne('/api/guides/admin/tous').flush([]);
    await decisionPromise;

    comp.switchTab('moderation');
    httpMock.expectOne('/api/moderation/signalements?statut=OUVERT').flush([]);
    httpMock.expectOne('/api/moderation/avis').flush([
      {
        id: 7,
        auteurId: 4,
        auteurNom: 'Moussa Diop',
        cibleType: 'EVENEMENT',
        cibleId: 1,
        reservationId: 4,
        note: 5,
        commentaire: 'Soirée culturelle remarquable.',
        experienceVerifiee: true,
        statutModeration: 'APPROUVE',
        datePublication: '2026-11-18T10:00:00',
      },
    ]);
    await flushMicrotasks();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Soirée culturelle remarquable.');

    comp.switchTab('notifications');
    httpMock.expectOne('/api/notifications/toutes?page=0&size=15').flush({
      content: [
        {
          id: 99,
          destinataire: 'touriste@uasz.sn',
          utilisateurId: 4,
          sujet: 'Avis modéré',
          contenu: 'Notification test',
          canal: 'EMAIL',
          statut: 'ECHEC_TEMPORAIRE',
          typeEvenement: 'AVIS_MODERE',
          tentatives: 1,
          maxTentatives: 4,
          dernierErreur: 'Timeout simulé',
          dateEnvoi: '2026-11-18T10:00:00',
          reservationId: null,
        },
      ],
      page: 0,
      size: 15,
      totalElements: 1,
      totalPages: 1,
      last: true,
      unreadCount: 0,
    });
    await flushMicrotasks();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Timeout simulé');

    const retryPromise = comp.retrySingleNotification(99);
    const retryReq = httpMock.expectOne('/api/notifications/99/relancer');
    expect(retryReq.request.method).toBe('POST');
    retryReq.flush({ id: 99, statut: 'ENVOYEE' });
    await flushMicrotasks();
    httpMock.expectOne('/api/notifications/toutes?page=0&size=15').flush({
      content: [],
      page: 0,
      size: 15,
      totalElements: 0,
      totalPages: 1,
      last: true,
      unreadCount: 0,
    });
    await retryPromise;
  });
});
