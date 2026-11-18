# ARCHITECTURE LOGICIELLE ANGULAR v22 (P06)

## 1. Principes directeurs

- **100 % Standalone Components** + `ChangeDetectionStrategy.OnPush`.
- **Lazy Loading par route** (`loadComponent` dans `src/app/app.routes.ts` pour l'ensemble des 17 routes publiques et protégées).
- **Signals-first** : état local et Stores par domaine basés sur `signal()` et `computed()`.
- **HttpClient natif `fetch`** (`withFetch()`) avec intercepteurs fonctionnels (`apiPrefixInterceptor`, `authInterceptor`, `httpErrorInterceptor`).
- **TypeScript strict** (`strict: true`, `noImplicitOverride`, `noImplicitReturns`).

## 2. Organisation des couches (`src/app/`)

- `core/` : configuration (`APP_SITE_CONFIG`), modèles DTO (`models/`), `AuthStore`, guards (`authGuard`, `guestGuard`, `roleGuard`), `SeoService` & `PageTitleStrategy`, shell (`MainLayoutComponent`, `ForbiddenPageComponent`, `NotFoundPageComponent`).
- `shared/` : composants UI réutilisables (`shared/components/`), pipes purs (`fcfaPrice`, `durationMinutes`, `difficulteLabel`, `evenementType`, `dateFr` sur `Africa/Dakar`), utilitaires (`patrimoine.utils.ts`).
- `features/` : domaines métier isolés (`home`, `patrimoines`, `circuits`, `evenements`, `guides`, `reservations`, `paiements`, `avis`, `notifications`, `auth`, `admin`), chacun structuré en `data-access/` (`*-api.service.ts` + `*.store.ts`) et `pages/`.

## 3. SEO SPA, erreurs et isolation de données

- `SeoService` met à jour dynamiquement `<title>`, `<meta name="description">`, les balises `og:*` et `<link rel="canonical">` par route et par fiche publique ; déployé en CSR derrière Nginx (`nginx.conf`, pas de serveur SSR Node en production).
- `httpErrorInterceptor` classe chaque échec en `ApiError` (`network`, `validation`, `business`, `not_found`, `unavailable`, `server`) et extrait `{"erreur": "..."}`.
- `ReservationStore` isole `listError`, `submitError` et `cancelError` ; les clés `Idempotency-Key` protègent création et initiation de paiement simulé.
- Les pages détail utilisent un compteur de séquence (`loadSeq`) afin d'ignorer toute réponse obsolète lors d'un changement rapide de route.
