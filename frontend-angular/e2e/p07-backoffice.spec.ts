import { expect, test, type Page } from '@playwright/test';

const ARTIFACT_DIR = process.env['PW_SCREENSHOT_DIR'] ?? 'test-results/p07-screenshots';

type Role = 'TOURISTE' | 'GUIDE' | 'CONSERVATEUR' | 'GESTIONNAIRE_SITE' | 'ADMINISTRATEUR';

interface MockAccount {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  role: Role;
  actif: boolean;
  dateInscription: string;
}

const ACCOUNTS: Record<Role, MockAccount> = {
  ADMINISTRATEUR: {
    id: 1,
    prenom: 'Lamine',
    nom: 'Faty',
    email: 'lamine.faty@univ-zig.sn',
    telephone: '+221770000001',
    role: 'ADMINISTRATEUR',
    actif: true,
    dateInscription: '2026-10-01T10:00:00',
  },
  TOURISTE: {
    id: 2,
    prenom: 'Moussa',
    nom: 'Diop',
    email: 'moussa.diop@zig.univ.sn',
    telephone: '+221770000002',
    role: 'TOURISTE',
    actif: true,
    dateInscription: '2026-10-02T10:00:00',
  },
  GESTIONNAIRE_SITE: {
    id: 3,
    prenom: 'Awa',
    nom: 'Sagna',
    email: 'awa.sagna@zig.univ.sn',
    telephone: '+221770000003',
    role: 'GESTIONNAIRE_SITE',
    actif: true,
    dateInscription: '2026-10-03T10:00:00',
  },
  CONSERVATEUR: {
    id: 4,
    prenom: 'Fatou',
    nom: 'Coly',
    email: 'fatou.coly@zig.univ.sn',
    telephone: '+221770000004',
    role: 'CONSERVATEUR',
    actif: true,
    dateInscription: '2026-10-04T10:00:00',
  },
  GUIDE: {
    id: 5,
    prenom: 'Alassane',
    nom: 'Badji',
    email: 'alassane.badji@zig.univ.sn',
    telephone: '+221770000005',
    role: 'GUIDE',
    actif: true,
    dateInscription: '2026-10-05T10:00:00',
  },
};

