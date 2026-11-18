import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../core/auth/auth.store';
import { apiPrefixInterceptor } from '../core/interceptors/api-prefix.interceptor';
import { httpErrorInterceptor } from '../core/interceptors/http-error.interceptor';
import { Utilisateur } from '../core/models/utilisateur.model';
import { UiAvisSectionComponent } from '../shared/components/ui-avis-section/ui-avis-section.component';
import { AvisApiService } from './avis/data-access/avis-api.service';
import { CircuitApiService } from './circuits/data-access/circuit-api.service';
import { GuideApiService } from './guides/data-access/guide-api.service';
import { NotificationApiService } from './notifications/data-access/notification-api.service';
import { NotificationStore } from './notifications/data-access/notification.store';

const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 15));

describe('P05 API Services & Stores (Guides, Avis, Modération, Notifications)', () => {
  let httpMock: HttpTestingController;
  let guideApi: GuideApiService;
  let avisApi: AvisApiService;
  let notifApi: NotificationApiService;
  let circuitApi: CircuitApiService;
  let notifStore: NotificationStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiPrefixInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    guideApi = TestBed.inject(GuideApiService);
    avisApi = TestBed.inject(AvisApiService);
    notifApi = TestBed.inject(NotificationApiService);
    circuitApi = TestBed.inject(CircuitApiService);
    notifStore = TestBed.inject(NotificationStore);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('executes Guide workflow endpoints (directory, profile update, submit, admin validation & circuit assignment)', async () => {
    const dirPromise = firstValueFrom(guideApi.getPublicGuides({ zone: 'BASSE_CASAMANCE', q: 'Badji' }));
    const dirReq = httpMock.expectOne(
      (r) =>
        r.url === '/api/guides' &&
        r.params.get('zone') === 'BASSE_CASAMANCE' &&
        r.params.get('q') === 'Badji'
    );
    dirReq.flush([{ id: 1, prenom: 'Alassane', nom: 'Badji', statutValidation: 'VALIDE' }]);
    expect((await dirPromise)[0].statutValidation).toBe('VALIDE');

    const submitPromise = firstValueFrom(guideApi.soumettreMonProfil());
    const subReq = httpMock.expectOne('/api/guides/mon-profil/soumettre');
    expect(subReq.request.method).toBe('POST');
    subReq.flush({ id: 2, statutValidation: 'EN_ATTENTE_VALIDATION' });
    expect((await submitPromise).statutValidation).toBe('EN_ATTENTE_VALIDATION');

    const validatePromise = firstValueFrom(guideApi.validerProfil(2, 'Carte conforme'));
    const valReq = httpMock.expectOne('/api/guides/2/valider');
    expect(valReq.request.method).toBe('POST');
    expect(valReq.request.body).toEqual({ motif: 'Carte conforme' });
    valReq.flush({ id: 2, statutValidation: 'VALIDE' });
    expect((await validatePromise).statutValidation).toBe('VALIDE');

    const assignPromise = firstValueFrom(circuitApi.affecterGuideResponsable(10, 5));
    const assignReq = httpMock.expectOne('/api/circuits/10/guide');
    expect(assignReq.request.method).toBe('PATCH');
    expect(assignReq.request.body).toEqual({ guideResponsableId: 5 });
    assignReq.flush({ id: 10, guideResponsableId: 5 });
    expect((await assignPromise).guideResponsableId).toBe(5);
  });

  it('executes Avis eligibility, creation, flagging and Moderation decisions endpoints', async () => {
    const eligPromise = firstValueFrom(avisApi.verifierEligibilite('EVENEMENT', 1));
    httpMock
      .expectOne('/api/avis/eligibilite?cibleType=EVENEMENT&cibleId=1')
      .flush({ cibleType: 'EVENEMENT', cibleId: 1, eligible: true, dejaEvalue: false, reservationsEligiblesIds: [4], motifIneligibilite: null });
    expect((await eligPromise).reservationsEligiblesIds).toEqual([4]);

    const sigPromise = firstValueFrom(avisApi.signalerAvis(8, 'SPAM', 'Message publicitaire répété'));
    const sigReq = httpMock.expectOne('/api/avis/8/signaler');
    expect(sigReq.request.method).toBe('POST');
    sigReq.flush({ id: 3, avisId: 8, statut: 'OUVERT' });
    expect((await sigPromise).statut).toBe('OUVERT');

    const modPromise = firstValueFrom(
      avisApi.traiterSignalement(3, 'VALIDE_CONTENU_RETIRE', 'Retrait confirmé', 'MASQUE')
    );
    const modReq = httpMock.expectOne('/api/moderation/signalements/3/decision');
    expect(modReq.request.method).toBe('POST');
    expect(modReq.request.body.statutAvisCible).toBe('MASQUE');
    modReq.flush({ id: 3, statut: 'VALIDE_CONTENU_RETIRE' });
    expect((await modPromise).statut).toBe('VALIDE_CONTENU_RETIRE');
  });

  it('updates NotificationStore unread badge and calls retry & read endpoints', async () => {
    const refreshPromise = notifStore.refreshUnreadCount();
    httpMock.expectOne('/api/notifications/mes-notifications/compteur').flush({ unreadCount: 3 });
    await refreshPromise;
    expect(notifStore.unreadCount()).toBe(3);

    notifStore.decrementUnread();
    expect(notifStore.unreadCount()).toBe(2);

    const readAllPromise = firstValueFrom(notifApi.marquerToutesCommeLues());
    const readAllReq = httpMock.expectOne('/api/notifications/tout-lire');
    expect(readAllReq.request.method).toBe('PATCH');
    readAllReq.flush({ marqueesLues: 2, unreadCount: 0 });
    expect((await readAllPromise).unreadCount).toBe(0);

    const sweepPromise = firstValueFrom(notifApi.forcerRepriseEchecs());
    const sweepReq = httpMock.expectOne('/api/notifications/relancer-echecs');
    expect(sweepReq.request.method).toBe('POST');
    sweepReq.flush({ notificationsLivrees: 1 });
    expect((await sweepPromise).notificationsLivrees).toBe(1);
  });
});

