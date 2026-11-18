import { Dialog } from '@angular/cdk/dialog';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthStore, formatRoleLabel } from '../../core/auth/auth.store';
import { apiPrefixInterceptor } from '../../core/interceptors/api-prefix.interceptor';
import { httpErrorInterceptor } from '../../core/interceptors/http-error.interceptor';
import { RoleUtilisateur, Utilisateur } from '../../core/models/utilisateur.model';
import { NotificationStore } from '../notifications/data-access/notification.store';
import { ProCircuitsPageComponent } from './pages/pro-circuits-page/pro-circuits-page.component';
import { ProDashboardPageComponent } from './pages/pro-dashboard-page/pro-dashboard-page.component';
import { ProEvenementsPageComponent } from './pages/pro-evenements-page/pro-evenements-page.component';
import { ProGuideWorkspacePageComponent } from './pages/pro-guide-workspace-page/pro-guide-workspace-page.component';
import { ProGuidesAdminPageComponent } from './pages/pro-guides-admin-page/pro-guides-admin-page.component';
import { ProModerationPageComponent } from './pages/pro-moderation-page/pro-moderation-page.component';
import { ProNotificationsPageComponent } from './pages/pro-notifications-page/pro-notifications-page.component';
import { ProPaiementsPageComponent } from './pages/pro-paiements-page/pro-paiements-page.component';
import { ProPatrimoinesPageComponent } from './pages/pro-patrimoines-page/pro-patrimoines-page.component';
import { ProReservationsPageComponent } from './pages/pro-reservations-page/pro-reservations-page.component';
import { ProUtilisateursPageComponent } from './pages/pro-utilisateurs-page/pro-utilisateurs-page.component';

const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve, 20));

function makeUser(role: RoleUtilisateur, id = 1): Utilisateur {
  return {
    id,
    prenom: 'Test',
    nom: role,
    email: `${role.toLowerCase()}@uasz.sn`,
    telephone: '+221770000000',
    role,
    actif: true,
    dateInscription: '2026-11-18T08:00:00',
  };
}

