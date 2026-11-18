# Patrimoine du Sénégal — Frontend Angular v22

Refonte complète du frontend vers **Angular 22.2** (Standalone Components, Signals, Zoneless/OnPush, Typed Reactive Forms) avec Design System éditorial *« Terre, Mangrove & Lin »*.

> Le frontend React d'origine (`../frontend/`) reste intégralement conservé jusqu'à validation finale.

## Scripts disponibles

- `npm start` : démarre `ng serve` sur `http://localhost:4200` avec `proxy.conf.json` (`/api` → `http://localhost:8080`).
- `npm run build` : compile le bundle de production dans `dist/frontend-angular/browser`.
- `npm test` : exécute les tests unitaires et d'intégration HTTP sous **Vitest**.
- `npm run test:e2e` : exécute les tests E2E, responsive et accessibilité sous **Playwright**.

## Documentation détaillée

- [Design System](docs/DESIGN_SYSTEM.md)
- [Architecture Angular](docs/ARCHITECTURE.md)
- [Intégration API](docs/API_INTEGRATION.md)
- [Guide de déploiement & Docker](docs/DEPLOYMENT.md)
- [Rapport Qualité, Performance & Accessibilité](docs/RAPPORT_QUALITE_PERF_A11Y.md)
