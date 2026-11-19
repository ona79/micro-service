const { chromium } = require('../frontend-angular/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../docs/evidence/p07-8-lot4');
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

  console.log('=== LOT 4 PLAYWRIGHT VALIDATION & CAPTURE SUITE ===');
  console.log('Output directory:', OUT_DIR);

  async function capture(page, filename, width, height) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(600);
    const target = path.join(OUT_DIR, filename);
    await page.screenshot({ path: target, fullPage: false });
    console.log(`[CAPTURED] ${filename} (${width}x${height})`);
  }

  async function loginAs(context, email, password, expectedUrl = '**/pro/**') {
    await context.clearCookies();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/connexion`, { waitUntil: 'networkidle' });
    await page.fill('#login-email', email);
    await page.fill('#login-password', password);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/utilisateurs/connexion')),
      page.click('button.auth-submit-btn'),
    ]);
    await page.waitForURL(expectedUrl, { timeout: 10000 });
    console.log(`✓ Authenticated: ${email} -> ${page.url()}`);
    return page;
  }

  const context = await browser.newContext();
  const page = await context.newPage();

  // -------------------------------------------------------------
  // 1. PUBLIC EXPERIENCE CAPTURES (1440x900)
  // -------------------------------------------------------------
  console.log('\n--- Section 1 : Pages publiques ---');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await capture(page, 'public-01-home-desktop-1440.png', 1440, 900);

  await page.goto(`${BASE_URL}/patrimoines`, { waitUntil: 'networkidle' });
  await capture(page, 'public-02-patrimoines-catalogue-1440.png', 1440, 900);

  await page.goto(`${BASE_URL}/patrimoines/1`, { waitUntil: 'networkidle' });
  await capture(page, 'public-03-patrimoine-detail-1440.png', 1440, 900);

  await page.goto(`${BASE_URL}/circuits`, { waitUntil: 'networkidle' });
  await capture(page, 'public-04-circuits-catalogue-1440.png', 1440, 900);

  await page.goto(`${BASE_URL}/circuits/1`, { waitUntil: 'networkidle' });
  await capture(page, 'public-05-circuit-detail-1440.png', 1440, 900);

  await page.goto(`${BASE_URL}/evenements`, { waitUntil: 'networkidle' });
  await capture(page, 'public-06-evenements-agenda-1440.png', 1440, 900);

  await page.goto(`${BASE_URL}/guides`, { waitUntil: 'networkidle' });
  await capture(page, 'public-07-guides-annuaire-1440.png', 1440, 900);

  await page.goto(`${BASE_URL}/guides/5`, { waitUntil: 'networkidle' });
  await capture(page, 'public-08-guide-detail-1440.png', 1440, 900);

  await page.goto(`${BASE_URL}/connexion`, { waitUntil: 'networkidle' });
  await capture(page, 'public-09-connexion-1440.png', 1440, 900);

  await page.goto(`${BASE_URL}/inscription`, { waitUntil: 'networkidle' });
  await capture(page, 'public-10-inscription-1440.png', 1440, 900);

  await page.goto(`${BASE_URL}/page-introuvable-test-404`, { waitUntil: 'networkidle' });
  await capture(page, 'public-11-erreur-404-1440.png', 1440, 900);

  await page.goto(`${BASE_URL}/acces-refuse`, { waitUntil: 'networkidle' });
  await capture(page, 'public-12-erreur-403-1440.png', 1440, 900);

  // -------------------------------------------------------------
  // 2. TOURISTE AUTHENTIFIÉ
  // -------------------------------------------------------------
  console.log('\n--- Section 2 : Parcours Touriste ---');
  const touristPage = await loginAs(context, 'moussa.diop@zig.univ.sn', 'Passer123!', '**/mon-espace');
  await touristPage.goto(`${BASE_URL}/mon-espace`, { waitUntil: 'networkidle' });
  await capture(touristPage, 'touriste-01-mon-espace-1440.png', 1440, 900);

  await touristPage.goto(`${BASE_URL}/reserver?type=CIRCUIT&circuitId=1`, { waitUntil: 'networkidle' });
  await capture(touristPage, 'touriste-02-reserver-tunnel-1440.png', 1440, 900);

  await touristPage.goto(`${BASE_URL}/reservation/1`, { waitUntil: 'networkidle' });
  await capture(touristPage, 'touriste-03-reservation-detail-billets-1440.png', 1440, 900);

  await touristPage.goto(`${BASE_URL}/notifications`, { waitUntil: 'networkidle' });
  await capture(touristPage, 'touriste-04-notifications-voyageur-1440.png', 1440, 900);
  await touristPage.close();

  // -------------------------------------------------------------
  // 3. GUIDE AUTHENTIFIÉ
  // -------------------------------------------------------------
  console.log('\n--- Section 3 : Parcours Guide ---');
  const guidePage = await loginAs(context, 'alassane.badji@zig.univ.sn', 'Gestion2026!');
  await guidePage.goto(`${BASE_URL}/pro/tableau-de-bord`, { waitUntil: 'networkidle' });
  await capture(guidePage, 'guide-01-dashboard-cockpit-1440.png', 1440, 900);

  await guidePage.goto(`${BASE_URL}/pro/mon-profil-guide`, { waitUntil: 'networkidle' });
  await capture(guidePage, 'guide-02-profil-disponibilite-1440.png', 1440, 900);

  await guidePage.goto(`${BASE_URL}/pro/circuits`, { waitUntil: 'networkidle' });
  await capture(guidePage, 'guide-03-circuits-assignes-bola-1440.png', 1440, 900);

  await guidePage.goto(`${BASE_URL}/pro/manifestes`, { waitUntil: 'networkidle' });
  await capture(guidePage, 'guide-04-manifestes-passagers-1440.png', 1440, 900);
  await guidePage.close();

  // -------------------------------------------------------------
  // 4. CONSERVATEUR AUTHENTIFIÉ
  // -------------------------------------------------------------
  console.log('\n--- Section 4 : Parcours Conservateur ---');
  const consPage = await loginAs(context, 'fatou.kabore@zig.univ.sn', 'Gestion2026!');
  await consPage.goto(`${BASE_URL}/pro/tableau-de-bord`, { waitUntil: 'networkidle' });
  await capture(consPage, 'conservateur-01-dashboard-patrimonial-1440.png', 1440, 900);

  await consPage.goto(`${BASE_URL}/pro/patrimoines`, { waitUntil: 'networkidle' });
  await capture(consPage, 'conservateur-02-gestion-patrimoine-gps-1440.png', 1440, 900);

  await consPage.goto(`${BASE_URL}/pro/guides`, { waitUntil: 'networkidle' });
  await capture(consPage, 'conservateur-03-validation-guides-deontologie-1440.png', 1440, 900);
  await consPage.close();

  // -------------------------------------------------------------
  // 5. GESTIONNAIRE DE SITE AUTHENTIFIÉ
  // -------------------------------------------------------------
  console.log('\n--- Section 5 : Parcours Gestionnaire de site ---');
  const gestPage = await loginAs(context, 'awa.sagna@zig.univ.sn', 'Gestion2026!');
  await gestPage.goto(`${BASE_URL}/pro/tableau-de-bord`, { waitUntil: 'networkidle' });
  await capture(gestPage, 'gestionnaire-01-dashboard-site-1440.png', 1440, 900);

  await gestPage.goto(`${BASE_URL}/pro/controle-acces`, { waitUntil: 'networkidle' });
  await capture(gestPage, 'gestionnaire-02-controle-acces-camera-qr-1440.png', 1440, 900);

  await gestPage.goto(`${BASE_URL}/pro/evenements`, { waitUntil: 'networkidle' });
  await capture(gestPage, 'gestionnaire-03-evenements-site-1440.png', 1440, 900);
  await gestPage.close();

  // -------------------------------------------------------------
  // 6. ADMINISTRATEUR AUTHENTIFIÉ
  // -------------------------------------------------------------
  console.log('\n--- Section 6 : Parcours Administrateur ---');
  const adminPage = await loginAs(context, 'lamine.faty@univ-zig.sn', 'Admin2026!', '**/pro/**');
  await adminPage.goto(`${BASE_URL}/pro/tableau-de-bord`, { waitUntil: 'networkidle' });
  await capture(adminPage, 'admin-01-dashboard-consolide-7ms-1440.png', 1440, 900);

  await adminPage.goto(`${BASE_URL}/pro/utilisateurs`, { waitUntil: 'networkidle' });
  await capture(adminPage, 'admin-02-utilisateurs-rbac-audit-1440.png', 1440, 900);

  await adminPage.goto(`${BASE_URL}/pro/reservations`, { waitUntil: 'networkidle' });
  await capture(adminPage, 'admin-03-supervision-reservations-1440.png', 1440, 900);

  await adminPage.goto(`${BASE_URL}/pro/paiements`, { waitUntil: 'networkidle' });
  await capture(adminPage, 'admin-04-supervision-paiements-simules-1440.png', 1440, 900);

  await adminPage.goto(`${BASE_URL}/pro/statistiques`, { waitUntil: 'networkidle' });
  await capture(adminPage, 'admin-05-statistiques-metriques-1440.png', 1440, 900);

  await adminPage.goto(`${BASE_URL}/pro/notifications`, { waitUntil: 'networkidle' });
  await capture(adminPage, 'admin-06-notifications-supervision-1440.png', 1440, 900);

  // -------------------------------------------------------------
  // 7. RESPONSIVE MULTI-RÉSOLUTIONS (SECTION 7 DU MANDAT)
  // -------------------------------------------------------------
  console.log('\n--- Section 7 : Responsive multi-résolutions ---');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await capture(page, 'responsive-01-home-petit-mobile-360x800.png', 360, 800);
  await capture(page, 'responsive-02-home-mobile-390x844.png', 390, 844);
  await capture(page, 'responsive-03-home-tablette-portrait-768x1024.png', 768, 1024);
  await capture(page, 'responsive-04-home-tablette-paysage-1024x768.png', 1024, 768);
  await capture(page, 'responsive-05-home-desktop-1440x900.png', 1440, 900);
  await capture(page, 'responsive-06-home-grand-desktop-1920x1080.png', 1920, 1080);

  await adminPage.goto(`${BASE_URL}/pro/tableau-de-bord`, { waitUntil: 'networkidle' });
  await capture(adminPage, 'responsive-07-pro-dashboard-mobile-360x800.png', 360, 800);

  await adminPage.goto(`${BASE_URL}/pro/controle-acces`, { waitUntil: 'networkidle' });
  await capture(adminPage, 'responsive-08-pro-controle-acces-mobile-390x844.png', 390, 844);
  await capture(adminPage, 'responsive-09-pro-controle-acces-tablette-768x1024.png', 768, 1024);

  // -------------------------------------------------------------
  // 8. ACCESSIBILITÉ WCAG 2.2 AA (PREUVES CIBLÉES)
  // -------------------------------------------------------------
  console.log('\n--- Section 8 : Accessibilité ciblée ---');
  await page.goto(`${BASE_URL}/patrimoines`, { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await capture(page, 'a11y-01-focus-clavier-navigation-1440.png', 1440, 900);

  await adminPage.goto(`${BASE_URL}/pro/controle-acces`, { waitUntil: 'networkidle' });
  await capture(adminPage, 'a11y-02-controle-acces-camera-label-1440.png', 1440, 900);

  await page.goto(`${BASE_URL}/page-404-test-h1`, { waitUntil: 'networkidle' });
  await capture(page, 'a11y-03-erreur-404-sr-only-h1-1440.png', 1440, 900);

  await adminPage.close();
  await page.close();
  await browser.close();

  console.log('\n=== SUITE PLAYWRIGHT LOT 4 TERMINÉE AVEC SUCCÈS ===');
}

run().catch((err) => {
  console.error('Erreur lors de la capture Lot 4:', err);
  process.exit(1);
});
