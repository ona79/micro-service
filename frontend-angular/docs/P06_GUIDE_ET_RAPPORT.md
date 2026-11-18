# MISSION P06 — EXPÉRIENCE TOURISTIQUE PUBLIQUE ANGULAR 22 : GUIDE & RAPPORT TECHNIQUE

**Projet** : Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance (UASZ — Licence 3 Ingénierie Informatique)  
**Branche de réalisation** : `feature/p06-public-tourism-frontend` (issue de `develop`)  
**Stack Front-End** : Angular `22.2` (Standalone Components, Signals, `@angular/aria`, `@angular/cdk/dialog`, Leaflet, Vitest, Playwright)

---

## 1. Architecture Publique & Expérience Casamance

### Identité visuelle & Design System (`src/styles/tokens.css`, `core/config/site.config.ts`)
- **Brand** : `Casamance Patrimoine — Découverte & Itinéraires Culturels`.
- **Palette Casamance respectée** :
  - Vert mangrove principal : `#245B45` (`--brand-primary`, forêt sombre `#173D2D`).
  - Terre latérite : `#B75F3B` (`--accent-terracotta`).
  - Ocre doré / décoratif : `#D9A441` (`--accent-ochre-gold`), décliné en `--accent-ochre: #82560C` pour les textes et puces afin de respecter le contraste WCAG AA `>= 4.5:1`.
  - Lin naturel : `#F1EBDD` (`--surface-sand`) sur toile `#FAF7F0` (`--surface-canvas`).
- **Actifs visuels Casamance (`frontend-angular/public/images/`)** :
  - `hero.jpg` : lever du soleil en pirogue sur les bolongs bordés de palétuviers.
  - `patrimoines/PAT-ZIG-001.svg` (Mémorial du Joola — traitement sobre `--memorial-*`), `PAT-CRB-002.jpg` (Île de Carabane), `PAT-ZIG-003.jpg` (Ziguinchor), `PAT-OSS-004.jpg` (Bois sacré d'Oussouye), `PAT-CAS-005.jpg` (Case à Impluvium d'Enampore), `PAT-SED-006.svg` (Fort de Sédhiou), `PAT-OSS-007.jpg` (Mangrove & Bolongs), `PAT-KOL-008.jpg` (Réserve de Vélingara-Kolda).
  - `UiPatrimoineImageComponent` résout localement les URLs héritées `/assets/patrimoines/*`, normalise le ratio `16/10` (limitation du CLS) et applique un traitement visuel respectueux sur les lieux mémoriels (`sobriete`).

---

## 2. Fonctionnalités réalisées & Connexion API Réelle

