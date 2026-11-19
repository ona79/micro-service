const { chromium } = require('../frontend-angular/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '../docs/evidence/p07-8-lot3');
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

  console.log('Capture Lot 3: Browser launched. Output:', OUT_DIR);

  async function capture(page, name, width, height) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(800);
    const filePath = path.join(OUT_DIR, name);
    await page.screenshot({ path: filePath, fullPage: false });
    console.log(`Saved: ${name} (${width}x${height})`);
  }

  async function loginAs(context, email, password) {
    await context.clearCookies();
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/connexion`, { waitUntil: 'networkidle' });
    await page.fill('#login-email', email);
    await page.fill('#login-password', password);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/utilisateurs/connexion')),
      page.click('button.auth-submit-btn'),
    ]);
    await page.waitForURL('**/pro/**', { timeout: 10000 });
    console.log(`✓ Authenticated as ${email} -> ${page.url()}`);
    return page;
  }

  // =========================================================================
  // 1. ESPACE ADMINISTRATEUR
  // =========================================================================
  console.log('\n--- [1/4] Session ADMINISTRATEUR ---');
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await loginAs(adminCtx, 'lamine.faty@univ-zig.sn', 'Admin2026!');

  // 01. Dashboard Admin Desktop
  await adminPage.goto(`${BASE_URL}/pro/tableau-de-bord`, { waitUntil: 'networkidle' });
  await capture(adminPage, '01-admin-dashboard-desktop-1440.png', 1440, 900);

  // 02. Dashboard Admin Mobile
  await capture(adminPage, '02-admin-dashboard-mobile-390.png', 390, 844);

  // 03. Statistiques Globales Desktop
  await adminPage.goto(`${BASE_URL}/pro/statistiques`, { waitUntil: 'networkidle' });
  await capture(adminPage, '03-admin-statistiques-desktop-1440.png', 1440, 900);

  // 04. Gestion Utilisateurs & Audit Sécurité
  await adminPage.goto(`${BASE_URL}/pro/utilisateurs`, { waitUntil: 'networkidle' });
  await capture(adminPage, '04-admin-utilisateurs-audit-1440.png', 1440, 900);

  // 05. Supervision des Réservations
  await adminPage.goto(`${BASE_URL}/pro/reservations`, { waitUntil: 'networkidle' });
  await capture(adminPage, '05-admin-supervision-reservations-1440.png', 1440, 900);

  // 06. Supervision des Paiements Simulés Wave / Orange Money P04
  await adminPage.goto(`${BASE_URL}/pro/paiements`, { waitUntil: 'networkidle' });
  await capture(adminPage, '06-admin-supervision-paiements-simules-1440.png', 1440, 900);

  // 07. Supervision des Notifications
  await adminPage.goto(`${BASE_URL}/pro/notifications`, { waitUntil: 'networkidle' });
  await capture(adminPage, '07-admin-notifications-supervision-1440.png', 1440, 900);

  await adminCtx.close();

  // =========================================================================
  // 2. ESPACE CONSERVATEUR
  // =========================================================================
  console.log('\n--- [2/4] Session CONSERVATEUR ---');
  const consCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const consPage = await loginAs(consCtx, 'fatou.kabore@zig.univ.sn', 'Gestion2026!');

  // 08. Dashboard Conservateur Desktop
  await consPage.goto(`${BASE_URL}/pro/tableau-de-bord`, { waitUntil: 'networkidle' });
  await capture(consPage, '08-conservateur-dashboard-desktop-1440.png', 1440, 900);

  // 09. Gestion Patrimoines & GPS
  await consPage.goto(`${BASE_URL}/pro/patrimoines`, { waitUntil: 'networkidle' });
  await capture(consPage, '09-conservateur-patrimoines-gps-1440.png', 1440, 900);

  // 10. Instruction & Validation des Guides
  await consPage.goto(`${BASE_URL}/pro/guides`, { waitUntil: 'networkidle' });
  await capture(consPage, '10-conservateur-validation-guides-1440.png', 1440, 900);

  await consCtx.close();

  // =========================================================================
  // 3. ESPACE GESTIONNAIRE_SITE
  // =========================================================================
  console.log('\n--- [3/4] Session GESTIONNAIRE_SITE ---');
  const gestCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const gestPage = await loginAs(gestCtx, 'awa.sagna@zig.univ.sn', 'Gestion2026!');

  // 11. Dashboard Gestionnaire Desktop
  await gestPage.goto(`${BASE_URL}/pro/tableau-de-bord`, { waitUntil: 'networkidle' });
  await capture(gestPage, '11-gestionnaire-dashboard-desktop-1440.png', 1440, 900);

  // 12. Contrôle d'Accès Scan QR & Billetterie Desktop
  await gestPage.goto(`${BASE_URL}/pro/controle-acces`, { waitUntil: 'networkidle' });
  await capture(gestPage, '12-gestionnaire-controle-acces-desktop-1440.png', 1440, 900);

  // 13. Contrôle d'Accès Tablette (768px)
  await capture(gestPage, '13-gestionnaire-controle-acces-tablette-768.png', 768, 1024);

  // 14. Contrôle d'Accès Mobile (390px)
  await capture(gestPage, '14-gestionnaire-controle-acces-mobile-390.png', 390, 844);

  // 15. Gestion des Événements Desktop
  await gestPage.goto(`${BASE_URL}/pro/evenements`, { waitUntil: 'networkidle' });
  await capture(gestPage, '15-gestionnaire-evenements-desktop-1440.png', 1440, 900);

  await gestCtx.close();

  // =========================================================================
  // 4. ESPACE GUIDE
  // =========================================================================
  console.log('\n--- [4/4] Session GUIDE ---');
  const guideCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const guidePage = await loginAs(guideCtx, 'alassane.badji@zig.univ.sn', 'Gestion2026!');

  // 16. Dashboard Guide Desktop
  await guidePage.goto(`${BASE_URL}/pro/tableau-de-bord`, { waitUntil: 'networkidle' });
  await capture(guidePage, '16-guide-dashboard-desktop-1440.png', 1440, 900);

  // 17. Dossier Professionnel, Disponibilité & Avis Guide
  await guidePage.goto(`${BASE_URL}/pro/mon-profil-guide`, { waitUntil: 'networkidle' });
  await capture(guidePage, '17-guide-mon-profil-workspace-1440.png', 1440, 900);

  // 18. Circuits Assignés au Guide
  await guidePage.goto(`${BASE_URL}/pro/circuits`, { waitUntil: 'networkidle' });
  await capture(guidePage, '18-guide-circuits-assignes-1440.png', 1440, 900);

  // 19. Manifestes Participants Circuits
  await guidePage.goto(`${BASE_URL}/pro/manifestes`, { waitUntil: 'networkidle' });
  await capture(guidePage, '19-guide-manifestes-circuits-1440.png', 1440, 900);

  // 20. Workspace Guide Mobile (390px)
  await guidePage.goto(`${BASE_URL}/pro/mon-profil-guide`, { waitUntil: 'networkidle' });
  await capture(guidePage, '20-guide-workspace-mobile-390.png', 390, 844);

  await guideCtx.close();

  await browser.close();
  console.log('\n✓ All 20 Lot 3 evidence screenshots captured successfully.');
}

run().catch((err) => {
  console.error('Error running Lot 3 capture script:', err);
  process.exit(1);
});
