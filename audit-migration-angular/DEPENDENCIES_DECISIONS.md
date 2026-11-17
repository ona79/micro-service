# DÉCISIONS SUR LES BIBLIOTHÈQUES ET DÉPENDANCES (`DEPENDENCIES_DECISIONS.md`)

**Phase 3 — Évaluation et sélection raisonnée de l'écosystème Angular v22**  
**Date d'évaluation** : 17 novembre 2026  
**Socle cible** : Angular `22.2.x` (Node.js `26.12.0`, TypeScript `6.x`)

---

## 1. Bibliothèques retenues

| Catégorie | Bibliothèque | Version vérifiée | Licence | Poids / Impact bundle | Justification métier & technique |
|---|---|---|---|---|---|
| **Accessibilité & Primitives UI** | `@angular/cdk` | `22.2.7` | MIT | Faible (tree-shakeable : `Dialog`, `A11y`) | Fournit `DialogModule` (`FocusTrap`, gestion `Escape`, `aria-modal`, restauration du focus) pour les modales accessibles (confirmation d'annulation de réservation) et utilitaires d'accessibilité. |
| **Primitives WAI-ARIA** | `@angular/aria` | `22.2.7` | MIT | Très faible (headless) | Stabilisé en Angular v22. Apporte les directives headless WAI-ARIA (navigation clavier, attributs ARIA automatiques) pour nos composants personnalisés (barre d'onglets/filtres, menus accessibles) sans imposer de style tiers. |
| **Icônes** | `@lucide/angular` | `1.74.0` | ISC | Tree-shakeable (~1-2 Ko par icône importée) | Successeur officiel de `lucide-angular` (obsolète). Composants SVG standalone compatibles Signals & Zoneless Angular 22. Remplace avantageusement flèches texte et barres CSS. |
| **Cartographie** | `leaflet` + `@types/leaflet` | `1.9.4` / `1.9.22` | BSD-2-Clause | ~42 Ko gzippé (chargé en lazy dans les composants carte) | `ms-patrimoine` fournit de vraies coordonnées GPS (`latitudePatrimoine`, `longitudePatrimoine`). Leaflet permet d'afficher les sites sur carte OpenStreetMap et de tracer les itinéraires (`L.polyline`) des circuits multi-étapes sans clé API payante. |
| **Notifications Toast** | `ngx-sonner` | `3.1.0` | MIT | Très léger (~5 Ko) | Compatible Angular `>= 19` (Signals/Zoneless). Apporte un retour non bloquant immédiat (création/annulation de réservation, erreurs réseau) accessible (`aria-live`). |
| **Dates & Localisation** | `date-fns` | `4.4.0` | MIT | Tree-shakeable (imports ciblés + locale `fr`) | Formatage fiable des `LocalDateTime` ISO-8601 backend, extraction jour/mois pour l'agenda des événements et comparaisons de dates sans piège de fuseau horaire. |
| **Tests unitaires & composants** | `vitest` + `jsdom` *(natif Angular 22)* | Intégré `@angular/build:unit-test` | MIT | Dev only | Runner officiel par défaut d'Angular v22 remplaçant Karma/Jasmine. Exécution rapide en Node/jsdom avec support `TestBed` et `HttpTestingController`. |
| **Tests E2E, Responsive & A11y** | `@playwright/test` | `1.65.1` | Apache-2.0 | Dev only | Vérifie les parcours complets dans un vrai navigateur Chromium sur desktop (`1280px`), tablette (`768px`) et mobile (`375px`), avec assertions d'accessibilité et interception réseau déterministe. |

---

## 2. Bibliothèques évaluées et écartées (Justification anti-bloat)

| Bibliothèque évaluée | Décision | Justification |
|---|---|---|
| `lucide-angular` (non-scopé) | **Écartée** | Paquet hérité/déprécié au profit de `@lucide/angular`. |
| `maplibre-gl` | **Écartée** | Excellent pour du vectoriel 3D/WebGL, mais nettement plus lourd (~220+ Ko gzip) et exige des styles de tuiles vectorielles externes ; Leaflet suffit amplement pour des marqueurs patrimoniaux et polylignes OSM. |
| `echarts` / `chart.js` | **Écartée** | Aucune donnée analytique ou série temporelle dans les 7 API backend ; ajouter des graphiques inciterait à créer des métriques factices. |
| `ag-grid` / `@tanstack/angular-table` | **Écartée** | Surdimensionnées pour des catalogues de cartes et un registre de réservations filtrable ; des composants sémantiques natifs restent plus légers et plus adaptables sur mobile. |
| `tiptap` | **Écartée** | Aucune édition de texte riche côté client dans le périmètre actuel (champs texte bornés à 2 000 caractères côté backend). |
| `zod` | **Écartée** | Les Typed Reactive Forms d'Angular + interfaces TypeScript strictes couvrent nativement les validations `@Valid` backend sans ajouter de dépendance runtime supplémentaire. |
| `Angular Animations` (`@angular/animations`) | **Écartée (non ajoutée)** | Depuis Angular 20–22, les transitions CSS natives (`animate.enter`/`animate.leave` et CSS transitions avec `prefers-reduced-motion`) suffisent sans charger le runtime `@angular/animations`. |
| `Storybook` | **Différée** | Le Design System est documenté directement dans `frontend-angular/docs/DESIGN_SYSTEM.md` et testable via Vitest/Playwright ; Storybook pourra être ajouté ultérieurement si une équipe multi-projets partage les composants UI. |

---

## 3. Vérification de compatibilité Angular `22.2.x`

- `@angular/cdk@22.2.7` & `@angular/aria@22.2.7` : alignés sur `@angular/core ^22.0.0`.
- `@lucide/angular@1.74.0` : `peerDependencies` `@angular/core >= 17.0.0`.
- `ngx-sonner@3.1.0` : `peerDependencies` `@angular/core >= 19.0.0`.
- `leaflet@1.9.4` & `date-fns@4.4.0` : agnostiques au framework, zéro conflit PeerDependency.