### Vitrine publique (`HomePageComponent`)
- Hero éditorial avec recherche globale vers `/patrimoines?q=...` et triple CTA (`Découvrir les sites`, `Parcourir les circuits`, `Guides agréés`).
- Navigation rapide par terroirs (`Basse-Casamance`, `Moyenne-Casamance`, `Haute-Casamance`).
- Bandeau d'indicateurs **exclusivement alimenté par les réponses API réelles** (aucune statistique fictive ni fausse note).
- Mises en avant des patrimoines `PUBLIE`, des circuits populaires (avec mention explicite de distance à vol d'oiseau), des prochains événements (`Africa/Dakar`) et des guides validés (`VALIDE` & `visibilitePublique=true`).

### Catalogues filtrés côté serveur & Cartographie
- **Patrimoines (`/patrimoines`, `/patrimoines/:id`)** : recherche serveur via `GET /api/patrimoines/recherche` (`q`, `zone`, `categorie`, `sortBy`, `page`, `size`), synchronisation bidirectionnelle URL query params, vue grille / vue carte Leaflet interactive, badges d'avis vérifiés (`GET /api/avis/resumes`) et isolation stricte contre tout brouillon/archive.
- **Circuits (`/circuits`, `/circuits/:id`)** : recherche serveur `GET /api/circuits/recherche`, filtres difficulté, transport, zone, durée/distance max, carte Leaflet polyline des étapes ordonnées, affichage exclusif du guide responsable s'il est `VALIDE` et public, et rappel permanent du calcul **orthodromique indicatif**.
- **Agenda Culturel (`/evenements`, `/evenements/:id`)** : recherche serveur `GET /api/evenements/recherche` intégrant les 7 typologies P03 dont `CEREMONIE_TRADITIONNELLE` et `FOIRE_ARTISANALE`, formatage calé sur le fuseau officiel `Africa/Dakar` via `DateFrPipe` (`dd`, `MMM yyyy`, `date`, `d MMM yyyy`, `datetime`), éligibilité de réservation `ouvertReservation`.
- **Guides (`/guides`, `/guides/:id`)** : filtrage par recherche, zone, langue et disponibilité ; blocage de toute donnée privée ou profil non validé.

### Parcours Touriste complet & Espace Personnel
- **Réservation (`/reserver`)** : sélecteur restreint aux prestations `PUBLIE`, contrôle de disponibilité serveur au changement de circuit/événement/date (`GET /api/reservations/disponibilite`), participants nominatifs, `Idempotency-Key` anti-double soumission.
- **Détail Réservation (`/reservations/:id`, `ReservationDetailPageComponent`)** : récapitulatif complet, participants, tentatives de paiement associées, historique d'état, synchronisation manuelle (`POST /synchroniser`), soumission brouillon, annulation confirmée via CDK dialog, lien vers avis vérifié si `CONFIRMEE` et gestion des erreurs BOLA (`403`/`404`).
- **Paiement simulé (`/paiements/:reservationId`)** : mention pédagogique explicite Wave / Orange Money simulé ; aucune confirmation client n'est affichée tant que `statut === 'CONFIRMEE'` n'est pas renvoyé par le backend.
- **Mon Espace (`/mon-espace`, `AccountPageComponent`)** : organisation par onglets accessibles (`Réservations`, `Paiements simulés`, `Mes avis`, `Notifications`, `Profil & coordonnées`), formulaire réactif typé de mise à jour du profil via `PUT /api/utilisateurs/{id}`.

---

## 3. Stratégie SEO, Accessibilité & Performance

### SEO & Métadonnées (`SeoService`, `PageTitleStrategy`)
- `SeoService` met à jour dynamiquement `<title>`, `<meta name="description">`, `<meta property="og:*">` et `<link rel="canonical">` sur toutes les routes statiques et fiches dynamiques (`/patrimoines/:id`, `/circuits/:id`, `/evenements/:id`, `/guides/:id`, `/reservations/:id`).
- **Transparence CSR / Nginx** : l'application est servie en **Client-Side Rendering (SPA CSR)** derrière Nginx (`nginx.conf` avec `try_files $uri /index.html`). Aucun serveur SSR Node n'est activé dans `docker-compose.yml` ; les métadonnées dynamiques par fiche sont mises à jour côté client lors de la navigation Angular (trade-off assumé, documenté si un pré-rendu serveur ou edge était souhaité ultérieurement pour les robots sociaux sans exécution JS).

### Accessibilité & Performance
- Skip-link `#main-content`, hiérarchie `h1` unique par page, focus visible, modales `@angular/cdk/dialog`, toolbars `@angular/aria/toolbar`.
- Toutes les routes sont lazy-loadées via `loadComponent` (isolant Leaflet et le dashboard admin dans des chunks dédiés).

---

## 4. Résultats Vérifiés (Build, Vitest & Playwright)

Les vérifications automatisées suivantes ont été exécutées sur la version finale :
- **Vitest (`npx ng test --no-watch`)** : 18 fichiers de test, **51 tests exécutés avec succès** (`18 passed (18)`, `51 passed (51)`).
- **Build Production Angular 22 (`npm run build`)** : bundle initial `588.05 kB` brut (`119.76 kB` compressé estimé) avec découpage en chunks paresseux par route.
- **Playwright E2E (`npx playwright test e2e/p06-tourism.spec.ts`)** : 3 tests E2E réussis (`1 skipped` intentionnellement sur mobile pour `/mon-espace` desktop) sur Chromium desktop (`1280x800`) et mobile (`375x812`) avec routes API simulées dans le navigateur (couvrant absence de débordement horizontal, chargement effectif des visuels Casamance, masquage des brouillons, fiche réservation, mise à jour de profil). *Note sur le périmètre : les tests E2E Playwright s'appuient sur des bouchons HTTP Playwright (`page.route`) dans l'environnement local.*
