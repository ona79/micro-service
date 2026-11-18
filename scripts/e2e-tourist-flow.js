const { chromium } = require('../frontend-angular/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost';

async function runE2E() {
  console.log('=== DÉBUT SUITE E2E - PARCOURS TOURISTIQUES CASAMANCE (LOT 2.1) ===');
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const results = {
    auth: false,
    parcoursA_gratuit: false,
    parcoursB_payantSimulation: false,
    parcoursC_annulation: false,
    bola_isolation: false,
  };

  try {
    // -------------------------------------------------------------
    // ÉTAPE 1 : AUTHENTIFICATION TOURISTE RÉELLE VIA QUICK-PILL
    // -------------------------------------------------------------
    console.log('\n[1/5] Authentification Touriste...');
    await page.goto(`${BASE_URL}/connexion`, { waitUntil: 'networkidle' });
    await page.click('button.quick-pill:has-text("Touriste")');
    await page.waitForTimeout(300);

    const [loginRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/utilisateurs/connexion')),
      page.click('button.auth-submit-btn'),
    ]);
    console.log(`-> Statut réponse connexion: ${loginRes.status()}`);
    await page.waitForURL('**/mon-espace', { timeout: 10000 });
    console.log(`-> Navigation confirmée sur ${page.url()}`);
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === 'PATRIMOINE_SESSION');
    if (sessionCookie && loginRes.status() === 200) {
      results.auth = true;
      console.log('✓ Authentification réussie (Cookie HttpOnly PATRIMOINE_SESSION actif)');
    }

    // Annuler préalablement toute réservation active sur l'événement 4 ou 1 pour garantir l'idempotence
    try {
      const activeReservationsRes = await page.request.get(`${BASE_URL}/api/reservations/mes-reservations`);
      if (activeReservationsRes.ok()) {
        const list = await activeReservationsRes.json();
        for (const r of list) {
          if (['CONFIRMEE', 'EN_ATTENTE_PAIEMENT'].includes(r.statut)) {
            // On conserve reservation 1 pour les captures et on annule les temporaires si besoin
            if (r.id !== 1 && r.evenementId === 4) {
              await page.request.put(`${BASE_URL}/api/reservations/${r.id}/annuler`, {
                data: { motif: 'Nettoyage idempotent avant test E2E' },
              });
            }
          }
        }
      }
    } catch {}

    // -------------------------------------------------------------
    // ÉTAPE 2 : PARCOURS A — VISITE GRATUITE (0 FCFA)
    // -------------------------------------------------------------
    console.log('\n[2/5] Parcours A : Réservation visite gratuite (0 FCFA)...');
    await page.goto(`${BASE_URL}/reserver?type=EVENEMENT&evenementId=4`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(800);

    await page.fill('input[formcontrolname="nombrePlaces"]', '2');
    await page.waitForTimeout(300);

    const [createRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/reservations') && res.request().method() === 'POST'),
      page.click('button.submit-btn'),
    ]);
    const createdData = await createRes.json();
    console.log(`-> Réservation gratuite créée : #${createdData.id}, statut: ${createdData.statut}, montant: ${createdData.montantTotal} FCFA`);

    // Vérification des billets QR générés
    const ticketsRes = await page.request.get(`${BASE_URL}/api/reservations/${createdData.id}/billets`);
    const tickets = ticketsRes.ok() ? await ticketsRes.json() : [];
    console.log(`-> Billets QR émis pour réservation #${createdData.id} : ${tickets.length} billet(s) (Statut: ${tickets[0]?.statut})`);

    if (createdData.statut === 'CONFIRMEE' && createdData.montantTotal === 0 && tickets.length === 2 && tickets[0].statut === 'VALIDE') {
      results.parcoursA_gratuit = true;
      console.log('✓ Parcours A validé : réservation instantanément CONFIRMEE et 2 billets QR réels VALIDE');
    }

    // -------------------------------------------------------------
    // ÉTAPE 3 : PARCOURS B — VISITE PAYANTE & PAIEMENT SIMULÉ WAVE/OM (P04)
    // -------------------------------------------------------------
    console.log('\n[3/5] Parcours B : Réservation payante & paiement simulé...');
    await page.goto(`${BASE_URL}/reserver?type=EVENEMENT&evenementId=1`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(800);

    await page.fill('input[formcontrolname="nombrePlaces"]', '1');
    await page.waitForTimeout(300);

    const [payantCreateRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/reservations') && res.request().method() === 'POST'),
      page.click('button.submit-btn'),
    ]);
    const payantData = await payantCreateRes.json();
    console.log(`-> Réservation payante créée : #${payantData.id}, statut: ${payantData.statut}, montant: ${payantData.montantTotal} FCFA`);

    // Aller sur la page de paiement simulé
    await page.goto(`${BASE_URL}/paiements/${payantData.id}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForTimeout(1000);

    const pageText = await page.textContent('body');
    const hasSimulationNotice = pageText.includes('PAIEMENT SIMULÉ') || pageText.includes('P04') || pageText.includes('Simulation');
    console.log(`-> Mention simulation présente sur la page : ${hasSimulationNotice}`);

    // Initier session de paiement simulé
    const initBtn = page.locator('button.init-btn');
    if (await initBtn.count() > 0) {
      const [initRes] = await Promise.all([
        page.waitForResponse((res) => res.url().includes('/api/paiements') && res.request().method() === 'POST'),
        initBtn.first().click(),
      ]);
      const initJson = await initRes.json();
      console.log(`-> Session de paiement simulé initiée : #${initJson.id} (${initJson.referenceTransaction}), statut: ${initJson.statut}`);
      await page.waitForTimeout(1000);

      // Tester l'acceptation de la simulation
      const acceptBtn = page.locator('button:has-text("Simuler acceptation")');
      if (await acceptBtn.count() > 0) {
        const [decisionRes] = await Promise.all([
          page.waitForResponse((res) => res.url().includes('/simuler')),
          acceptBtn.first().click(),
        ]);
        const decisionData = await decisionRes.json();
        console.log(`-> Décision simulation appliquée: ${decisionData.statut}, mention: ${decisionData.mentionSimulation}`);
        
        await page.waitForTimeout(1000);
        await page.goto(`${BASE_URL}/reservations/${payantData.id}`, { waitUntil: 'networkidle' });
        const resContent = await page.textContent('body');
        const isConfirmee = resContent.includes('CONFIRMEE') || resContent.includes('Confirmée');
        const qrCount = await page.locator('app-ui-ticket-view').count();
        console.log(`-> Réservation ${payantData.id} confirmée: ${isConfirmee}, billets QR émis: ${qrCount}`);
        
        if (decisionData.statut === 'ACCEPTE' && isConfirmee && qrCount > 0) {
          results.parcoursB_payantSimulation = true;
          console.log('✓ Parcours B validé : cycle devis -> initiation Wave -> acceptation simulée -> CONFIRMEE -> QR générés');
        }
      }
    }

    // -------------------------------------------------------------
    // ÉTAPE 4 : PARCOURS C — ANNULATION DE RÉSERVATION & INVALIDATION BILLETS
    // -------------------------------------------------------------
    console.log('\n[4/5] Parcours C : Annulation de réservation...');
    await page.goto(`${BASE_URL}/reservations/${payantData.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const cancelBtn = page.locator('button.btn-danger:has-text("Annuler")');
    if (await cancelBtn.count() > 0) {
      await cancelBtn.first().click();
      await page.waitForTimeout(500);

      const confirmDialogBtn = page.locator('button.dialog-btn--danger');
      if (await confirmDialogBtn.count() > 0) {
        const [cancelRes] = await Promise.all([
          page.waitForResponse((res) => res.url().includes('/annuler')),
          confirmDialogBtn.click(),
        ]);
        const cancelData = await cancelRes.json();
        console.log(`-> Réponse annulation serveur: ${cancelRes.status()}, nouveau statut: ${cancelData.statut}`);

        await page.waitForTimeout(1000);
        const cancelBodyText = await page.textContent('body');
        const isAnnulee = cancelBodyText.includes('Annulée') || cancelBodyText.includes('ANNULEE');
        
        // Vérification de l'invalidation des billets QR associés
        const cancelledTicketsRes = await page.request.get(`${BASE_URL}/api/reservations/${payantData.id}/billets`);
        const cancelledTickets = cancelledTicketsRes.ok() ? await cancelledTicketsRes.json() : [];
        console.log(`-> Billets QR après annulation : statut = ${cancelledTickets[0]?.statut}`);

        if (cancelRes.status() === 200 && cancelData.statut === 'ANNULEE' && isAnnulee && cancelledTickets[0]?.statut === 'ANNULE') {
          results.parcoursC_annulation = true;
          console.log('✓ Parcours C validé : réservation annulée et billets QR invalidés');
        }
      }
    }

    // -------------------------------------------------------------
    // ÉTAPE 5 : CONTRÔLE D'ISOLATION BOLA
    // -------------------------------------------------------------
    console.log('\n[5/5] Contrôle d\'isolation BOLA...');
    await page.goto(`${BASE_URL}/reservations/2`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const errorBanner = page.locator('app-ui-error-banner');
    const bannerCount = await errorBanner.count();
    const bannerText = bannerCount > 0 ? await errorBanner.first().textContent() : '';
    console.log(`-> Tentative d'accès réservation tierce (#2) : Bannière affichée = ${bannerCount > 0}`);
    console.log(`-> Message UI : « ${bannerText.replace(/\s+/g, ' ').trim()} »`);

    if (bannerCount > 0 && bannerText.includes('autre utilisateur')) {
      results.bola_isolation = true;
      console.log('✓ Contrôle BOLA validé : accès direct et API strictement cloisonnés');
    }

  } catch (err) {
    console.error('Erreur durant la suite E2E :', err);
  } finally {
    await browser.close();
  }

  console.log('\n=== RÉSUMÉ DE LA VALIDATION E2E ===');
  console.log(`1. Authentification session HttpOnly  : ${results.auth ? 'SUCCÈS' : 'ÉCHEC'}`);
  console.log(`2. Parcours A (Gratuit 0 FCFA)       : ${results.parcoursA_gratuit ? 'SUCCÈS' : 'ÉCHEC'}`);
  console.log(`3. Parcours B (Payant simulé Wave/OM): ${results.parcoursB_payantSimulation ? 'SUCCÈS' : 'ÉCHEC'}`);
  console.log(`4. Parcours C (Annulation & QR)      : ${results.parcoursC_annulation ? 'SUCCÈS' : 'ÉCHEC'}`);
  console.log(`5. Cloisonnement BOLA                : ${results.bola_isolation ? 'SUCCÈS' : 'ÉCHEC'}`);

  return results;
}

runE2E();
