const { chromium } = require('../frontend-angular/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../docs/evidence/p07-8-lot2');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const BASE_URL = 'http://localhost';

async function run() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  console.log('Browser launched successfully. Output directory:', OUT_DIR);

  // Helper for capturing
  async function capture(page, name, width, height) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(1000);
    const filePath = path.join(OUT_DIR, name);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`Saved: ${name} (${width}x${height})`);
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    // 1. Accueil Desktop (1440px)
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await capture(page, '01-accueil-desktop-1440.png', 1440, 900);

    // 2. Accueil Mobile (390px)
    await capture(page, '02-accueil-mobile-390.png', 390, 844);

    // 3. Catalogue patrimoines avec recherche GPS (1440px)
    await page.goto(`${BASE_URL}/patrimoines`, { waitUntil: 'networkidle' });
    await capture(page, '03-catalogue-patrimoines-gps-1440.png', 1440, 900);

    // 4. Fiche patrimoine (1440px)
    await page.goto(`${BASE_URL}/patrimoines/1`, { waitUntil: 'networkidle' });
    await capture(page, '04-fiche-patrimoine-1440.png', 1440, 900);

    // 5. Catalogue circuits (1440px)
    await page.goto(`${BASE_URL}/circuits`, { waitUntil: 'networkidle' });
    await capture(page, '05-catalogue-circuits-1440.png', 1440, 900);

    // 6. Fiche circuit (1440px)
    await page.goto(`${BASE_URL}/circuits/1`, { waitUntil: 'networkidle' });
    await capture(page, '06-fiche-circuit-1440.png', 1440, 900);

    // 7. Agenda événements (1440px)
    await page.goto(`${BASE_URL}/evenements`, { waitUntil: 'networkidle' });
    await capture(page, '07-agenda-evenements-1440.png', 1440, 900);

    // 8. Fiche événement (1440px)
    await page.goto(`${BASE_URL}/evenements/1`, { waitUntil: 'networkidle' });
    await capture(page, '08-fiche-evenement-1440.png', 1440, 900);

    // 9. Annuaire guides (1440px)
    await page.goto(`${BASE_URL}/guides`, { waitUntil: 'networkidle' });
    await capture(page, '09-annuaire-guides-1440.png', 1440, 900);

    // 10. Fiche guide (1440px)
    await page.goto(`${BASE_URL}/guides/1`, { waitUntil: 'networkidle' });
    await capture(page, '10-fiche-guide-1440.png', 1440, 900);

    // Authenticate as touriste to capture personal and booking flow
    console.log('Logging in as touriste...');
    await page.goto(`${BASE_URL}/connexion`, { waitUntil: 'networkidle' });
    // Click demo touriste pill
    const touristeBtn = page.locator('button.quick-pill:has-text("Touriste")');
    if (await touristeBtn.count() > 0) {
      await touristeBtn.first().click();
      await page.waitForTimeout(300);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {});
    }

    // 11. Page de réservation (1440px)
    await page.goto(`${BASE_URL}/reserver`, { waitUntil: 'networkidle' });
    await capture(page, '11-page-reservation-1440.png', 1440, 900);

    // 12. Page de réservation mobile (390px)
    await capture(page, '12-page-reservation-mobile-390.png', 390, 844);

    // 13. Page de paiement simulé (1440px)
    await page.goto(`${BASE_URL}/paiements/1`, { waitUntil: 'networkidle' });
    await capture(page, '13-page-paiement-simule-1440.png', 1440, 900);

    // 14. Détail réservation avec billets QR (1440px)
    await page.goto(`${BASE_URL}/reservations/1`, { waitUntil: 'networkidle' });
    await capture(page, '14-detail-reservation-billets-qr-1440.png', 1440, 900);

    // 15. Espace personnel avec onglet billets (1440px)
    await page.goto(`${BASE_URL}/mon-espace`, { waitUntil: 'networkidle' });
    // Click on Billets tab
    const billetsTab = page.locator('button.account-tab:has-text("billets")');
    if (await billetsTab.count() > 0) {
      await billetsTab.first().click();
      await page.waitForTimeout(500);
    }
    await capture(page, '15-mon-espace-billets-qr-1440.png', 1440, 900);

    // 16. Espace personnel mobile (390px)
    await capture(page, '16-mon-espace-mobile-390.png', 390, 844);

    console.log('All 16 visual captures completed successfully!');
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    await browser.close();
  }
}

run();
