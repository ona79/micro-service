# ARCHITECTURE LOGICIELLE ANGULAR v22

## 1. Principes directeurs

- **100 % Standalone Components** + `ChangeDetectionStrategy.OnPush`.
- **Lazy Loading par route** (`loadComponent` dans `src/app/app.routes.ts`).
- **Signals-first** : état local et Stores par domaine basés sur `signal()` et `computed()`.
- **HttpClient natif `fetch`** (`withFetch()`) avec intercepteurs fonctionnels (`apiPrefixInterceptor`, `httpErrorInterceptor`).
- **TypeScript strict** (`strict: true`, `noImplicitOverride`, `noImplicitReturns`).

## 2. Organisation des couches (`src/app/`)

- `core/` : configuration (`APP_SITE_CONFIG`), modèles DTO (`models/`), intercepteurs HTTP, `PageTitleStrategy`, shell (`MainLayoutComponent`, `NotFoundPageComponent`).
- `shared/` : composants UI réutilisables (`shared/components/`), pipes purs (`fcfaPrice`, `durationMinutes`, `difficulteLabel`, `evenementType`, `dateFr`), utilitaires purs (`patrimoine.utils.ts`).
- `features/` : domaines métier isolés (`home`, `patrimoines`, `circuits`, `evenements`, `reservations`), chacun structuré en `data-access/` (`*-api.service.ts` + `*.store.ts`) et `pages/`.

## 3. Gestion des erreurs et annulations

- `httpErrorInterceptor` classe chaque échec en `ApiError` (`network`, `validation`, `business`, `not_found`, `unavailable`, `server`) et extrait systématiquement `{"erreur": "..."}`.
- `ReservationStore` isole `listError`, `submitError` et `cancelError` pour éviter toute confusion visuelle dans le comptoir `/reserver`.
- Les pages détail utilisent un compteur de séquence (`loadSeq`) afin d'ignorer toute réponse obsolète lors de changements rapides d'ID.
