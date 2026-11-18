# RAPPORT DE VALIDATION FRONTEND ANGULAR (`frontend-angular`)

**Date d'exécution** : 17 Novembre 2026  
**Branche Git** : `develop`  
**Framework** : Angular `22.2.0` (Standalone Components, Signals, `@defer`, `@angular/cdk`, `@angular/aria`, `@lucide/angular`, `leaflet`, `ngx-sonner`, `date-fns`)  
**TypeScript** : `5.9.3` (Mode `strict: true`, `noImplicitOverride: true`, `strictTemplates: true`)

---

## 1. Audit de Compilation et de Configuration (Phase 2)

| Vérification | Commande exécutée | Résultat | Statut |
| :--- | :--- | :--- | :--- |
| Installation des dépendances | `npm ci` / `npm ls --depth=0` | Arbre de dépendances intègre, aucun conflit de peerDependencies | **PASS** |
| Vérification statique TypeScript | `npx tsc --noEmit` | `0` erreur de typage, `0` `any` implicite | **PASS** |
| Compilation Angular Development | `npx ng build --configuration development` | Compilation des 9 routes lazy-loaded sans erreur de template ni d'injection | **PASS** |
| Compilation Angular Production | `npm run build` (`ng build`) | `0` erreur, `0` warning — Bundle initial `483.23 kB` brut (`107.83 kB` gzip estimé) | **PASS** |
| Configuration du Proxy Dev | `proxy.conf.json` | Redirection `/api/**` vers `http://localhost:8090` (`api-gateway`) opérationnelle | **PASS** |
| Configuration Docker / Nginx | `Dockerfile` + `nginx.conf` | Multi-stage Node 22 Alpine -> Nginx 1.27 Alpine, fallback SPA `try_files $uri $uri/ /index.html` + reverse proxy `/api/` | **PASS** |

### Détail des bundles de production (`dist/frontend-angular/browser`)

| Chunk / Fichier | Rôle | Taille brute | Taille transférée (estimée) |
| :--- | :--- | :--- | :--- |
| `main-B5R7ZPQX.js` | Runtime Angular + Shell applicatif | `215.72 kB` | `55.66 kB` |
| `chunk-2P5Y2XYH.js` | Bibliothèques partagées (`@lucide/angular`, `@angular/cdk`, `ngx-sonner`) | `191.59 kB` | `38.94 kB` |
| `styles-B7W2D7QW.css` | Design System *« Terre, Mangrove & Lin »* + Leaflet CSS | `75.92 kB` | `13.23 kB` |
| **Total Initial** | **Chargement initial (budget max : 750 kB)** | **`483.23 kB`** | **`107.83 kB`** |
| `patrimoines-list-page` (lazy) | Catalogue des sites patrimoniaux + filtres | `44.91 kB` | `10.97 kB` |
| `circuits-list-page` (lazy) | Parcours touristiques + démonstrateur inter-services | `29.10 kB` | `7.51 kB` |
| `evenements-list-page` (lazy) | Agenda culturel | `27.99 kB` | `7.12 kB` |
| `reserver-page` (lazy) | Tunnel de réservation + modale de confirmation | `23.43 kB` | `5.97 kB` |
| `patrimoine-detail-page` (lazy) | Fiche détaillée d'un site patrimonial | `14.12 kB` | `3.99 kB` |
| `circuit-detail-page` (lazy) | Fiche détaillée d'un circuit + étapes | `13.79 kB` | `3.97 kB` |
| `home-page` (lazy) | Page d'accueil éditoriale + carte interactive | `13.61 kB` | `4.14 kB` |
| `evenement-detail-page` (lazy) | Fiche détaillée d'un événement | `13.22 kB` | `3.82 kB` |

---

## 2. Tests Unitaires et Composants Frontend (Phase 3)

**Outil d'exécution** : `@angular/build:unit-test` + **Vitest `4.0.8`** (`jsdom`)  
**Commande** : `npx ng test --no-watch`  
**Résultat global** : **12 fichiers de test exécutés — 12 PASS (28/28 assertions validées, 0 échec)**

