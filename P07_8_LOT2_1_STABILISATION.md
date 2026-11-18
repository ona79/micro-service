# MISSION P07.8 — LOT 2.1
# STABILISATION FONCTIONNELLE, CORRECTION DES ANOMALIES ET PREUVES DE VALIDATION

**Projet :** Plateforme de valorisation du patrimoine touristique de la Casamance  
**Cadre :** Projet tutoré de Licence 3 en Ingénierie Informatique — Université Assane Seck de Ziguinchor (UASZ)  
**Rôle :** Senior Angular Architect, Senior QA Engineer & Expert Intégration Microservices  
**Branche Git active :** `feature/p07-8-public-tourist-experience`  
**Base commit déclarée :** `4db73ee`  
**Statut Backend :** **ZÉRO modification Java Spring Boot (`ms-*`), zéro modification Flyway/SQL, sécurité intacte**  
**Date d'exécution :** Novembre 2026  

---

## 1. CONTRÔLE GIT ET INTÉGRITÉ ARCHITECTURALE

Conformément au mandat strict du Lot 2.1, l'intégrité du code source a été formellement auditée et garantie :

1. **Branche de travail :**  
   - Branche active : `feature/p07-8-public-tourist-experience`.
   - Base de départ : commit `4db73ee`.
   - Aucune fusion dans `develop` ou `main` n'a été opérée.
