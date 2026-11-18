# ÉTUDE DE MIGRATION ET ARCHITECTURE ANGULAR CIBLE

Ce document couvre la **Phase 2 (Étude de migration vers Angular)** et la **Phase 3 (Conception de l'architecture cible)**.

---

## 1. Vérification technique et choix de version Angular (Novembre 2026)

- **Version cible recommandée** : **Angular v22** (dernière version majeure stable publiée en juin 2026).
- **Compatibilité avec l'environnement local vérifié** :
  - Angular v22 requiert **Node.js `>= 22.22.3`** (compatible Node 24 et 26) et **TypeScript `>= 6.0`**.
  - La machine dispose actuellement de **Node.js `v26.12.0`** et **npm `11.20.0`** : l'outillage local est immédiatement compatible.
- **Pratiques Angular v22 retenues** :
  - **100 % Standalone Components** (aucun `NgModule` superflu).
  - **Zoneless & `ChangeDetectionStrategy.OnPush` par défaut** (standard Angular v22, performances optimales et zéro dépendance `zone.js`).
  - **Signals-first** (`signal()`, `computed()`, `effect()`, `input()`, `output()`) pour l'état local et partagé.
  - **`HttpClient` basé sur `fetch` natif** (par défaut dans Angular v22 via `withFetch()`) + **Functional Interceptors** (`HttpInterceptorFn`).
  - **Signal Forms** (stabilisés en Angular v22) ou **Typed Reactive Forms** pour les formulaires complexes, avec validation alignée sur `@Valid` du backend.
  - **Angular Router** avec **Lazy Loading par route (`loadComponent` / `loadChildren`)**, `withComponentInputBinding()`, `withInMemoryScrolling({ scrollPositionRestoration: 'top' })` et `TitleStrategy` personnalisée.
  - **Control Flow natif** (`@if`, `@for`, `@empty`) dans tous les templates.

---

## 2. Correspondances React → Angular adaptées au projet

*Évitant toute conversion mécanique, chaque mécanisme React existant est réinterprété selon les idiomes Angular modernes :*

| Mécanisme React existant | Problème / Limite actuelle | Solution Angular v22 adaptée au projet |
|---|---|---|
| `App.jsx` + `routes.jsx` (imports synchrones) | Pas de lazy loading, pas de scroll-top, `<title>` fixe | `app.routes.ts` avec `loadComponent` par page, `withInMemoryScrolling`, `Title` sur chaque route |
| `Layout.jsx` (`Outlet`) | Burger sans `Escape`, pas de skip-link | `MainLayoutComponent` (`<router-outlet />`) avec skip-link, fermeture `Escape` (`@HostListener`), navigation accessible |
| `apiRequest()` (`client.js`) sur `fetch` | Pas d'`AbortController`, pas d'intercepteur global | `HttpClient` (`provideHttpClient(withFetch(), withInterceptors([...]))`) : annulation automatique via `switchMap`/RxJS `takeUntilDestroyed` ou `rxResource`, `apiBaseUrlInterceptor` + `httpErrorInterceptor` |
| `useState` + `useEffect` dupliqués dans 8 pages | 8x code boilerplate, pas de cache | **Stores / Facades par domaine** (`PatrimoineStore`, `CircuitStore`, `EvenementStore`, `ReservationStore`) exposant des `Signal`s en lecture seule (`items`, `loading`, `error`), avec cache mémoire léger pour `/api/patrimoines` (évite les re-téléchargements répétés entre pages Circuits/Événements) |
| `patrimoinesMap` dupliqué dans 4 pages | Logique recalculée partout | `computed(() => Map<number, Patrimoine>)` centralisé dans `PatrimoineStore` et partagé |
| `ReserverPage` formulaire manuel | Validation HTML5 seule, bug d'erreur partagée | **Signal Forms** (ou Reactive Forms typés) avec validation synchrone par champ + séparation stricte `createError` vs `cancelError` + modale de confirmation d'annulation |
| `PatrimoinesPage` `?q=` buggé | Désynchronisation URL/input | Binding réactif unidirectionnel sur `ActivatedRoute.queryParams` (ou `input()` via `withComponentInputBinding()`) + mise à jour propre de l'URL via `Router.navigate([], { queryParams, replaceUrl: true })` |
| `utils/formatters.js` | Fonctions importées manuellement | **Pipes Angular purs** (`FcfaPricePipe`, `DurationMinutesPipe`, `DifficulteLabelPipe`, `EvenementTypePipe`, `DateFrPipe`) + helper pur `isLieuDeMemoire()` |
| `config.js` | URL `/api` en dur | `environment.ts` / `environment.development.ts` + `InjectionToken` `APP_CONFIG` + `proxy.conf.json` en dev |
| `tokens.css` + CSS BEM | CSS pur propre | Conservation **à l'identique** de `tokens.css` dans `src/styles/tokens.css`, styles globaux dans `styles.scss`/`.css`, et encapsulation `ViewEncapsulation.Emulated` par composant |
| Aucun test front | 0 % couverture | Tests unitaires/composants (Angular Testing + Vitest/TestBed) + `provideHttpClientTesting()` (`HttpTestingController`) |

---

## 3. Conception de l'architecture cible (`frontend-angular/`)

L'application étant de taille modeste (8 routes, 4 domaines API consommés, extensible à 7 avec Auth/Paiement/Admin), une architecture **modulaire orientée fonctionnalités (Core / Shared / Features)** sans sur-ingénierie (pas de NgRx lourd, pas de micro-frontends) est optimale.

### 3.1 Arborescence cible proposée

```text
frontend-angular/
├── angular.json
├── package.json
├── tsconfig.json / tsconfig.app.json / tsconfig.spec.json
├── proxy.conf.json                          # Proxy /api -> http://localhost:8080 (dev)
├── Dockerfile                               # Build Node -> Nginx (prod + proxy /api -> api-gateway:8080)
├── nginx.conf                               # SPA fallback (try_files) + reverse proxy /api
└── src/
    ├── index.html                           # Chargement police Nunito + <app-root>
    ├── main.ts                              # bootstrapApplication(AppComponent, appConfig)
    ├── environments/
    │   ├── environment.ts                   # production: true, apiBaseUrl: '/api'
    │   └── environment.development.ts       # production: false, apiBaseUrl: '/api'
    ├── styles/
    │   ├── tokens.css                       # Reprise 1:1 des variables CSS existantes
    │   └── global.css                       # Styles partagés (.container, .cards-grid, .detail-layout...)
    └── app/
        ├── app.component.ts
        ├── app.config.ts                    # Router, HttpClient(withFetch, withInterceptors), TitleStrategy
        ├── app.routes.ts                    # Routes lazy-loadées + 404
        │
        ├── core/                            # Singletons techniques & contrats transverses
        │   ├── config/
        │   │   └── site.config.ts           # SITE_CONFIG (siteName, slogan, universite, memorialKeywords)
        │   ├── interceptors/
        │   │   ├── api-prefix.interceptor.ts    # Préfixe les appels relatifs avec apiBaseUrl
        │   │   └── http-error.interceptor.ts    # Extrait {"erreur": "..."} + gestion réseau/503
        │   ├── models/                      # Interfaces & Enums TypeScript alignés sur les DTO Java
        │   │   ├── patrimoine.model.ts
        │   │   ├── circuit.model.ts
        │   │   ├── evenement.model.ts
        │   │   ├── reservation.model.ts
        │   │   └── api-error.model.ts
        │   ├── services/
        │   │   └── page-title.strategy.ts   # "<Titre page> — Patrimoine du Sénégal"
        │   └── layout/
        │       └── main-layout/             # Header sticky, recherche globale, Nav, Burger, Footer
        │
        ├── shared/                          # Composants UI purs & Pipes réutilisables (aucune dépendance métier API)
        │   ├── components/
        │   │   ├── ui-button/               # Bouton/Lien réutilisable (variants: primary, secondary, outline, danger)
        │   │   ├── ui-card/                 # Carte éditoriale 16px + mode sobre
        │   │   ├── ui-breadcrumb/           # Fil d'Ariane accessible
        │   │   ├── ui-filter-bar/           # Barre de filtres déclarative
        │   │   ├── ui-info-box/             # Encadré infos pratiques + lien OpenStreetMap validé
        │   │   ├── ui-patrimoine-image/     # Image + fallback vert/sobre sur erreur
        │   │   ├── ui-hero/                 # Bannière d'accueil + recherche
        │   │   ├── ui-loader/               # Spinner accessible
        │   │   ├── ui-error-message/        # Alerte erreur + bouton Réessayer
        │   │   ├── ui-empty-state/          # État vide + action
        │   │   └── ui-confirm-dialog/       # Modale de confirmation (ex: annulation réservation)
        │   ├── pipes/
        │   │   ├── fcfa-price.pipe.ts
        │   │   ├── duration-minutes.pipe.ts
        │   │   ├── difficulte-label.pipe.ts
        │   │   ├── evenement-type.pipe.ts
        │   │   └── date-fr.pipe.ts
        │   └── utils/
        │       └── patrimoine.utils.ts      # isLieuDeMemoire(), sortEtapes()
        │
        └── features/                        # Domaines fonctionnels isolés (lazy-loadés)
            ├── home/
            │   └── pages/home-page/
            ├── patrimoines/
            │   ├── data-access/
            │   │   ├── patrimoine-api.service.ts
            │   │   └── patrimoine.store.ts  # Signals + cache liste + index Map<id, Patrimoine>
            │   └── pages/
            │       ├── patrimoines-list-page/
            │       └── patrimoine-detail-page/
            ├── circuits/
            │   ├── data-access/
            │   │   ├── circuit-api.service.ts
            │   │   └── circuit.store.ts
            │   └── pages/
            │       ├── circuits-list-page/
            │       └── circuit-detail-page/
            ├── evenements/
            │   ├── data-access/
            │   │   ├── evenement-api.service.ts
            │   │   └── evenement.store.ts
            │   └── pages/
            │       ├── evenements-list-page/
            │       └── evenement-detail-page/
            └── reservations/
                ├── data-access/
                │   ├── reservation-api.service.ts
                │   └── reservation.store.ts
                └── pages/
                    └── reserver-page/
```

---

## 4. Responsabilités de chaque couche

1. **`core/`** :
   - Ne contient aucune logique d'affichage métier.
   - Porte les contrats exacts des DTO backend (`models/`), les intercepteurs HTTP transverses (`apiPrefixInterceptor`, `httpErrorInterceptor`), la stratégie de titre et le squelette de layout (`MainLayoutComponent`).
   - *Évolutivité* : prêt à accueillir `auth.interceptor.ts` et `auth.guard.ts` le jour où `ms-utilisateur` + Spring Security/JWT seront activés côté backend.
2. **`shared/`** :
   - Composants UI strictement présentationnels (`OnPush`, `input()`, `output()`, zéro injection de services HTTP).
   - Pipes purs pour le formatage (remplace les appels impératifs dans les templates).
3. **`features/<domaine>/data-access/`** :
   - `*-api.service.ts` : appels `HttpClient` typés (aucune transformation d'UI).
   - `*.store.ts` (`@Injectable({ providedIn: 'root' })` ou `@Service`) : encapsule l'état par Signals (`items`, `selectedItem`, `loading`, `error`), gère la déduplication/mise en cache et l'enrichissement croisé avec `PatrimoineStore`.
4. **`features/<domaine>/pages/`** :
   - Composants intelligents (« Smart Components ») chargés paresseusement par le routeur, connectant les `Store`s aux composants `shared/`.

---

## 5. Stratégie de gestion d'état, erreurs, environnements et tests

- **Gestion d'état** : Signals natifs dans des Stores par domaine (pas de NgRx Redux boilerplate, parfaitement proportionné pour 4 à 7 domaines). `PatrimoineStore.ensureLoaded()` permet d'éviter de re-télécharger `GET /api/patrimoines` sur `CircuitsPage`, `CircuitDetailPage`, `EvenementsPage` et `EvenementDetailPage` si déjà en mémoire (avec possibilité de rafraîchissement explicite).
- **Gestion des erreurs** : `httpErrorInterceptor` normalise toute `HttpErrorResponse` en une erreur lisible extrayant `err.error?.erreur` (contrat `GlobalExceptionHandler`), ou un message réseau explicite si `status === 0` (API Gateway injoignable). Sur `ReserverPage`, les erreurs de création (`createError` Signal) et d'annulation (`cancelError` Signal) sont strictement séparées.
- **Environnements & Conteneurisation** :
  - Dev : `ng serve --proxy-config proxy.conf.json` vers `http://localhost:8080`.
  - Prod : image Nginx multi-stage (`frontend-angular/Dockerfile`) servant le build statique avec `try_files $uri $uri/ /index.html;` pour le routage SPA et `location /api/ { proxy_pass http://api-gateway:8080; }` — résolvant du même coup l'absence de CORS sur `api-gateway`.
- **Tests** :
  - Unitaires : pipes (`fcfa-price.pipe.spec.ts`, `duration-minutes.pipe.spec.ts`), `patrimoine.utils.spec.ts` (`isLieuDeMemoire`), `httpErrorInterceptor.spec.ts`.
  - Intégration services : `*-api.service.spec.ts` avec `HttpTestingController`.
  - Composants : tests des filtres, états loading/error/empty, formulaire `ReserverPage` (validation + soumission + annulation confirmée).
  - E2E (recommandé en phase de validation) : Playwright contre `docker compose` (4 services minimum : `ms-patrimoine`, `ms-circuit`, `ms-evenement`, `ms-reservation`, `api-gateway`).