async function setupBackofficeMocks(page: Page, initialRole: Role | null = null) {
  let currentUser: MockAccount | null = initialRole ? { ...ACCOUNTS[initialRole] } : null;

  await page.route(
    /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|tile\.openstreetmap\.org|unpkg\.com)/,
    (route) => route.abort()
  );

  await page.route('**/api/utilisateurs**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname === '/api/utilisateurs/connexion' && method === 'POST') {
      const body = route.request().postDataJSON() as { email: string };
      const match = Object.values(ACCOUNTS).find(
        (u) => u.email.toLowerCase() === body.email?.toLowerCase()
      );
      if (!match) {
        await route.fulfill({ status: 401, json: { erreur: 'Identifiants invalides' } });
        return;
      }
      currentUser = { ...match };
      await route.fulfill({ json: currentUser });
      return;
    }
    if (url.pathname === '/api/utilisateurs/deconnexion') {
      currentUser = null;
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    if (url.pathname === '/api/utilisateurs/me') {
      if (currentUser) {
        await route.fulfill({ json: currentUser });
      } else {
        await route.fulfill({ status: 401, json: { erreur: 'Session absente' } });
      }
      return;
    }
    if (url.pathname === '/api/utilisateurs/statistiques') {
      await route.fulfill({
        json: {
          total: 5,
          actifs: 5,
          inactifs: 0,
          parRole: { ADMINISTRATEUR: 1, GESTIONNAIRE_SITE: 1, CONSERVATEUR: 1, GUIDE: 1, TOURISTE: 1 },
          auditLogsTotal: 22,
          alertesSecurite24h: 1,
          echecsConnexion24h: 2,
        },
      });
      return;
    }
    if (url.pathname === '/api/utilisateurs/recherche') {
      await route.fulfill({
        json: {
          content: Object.values(ACCOUNTS),
          page: 0,
          size: 12,
          totalElements: 5,
          totalPages: 1,
          last: true,
        },
      });
      return;
    }
    if (url.pathname === '/api/utilisateurs/audit') {
      await route.fulfill({
        json: {
          content: [
            {
              id: 101,
              timestamp: '2026-11-18T11:30:00',
              eventType: 'LOGIN_SUCCESS',
              utilisateurId: 1,
              email: 'lamine.faty@univ-zig.sn',
              ipAddress: '127.0.0.1',
              details: 'Connexion réussie Back-Office',
              status: 'SUCCESS',
            },
          ],
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
          last: true,
        },
      });
      return;
    }
    await route.fulfill({ json: Object.values(ACCOUNTS) });
  });

  await page.route('**/api/patrimoines**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/statistiques')) {
      await route.fulfill({
        json: {
          total: currentUser?.role === 'GESTIONNAIRE_SITE' ? 1 : 2,
          brouillons: currentUser?.role === 'GESTIONNAIRE_SITE' ? 0 : 1,
          soumis: 0,
          publies: 1,
          archives: 0,
          scope: currentUser?.role === 'GESTIONNAIRE_SITE' ? 'PUBLIE_UNIQUEMENT' : 'GLOBAL',
          parCategorie: { HISTORIQUE: 1, CULTUREL: 1 },
          parZone: { BASSE_CASAMANCE: 2 },
          capaciteTotalePubliee: 250,
          tarifMoyenPublie: 1000,
        },
      });
      return;
    }
    if (url.pathname.endsWith('/recherche')) {
      const list = [
        {
          id: 1,
          nomPatrimoine: 'Mémorial de la Tragédie du Joola',
          codePatrimoine: 'PAT-ZIG-001',
          descriptionPatrimoine: 'Lieu de mémoire à Ziguinchor',
          adressePatrimoine: 'Ziguinchor',
          capacitePatrimoine: 250,
          latitudePatrimoine: 12.5833,
          longitudePatrimoine: -16.2719,
          categoriePatrimoine: 'HISTORIQUE',
          zoneGeographique: 'BASSE_CASAMANCE',
          tarifEntree: 0,
          statutPublication: 'PUBLIE',
        },
      ];
      if (url.searchParams.get('inclureNonPublies') === 'true') {
        list.push({
          id: 9,
          nomPatrimoine: 'Case Royale Oussouye Brouillon',
          codePatrimoine: 'PAT-OSS-009',
          descriptionPatrimoine: 'Fiche en préparation conservateur',
          adressePatrimoine: 'Oussouye',
          capacitePatrimoine: 80,
          latitudePatrimoine: 12.48,
          longitudePatrimoine: -16.54,
          categoriePatrimoine: 'CULTUREL',
          zoneGeographique: 'BASSE_CASAMANCE',
          tarifEntree: 1500,
          statutPublication: 'BROUILLON',
        });
      }
      await route.fulfill({
        json: { content: list, page: 0, size: 10, totalElements: list.length, totalPages: 1, last: true },
      });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await page.route('**/api/circuits**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/statistiques')) {
      await route.fulfill({
        json: {
          total: 1,
          brouillons: 0,
          soumis: 0,
          publies: 1,
          archives: 0,
          avecGuideAffecte: 1,
          sansGuide: 0,
          scope: currentUser?.role === 'GUIDE' ? 'GUIDE_PROPRE' : 'GLOBAL',
          parDifficulte: { FACILE: 1 },
          parMoyenTransport: { PIROGUE: 1 },
          parZone: { BASSE_CASAMANCE: 1 },
          prixMoyenPublie: 15000,
          dureeMoyenneMinutes: 180,
        },
      });
      return;
    }
    const circuit = {
      id: 1,
      nomCircuit: 'Bolongs de Casamance & Enampore',
      descriptionCircuit: 'Circuit fluvial en pirogue',
      difficulte: 'FACILE',
      moyenTransport: 'PIROGUE',
      zoneGeographique: 'BASSE_CASAMANCE',
      dureeEstimee: 180,
      distanceTotale: 34.5,
      placesMax: 16,
      prix: 15000,
      statutCircuit: 'PUBLIE',
      guideResponsableId: 5,
      etapes: [{ id: 1, ordre: 1, dureeVisite: 90, patrimoineId: 1, patrimoine: null }],
    };
    if (url.pathname.endsWith('/guide/mes-circuits')) {
      await route.fulfill({ json: [circuit] });
      return;
    }
    if (url.pathname.endsWith('/recherche')) {
      await route.fulfill({
        json: { content: [circuit], page: 0, size: 10, totalElements: 1, totalPages: 1, last: true },
      });
      return;
    }
    await route.fulfill({ json: circuit });
  });

  await page.route('**/api/evenements**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/statistiques')) {
      await route.fulfill({
        json: {
          total: 1,
          brouillons: 0,
          soumis: 0,
          publies: 1,
          annules: 0,
          termines: 0,
          archives: 0,
          aVenirPublies: 1,
          ouvertsReservation: 1,
          parType: { FESTIVAL: 1 },
          parZone: { BASSE_CASAMANCE: 1 },
        },
      });
      return;
    }
    await route.fulfill({
      json: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, last: true },
    });
  });

  await page.route('**/api/guides**', async (route) => {
    const url = new URL(route.request().url());
    const profil = {
      id: 7,
      utilisateurId: 5,
      nom: 'Badji',
      prenom: 'Alassane',
      email: 'alassane.badji@zig.univ.sn',
      compteActif: true,
      presentationCourte: 'Spécialiste des bolongs',
      biographie: 'Guide agréé depuis 8 ans en Basse-Casamance.',
      languesParlees: 'Français, Diola, Wolof',
      specialites: 'Bolongs, Cases à impluvium',
      zonesIntervention: 'Oussouye, Carabane',
      anneesExperience: 8,
      disponible: true,
      visibilitePublique: true,
      statutValidation: 'VALIDE',
    };
    if (url.pathname.endsWith('/statistiques')) {
      await route.fulfill({
        json: {
          total: 2,
          brouillons: 0,
          enAttenteValidation: 1,
          valides: 1,
          rejetes: 0,
          suspendus: 0,
          desactives: 0,
          disponiblesEtValides: 1,
          visiblesPublic: 1,
          parZone: { Oussouye: 1 },
          parLangue: { Français: 1 },
        },
      });
      return;
    }
    if (url.pathname.endsWith('/mon-profil')) {
      await route.fulfill({ json: profil });
      return;
    }
    if (url.pathname.endsWith('/admin/tous')) {
      await route.fulfill({ json: [profil] });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await page.route('**/api/reservations**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/statistiques')) {
      await route.fulfill({
        json: {
          totalReservations: 3,
          brouillon: 0,
          enAttentePaiement: 1,
          confirmees: 2,
          expirees: 0,
          annulees: 0,
          echecs: 0,
          remboursees: 0,
          placesReserveesActives: 6,
          montantTotalConfirme: 45000,
          montantTotalEnAttente: 15000,
          devise: 'XOF',
          reservationsParCircuit: 2,
          reservationsParEvenement: 1,
        },
      });
      return;
    }
    if (url.pathname.includes('/guide/circuits/')) {
      await route.fulfill({
        json: [
          {
            reservationId: 11,
            referenceReservation: 'RES-2026-011',
            circuitId: 1,
            nomClient: 'Moussa Diop',
            nombrePlaces: 2,
            datePrestation: '2026-12-10',
            creneauPrestation: '09h00',
            statut: 'CONFIRMEE',
            commentaire: null,
            participants: [{ nomComplet: 'Moussa Diop', categorie: 'ADULTE' }],
          },
        ],
      });
      return;
    }
    await route.fulfill({
      json: {
        content: [
          {
            id: 11,
            referenceReservation: 'RES-2026-011',
            nomClient: 'Moussa Diop',
            emailClient: 'moussa.diop@zig.univ.sn',
            telephoneClient: '+221770000002',
            nombrePlaces: 2,
            dateReservation: '2026-11-18T09:00:00',
            typeReservation: 'CIRCUIT',
            statut: 'CONFIRMEE',
            montantTotal: 30000,
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
      },
    });
  });

  await page.route('**/api/paiements**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/statistiques')) {
      await route.fulfill({
        json: {
          totalTransactions: 2,
          enCours: 0,
          acceptees: 2,
          refusees: 0,
          expirees: 0,
          annulees: 0,
          remboursees: 0,
          montantTotalAccepteSimule: 45000,
          montantTotalRembourseSimule: 0,
          montantWaveSimule: 30000,
          montantOrangeMoneySimule: 15000,
          outboxEnAttente: 0,
          devise: 'XOF',
          estSimule: true,
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        content: [
          {
            id: 71,
            referenceTransaction: 'PAY-SIM-WAV-71',
            reservationId: 11,
            montant: 30000,
            modePaiement: 'WAVE',
            statut: 'ACCEPTE',
            datePaiement: '2026-11-18T09:05:00',
            estSimule: true,
            mentionSimulation: 'PAIEMENT SIMULÉ',
            numeroTelephoneMasque: '+22177****02',
            synchroReservationStatut: 'SYNCHRONISEE',
          },
        ],
        page: 0,
        size: 12,
        totalElements: 1,
        totalPages: 1,
        last: true,
      },
    });
  });

  await page.route('**/api/moderation**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/statistiques')) {
      await route.fulfill({
        json: {
          totalAvis: 3,
          approuves: 3,
          enAttente: 0,
          masques: 0,
          rejetes: 0,
          noteMoyenneApprouves: 4.8,
          totalSignalements: 1,
          signalementsOuverts: 1,
          signalementsFondes: 0,
          signalementsRejetes: 0,
          avisParCible: { CIRCUIT: 2, GUIDE: 1 },
        },
      });
      return;
    }
    await route.fulfill({ json: [] });
  });

  await page.route('**/api/avis**', async (route) => {
    await route.fulfill({
      json: {
        content: [],
        page: 0,
        size: 6,
        totalElements: 0,
        totalPages: 0,
        last: true,
        eligible: false,
        dejaEvalue: false,
        reservationsEligiblesIds: [],
        noteMoyenne: 0,
        totalAvis: 0,
        repartition: {},
      },
    });
  });

  await page.route('**/api/notifications**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/compteur')) {
      await route.fulfill({ json: { unreadCount: 2 } });
      return;
    }
    if (url.pathname.endsWith('/statistiques')) {
      await route.fulfill({
        json: {
          total: 4,
          enAttente: 0,
          envoyees: 4,
          echecsTemporaires: 0,
          echecsDefinitifs: 0,
          nonLuesTotal: 2,
          parStatut: { ENVOYEE: 4 },
          parCanal: { EMAIL: 3, IN_APP: 1 },
          parTypeEvenement: { PAIEMENT_ACCEPTE: 2, GUIDE_PROFILE_VALIDE: 2 },
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        content: [],
        page: 0,
        size: 12,
        totalElements: 0,
        totalPages: 0,
        last: true,
        unreadCount: 2,
      },
    });
  });
}

