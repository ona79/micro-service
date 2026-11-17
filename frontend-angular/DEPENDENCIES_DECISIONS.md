# DÉCISIONS SUR LES BIBLIOTHÈQUES ET DÉPENDANCES (`DEPENDENCIES_DECISIONS.md`)

**Phase 3 — Évaluation et sélection raisonnée de l'écosystème Angular v22**  
**Socle cible** : Angular `22.2.x` (Node.js `26.12.0`, TypeScript `6.0.2`)

---

## 1. Bibliothèques retenues

| Catégorie | Bibliothèque | Version installée | Licence | Poids / Impact bundle | Justification métier & technique |
|---|---|---|---|---|---|
| **Accessibilité & Primitives UI** | `@angular/cdk` | `22.2.7` | MIT | Faible (tree-shakeable : `Dialog`) | Fournit `Dialog` (`FocusTrap`, gestion `Escape`, `aria-modal`, restauration du focus) pour la modale de confirmation d'annulation de réservation. |
| **Primitives WAI-ARIA** | `@angular/aria` | `22.2.7` | MIT | Très faible (headless) | Stabilisé en Angular v22. Directives WAI-ARIA (`Toolbar`, `ToolbarWidget`) pour la navigation clavier accessible des barres de filtres et bascules d'affichage. |
| **Icônes** | `@lucide/angular` | `1.74.0` | ISC | Tree-shakeable (~1–2 Ko par icône) | Successeur officiel de `lucide-angular`. Composants SVG standalone compatibles Signals & Zoneless Angular 22. |
| **Cartographie** | `leaflet` + `@types/leaflet` | `1.9.4` / `1.9.22` | BSD-2-Clause | ~38.8 Ko gzip (chunk lazy séparé) | `ms-patrimoine` fournit de vraies coordonnées GPS (`latitudePatrimoine`, `longitudePatrimoine`). Permet d'afficher les sites sur carte OpenStreetMap et de tracer les itinéraires (`L.polyline`) des circuits multi-étapes sans clé API payante. |
| **Notifications Toast** | `ngx-sonner` | `3.1.0` | MIT | Très léger (~5 Ko) | Compatible Angular `>= 19` (Signals/Zoneless). Retour non bloquant immédiat pour les créations/annulations de réservations. |
| **Dates & Localisation** | `date-fns` | `4.4.0` | MIT | Tree-shakeable (locale `fr`) | Formatage fiable des `LocalDateTime` ISO-8601 backend et comparaisons de dates sans décalage de fuseau horaire. |
| **Tests unitaires & composants** | `vitest` + `jsdom` | `5.x` / `30.x` | MIT | Dev only | Runner officiel par défaut d'Angular v22 (`@angular/build:unit-test`), intégré avec `TestBed` et `HttpTestingController`. |
| **Tests E2E, Responsive & A11y** | `@playwright/test` | `1.65.1` | Apache-2.0 | Dev only | Vérifie les parcours complets dans Chromium sur desktop (`1280px`) et mobile (`375px`). |

---

## 2. Bibliothèques évaluées et écartées

| Bibliothèque évaluée | Décision | Justification |
|---|---|---|
| `lucide-angular` (non-scopé) | **Écartée** | Paquet hérité/déprécié au profit de `@lucide/angular`. |
| `maplibre-gl` | **Écartée** | Nettement plus lourd (~220+ Ko gzip) pour de simples marqueurs patrimoniaux et polylignes OSM. |
| `echarts` / `chart.js` | **Écartée** | Aucune série temporelle ou métrique analytique dans les API backend ; évite tout dashboard artificiel. |
| `ag-grid` / `@tanstack/angular-table` | **Écartée** | Surdimensionnées pour des catalogues éditoriaux et un registre de réservations responsive. |
| `tiptap` | **Écartée** | Aucune édition de texte riche côté client dans le périmètre actuel. |
| `zod` | **Écartée** | Les Typed Reactive Forms d'Angular + interfaces TypeScript strictes couvrent nativement les validations `@Valid`. |
| `Storybook` | **Différée** | Le Design System est documenté dans `docs/DESIGN_SYSTEM.md` et testé sous Vitest/Playwright sans alourdir `node_modules`. |
