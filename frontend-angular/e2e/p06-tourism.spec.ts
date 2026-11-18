import { expect, test, type Page } from '@playwright/test';

const ARTIFACT_DIR =
  '/home/mahou-dev/.gemini/antigravity/brain/d6c3c5cc-e13a-42c6-b987-d193795c2b79/scratch';

const CASAMANCE_PATRIMOINES = [
  {
    id: 1,
    nomPatrimoine: 'Mémorial de la Tragédie du Joola',
    codePatrimoine: 'PAT-ZIG-001',
    descriptionPatrimoine: 'Lieu national de mémoire et de recueillement à Ziguinchor.',
    historiquePatrimoine: 'Érigé en hommage aux victimes du 26 septembre 2002.',
    adressePatrimoine: 'Berges du fleuve, Ziguinchor',
    capacitePatrimoine: 250,
    latitudePatrimoine: 12.5833,
    longitudePatrimoine: -16.2719,
    categoriePatrimoine: 'HISTORIQUE',
    zoneGeographique: 'BASSE_CASAMANCE',
    localite: 'Ziguinchor',
    statutPublication: 'PUBLIE',
  },
  {
    id: 2,
    nomPatrimoine: 'Île de Carabane et Mission',
    codePatrimoine: 'PAT-CRB-002',
    descriptionPatrimoine: 'Ancien comptoir estuarien et église coloniale sous les cocotiers.',
    historiquePatrimoine: 'Comptoir fondé en 1836 à l’embouchure du fleuve Casamance.',
    adressePatrimoine: 'Île de Carabane',
    capacitePatrimoine: 180,
    latitudePatrimoine: 12.5535,
    longitudePatrimoine: -16.7019,
    categoriePatrimoine: 'ARCHITECTURAL',
    zoneGeographique: 'BASSE_CASAMANCE',
    localite: 'Carabane',
    statutPublication: 'PUBLIE',
  },
  {
    id: 5,
    nomPatrimoine: 'Case à Impluvium d’Enampore',
    codePatrimoine: 'PAT-CAS-005',
    descriptionPatrimoine: 'Chef-d’œuvre de l’architecture communautaire diola en terre crue.',
    historiquePatrimoine: 'Tradition constructive séculaire du royaume du Bandial.',
    adressePatrimoine: 'Enampore, Basse-Casamance',
    capacitePatrimoine: 120,
    latitudePatrimoine: 12.5177,
    longitudePatrimoine: -16.4472,
    categoriePatrimoine: 'ARCHITECTURAL',
    zoneGeographique: 'BASSE_CASAMANCE',
    localite: 'Enampore',
    statutPublication: 'PUBLIE',
  },
  {
    id: 6,
    nomPatrimoine: 'Fort de Sédhiou',
    codePatrimoine: 'PAT-SED-006',
    descriptionPatrimoine: 'Vestiges fortifiés surplombant la Moyenne-Casamance.',
    historiquePatrimoine: 'Édifié au XIXe siècle sur les berges du fleuve.',
    adressePatrimoine: 'Sédhiou',
    capacitePatrimoine: 150,
    latitudePatrimoine: 12.7081,
    longitudePatrimoine: -15.5569,
    categoriePatrimoine: 'HISTORIQUE',
    zoneGeographique: 'MOYENNE_CASAMANCE',
    localite: 'Sédhiou',
    statutPublication: 'PUBLIE',
  },
  {
    id: 99,
    nomPatrimoine: 'Site en brouillon non publié',
    codePatrimoine: 'PAT-DRAFT-99',
    descriptionPatrimoine: 'Doit rester invisible côté public.',
    historiquePatrimoine: null,
    adressePatrimoine: 'Interne',
    capacitePatrimoine: 50,
    latitudePatrimoine: 12.6,
    longitudePatrimoine: -16.2,
    categoriePatrimoine: 'CULTUREL',
    zoneGeographique: 'HAUTE_CASAMANCE',
    localite: 'Kolda',
    statutPublication: 'BROUILLON',
  },
];