test.describe('P07 Back-Office RBAC, Séparation Public/Pro & Workflows', () => {
  test('ADMINISTRATEUR accède au cockpit /pro/tableau-de-bord, paiements et audit sécurité', async ({
    page,
    isMobile,
  }) => {
    await setupBackofficeMocks(page, 'ADMINISTRATEUR');
    await page.goto('/pro/tableau-de-bord');

    await expect(page).toHaveURL(/\/pro\/tableau-de-bord/);
    await expect(page.getByText('Revenus simulés acceptés')).toBeVisible();
    await expect(page.getByText(/45[\s\u00a0\u202f]?000\s*FCFA/)).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(hasHorizontalOverflow).toBe(false);

    if (!isMobile) {
      await page.screenshot({
        path: `${ARTIFACT_DIR}/p07-admin-dashboard-desktop.png`,
        fullPage: false,
      });
    } else {
      await page.screenshot({
        path: `${ARTIFACT_DIR}/p07-admin-dashboard-mobile.png`,
        fullPage: false,
      });
      const burger = page.getByRole('button', { name: 'Ouvrir le menu back-office' });
      await expect(burger).toBeVisible();
      await burger.click();
    }

    await page.getByRole('link', { name: /Paiements simulés/i }).click();
    await expect(page).toHaveURL(/\/pro\/paiements/);
    await expect(page.getByText('PAY-SIM-WAV-71')).toBeVisible();

    if (!isMobile) {
      await page.screenshot({
        path: `${ARTIFACT_DIR}/p07-admin-paiements-desktop.png`,
        fullPage: false,
      });
    }

    await page.goto('/pro/utilisateurs');
    await expect(page.getByText('lamine.faty@univ-zig.sn')).toBeVisible();
    await page.getByRole('tab', { name: /Journal d'audit sécurité/i }).click();
    await expect(page.getByRole('table').getByText('LOGIN_SUCCESS')).toBeVisible();
  });

  test('CONSERVATEUR gère uniquement le patrimoine et est bloqué sur paiements/users/reservations', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Matrice complète vérifiée sur desktop');
    await setupBackofficeMocks(page, 'CONSERVATEUR');
    await page.goto('/pro/tableau-de-bord');

    await expect(page.locator('.pro-nav')).toContainText('Patrimoines');
    await expect(page.locator('.pro-nav')).not.toContainText('Paiements simulés');
    await expect(page.locator('.pro-nav')).not.toContainText('Utilisateurs & Audit');

    await page.goto('/pro/patrimoines');
    await expect(page.getByText('PAT-OSS-009')).toBeVisible();
    await page.screenshot({
      path: `${ARTIFACT_DIR}/p07-conservateur-patrimoines.png`,
      fullPage: false,
    });

    await page.goto('/pro/paiements');
    await expect(page).toHaveURL(/\/acces-refuse/);
  });

  test('GESTIONNAIRE_SITE voit Patrimoines en lecture seule et accède à Guides & Réservations sans Paiements', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Vérification gestionnaire sur desktop');
    await setupBackofficeMocks(page, 'GESTIONNAIRE_SITE');
    await page.goto('/pro/patrimoines');

    await expect(page.getByText(/lecture seule/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Nouveau patrimoine/i })).toHaveCount(0);

    await page.goto('/pro/reservations');
    await expect(page.getByText('RES-2026-011')).toBeVisible();

    await page.goto('/pro/utilisateurs');
    await expect(page).toHaveURL(/\/acces-refuse/);
  });

  test('GUIDE est isolé sur son périmètre /pro/mon-profil-guide, /pro/circuits et /pro/manifestes et bloqué sur /administration', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Vérification périmètre guide sur desktop');
    await setupBackofficeMocks(page, null);
    await page.goto('/connexion');
    await page.locator('#login-email').fill('alassane.badji@zig.univ.sn');
    await page.locator('#login-password').fill('Guide2026!');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(/\/pro\/tableau-de-bord/, { timeout: 10000 });
    await expect(page.locator('.pro-nav')).toContainText('Mon profil guide');
    await expect(page.locator('.pro-nav')).toContainText('Mes circuits');
    await expect(page.locator('.pro-nav')).not.toContainText('Patrimoines');
    await expect(page.locator('.pro-nav')).not.toContainText('Paiements simulés');

    await page.getByRole('link', { name: 'Manifestes circuits' }).click();
    await expect(page.getByText('RES-2026-011')).toBeVisible();
    await page.screenshot({
      path: `${ARTIFACT_DIR}/p07-guide-manifestes.png`,
      fullPage: false,
    });

    await page.goto('/administration');
    await expect(page).toHaveURL(/\/acces-refuse/);
  });

  test('TOURISTE connecté est strictement rejeté de /pro/tableau-de-bord', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Vérification refus touriste sur desktop');
    await setupBackofficeMocks(page, 'TOURISTE');
    await page.goto('/pro/tableau-de-bord');
    await expect(page).toHaveURL(/\/acces-refuse/);
  });
});