describe('UiAvisSectionComponent (P05)', () => {
  let httpMock: HttpTestingController;
  let userSignal: ReturnType<typeof signal<Utilisateur | null>>;

  beforeEach(async () => {
    userSignal = signal<Utilisateur | null>(null);
    const authStub = {
      user: userSignal.asReadonly(),
      isAuthenticated: computed(() => userSignal() !== null),
    };

    await TestBed.configureTestingModule({
      imports: [UiAvisSectionComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiPrefixInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthStore, useValue: authStub },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('renders verified reviews for anonymous visitors without requesting private /eligibilite endpoint', async () => {
    const fixture = TestBed.createComponent(UiAvisSectionComponent);
    fixture.componentRef.setInput('cibleType', 'GUIDE');
    fixture.componentRef.setInput('cibleId', 5);
    fixture.detectChanges();

    httpMock.expectOne('/api/avis/resume?cibleType=GUIDE&cibleId=5').flush({
      cibleType: 'GUIDE',
      cibleId: 5,
      noteMoyenne: 5,
      totalAvis: 1,
      repartition: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 },
    });
    httpMock.expectOne('/api/avis?cibleType=GUIDE&cibleId=5&page=0&size=6').flush({
      content: [
        {
          id: 1,
          auteurId: 4,
          auteurNom: 'Moussa Diop',
          cibleType: 'GUIDE',
          cibleId: 5,
          reservationId: 3,
          note: 5,
          commentaire: 'Excellent accompagnement culturel en Basse-Casamance.',
          experienceVerifiee: true,
          statutModeration: 'APPROUVE',
          datePublication: '2026-11-18T09:00:00',
        },
      ],
      page: 0,
      size: 6,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });
    httpMock.expectNone((r) => r.url === '/api/avis/eligibilite');

    await flushMicrotasks();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Moussa Diop');
    expect(text).toContain('Expérience vérifiée');
    expect(text).toContain('Excellent accompagnement culturel en Basse-Casamance.');
  });

  it('checks /eligibilite when authenticated and publishes a new verified review', async () => {
    userSignal.set({
      id: 4,
      prenom: 'Moussa',
      nom: 'Diop',
      email: 'moussa.diop@casamance.sn',
      telephone: null,
      role: 'TOURISTE',
      actif: true,
      dateInscription: null,
    });

    const fixture = TestBed.createComponent(UiAvisSectionComponent);
    fixture.componentRef.setInput('cibleType', 'EVENEMENT');
    fixture.componentRef.setInput('cibleId', 1);
    fixture.detectChanges();

    httpMock.expectOne('/api/avis/resume?cibleType=EVENEMENT&cibleId=1').flush({
      cibleType: 'EVENEMENT',
      cibleId: 1,
      noteMoyenne: 0,
      totalAvis: 0,
      repartition: {},
    });
    httpMock.expectOne('/api/avis?cibleType=EVENEMENT&cibleId=1&page=0&size=6').flush({
      content: [],
      page: 0,
      size: 6,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });
    httpMock.expectOne('/api/avis/eligibilite?cibleType=EVENEMENT&cibleId=1').flush({
      cibleType: 'EVENEMENT',
      cibleId: 1,
      eligible: true,
      dejaEvalue: false,
      reservationsEligiblesIds: [4],
      motifIneligibilite: null,
    });

    await flushMicrotasks();
    fixture.detectChanges();

    const comp = fixture.componentInstance as unknown as {
      newCommentaire: string;
      submitNewAvis: () => Promise<void>;
    };
    comp.newCommentaire = 'Festival très bien organisé avec accueil chaleureux.';
    const submitPromise = comp.submitNewAvis();

    const postReq = httpMock.expectOne('/api/avis');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      cibleType: 'EVENEMENT',
      cibleId: 1,
      reservationId: 4,
      note: 5,
      commentaire: 'Festival très bien organisé avec accueil chaleureux.',
    });
    postReq.flush({
      id: 11,
      auteurId: 4,
      auteurNom: 'Moussa Diop',
      cibleType: 'EVENEMENT',
      cibleId: 1,
      reservationId: 4,
      note: 5,
      commentaire: 'Festival très bien organisé avec accueil chaleureux.',
      experienceVerifiee: true,
      statutModeration: 'APPROUVE',
      datePublication: '2026-11-18T10:00:00',
    });

    await flushMicrotasks();
    httpMock.expectOne('/api/avis/resume?cibleType=EVENEMENT&cibleId=1').flush({
      cibleType: 'EVENEMENT',
      cibleId: 1,
      noteMoyenne: 5,
      totalAvis: 1,
      repartition: { 5: 1 },
    });
    httpMock.expectOne('/api/avis?cibleType=EVENEMENT&cibleId=1&page=0&size=6').flush({
      content: [
        {
          id: 11,
          auteurId: 4,
          auteurNom: 'Moussa Diop',
          cibleType: 'EVENEMENT',
          cibleId: 1,
          reservationId: 4,
          note: 5,
          commentaire: 'Festival très bien organisé avec accueil chaleureux.',
          experienceVerifiee: true,
          statutModeration: 'APPROUVE',
          datePublication: '2026-11-18T10:00:00',
        },
      ],
      page: 0,
      size: 6,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });
    httpMock.expectOne('/api/avis/eligibilite?cibleType=EVENEMENT&cibleId=1').flush({
      cibleType: 'EVENEMENT',
      cibleId: 1,
      eligible: false,
      dejaEvalue: true,
      reservationsEligiblesIds: [],
      motifIneligibilite: 'Vous avez déjà évalué cette prestation.',
    });

    await submitPromise;
    await flushMicrotasks();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Festival très bien organisé');
  });
});