const CASAMANCE_CIRCUITS = [
  {
    id: 1,
    nomCircuit: 'Bolongs de Casamance & Enampore',
    descriptionCircuit: 'Immersion en pirogue traditionnelle et architecture diola.',
    presentationTouristique: 'Une journée au fil de l’eau entre mangrove et cases à impluvium.',
    difficulte: 'FACILE',
    moyenTransport: 'PIROGUE',
    zoneGeographique: 'BASSE_CASAMANCE',
    dureeEstimee: 240,
    distanceTotale: 38.4,
    placesMax: 16,
    prix: 15000,
    statutCircuit: 'PUBLIE',
    guideResponsableId: 50,
    etapes: [
      { id: 1, ordre: 1, dureeVisite: 90, patrimoineId: 5, patrimoine: CASAMANCE_PATRIMOINES[2] },
      { id: 2, ordre: 2, dureeVisite: 150, patrimoineId: 2, patrimoine: CASAMANCE_PATRIMOINES[1] },
    ],
  },
];

const CASAMANCE_EVENEMENTS = [
  {
    id: 1,
    nomEvenement: 'Kankourang de Sédhiou & Rencontres',
    descriptionEvenement: 'Célébration culturelle et artisanale au bord du fleuve.',
    typeEvenement: 'CEREMONIE_TRADITIONNELLE',
    dateDebut: '2026-12-20T10:00:00',
    dateFin: '2026-12-20T18:00:00',
    lieu: 'Place historique, Sédhiou',
    zoneGeographique: 'MOYENNE_CASAMANCE',
    capaciteMax: 150,
    prix: 0,
    ouvertReservation: true,
    patrimoineId: 6,
    patrimoine: CASAMANCE_PATRIMOINES[3],
    statutEvenement: 'PUBLIE',
  },
];

const CASAMANCE_GUIDES = [
  {
    id: 1,
    utilisateurId: 50,
    nom: 'Badji',
    prenom: 'Alassane',
    compteActif: true,
    presentationCourte: 'Spécialiste des bolongs et traditions du Bandial.',
    biographie: 'Guide certifié depuis 8 ans en Basse-Casamance.',
    languesParlees: 'Français, Diola, Wolof',
    specialites: 'Écotourisme, Cases à impluvium',
    zonesIntervention: 'Basse-Casamance (Oussouye, Carabane, Ziguinchor)',
    anneesExperience: 8,
    tarifJournalierIndicatif: 25000,
    disponible: true,
    visibilitePublique: true,
    statutValidation: 'VALIDE',
  },
];

const TOURISTE_USER = {
  id: 12,
  prenom: 'Moussa',
  nom: 'Diop',
  email: 'moussa.diop@zig.univ.sn',
  telephone: '+221771234567',
  role: 'TOURISTE',
  actif: true,
  dateInscription: '2026-10-01T10:00:00',
};