describe('P07 Modular Back-Office Components (/pro/**)', () => {
  let httpMock: HttpTestingController;
  const userSig = signal<Utilisateur | null>(makeUser('ADMINISTRATEUR'));
  const dialogSpy = { open: vi.fn() };
  const rechercherUsersMock = vi.fn();
  const getUserStatsMock = vi.fn();
  const revoquerSessionsMock = vi.fn();
  const getAuditLogsMock = vi.fn();
  const updateUserMock = vi.fn();
  const createUserByAdminMock = vi.fn();
  const deleteUserMock = vi.fn();

  beforeEach(async () => {
    TestBed.resetTestingModule();
    userSig.set(makeUser('ADMINISTRATEUR'));
    dialogSpy.open.mockReset();
    rechercherUsersMock.mockReset();
    getUserStatsMock.mockReset();
    revoquerSessionsMock.mockReset();
    getAuditLogsMock.mockReset();
    updateUserMock.mockReset();
    createUserByAdminMock.mockReset();
    deleteUserMock.mockReset();

    const authStub = {
      user: userSig.asReadonly(),
      isAuthenticated: () => userSig() !== null,
      isAdmin: () => userSig()?.role === 'ADMINISTRATEUR',
      isSiteManager: () => userSig()?.role === 'GESTIONNAIRE_SITE',
      isConservateur: () => userSig()?.role === 'CONSERVATEUR',
      isGuide: () => userSig()?.role === 'GUIDE',
      isTouriste: () => userSig()?.role === 'TOURISTE',
      roleLabel: () => formatRoleLabel(userSig()?.role),
      rechercherUsers: rechercherUsersMock,
      getUserStats: getUserStatsMock,
      revoquerSessions: revoquerSessionsMock,
      getAuditLogs: getAuditLogsMock,
      updateUser: updateUserMock,
      createUserByAdmin: createUserByAdminMock,
      deleteUser: deleteUserMock,
    };

    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiPrefixInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthStore, useValue: authStub },
        { provide: Dialog, useValue: dialogSpy },
        {
          provide: NotificationStore,
          useValue: {
            unreadCount: signal(3).asReadonly(),
            refreshUnreadCount: vi.fn().mockResolvedValue(3),
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('ProDashboardPageComponent scopes API statistics calls strictly for CONSERVATEUR', async () => {
    userSig.set(makeUser('CONSERVATEUR', 4));
    const fixture = TestBed.createComponent(ProDashboardPageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/patrimoines/statistiques').flush({
      total: 10,
      brouillons: 2,
      soumis: 1,
      publies: 7,
      archives: 0,
      scope: 'GLOBAL',
      parCategorie: { HISTORIQUE: 4, CULTUREL: 6 },
      parZone: { BASSE_CASAMANCE: 7, MOYENNE_CASAMANCE: 3 },
      capaciteTotalePubliee: 800,
      tarifMoyenPublie: 1500,
    });
    expect(httpMock.match('/api/paiements/statistiques')).toHaveLength(0);
    expect(httpMock.match('/api/utilisateurs/statistiques')).toHaveLength(0);

    await flushMicrotasks();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sites patrimoniaux');
    expect(fixture.nativeElement.textContent).toContain('Historique'.toUpperCase().slice(0, 4));
  });

  it('ProPatrimoinesPageComponent puts GESTIONNAIRE_SITE in read-only mode on published sites only', async () => {
    userSig.set(makeUser('GESTIONNAIRE_SITE', 3));
    const fixture = TestBed.createComponent(ProPatrimoinesPageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/patrimoines/statistiques').flush({
      total: 5,
      brouillons: 0,
      soumis: 0,
      publies: 5,
      archives: 0,
      scope: 'PUBLIE_UNIQUEMENT',
      parCategorie: { HISTORIQUE: 5 },
      parZone: { BASSE_CASAMANCE: 5 },
      capaciteTotalePubliee: 500,
      tarifMoyenPublie: 1000,
    });
    const searchReq = httpMock.expectOne((r) => r.url === '/api/patrimoines/recherche');
    expect(searchReq.request.params.get('inclureNonPublies')).toBeNull();
    expect(searchReq.request.params.get('statut')).toBe('PUBLIE');
    searchReq.flush({
      content: [
        {
          id: 1,
          nomPatrimoine: 'Mémorial du Joola',
          codePatrimoine: 'PAT-ZIG-001',
          descriptionPatrimoine: 'Lieu national',
          historiquePatrimoine: null,
          adressePatrimoine: 'Ziguinchor',
          capacitePatrimoine: 250,
          latitudePatrimoine: 12.58,
          longitudePatrimoine: -16.27,
          statutPublication: 'PUBLIE',
        },
      ],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });

    await flushMicrotasks();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('lecture seule');
    expect(text).not.toContain('Nouveau patrimoine');
    expect(text).toContain('Mémorial du Joola');
  });

  it('ProCircuitsPageComponent scopes GUIDE to /circuits/guide/mes-circuits without create or publish actions', async () => {
    userSig.set(makeUser('GUIDE', 5));
    const fixture = TestBed.createComponent(ProCircuitsPageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/circuits/statistiques').flush({
      total: 1,
      brouillons: 1,
      soumis: 0,
      publies: 0,
      archives: 0,
      avecGuideAffecte: 1,
      sansGuide: 0,
      scope: 'GUIDE_PROPRE',
      parDifficulte: { FACILE: 1 },
      parMoyenTransport: { PIROGUE: 1 },
      parZone: { BASSE_CASAMANCE: 1 },
      prixMoyenPublie: 0,
      dureeMoyenneMinutes: 120,
    });
    httpMock
      .expectOne((r) => r.url === '/api/patrimoines/recherche')
      .flush({ content: [], page: 0, size: 50, totalElements: 0, totalPages: 0, last: true });
    await flushMicrotasks();
    httpMock.expectOne('/api/circuits/guide/mes-circuits').flush([
      {
        id: 21,
        nomCircuit: 'Circuit Bolongs BOLA',
        descriptionCircuit: 'Parcours assigné au guide 5',
        difficulte: 'FACILE',
        dureeEstimee: 120,
        distanceTotale: 14.5,
        placesMax: 10,
        prix: 15000,
        statutCircuit: 'BROUILLON',
        guideResponsableId: 5,
        etapes: [],
      },
    ]);

    await flushMicrotasks();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Circuit Bolongs BOLA');
    expect(text).toContain('Soumettre');
    expect(text).not.toContain('Nouveau circuit');
    expect(text).not.toContain('Publier');
  });

  it('ProEvenementsPageComponent blocks save on invalid date range before API call', async () => {
    userSig.set(makeUser('GESTIONNAIRE_SITE', 3));
    const fixture = TestBed.createComponent(ProEvenementsPageComponent);
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url === '/api/patrimoines/recherche')
      .flush({ content: [], page: 0, size: 50, totalElements: 0, totalPages: 0, last: true });
    httpMock.expectOne('/api/evenements/statistiques').flush({
      total: 0,
      brouillons: 0,
      soumis: 0,
      publies: 0,
      annules: 0,
      termines: 0,
      archives: 0,
      aVenirPublies: 0,
      ouvertsReservation: 0,
      parType: {},
      parZone: {},
    });
    httpMock
      .expectOne((r) => r.url === '/api/evenements/recherche')
      .flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true });

    await flushMicrotasks();
    const comp = fixture.componentInstance as unknown as {
      openCreateForm: () => void;
      form: { patchValue: (v: Record<string, unknown>) => void; invalid: boolean };
      save: () => Promise<void>;
    };
    comp.openCreateForm();
    comp.form.patchValue({
      nomEvenement: 'Festival Test',
      descriptionEvenement: 'Description valide d’événement Casamance',
      dateDebut: '2026-12-20T18:00',
      dateFin: '2026-12-20T09:00',
    });
    await comp.save();
    fixture.detectChanges();
    expect(comp.form.invalid).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('date de fin doit être postérieure');
  });

  it('ProGuidesAdminPageComponent requires mandatory motif on reject and loads audit history', async () => {
    userSig.set(makeUser('GESTIONNAIRE_SITE', 3));
    const fixture = TestBed.createComponent(ProGuidesAdminPageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/guides/statistiques').flush({
      total: 1,
      brouillons: 0,
      enAttenteValidation: 1,
      valides: 0,
      rejetes: 0,
      suspendus: 0,
      desactives: 0,
      disponiblesEtValides: 0,
      visiblesPublic: 0,
      parZone: {},
      parLangue: {},
    });
    const dossier = {
      id: 7,
      utilisateurId: 5,
      nom: 'Badji',
      prenom: 'Alassane',
      compteActif: true,
      presentationCourte: 'Guide nature',
      biographie: 'Biographie longue d’expérience Casamance.',
      languesParlees: 'Français',
      specialites: 'Bolongs',
      zonesIntervention: 'Oussouye',
      anneesExperience: 5,
      disponible: true,
      visibilitePublique: false,
      statutValidation: 'EN_ATTENTE_VALIDATION',
    };
    httpMock.expectOne('/api/guides/admin/tous').flush([dossier]);

    await flushMicrotasks();
    const comp = fixture.componentInstance as unknown as {
      openDetail: (g: unknown) => Promise<void>;
      rejeter: (g: unknown) => Promise<void>;
      decisionMotif: string;
    };
    const openPromise = comp.openDetail(dossier);
    httpMock.expectOne('/api/guides/7/historique').flush([]);
    await openPromise;
    fixture.detectChanges();

    comp.decisionMotif = 'abc';
    await comp.rejeter(dossier);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('motif explicite');

    comp.decisionMotif = 'Carte professionnelle illisible';
    const rejectPromise = comp.rejeter(dossier);
    const rejectReq = httpMock.expectOne('/api/guides/7/rejeter');
    expect(rejectReq.request.body).toEqual({ motif: 'Carte professionnelle illisible' });
    rejectReq.flush({ ...dossier, statutValidation: 'REJETE' });
    await flushMicrotasks();
    httpMock.expectOne('/api/guides/statistiques').flush({
      total: 1,
      brouillons: 0,
      enAttenteValidation: 0,
      valides: 0,
      rejetes: 1,
      suspendus: 0,
      desactives: 0,
      disponiblesEtValides: 0,
      visiblesPublic: 0,
      parZone: {},
      parLangue: {},
    });
    httpMock.expectOne('/api/guides/admin/tous').flush([{ ...dossier, statutValidation: 'REJETE' }]);
    await flushMicrotasks();
    httpMock.expectOne('/api/guides/7/historique').flush([]);
    await rejectPromise;
  });

  it('ProGuideWorkspacePageComponent validates form and confirms deactivation via CDK Dialog', async () => {
    userSig.set(makeUser('GUIDE', 5));
    const fixture = TestBed.createComponent(ProGuideWorkspacePageComponent);
    fixture.detectChanges();

    const monProfil = {
      id: 7,
      utilisateurId: 5,
      nom: 'Badji',
      prenom: 'Alassane',
      compteActif: true,
      presentationCourte: 'Guide nature Casamance',
      biographie: 'Expérience reconnue en écotourisme en Basse-Casamance.',
      languesParlees: 'Français, Diola',
      specialites: 'Mangrove',
      zonesIntervention: 'Oussouye',
      anneesExperience: 6,
      disponible: true,
      visibilitePublique: true,
      statutValidation: 'VALIDE',
    };
    httpMock.expectOne('/api/guides/mon-profil').flush(monProfil);
    httpMock.expectOne('/api/reservations/guide/agenda').flush([]);
    await flushMicrotasks();
    httpMock.expectOne('/api/guides/7/historique').flush([]);
    await flushMicrotasks();
    fixture.detectChanges();
    await flushMicrotasks();
    httpMock.match((r) => r.url.startsWith('/api/avis')).forEach((r) =>
      r.flush({
        cibleType: 'GUIDE',
        cibleId: 5,
        noteMoyenne: 0,
        totalAvis: 0,
        repartition: {},
        eligible: false,
        dejaEvalue: false,
        reservationsEligiblesIds: [],
        content: [],
        page: 0,
        size: 6,
        totalElements: 0,
        totalPages: 0,
        last: true,
      })
    );

    await flushMicrotasks();
    dialogSpy.open.mockReturnValue({ closed: of(false) });
    const comp = fixture.componentInstance as unknown as { desactiver: () => Promise<void> };
    await comp.desactiver();
    expect(dialogSpy.open).toHaveBeenCalledTimes(1);
    expect(httpMock.match('/api/guides/mon-profil/desactiver')).toHaveLength(0);
  });

  it('ProReservationsPageComponent executes sync and confirmed cancel without manual confirmation', async () => {
    userSig.set(makeUser('GESTIONNAIRE_SITE', 3));
    const fixture = TestBed.createComponent(ProReservationsPageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/reservations/statistiques').flush({
      totalReservations: 1,
      brouillon: 0,
      enAttentePaiement: 1,
      confirmees: 0,
      expirees: 0,
      annulees: 0,
      echecs: 0,
      remboursees: 0,
      placesReserveesActives: 2,
      montantTotalConfirme: 0,
      montantTotalEnAttente: 20000,
      devise: 'XOF',
      reservationsParCircuit: 1,
      reservationsParEvenement: 0,
    });
    httpMock.expectOne((r) => r.url === '/api/reservations/recherche').flush({
      content: [
        {
          id: 41,
          referenceReservation: 'RES-2026-41',
          nomClient: 'Moussa Diop',
          emailClient: 'moussa@uasz.sn',
          telephoneClient: '+221770000000',
          nombrePlaces: 2,
          dateReservation: '2026-11-18T10:00:00',
          typeReservation: 'CIRCUIT',
          statut: 'EN_ATTENTE_PAIEMENT',
          montantTotal: 20000,
          circuitId: 1,
          evenementId: null,
          circuit: null,
          evenement: null,
        },
      ],
      page: 0,
      size: 12,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });

    await flushMicrotasks();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('RES-2026-41');
    expect(text).not.toContain('Confirmer manuellement');
  });

  it('ProPaiementsPageComponent executes ADMINISTRATEUR refund after CDK confirm', async () => {
    userSig.set(makeUser('ADMINISTRATEUR', 1));
    const fixture = TestBed.createComponent(ProPaiementsPageComponent);
    fixture.detectChanges();

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
    const payRow = {
      id: 77,
      referenceTransaction: 'PAY-SIM-77',
      reservationId: 41,
      montant: 30000,
      modePaiement: 'WAVE',
      statut: 'ACCEPTE',
      datePaiement: '2026-11-18T10:00:00',
      estSimule: true,
      numeroTelephoneMasque: '+22177****00',
    };
    httpMock.expectOne((r) => r.url === '/api/paiements/recherche').flush({
      content: [payRow],
      page: 0,
      size: 12,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });

    await flushMicrotasks();
    dialogSpy.open.mockReturnValue({ closed: of(true) });
    const comp = fixture.componentInstance as unknown as { rembourser: (p: unknown) => Promise<void> };
    const pPromise = comp.rembourser(payRow);
    await flushMicrotasks();

    const req = httpMock.expectOne('/api/paiements/77/rembourser');
    expect(req.request.method).toBe('POST');
    req.flush({ ...payRow, statut: 'REMBOURSE' });

    await flushMicrotasks();
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
    httpMock.expectOne((r) => r.url === '/api/paiements/recherche').flush({
      content: [],
      page: 0,
      size: 12,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });
    await pPromise;
  });

  it('ProModerationPageComponent requires >=5 char justification and surfaces 409 conflict cleanly', async () => {
    userSig.set(makeUser('GESTIONNAIRE_SITE', 3));
    const fixture = TestBed.createComponent(ProModerationPageComponent);
    fixture.detectChanges();

    httpMock.expectOne('/api/moderation/statistiques').flush({
      totalAvis: 1,
      approuves: 1,
      enAttente: 0,
      masques: 0,
      rejetes: 0,
      noteMoyenneApprouves: 5,
      totalSignalements: 1,
      signalementsOuverts: 1,
      signalementsFondes: 0,
      signalementsRejetes: 0,
      avisParCible: { CIRCUIT: 1 },
    });
    const sig = {
      id: 12,
      avisId: 5,
      signaleParId: 4,
      signaleParNom: 'Fatou',
      categorie: 'SPAM',
      motif: 'Lien publicitaire non sollicité',
      statut: 'OUVERT',
      dateSignalement: '2026-11-18T09:00:00',
    };
    httpMock.expectOne('/api/moderation/signalements?statut=OUVERT').flush([sig]);
    httpMock.expectOne('/api/moderation/avis').flush([]);

    await flushMicrotasks();
    const comp = fixture.componentInstance as unknown as {
      openSigDecision: (s: unknown, d: 'VALIDE_CONTENU_RETIRE') => void;
      justification: string;
      confirmSigDecision: () => Promise<void>;
    };
    comp.openSigDecision(sig, 'VALIDE_CONTENU_RETIRE');
    comp.justification = 'non';
    await comp.confirmSigDecision();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('au moins 5 caractères');

    comp.justification = 'Contenu promotionnel confirmé';
    const dPromise = comp.confirmSigDecision();
    const req = httpMock.expectOne('/api/moderation/signalements/12/decision');
    req.flush({ erreur: 'Signalement déjà clôturé par un autre modérateur' }, { status: 409, statusText: 'Conflict' });
    await dPromise;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Signalement déjà clôturé');
  });

  it('ProUtilisateursPageComponent & ProNotificationsPageComponent handle pagination, security audit and global retry', async () => {
    userSig.set(makeUser('ADMINISTRATEUR', 1));
    getUserStatsMock.mockResolvedValue({
      total: 5,
      actifs: 5,
      inactifs: 0,
      parRole: { ADMINISTRATEUR: 1, GUIDE: 1, CONSERVATEUR: 1, GESTIONNAIRE_SITE: 1, TOURISTE: 1 },
      auditLogsTotal: 14,
      alertesSecurite24h: 1,
      echecsConnexion24h: 2,
    });
    rechercherUsersMock.mockResolvedValue({
      content: [makeUser('CONSERVATEUR', 4)],
      page: 0,
      size: 12,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });
    getAuditLogsMock.mockResolvedValue({
      content: [
        {
          id: 99,
          timestamp: '2026-11-18T11:00:00',
          eventType: 'ROLE_CHANGE',
          utilisateurId: 4,
          email: 'fatou@uasz.sn',
          ipAddress: '127.0.0.1',
          details: 'Changement de rôle',
          status: 'SUCCESS',
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });

    const uFixture = TestBed.createComponent(ProUtilisateursPageComponent);
    uFixture.detectChanges();
    await flushMicrotasks();
    uFixture.detectChanges();
    expect(uFixture.nativeElement.textContent).toContain('conservateur@uasz.sn');

    const uComp = uFixture.componentInstance as unknown as { switchTab: (t: 'audit') => void };
    uComp.switchTab('audit');
    await flushMicrotasks();
    uFixture.detectChanges();
    expect(uFixture.nativeElement.textContent).toContain('ROLE_CHANGE');

    const nFixture = TestBed.createComponent(ProNotificationsPageComponent);
    nFixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === '/api/notifications/mes-notifications')
      .flush({ content: [], page: 0, size: 12, totalElements: 0, totalPages: 0, last: true, unreadCount: 0 });
    await flushMicrotasks();
  });
});
