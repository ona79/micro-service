import { expect, Page, test } from '@playwright/test';

const MOCK_PATRIMOINES = [
  {
    id: 1,
    nomPatrimoine: 'Maison des Esclaves de Gorée',
    codePatrimoine: 'PAT-DKR-001',
    descriptionPatrimoine: "Monument historique emblématique situé sur l'île de Gorée.",
    historiquePatrimoine: 'Édifiée vers 1776, inscrite au patrimoine mondial UNESCO en 1978.',
    adressePatrimoine: 'Île de Gorée, Dakar',
    capacitePatrimoine: 150,
    latitudePatrimoine: 14.6672,
    longitudePatrimoine: -17.399,
  },
  {
    id: 2,
    nomPatrimoine: 'Monument de la Renaissance Africaine',
    codePatrimoine: 'PAT-DKR-002',
    descriptionPatrimoine: 'Statue monumentale en bronze de 52 mètres dominant Dakar.',
    historiquePatrimoine: 'Inauguré le 3 avril 2010.',
    adressePatrimoine: 'Collines des Mamelles, Ouakam, Dakar',
    capacitePatrimoine: 500,
    latitudePatrimoine: 14.7222,
    longitudePatrimoine: -17.495,
  },
  {
    id: 3,
    nomPatrimoine: 'Cathédrale Saint-Antoine de Padoue',
    codePatrimoine: 'PAT-ZIG-003',
    descriptionPatrimoine: 'Édifice religieux et patrimonial majeur de la Casamance.',
    historiquePatrimoine: 'Construite au coeur de Ziguinchor.',
    adressePatrimoine: 'Centre-ville, Ziguinchor',
    capacitePatrimoine: 300,
    latitudePatrimoine: 12.5833,
    longitudePatrimoine: -16.2719,
  },
];

const MOCK_CIRCUITS = [
  {
    id: 1,
    nomCircuit: 'De Gorée à la Casamance : Mémoire et Teranga',
    descriptionCircuit: 'Parcours culturel reliant Dakar et Ziguinchor.',
    difficulte: 'FACILE',
    dureeEstimee: 225,
    distanceTotale: 301.4,
    placesMax: 25,
    prix: 15000,
    etapes: [
      { id: 1, ordre: 1, dureeVisite: 90, patrimoineId: 1, patrimoine: null },
      { id: 2, ordre: 2, dureeVisite: 60, patrimoineId: 2, patrimoine: null },
      { id: 3, ordre: 3, dureeVisite: 75, patrimoineId: 3, patrimoine: null },
    ],
  },
];

const MOCK_EVENEMENTS = [
  {
    id: 1,
    nomEvenement: 'Journées du Patrimoine de la Casamance',
    descriptionEvenement: 'Visite guidée et exposition architecturale.',
    typeEvenement: 'VISITE_GUIDEE',
    dateDebut: '2026-12-15T09:30:00',
    dateFin: '2026-12-15T17:00:00',
    lieu: 'Centre-ville, Ziguinchor',
    capaciteMax: 80,
    prix: 5000,
    patrimoineId: 3,
    patrimoine: null,
  },
];

async function setupApiMocks(page: Page) {
  let reservations = [
    {
      id: 1,
      nomClient: 'Moussa Diop',
      emailClient: 'moussa.diop@zig.univ.sn',
      telephoneClient: '+221771234567',
      nombrePlaces: 2,
      dateReservation: '2026-11-17T08:00:00',
      typeReservation: 'CIRCUIT',
      statut: 'CONFIRMEE',
      montantTotal: 30000,
      circuitId: 1,
      evenementId: null,
      circuit: null,
      evenement: null,
    },
  ];

  await page.route('**/api/patrimoines/*', async (route) => {
    const id = Number(route.request().url().split('/').pop());
    const found = MOCK_PATRIMOINES.find((p) => p.id === id);
    if (found) {
      await route.fulfill({ json: found });
    } else {
      await route.fulfill({ status: 404, json: { erreur: 'Patrimoine introuvable' } });
    }
  });

  await page.route('**/api/patrimoines', async (route) => {
    await route.fulfill({ json: MOCK_PATRIMOINES });
  });

  await page.route('**/api/circuits/*', async (route) => {
    const id = Number(route.request().url().split('/').pop());
    const found = MOCK_CIRCUITS.find((c) => c.id === id);
    if (found) {
      await route.fulfill({
        json: {
          ...found,
          etapes: found.etapes.map((e) => ({
            ...e,
            patrimoine: MOCK_PATRIMOINES.find((p) => p.id === e.patrimoineId) ?? null,
          })),
        },
      });
    } else {
      await route.fulfill({ status: 404, json: { erreur: 'Circuit introuvable' } });
    }
  });

  await page.route('**/api/circuits', async (route) => {
    await route.fulfill({ json: MOCK_CIRCUITS });
  });

  await page.route('**/api/evenements/*', async (route) => {
    const id = Number(route.request().url().split('/').pop());
    const found = MOCK_EVENEMENTS.find((ev) => ev.id === id);
    if (found) {
      await route.fulfill({
        json: {
          ...found,
          patrimoine: MOCK_PATRIMOINES.find((p) => p.id === found.patrimoineId) ?? null,
        },
      });
    } else {
      await route.fulfill({ status: 404, json: { erreur: 'Événement introuvable' } });
    }
  });

  await page.route('**/api/evenements', async (route) => {
    await route.fulfill({ json: MOCK_EVENEMENTS });
  });

  await page.route('**/api/reservations/*/annuler', async (route) => {
    const parts = route.request().url().split('/');
    const id = Number(parts[parts.length - 2]);
    reservations = reservations.map((r) =>
      r.id === id ? { ...r, statut: 'ANNULEE' } : r
    );
    const updated = reservations.find((r) => r.id === id);
    await route.fulfill({ json: updated });
  });

  await page.route('**/api/reservations', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON();
      if (body.nombrePlaces > 20) {
        await route.fulfill({
          status: 400,
          json: { erreur: 'Capacité insuffisante pour le circuit 1 : 20 place(s) disponible(s)' },
        });
        return;
      }
      const created = {
        id: reservations.length + 1,
        ...body,
        dateReservation: '2026-11-17T09:30:00',
        statut: 'CONFIRMEE',
        montantTotal: body.nombrePlaces * 15000,
        circuit: null,
        evenement: null,
      };
      reservations = [...reservations, created];
      await route.fulfill({ status: 201, json: created });
      return;
    }
    await route.fulfill({ json: reservations });
  });
}