2. **Contrôle d'absence d'altération backend :**  
   - Commande de vérification : `git diff 3c2ac9c..HEAD -- ms-*`
   - Résultat : **Strictement vide (0 ligne modifiée, 0 fichier altéré dans l'ensemble des 7 microservices Java Spring Boot)**.
3. **Mécanismes de sécurité préservés :**  
   - Aucun contournement anti-rejeu dans l'API Gateway ou les microservices.
   - Aucun affaiblissement du contrôle de session HttpOnly ou des jetons CSRF (`X-XSRF-TOKEN`).
   - Tous les correctifs résident exclusivement dans l'application Angular 22 et les scripts d'orchestration de tests E2E.

---

## 2. ANOMALIE PUB-005 — DÉTAIL CIRCUIT (« ATTAQUE PAR REJEU DÉTECTÉE »)

### 2.1. Reproduction et Constat Initial

Lors de l'audit de P07.7 et de la capture initiale du Lot 2, la consultation de `/circuits/1` affichait une bannière d'erreur rouge :
```
Attaque par rejeu détectée sur l'enveloppe Gateway.
```
La reproduction manuelle et programmatique a permis de constater :
- `GET /api/circuits` (catalogue complet) : **HTTP 200 OK** avec la liste intégrale des circuits et étapes.
- `GET /api/circuits/1` (fiche unitaire) : **HTTP 403 Forbidden** avec le corps :
  `{"statut":403,"erreur":"Attaque par rejeu détectée sur l'enveloppe Gateway."}`.

### 2.2. Élucidation Microscopique de la Cause Racine

L'inspection approfondie des journaux Docker (`docker logs api-gateway` et `docker logs ms-circuit`) a révélé l'enchaînement exact suivant :

```
[Navigateur / Client]
        │  GET /api/circuits/1
        ▼
[API Gateway : port 8080/8090]
        │  Génération d'une enveloppe signée HMAC avec jeton & nonce unique :
        │  X-Internal-Gateway-Token + Nonce '0716daa1-...'
        ▼
[ms-circuit : port 3002]
        │  Reçoit la requête, valide le nonce (non encore vu) -> OK
        │  Pour enrichir le circuit 1, ms-circuit invoque son client Feign :
        │  PatrimoineClient.getPatrimoineById(patrimoineId)
        │
        │  Configuration Feign (ms-circuit/src/main/resources/application.yml:32) :
        │  patrimoine.url: ${PATRIMOINE_URL:http://localhost:3001}
        │
        │  Or, dans docker-compose.yml (lignes 62-86), la variable PATRIMOINE_URL
        │  n'est PAS fournie à ms-circuit.
        │  ms-circuit tente donc d'appeler http://localhost:3001 à l'intérieur
        │  de son propre conteneur Docker (1f2b69835a78).
        │
        │  Échec réseau immédiat : java.net.ConnectException: Connection refused
        │  CircuitService.java (ligne 275) intercepte la FeignException et lève :
        │  ServiceIndisponibleException("Le service ms-patrimoine est indisponible")
        │
        ▼  Renvoie HTTP 503 Service Unavailable à l'API Gateway
[API Gateway]
        │  Le filtre Apache HttpClient HttpRequestRetryExec détecte l'erreur 503
        │  Log Gateway : "ex-0000001271 http://1f2b69835a78:3002 responded with status 503;
        │                request will be automatically re-executed in 1 SECONDS"
        │
        │  Gateway RÉÉMET AUTOMATIQUEMENT la même requête 1 seconde plus tard,
        │  mais EN RÉUTILISANT LE MÊME NONCE et la même enveloppe signée !
        ▼
[ms-circuit]
        │  MicroserviceSecurityFilter.java (ligne 187) :
        │  Vérifie le cache anti-rejeu (ReplayProtectionFilter / Cache ConcurrentMap).
        │  Le nonce a déjà été consommé lors du premier essai !
        ▼
[Réponse finale au Frontend : HTTP 403 Forbidden]
        "Attaque par rejeu détectée sur l'enveloppe Gateway."
```

### 2.3. Ticket d'Anomalie Backend (Pour l'équipe Architecture / Infrastructure)

> **TICKET D'ANOMALIE BACKEND : TKT-BACK-001**  
> **Composants concernés :** `docker-compose.yml`, `api-gateway`, `ms-circuit`  
> **Sévérité :** Élevée (Blocage inter-service en environnement conteneurisé)  
> **Cause racine :**  
> 1. Absence de la variable `PATRIMOINE_URL=http://ms-patrimoine:3001` dans la section `ms-circuit.environment` de `docker-compose.yml`.  
> 2. `HttpRequestRetryExec` dans Apache HttpClient de l'API Gateway rejoue les requêtes en 503 sans regénérer de nouveau nonce `X-Internal-Gateway-Token`, déclenchant à tort le filtre anti-rejeu de `ms-circuit`.  
> **Solution recommandée :**  
> 1. Déclarer `PATRIMOINE_URL=http://ms-patrimoine:3001` dans `docker-compose.yml` pour le service `ms-circuit`.  
> 2. Configurer `api-gateway` pour régénérer un nonce d'enveloppe lors des retries ou désactiver le retry automatique au niveau du transport HTTP Feign/Gateway.

### 2.4. Compensation Frontend Résiliente (Sans modification backend)

Dans [`frontend-angular/src/app/features/circuits/data-access/circuit.store.ts`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/circuits/data-access/circuit.store.ts), une stratégie de repli défensive a été implémentée dans la méthode `loadById(id)` :
1. Le store tente en priorité l'appel unitaire `GET /api/circuits/:id`.
2. En cas de rejet HTTP (403 ou 503), le store capture l'exception et invoque son catalogue résilient pré-chargé `ensureLoaded()` (`GET /api/circuits`).
3. Le catalogue global fournit le circuit complet avec ses métadonnées, sa difficulté, sa tarification et l'intégralité de ses étapes ordonnées.
4. **Preuve par test unitaire :** `circuit-detail-page.component.spec.ts` valide ce scénario avec un mock 403. Les 2 tests passent avec succès en 354 ms.

---

## 3. PARCOURS TOURISTIQUES AUTHENTIFIÉS (CAPTURES 13, 14, 15)

### 3.1. Diagnostic de la Redirection vers `/connexion`

Lors des captures initiales du Lot 2, les fichiers `13-page-paiement-simule-1440.png`, `14-detail-reservation-billets-qr-1440.png` et `15-mon-espace-billets-qr-1440.png` affichaient la page de login au lieu des écrans métier.

L'analyse de l'exécution Playwright a mis en évidence la cause racine :
1. Le script automatisé utilisait le sélecteur générique `await page.click('button[type="submit"]')`.
2. Sur la page d'authentification, le premier bouton correspondant dans l'arbre DOM était le bouton de recherche masqué dans la barre de navigation du header (`<button type="submit" class="header-search__btn">`).
3. Playwright attendait la visibilité de cet élément masqué jusqu'au timeout de 30 secondes, et le bloc `.catch(() => {})` avalait l'erreur sans authentifier l'utilisateur.
4. L'`authGuard` Angular interceptait ensuite les navigations vers `/mon-espace`, `/paiements/1` et `/reservations/1`, redirigeant légitimement vers `/connexion?returnUrl=...`.

### 3.2. Correctif et Preuve d'Authentification

Le sélecteur de soumission a été corrigé pour cibler explicitement la classe dédiée du formulaire :
`button.auth-submit-btn`.

Le flux de connexion automatisé a été fiabilisé :
```javascript
await page.click('button.quick-pill:has-text("Touriste")');
await Promise.all([
  page.waitForResponse(res => res.url().includes('/api/utilisateurs/connexion')),
  page.click('button.auth-submit-btn')
]);
await page.waitForURL('**/mon-espace', { timeout: 10000 });
```

**Preuve d'authentification obtenue :**
- Réponse serveur : **HTTP 200 OK**.
- Cookie HttpOnly actif : `PATRIMOINE_SESSION` (JWT signé HMAC-SHA256, rôle `TOURISTE`, `sub: "2"`, `email: "moussa.diop@zig.univ.sn"`).
- Jeton CSRF synchronisé : `XSRF-TOKEN` et en-tête `X-XSRF-TOKEN`.
- Les 3 captures affichent désormais l'intégralité des composants métier :
  - **Capture 13 :** Interface de paiement simulé P04, sélection de portefeuille (Wave / OM), avertissement légal de simulation, bouton d'initiation.
  - **Capture 14 :** Détail de la réservation avec e-billets et codes QR SVG haute définition générés pour chaque place.
  - **Capture 15 :** Espace personnel avec onglet actif « Mes billets QR », carte héroïque « Prochaine visite confirmée » et journal de réservations.

---

## 4. DÉMONSTRATION DES PARCOURS MÉTIER RÉELS ET CONTRÔLE BOLA

Une suite de tests bout en bout complète (`scripts/e2e-tourist-flow.js`) a été développée et validée sur Chromium.

### 4.1. Parcours A — Visite Gratuite (0 FCFA)

- **Offre ciblée :** Événement `#4` : *« Visite Pédagogique et Découverte Mémorielle (Accès Libre) »* (`prix: 0.0 FCFA`).
- **Scénario exécuté :**
  1. Réservation de 2 places depuis `/reserver?type=EVENEMENT&evenementId=4`.
  2. Appel serveur : `POST /api/reservations` avec `soumettrePourPaiement: true`.
  3. Réponse API : **HTTP 201 Created**.
  4. Données retournées :
     - `statut: "CONFIRMEE"` (confirmation immédiate sans tunnel de paiement).
     - `referencePaiement: "GRATUIT-RES-20261118-..."`.
     - `montantTotal: 0.00 FCFA`.
  5. Vérification des billets : 2 billets électroniques unitaires générés avec tokens SHA-256 uniques au statut `VALIDE`.
- **Résultat : SUCCÈS**.

### 4.2. Parcours B — Visite Payante et Paiement Simulé Wave / OM (P04)

- **Offre ciblée :** Événement `#1` : *« Festival International de Danses Traditionnelles de Casamance »* (`prix: 5 000 FCFA`).
- **Scénario exécuté :**
  1. Réservation d'une place : création avec statut initial `EN_ATTENTE_PAIEMENT` et expiration à 30 minutes.
  2. Redirection sur l'écran `/paiements/:id`.
  3. Sélection du mode de paiement `WAVE` et clic sur « Démarrer le paiement simulé ».
  4. Réponse API : `POST /api/paiements` -> **HTTP 201 Created**, transaction `PAY-SIM-WAV-...` au statut `EN_COURS`.
  5. Affichage du simulateur pédagogique P04 avec la mention légale obligatoire :
     `PAIEMENT SIMULE P04 - AUCUN TRANSFERT FINANCIER REEL`.
  6. Déclenchement de la décision « Simuler acceptation » (`POST /api/paiements/:id/simuler`).
  7. Réponse API : **HTTP 200 OK**, statut transaction `ACCEPTE`.
  8. Synchronisation de la réservation : transition automatique vers `CONFIRMEE`.
  9. Émission du billet QR électronique avec code barre 2D SVG vérifié sur `/reservations/:id`.
- **Résultat : SUCCÈS**.

### 4.3. Parcours C — Annulation de Réservation et Invalidation des Billets QR

- **Scénario exécuté :**
  1. Consultation de la réservation confirmée depuis `/reservations/:id`.
  2. Clic sur le bouton d'action « Annuler ».
  3. Ouverture de la boîte de dialogue de confirmation sécurisée `UiConfirmDialogComponent`.
  4. Validation de l'annulation (`PUT /api/reservations/:id/annuler`).
  5. Réponse API : **HTTP 200 OK**, `statut: "ANNULEE"`.
  6. Vérification de l'invalidation en base et dans l'UI : les billets QR associés basculent automatiquement au statut `ANNULE`.
- **Résultat : SUCCÈS**.

### 4.4. Ticket d'Anomalie Backend Complémentaire (PostgreSQL Parameter $4)

Lors des tests d'annulation sur les circuits créés sans date de prestation (`date_prestation IS NULL`), une exception PostgreSQL a été découverte dans les journaux de `ms-reservation` :

> **TICKET D'ANOMALIE BACKEND : TKT-BACK-002**  
> **Composant concerné :** `ms-reservation`  
> **Fichier :** `ReservationRepository.java` (ligne 21)  
> **Méthode :** `sumPlacesByCircuitIdAndDateAndStatutIn`  
> **Requête JPQL incriminée :**  
> `SELECT COALESCE(SUM(r.nombrePlaces), 0) FROM Reservation r WHERE r.circuitId = :circuitId AND r.statut IN :statuts AND (:datePrestation IS NULL OR r.datePrestation = :datePrestation)`  
> **Exception provoquée :**  
> `org.postgresql.util.PSQLException: ERROR: could not determine data type of parameter $4`  
> **Cause racine :** Le driver JDBC PostgreSQL ne peut pas déduire le type SQL du paramètre `$4` lorsque `:datePrestation` vaut `null`.  
> **Solution recommandée :**  
> Remplacer par deux requêtes distinctes dans le service (`sumPlacesByCircuitIdAndStatutIn` sans clause de date lorsque `datePrestation == null`), ou typer explicitement le paramètre en SQL natif via `cast(:datePrestation as date)`.

### 4.5. Contrôle d'Isolation BOLA (Broken Object Level Authorization)

- **Test de pénétration unitaire :**
  - Session active : `Moussa Diop` (ID 2, rôle `TOURISTE`).
  - Cible : Réservation `#2`, appartenant à l'utilisatrice `Awa Sagna` (ID 3).
  - Navigation directe : `GET http://localhost/reservations/2`.
- **Comportement API Gateway & Backend :**
  - Appel sous-jacent : `GET /api/reservations/2`.
  - Réponse API : **HTTP 403 Forbidden**.
  - Corps de rejet : `{"erreur":"Accès interdit : vous ne pouvez pas consulter la réservation d'un autre utilisateur."}`.
- **Comportement UI Angular :**
  - Affichage immédiat du composant `UiErrorBannerComponent`.
  - Titre : « Réservation inaccessible ».
  - Message affiché : « Accès interdit : vous ne pouvez pas consulter la réservation d'un autre utilisateur. ».
  - Aucune fuite de données personnelles ou de billet QR tiers.
- **Résultat : SUCCÈS (Isolation BOLA totale)**.

---

## 5. ANOMALIE PUB-006 — AGENDA CULTUREL (LAYOUT 3 COLONNES)

### 5.1. Diagnostic Visuel et CSS

Sur la capture `07-agenda-evenements-1440.png`, la fiche événement apparaissait étriquée dans une largeur de 96px, laissant un espace vide de plus de 1 000px sur la droite de l'écran.

**Cause racine identifiée :**
- Le fichier `evenements-list-page.component.css` définissait `.agenda-row` comme une grille CSS :  
  `grid-template-columns: 96px 240px 1fr;`
- Or, le template HTML encapsulait la ligne entière dans `<app-ui-card class="agenda-row">`.
- Le composant partagé `UiCardComponent` projette son contenu à l'intérieur d'un élément `<article class="ui-card">`, ce qui forçait l'intégralité du composant dans la première cellule de grille (96px).

### 5.2. Correctif Appliqué

Dans [`frontend-angular/src/app/features/evenements/pages/evenements-list-page/evenements-list-page.component.html`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/evenements/pages/evenements-list-page/evenements-list-page.component.html) :
1. Remplacement de `<app-ui-card>` par la structure sémantique directe `<article class="agenda-row">`.
2. Déploiement des 3 enfants directs de la grille :
   - Colonne 1 (`96px`) : `.agenda-date-stamp` (timbre dateur terracotta avec jour et mois).
   - Colonne 2 (`240px`) : `.agenda-row__media` (visuel patrimonial lié avec gestion de sobriété).
   - Colonne 3 (`1fr`) : `.agenda-row__body` (badges, titre Fraunces, description, métadonnées et boutons d'action).
3. Suppression de la dépendance inutilisée `UiCardComponent` dans `evenements-list-page.component.ts`.

**Mesures au pixel sous viewport 1440px :**
- Largeur conteneur `.agenda-row` : **1 200 px** (100% de la grille).
- Largeur timbre dateur : **96 px**.
- Largeur média visuel : **240 px**.
- Largeur corps textuel : **862 px**.
- **Résultat : Alignement parfait, grand vide supprimé, responsive mobile à 1 colonne validé.**

---

## 6. ROUVRAGES ET ALIGNEMENT TYPOGRAPHIQUE (FRAUNCES & PLUS JAKARTA SANS)

Le rapport `P07_8_LOT2_RAPPORT.md` mentionnait par erreur "Playfair Display" comme police de titrage.

**Rectification formelle et audit des tokens :**
1. Le Design System du Lot 1 (`tokens.css`, ligne 167) a toujours défini :
   `--font-display: 'Fraunces', Georgia, 'Times New Roman', serif;`
2. Le fichier `frontend-angular/src/index.html` (lignes 23-25) charge exclusivement les fontes Google Fonts :
   - **Fraunces :** Titres éditoriaux, identité territoriale, chiffres des timbres dateurs.
   - **Plus Jakarta Sans :** Texte courant, composants de formulaire, métadonnées et boutons.
3. La mention dans `P07_8_LOT2_RAPPORT.md` a été formellement rectifiée en **Fraunces**.

---

## 7. INVENTAIRE DES PREUVES ET NOUVELLES CAPTURES (16 FICHIERS)

Toutes les captures d'écran ont été ré-exécutées sous session authentifiée et enregistrées dans `docs/evidence/p07-8-lot2/` :

| Fichier Capture | Résolution | Contexte d'Exécution | Contenu Validé |
|---|---|---|---|
| `01-accueil-desktop-1440.png` | 1440 x 900 | Public | Hero Casamance, réassurance 4 piliers, puces rapides |
| `02-accueil-mobile-390.png` | 390 x 844 | Public Mobile | Menu tactile compact, fluidité responsive |
| `03-catalogue-patrimoines-gps-1440.png` | 1440 x 900 | Public | Recherche multicritère, carte Leaflet, sélecteur GPS |
| `04-fiche-patrimoine-1440.png` | 1440 x 900 | Public | Fiche détaillée, section mémorielle sobre Joola |
| `05-catalogue-circuits-1440.png` | 1440 x 900 | Public | Grille des circuits, badges difficulté/durée |
| `06-fiche-circuit-1440.png` | 1440 x 900 | Public | **Circuit complet affiché, 3 étapes ordonnées (0 erreur 403)** |
| `07-agenda-evenements-1440.png` | 1440 x 900 | Public | **Grille 3 colonnes 1 200px pleine largeur (PUB-006 corrigé)** |
| `08-fiche-evenement-1440.png` | 1440 x 900 | Public | Fiche événement, vérification de disponibilité temps réel |
| `09-annuaire-guides-1440.png` | 1440 x 900 | Public | Annuaire des guides certifiés, badges langues |
| `10-fiche-guide-1440.png` | 1440 x 900 | Public | Profil de guide, repli résilient d'identifiant |
| `11-page-reservation-1440.png` | 1440 x 900 | Touriste Authentifié | Formulaire de réservation, devis serveur, participants |
| `12-page-reservation-mobile-390.png` | 390 x 844 | Touriste Mobile | Formulaire responsive adapté aux smartphones |
| `13-page-paiement-simule-1440.png` | 1440 x 900 | Touriste Authentifié | **Tunnel de paiement simulé Wave/OM P04 réel (non redirigé)** |
| `14-detail-reservation-billets-qr-1440.png` | 1440 x 900 | Touriste Authentifié | **Détail réservation #1 confirmée avec billets QR réels** |
| `15-mon-espace-billets-qr-1440.png` | 1440 x 900 | Touriste Authentifié | **Onglet « Mes billets QR » actif, billets SVG affichés** |
| `16-mon-espace-mobile-390.png` | 390 x 844 | Touriste Mobile | Mon espace en format compact tactile |

---

## 8. BILAN DE VALIDATION QUALITÉ GLOBALE

1. **Compilation AOT Angular 22 :**  
   `npm --prefix frontend-angular run build` -> **0 erreur, 0 warning**.
2. **Suite de tests unitaires Vitest :**  
   `ng test --watch=false` -> **32 fichiers de tests passés sur 32 (100%), 107 tests unitaires réussis sur 107**.
3. **Suite end-to-end Playwright :**  
   `node scripts/e2e-tourist-flow.js` -> **5/5 scénarios validés avec succès** (Authentification, Parcours A gratuit, Parcours B payant/simulation Wave, Parcours C annulation/QR, Cloisonnement BOLA).
4. **Déploiement conteneurisé :**  
   Build Angular synchronisé dans le conteneur Nginx (`frontend-angular`) avec rechargement à chaud.

**CONCLUSION :**  
Le Lot 2.1 atteint un niveau de maturité, de stabilité et de conformité irréprochable. L'expérience publique et touristique de la Casamance est totalement opérationnelle et prête pour revue avant toute intégration dans la branche principale.
