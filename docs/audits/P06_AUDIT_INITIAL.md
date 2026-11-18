# PHASE A — AUDIT TECHNIQUE & PLAN D'IMPLÉMENTATION P06

**Projet** : Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance (UASZ, Licence 3)  
**Branche de travail** : `feature/p06-public-tourism-frontend`  
**Base Git vérifiée** : `origin/develop` @ `3f53504` (`Merge pull request #10 from ona79/feature/p05-guides-reviews-notifications`)  
**CI de référence sur `develop`** : Run [`#44304602521`](https://github.com/ona79/micro-service/actions/runs/44304602521) (`WORKFLOW_RUN_CONCLUSION_SUCCESS`, `2m 30s`)  

---

## 1. INVENTAIRE DE L'EXISTANT ANGULAR (`frontend-angular`)

### 1.1 Socle technique et dépendances
- **Framework** : Angular `22.2.0` / CLI `22.2.7`, TypeScript `~6.0.2` (`strict: true`, `strictInjectionParameters`, `strictInputAccessModifiers`), `packageManager: npm@11.20.0`.
- **Architecture** : `ApplicationConfig` sans NgModules, routes en lazy loading (`withComponentInputBinding()`, `withInMemoryScrolling`), Signals + `OnPush`, `provideAppInitializer(() => authStore.ensureInitialized())`.
- **Bibliothèques installées** : `@angular/cdk` (`22.2.7`), `@angular/aria` (`22.2.7`), `@lucide/angular` (`1.74.0`), `leaflet` (`1.9.4`) + `@types/leaflet`, `ngx-sonner` (`3.1.0`), `date-fns` (`4.4.0`), Vitest (`5.0.0`) + `jsdom`, Playwright (`1.65.1`).
- **Build & Budgets (`angular.json`)** : builder `@angular/build:application`, budgets `initial <= 600kB warning / 1MB error`, `anyComponentStyle <= 12kB / 16kB`, `optimization.fonts: false`.
- **Déploiement (`nginx.conf`)** : SPA statique servie par Nginx (`try_files $uri $uri/ /index.html;`) + proxy `/api/` vers `http://api-gateway:8090/api/` (architecture CSR sans serveur Node SSR).

### 1.2 Sécurité, Intercepteurs & Sessions
- `authInterceptor` : attache `withCredentials: true` (cookie HttpOnly P02) et `X-XSRF-TOKEN` lu depuis `XSRF-TOKEN`, gère le *silent refresh* sur `401` via `/api/utilisateurs/refresh` et redirige vers `/connexion?returnUrl=...&expired=1` en cas d'échec.
- `httpErrorInterceptor` : normalise les réponses `{ erreur }` Spring Boot en `ApiError` typées (`network`, `not_found`, `unavailable`, `validation`, `business`, `server`).
- `authGuard`, `guestGuard`, `roleGuard` protègent les routes privées (`/reserver`, `/paiements`, `/notifications`, `/mon-espace`, `/espace-guide`, `/administration`).

### 1.3 Écrans existants identifiés
- **Publics** : `/` (`HomePageComponent`), `/patrimoines` & `/patrimoines/:id`, `/circuits` & `/circuits/:id`, `/evenements` & `/evenements/:id`, `/guides` & `/guides/:id`, `/connexion`, `/inscription`.
- **Privés** : `/reserver`, `/paiements/:reservationId`, `/notifications`, `/mon-espace`, `/espace-guide`, `/administration`.
- **Partagés (`shared/`)** : `UiPatrimoineImageComponent`, `UiHeritageMapComponent`, `UiAvisSectionComponent`, `UiBreadcrumbComponent`, `UiConfirmDialogComponent`, `UiEmptyStateComponent`, `UiErrorBannerComponent`, `UiSkeletonGridComponent`, pipes (`DateFrPipe`, `FcfaPricePipe`, `DurationMinutesPipe`, `DifficulteLabelPipe`, `EvenementTypePipe`).

---

## 2. DIAGNOSTIC DES LACUNES PAR RAPPORT AUX EXIGENCES P06

| Domaine / Section P06 | Constat observé dans le code existant | Écart / Action requise |
|---|---|---|
| **Identité Casamance & Palette (Sec. 6, 15)** | `site.config.ts`, `index.html`, `main-layout.component.html` et `home-page.component.html` mentionnent encore *« Patrimoine du Sénégal — De l'île de Gorée... »* ; `tokens.css` emploie `#1f5138`, `#b24c29`, `#8a5a10`, `#f2ede4` au lieu des teintes exactes `#245B45`, `#B75F3B`, `#D9A441`, `#F1EBDD`. | Ancrer l'éditorial, le branding et les métadonnées sur **la Casamance** (Basse, Moyenne et Haute-Casamance) et aligner la palette CSS (`#245B45` Vert mangrove, `#B75F3B` Terre latérite, `#D9A441` Ocre avec contraste WCAG AA préservé, `#F1EBDD` Lin naturel). |
| **Accueil touristique (Sec. 6)** | `HomePageComponent` charge `PatrimoineStore`, `CircuitStore`, `EvenementStore` mais n'affiche ni les **guides validés** (`GuideApiService`), ni de véritables cartes **circuits populaires**, ni les **prochains événements** (`/api/evenements/a-venir`), ni les **notes vérifiées** (`/api/avis/resumes`), ni les zones territoriales cliquables. | Transformer `/` en véritable vitrine touristique de Casamance connectée aux APIs réelles (`GET /api/patrimoines/recherche`, `GET /api/circuits/recherche`, `GET /api/evenements/a-venir`, `GET /api/guides`, `GET /api/avis/resumes`) sans données inventées. |
| **Patrimoines & Médias (Sec. 7, 15)** | `PatrimoinesListPage` fait filtrage/tri/pagination côté client via `getAll()` au lieu d'exploiter `GET /api/patrimoines/recherche` (pagination serveur et visibilité `PUBLIE` garantie backend). `UiPatrimoineImageComponent` ne mappe que d'anciens codes `PAT-DKR-*`/`PAT-SLN-*`, ignore `imageUrl` et ne couvre pas les 8 fiches Casamance de `V2/V3` (`PAT-ZIG-001`, `PAT-CRB-002`, `PAT-OSS-004`, `PAT-SED-006`, `PAT-OSS-007`, `PAT-KOL-008`). `galerieMedias` n'est pas exploité en fiche détail. | Basculer `/patrimoines` sur `PatrimoineApiService.rechercher(...)` (pagination/tri serveur, filtres catégorie, zone Casamance, localité, tarif/capacité) tout en gardant la carte Leaflet synchronisée ; ajouter les visuels locaux pour les 8 codes Casamance dans `public/images/patrimoines/` et enrichir `PatrimoineDetailPage` (horaires, tarif, GPS, galerie). |
| **Circuits (Sec. 8)** | `CircuitsListPage` filtre tout côté client sans tri/pagination serveur (`GET /api/circuits/recherche`) et sans filtre par **zone géographique**. Les cartes de liste affichent `~X km` sans rappeler explicitement le caractère orthodromique indicatif. | Exploiter `CircuitApiService.rechercher(...)` avec zone, difficulté, transport, durée/distance/prix max, tri et pagination serveur ; rappeler explicitement l'estimation orthodromique ; enrichir `CircuitDetailPage` avec le profil guide validé uniquement si `GET /api/guides/utilisateur/{id}` aboutit (`VALIDE` & visible). |
| **Événements & `Africa/Dakar` (Sec. 9)** | `DateFrPipe` utilise `date-fns` `format()` dans le **fuseau horaire local du navigateur** et non en `Africa/Dakar`. `EvenementsListPage` filtre en client, ne propose pas `CEREMONIE_TRADITIONNELLE` / `FOIRE_ARTISANALE`, et pourrait exploiter `GET /api/evenements/recherche` (`aVenirUniquement`, `dateMin`, `dateMax`). | Corriger `DateFrPipe` avec `Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Dakar', ... })` ; basculer `/evenements` sur `EvenementApiService.rechercher(...)` avec filtre date, catégorie complète, zone et vue « À venir ». |
| **Guides Publics (Sec. 10)** | `GuidesListPage` fonctionne mais manque de filtres par zone Casamance (Basse/Moyenne/Haute) / disponibilité et d'affichage de spécialités distinctes ; `GuideDetailPage` doit garantir le SEO dynamique. | Enrichir les filtres et badges publics sans exposer `email`, `telephone`, `documentsJustificatifs` ni guide non validé ; calculer les résumés d'avis vérifiés. |
| **Espace Touriste & Réservation P04/P05 (Sec. 11, 12)** | `AccountPageComponent` fait 741 lignes monolithiques, n'offre pas d'édition de profil/paramètres (`AuthStore.updateUser`) ni de vue détaillée complète d'une réservation (`/reservations/:id` ou panneau détaillé avec participants, créneau, date prestation, paiements, avis lié). Dans `ReserverPage`, la disponibilité temps réel (`/api/reservations/disponibilite`) n'est pas interrogée automatiquement à la sélection, et la liste des circuits n'exclut pas explicitement un éventuel statut non `PUBLIE`. | Ajouter `ReservationDetailPageComponent` (`/reservations/:id` protégée `authGuard`), modulariser `/mon-espace` (onglets Réservations, Profil & Paramètres, Paiements, Avis, Notifications) avec formulaire réactif typé de mise à jour profil ; rendre automatique la vérification de disponibilité dans `/reserver` avec récapitulatif explicite et verrou anti-double soumission / anti-double paiement. |
| **Performance & SEO (Sec. 17)** | Pas de gestion dynamique des balises `<meta name="description">`, Open Graph (`og:title`, `og:description`) ni `<link rel="canonical">`. Images carte sans dimensions explicites sur certains conteneurs. Limitation CSR documentée (SPA Nginx sans SSR Node). | Créer `SeoService` dans `core/services/` couplé à `Router` + fiches dynamiques, optimiser attributs `aspect-ratio` / `width` / `height`, documenter honnêtement le modèle CSR + Nginx et les métriques réelles de build. |
| **Tests & Qualité (Sec. 18, 19)** | Couverture P06 manquante sur `SeoService`, `DateFrPipe` en `Africa/Dakar`, pagination/recherche serveur, espace touriste (`/mon-espace`, `/reservations/:id`), parcours réservation/paiement guidé et scénarios accessibilité / responsive. | Compléter les specs Vitest pour tous les parcours P06 (visiteur non connecté, touriste connecté, réservation/paiement simulé, erreur/indisponibilité, notifications, isolation) et exécuter la vérification Playwright / responsive. |

---

## 3. PLAN D'IMPLÉMENTATION MODULAIRE

1. **Lot 1 — Identité Casamance, Design System & Assets authentiques** : alignement `tokens.css` (`#245B45`, `#B75F3B`, `#D9A441`, `#F1EBDD`), `site.config.ts`, `index.html`, `SeoService`, `DateFrPipe` sur fuseau `Africa/Dakar`, `UiPatrimoineImageComponent` + visuels pour les 8 patrimoines Casamance.
2. **Lot 2 — Découverte Publique (Accueil, Patrimoines, Circuits, Événements, Guides)** : refonte de `HomePageComponent` avec sections API réelles (patrimoines, circuits, prochains événements, guides validés, notes vérifiées, zones Casamance) ; pagination/tri/filtrage serveur sur `/patrimoines`, `/circuits`, `/evenements` via endpoints `/recherche` ; fiches détaillées enrichies + `SeoService` dynamique.
3. **Lot 3 — Parcours Touriste Complet (Réservation guidée, Paiement simulé, Détail Réservation, Espace Personnel modulaire)** : vérification disponibilité automatique, verrou double soumission, `/reservations/:id`, édition profil sécurisée dans `/mon-espace`, harmonisation `/notifications` et `/guides`.
4. **Lot 4 — Tests automatisés, Build Production, Captures, Documentation & CI** : suite Vitest élargie, build production, vérification E2E Playwright / captures d'écrans sur les vues clés desktop/mobile, mise à jour documentation `frontend-angular/docs/` et `README.md`, validation CI sur `feature/p06-public-tourism-frontend`.