test.describe('Patrimoine du Sénégal — Parcours E2E, Responsive & Accessibilité', () => {
  test('parcourt l’accueil, les patrimoines (et mode mémoire), les circuits et les événements', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await setupApiMocks(page);
    await page.goto('/');

    // Accessibilité : skip link, main landmark, titre h1 unique
    await expect(page.locator('a.skip-link')).toBeAttached();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByText('3 site(s) référencé(s)')).toBeVisible();

    // Recherche rapide depuis Hero -> /patrimoines?q=Gorée
    await page.locator('#hero-search-input').fill('Gorée');
    await page.locator('.hero-search__submit').click();
    await expect(page).toHaveURL(/\/patrimoines\?q=Gor/);
    await expect(
      page.getByRole('heading', { name: 'Maison des Esclaves de Gorée' })
    ).toBeVisible();

    // Ouverture fiche Lieu de mémoire
    await page.getByRole('link', { name: 'Maison des Esclaves de Gorée' }).first().click();
    await expect(page.locator('.memorial-notice')).toBeVisible();
    await expect(page.locator('nav[aria-label="Fil d\'Ariane"]')).toBeVisible();

    // Parcours Circuits & étapes
    await page.goto('/circuits');
    await expect(
      page.getByRole('heading', { name: 'De Gorée à la Casamance : Mémoire et Teranga' })
    ).toBeVisible();
    await page.getByRole('link', { name: /Voir l’itinéraire/i }).first().click();
    await expect(page.locator('.timeline-item')).toHaveCount(3);

    // Parcours Événements
    await page.goto('/evenements');
    await expect(
      page.getByRole('heading', { name: 'Journées du Patrimoine de la Casamance' })
    ).toBeVisible();

    // Route 404
    await page.goto('/route-inexistante');
    await expect(page.getByText('Page introuvable (404)')).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('gère la création de réservation, les erreurs métier et la confirmation d’annulation', async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.goto('/reserver?type=CIRCUIT&circuitId=1');

    await page.locator('#nomClient').fill('Aminata Diallo');
    await page.locator('#emailClient').fill('aminata@uasz.sn');
    await page.locator('#nombrePlaces').fill('2');

    await expect(page.locator('.estimate-box')).toContainText('30');
    await page.getByRole('button', { name: 'Confirmer la réservation' }).click();

    await expect(page.locator('.booking-success')).toContainText('Aminata Diallo');
    await expect(page.locator('.res-item')).toHaveCount(2);

    // Annulation avec modale de confirmation CDK
    await page.locator('.cancel-btn').first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Confirmer l’annulation' }).click();

    await expect(page.locator('.res-item--annulee')).toHaveCount(1);
  });

  test('fonctionne sur mobile avec menu burger accessible sans débordement horizontal', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Exécuté uniquement sur le profil mobile');
    await setupApiMocks(page);
    await page.goto('/');

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalOverflow).toBe(false);

    const burger = page.locator('.burger-btn');
    await expect(burger).toBeVisible();
    await burger.click();
    await expect(page.locator('#mobile-navigation')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#mobile-navigation')).toBeHidden();
  });
});
