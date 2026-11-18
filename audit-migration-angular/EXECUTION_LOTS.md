# RAPPORT D'EXÉCUTION PAR LOTS — MIGRATION & REFONTE ANGULAR v22

Ce document présente le bilan détaillé de chaque lot fonctionnel (Phase 9) réalisé sur la branche `develop`.

---

## Lot 0 — Socle Angular v22 & Design System « Terre, Mangrove & Lin »
- **Objectifs** : Initialiser `frontend-angular/` en Angular `22.2.7` sans toucher au dossier `frontend/` React ni aux microservices, installer les bibliothèques validées et poser les fondations du Design System.
- **Fichiers & composants** : `angular.json`, `tsconfig.json` (`strict: true`), `proxy.conf.json`, `src/styles/tokens.css`, `src/styles/global.css`, `src/environments/*`.
- **Bibliothèques installées** : `@angular/cdk@22.2.7`, `@angular/aria@22.2.7`, `@lucide/angular@1.74.0`, `ngx-sonner@3.1.0`, `leaflet@1.9.4`, `date-fns@4.4.0`, `@playwright/test@1.65.1`.
- **Résultat** : Build de production (`ng build`) sans erreur ni warning ; budget initial respecté (`107.83 kB` estimé en transfert).

---

## Lot 1 — Core Technique, Intercepteurs, Shell Layout & Composants Shared
- **Objectifs** : Centraliser la communication HTTP, normaliser les erreurs backend `{"erreur": "..."}` et construire les composants partagés accessibles.
- **Composants développés** : `MainLayoutComponent`, `NotFoundPageComponent`, `UiBreadcrumbComponent`, `UiErrorBannerComponent`, `UiEmptyStateComponent`, `UiSkeletonGridComponent`, `UiPatrimoineImageComponent`, `UiConfirmDialogComponent`, `UiHeritageMapComponent`.
- **Services & Pipes** : `apiPrefixInterceptor`, `httpErrorInterceptor`, `PageTitleStrategy`, `FcfaPricePipe`, `DurationMinutesPipe`, `DifficulteLabelPipe`, `EvenementTypePipe`, `DateFrPipe`, `patrimoine.utils.ts`.
- **Tests exécutés** : `patrimoine.utils.spec.ts`, `pipes.spec.ts`, `interceptors.spec.ts`, `app.spec.ts` (16/16 tests unitaires passants).

---

## Lot 2 — Accueil & Domaine Patrimoines
- **Objectifs** : Refondre la page d'accueil et le catalogue/détail des patrimoines avec bascule Catalogue / Carte Leaflet interactive et correction du bug `?q=`.
- **Pages concernées** : `HomePageComponent` (`/`), `PatrimoinesListPageComponent` (`/patrimoines`), `PatrimoineDetailPageComponent` (`/patrimoines/:id`).
- **Services & API** : `PatrimoineApiService`, `PatrimoineStore` (`GET /api/patrimoines`, `GET /api/patrimoines/{id}`).
- **Tests exécutés** : `patrimoines-list-page.component.spec.ts` (vérification de la synchronisation bidirectionnelle `?q=` et de la réinitialisation au retour sur `/patrimoines`).

---

## Lot 3 — Domaine Circuits Touristiques
- **Objectifs** : Présenter les circuits sous forme de carnet d'itinéraires et tracer le parcours réel sur carte Leaflet (`L.polyline`) entre les étapes ordonnées.
- **Pages concernées** : `CircuitsListPageComponent` (`/circuits`), `CircuitDetailPageComponent` (`/circuits/:id`).
- **Services & API** : `CircuitApiService`, `CircuitStore` (`GET /api/circuits`, `GET /api/circuits/{id}` + enrichissement croisé via `PatrimoineStore.byIdMap()`).

---

## Lot 4 — Domaine Événements Culturels
- **Objectifs** : Concevoir un véritable agenda culturel avec puces de filtrage `@angular/aria/toolbar`, blocs date Jour/Mois et héritage du registre sobre si l'événement a lieu sur un lieu de mémoire.
- **Pages concernées** : `EvenementsListPageComponent` (`/evenements`), `EvenementDetailPageComponent` (`/evenements/:id`).
- **Services & API** : `EvenementApiService`, `EvenementStore` (`GET /api/evenements`, `GET /api/evenements/{id}`).
- **Tests exécutés** : `evenements-list-page.component.spec.ts` (filtrage par puce de catégorie et formatage `"Gratuit"`).

---

## Lot 5 — Domaine Réservations & Formulaires
- **Objectifs** : Transformer `/reserver` en comptoir de réservation avec estimation du montant total en direct, validation Reactive Forms stricte, séparation des erreurs création/annulation et confirmation modale CDK avant annulation.
- **Pages concernées** : `ReserverPageComponent` (`/reserver`).
- **Services & API** : `ReservationApiService`, `ReservationStore` (`GET /api/reservations`, `POST /api/reservations`, `PUT /api/reservations/{id}/annuler`).
- **Tests exécutés** : `reserver-page.component.spec.ts` (calcul estimation, préservation du formulaire sur erreur 400 capacité insuffisante, confirmation CDK avant `PUT /annuler`).

---

## Lot 6 — Qualité, E2E Playwright, Conteneurisation & Documentation
- **Objectifs** : Valider l'ensemble des suites automatisées, préparer le déploiement Docker/Nginx et livrer la documentation complète.
- **Livrables** : `Dockerfile`, `nginx.conf`, `playwright.config.ts`, `e2e/patrimoine.spec.ts`, `docs/{DESIGN_SYSTEM,ARCHITECTURE,API_INTEGRATION,DEPLOYMENT,RAPPORT_QUALITE_PERF_A11Y}.md`.
- **Problèmes restants (côté backend uniquement, non modifiés conformément aux règles)** :
  - Absence d'authentification Spring Security / JWT sur `api-gateway` et `ms-utilisateur`.
  - Aucune photo `.jpg` présente dans `public/images/` (les plaques architecturales de repli s'affichent proprement).