| Suite de test (`src/app/**`) | Cible testée | Cas couverts | Statut |
| :--- | :--- | :--- | :--- |
| `src/app/app.spec.ts` | `AppComponent` | Instanciation du shell racine, présence de `<router-outlet>` et `<ngx-sonner-toaster>` | **PASS** (1/1) |
| `src/app/shared/utils/patrimoine.utils.spec.ts` | `patrimoine.utils.ts` | Parsing multi-URLs (`parseImageUrls`), résolution d'image de secours par catégorie (`resolvePrimaryImage`), badges et libellés métier | **PASS** (6/6) |
| `src/app/shared/pipes/pipes.spec.ts` | `FcfaCurrencyPipe`, `DurationFormatPipe` | Formatage monétaire FCFA (`Gratuit` pour `0`, `15 000 FCFA`), formatage durée (`45 min`, `2h`, `2h 15min`) | **PASS** (4/4) |
| `src/app/core/interceptors/interceptors.spec.ts` | `apiPrefixInterceptor`, `httpErrorInterceptor` | Préfixage `/api`, normalisation des erreurs HTTP `400`/`404`/`500` en `NormalizedHttpError` | **PASS** (3/3) |
| `src/app/core/layout/main-layout/main-layout.component.spec.ts` | `MainLayoutComponent` | Skip-link d'accessibilité, liens de navigation principaux, ouverture/fermeture du tiroir mobile | **PASS** (2/2) |
| `src/app/features/api-services.spec.ts` | `PatrimoineApiService`, `CircuitApiService`, `EvenementApiService`, `ReservationApiService` | Requêtes HTTP `GET`/`POST`/`PUT`/`DELETE`, test du comparateur inter-services (`FEIGN`, `RESTTEMPLATE`, `WEBCLIENT`) | **PASS** (4/4) |
| `src/app/features/home/pages/home-page/home-page.component.spec.ts` | `HomePageComponent` | Rendu du Hero éditorial, compteurs statistiques réactifs (Signals), cartes de prévisualisation | **PASS** (1/1) |
| `src/app/features/patrimoines/pages/patrimoines-list-page/patrimoines-list-page.component.spec.ts` | `PatrimoinesListPageComponent` | Filtrage combiné (recherche texte + catégorie + zone géographique + tri), bascule vue Grille / Carte, ouverture modale CRUD | **PASS** (2/2) |
| `src/app/features/patrimoines/pages/patrimoine-detail-page/patrimoine-detail-page.component.spec.ts` | `PatrimoineDetailPageComponent` | Chargement unitaire `GET /api/patrimoines/:id` sans double appel (`untracked`), affichage galerie, tarifs, capacité et coordonnées GPS | **PASS** (1/1) |
| `src/app/features/circuits/pages/circuit-detail-page/circuit-detail-page.component.spec.ts` | `CircuitDetailPageComponent` | Chargement unitaire `GET /api/circuits/:id`, timeline ordonnée des étapes, distance Haversine et durée | **PASS** (1/1) |
| `src/app/features/evenements/pages/evenements-list-page/evenements-list-page.component.spec.ts` | `EvenementsListPageComponent` | Filtrage par type d'événement (`FESTIVAL`, `EXPOSITION`, `VISITE_GUIDEE`, `CONFERENCE`), compteur de résultats | **PASS** (1/1) |
| `src/app/features/reservations/pages/reserver-page/reserver-page.component.spec.ts` | `ReserverPageComponent` | Pré-sélection via queryParams (`?type=CIRCUIT&targetId=1`), validation Reactive Forms, soumission `POST /api/reservations` et mise à jour de l'état | **PASS** (2/2) |

---

## 3. Anomalies Frontend Détectées et Corrigées Pendant la Campagne

1. **Double appel HTTP dans les pages de détail (`PatrimoineDetailPageComponent`, `CircuitDetailPageComponent`, `EvenementDetailPageComponent`)** :
   - *Symptôme* : `effect()` appelait `void this.store.ensureLoaded()` et `void this.loadDetail(id)` directement, ce qui abonnait l'effet au signal interne `_loaded` du store et provoquait un second appel `GET /api/<ressource>/:id` dès que la liste passait à `_loaded = true`.
   - *Correction* : Encapsulation dans `untracked(() => { void this.store.ensureLoaded(); void this.loadDetail(currentId); })`.
   - *Vérification* : Confirmé par `HttpTestingController.expectOne('/api/patrimoines/1')` + `httpMock.verify()` dans les tests unitaires.
2. **Inlining des polices Google Fonts en environnement isolé (`angular.json`)** :
   - *Symptôme* : `ng build` échouait hors-ligne lors de la récupération de `fonts.googleapis.com`.
   - *Correction* : Désactivation de l'inlining distant au build (`"fonts": false` dans `optimization`) tout en conservant le chargement `<link>` avec `fallback` typographique local (`Georgia`, `system-ui`).
3. **Doublon d'attribut `role="dialog"` dans `UiConfirmDialogComponent`** :
   - *Symptôme* : `@angular/cdk/dialog` injecte déjà `role="dialog"` sur `<cdk-dialog-container>`. La présence d'un second `role="dialog"` sur le `<div class="dialog-panel">` interne créait une ambiguïté ARIA détectée par Playwright (`strict mode violation: getByRole('dialog') resolved to 2 elements`).
   - *Correction* : Retrait du `role="dialog"` redondant sur l'élément enfant `.dialog-panel`.