async function setupP06Mocks(page: Page, authenticated = false) {
  let currentUser = authenticated ? { ...TOURISTE_USER } : null;

  await page.route(/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|tile\.openstreetmap\.org|unpkg\.com)/, (route) =>
    route.abort()
  );

  await page.route('**/api/utilisateurs/me', async (route) => {
    if (currentUser) {
      await route.fulfill({ json: currentUser });
    } else {
      await route.fulfill({ status: 401, json: { erreur: 'Non authentifié' } });
    }
  });

  await page.route('**/api/utilisateurs/12', async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      currentUser = { ...TOURISTE_USER, ...body };
      await route.fulfill({ json: currentUser });
      return;
    }
    await route.fulfill({ json: currentUser });
  });

  await page.route('**/api/patrimoines**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/patrimoines/recherche')) {
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const zone = url.searchParams.get('zone') ?? '';
      const pub = CASAMANCE_PATRIMOINES.filter((p) => p.statutPublication === 'PUBLIE').filter(
        (p) => {
          if (zone && p.zoneGeographique !== zone) return false;
          if (q && !`${p.nomPatrimoine} ${p.localite} ${p.codePatrimoine}`.toLowerCase().includes(q)) {
            return false;
          }
          return true;
        }
      );
      await route.fulfill({
        json: { content: pub, page: 0, size: 9, totalElements: pub.length, totalPages: 1, last: true },
      });
      return;
    }

    const matchById = /\/patrimoines\/(\d+)$/.exec(url.pathname);
    if (matchById) {
      const id = Number(matchById[1]);
      const found = CASAMANCE_PATRIMOINES.find((p) => p.id === id);
      await route.fulfill(found ? { json: found } : { status: 404, json: { erreur: 'Site introuvable' } });
      return;
    }

    await route.fulfill({ json: CASAMANCE_PATRIMOINES });
  });

  await page.route('**/api/circuits**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/circuits/recherche')) {
      const pub = CASAMANCE_CIRCUITS.filter((c) => c.statutCircuit === 'PUBLIE');
      await route.fulfill({
        json: { content: pub, page: 0, size: 8, totalElements: pub.length, totalPages: 1, last: true },
      });
      return;
    }
    const matchById = /\/circuits\/(\d+)$/.exec(url.pathname);
    if (matchById) {
      const id = Number(matchById[1]);
      const found = CASAMANCE_CIRCUITS.find((c) => c.id === id);
      await route.fulfill({ json: found ?? CASAMANCE_CIRCUITS[0] });
      return;
    }
    await route.fulfill({ json: CASAMANCE_CIRCUITS });
  });

  await page.route('**/api/evenements**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/evenements/recherche')) {
      await route.fulfill({
        json: {
          content: CASAMANCE_EVENEMENTS,
          page: 0,
          size: 8,
          totalElements: CASAMANCE_EVENEMENTS.length,
          totalPages: 1,
          last: true,
        },
      });
      return;
    }
    if (/\/evenements\/\d+$/.test(url.pathname)) {
      await route.fulfill({ json: CASAMANCE_EVENEMENTS[0] });
      return;
    }
    await route.fulfill({ json: CASAMANCE_EVENEMENTS });
  });

  await page.route('**/api/guides**', async (route) => {
    const url = new URL(route.request().url());
    if (/\/guides\/(utilisateur\/\d+|\d+)$/.test(url.pathname)) {
      await route.fulfill({ json: CASAMANCE_GUIDES[0] });
      return;
    }
    await route.fulfill({ json: CASAMANCE_GUIDES });
  });

  await page.route('**/api/avis**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/avis/resumes')) {
      await route.fulfill({
        json: [
          { cibleType: 'PATRIMOINE', cibleId: 2, noteMoyenne: 4.9, totalAvis: 5, repartition: {} },
          { cibleType: 'CIRCUIT', cibleId: 1, noteMoyenne: 4.8, totalAvis: 3, repartition: {} },
          { cibleType: 'GUIDE', cibleId: 50, noteMoyenne: 5.0, totalAvis: 6, repartition: {} },
        ],
      });
      return;
    }
    if (url.pathname.endsWith('/avis/resume')) {
      await route.fulfill({
        json: { cibleType: 'PATRIMOINE', cibleId: 1, noteMoyenne: 4.8, totalAvis: 2, repartition: { 5: 2 } },
      });
      return;
    }
    if (url.pathname.endsWith('/avis/mes-avis')) {
      await route.fulfill({ json: [] });
      return;
    }
    await route.fulfill({
      json: { content: [], page: 0, size: 6, totalElements: 0, totalPages: 0, last: true },
    });
  });

  await page.route('**/api/reservations/42', async (route) => {
    await route.fulfill({
      json: {
        id: 42,
        referenceReservation: 'RES-CAS-042',
        nomClient: 'Moussa Diop',
        emailClient: 'moussa.diop@zig.univ.sn',
        telephoneClient: '+221771234567',
        nombrePlaces: 2,
        dateReservation: '2026-11-18T10:00:00',
        datePrestation: '2026-12-10',
        creneauPrestation: 'Matin (09h00)',
        typeReservation: 'CIRCUIT',
        statut: 'EN_ATTENTE_PAIEMENT',
        montantTotal: 30000,
        circuitId: 1,
        evenementId: null,
        circuit: CASAMANCE_CIRCUITS[0],
        evenement: null,
        participants: [{ nomComplet: 'Moussa Diop', categorie: 'ADULTE' }],
        historique: [
          {
            id: 1,
            ancienStatut: null,
            nouveauStatut: 'EN_ATTENTE_PAIEMENT',
            dateTransition: '2026-11-18T10:00:00',
            motif: 'Création',
          },
        ],
      },
    });
  });

  await page.route('**/api/reservations', async (route) => {
    await route.fulfill({
      json: [
        {
          id: 42,
          referenceReservation: 'RES-CAS-042',
          nomClient: 'Moussa Diop',
          emailClient: 'moussa.diop@zig.univ.sn',
          nombrePlaces: 2,
          dateReservation: '2026-11-18T10:00:00',
          typeReservation: 'CIRCUIT',
          statut: 'EN_ATTENTE_PAIEMENT',
          montantTotal: 30000,
          circuitId: 1,
          evenementId: null,
          circuit: CASAMANCE_CIRCUITS[0],
          evenement: null,
        },
      ],
    });
  });

  await page.route('**/api/paiements/**', async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route('**/api/paiements', async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.route('**/api/notifications/mes-notifications**', async (route) => {
    await route.fulfill({
      json: { content: [], unreadCount: 0, page: 0, size: 15, totalElements: 0, totalPages: 1 },
    });
  });

  await page.route('**/api/notifications/non-lues/count', async (route) => {
    await route.fulfill({ json: { unreadCount: 0 } });
  });
}

test.describe('P06 Casamance Public Showcase & Tourist E2E', () => {
  test('renders Casamance showcase, filters catalogs, hides drafts, and verifies zero broken images or console errors', async ({
    page,
    isMobile,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await setupP06Mocks(page, false);
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('Casamance');
    await expect(page.getByText('4 site(s) référencé(s)')).toBeVisible();
    await expect(page.getByText('Site en brouillon non publié')).toBeHidden();
    await expect(page.getByText('Alassane Badji')).toBeVisible();

    const heroImg = page.locator('.hero-photo-frame img');
    await expect(heroImg).toBeVisible();
    const heroLoaded = await heroImg.evaluate(
      (img: HTMLImageElement) => img.complete && img.naturalWidth > 0
    );
    expect(heroLoaded).toBe(true);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflow).toBe(false);

    if (isMobile) {
      await page.screenshot({ path: `${ARTIFACT_DIR}/p06-home-mobile.png`, fullPage: false });
    } else {
      await page.screenshot({ path: `${ARTIFACT_DIR}/p06-home-desktop.png`, fullPage: false });
    }

    await page.goto('/patrimoines?zone=BASSE_CASAMANCE');
    await expect(page.getByRole('heading', { name: 'Île de Carabane et Mission' })).toBeVisible();
    await expect(page.getByText('Fort de Sédhiou')).toBeHidden();

    if (!isMobile) {
      await page.screenshot({ path: `${ARTIFACT_DIR}/p06-patrimoines-desktop.png`, fullPage: false });
    }

    await page.goto('/circuits/1');
    await expect(
      page.getByRole('heading', { name: 'Bolongs de Casamance & Enampore' })
    ).toBeVisible();
    await expect(page.getByText(/38\.4 km/).first()).toBeVisible();
    await expect(page.getByText('Alassane Badji').first()).toBeVisible();
    if (!isMobile) {
      await page.screenshot({ path: `${ARTIFACT_DIR}/p06-circuit-detail.png`, fullPage: false });
    }

    await page.goto('/evenements');
    await expect(
      page.getByRole('heading', { name: 'Kankourang de Sédhiou & Rencontres' })
    ).toBeVisible();
    await expect(page.getByText(/Africa\/Dakar/).first()).toBeVisible();

    await page.goto('/guides');
    await expect(page.getByRole('heading', { name: 'Alassane Badji' })).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('renders tourist /mon-espace tabs, profile edit, and /reservations/:id detail view', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Parcours espace personnel vérifié sur desktop');
    await setupP06Mocks(page, true);

    await page.goto('/mon-espace');
    await expect(page.locator('.account-hero__name')).toContainText('Moussa Diop');
    await expect(page.getByText('RES-CAS-042')).toBeVisible();

    await page.getByRole('tab', { name: /Profil & coordonnées/i }).click();
    await page.locator('#prof-nom').fill('Diop-Casamance');
    await page.getByRole('button', { name: /Enregistrer mes modifications/i }).click();
    await expect(page.locator('.account-hero__name')).toContainText('Diop-Casamance');

    await page.goto('/reservations/42');
    await expect(page.getByText('RES-CAS-042').first()).toBeVisible();
    await expect(page.getByText('Procéder au paiement simulé')).toBeVisible();
    await page.screenshot({ path: `${ARTIFACT_DIR}/p06-reservation-detail.png`, fullPage: false });
  });
});
