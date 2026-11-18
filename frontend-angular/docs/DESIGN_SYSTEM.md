# DESIGN SYSTEM — « TERRE, MANGROVE & LIN »

## 1. Tokens (`src/styles/tokens.css`)

| Famille | Tokens principaux | Valeurs / Rôle |
|---|---|---|
| **Surfaces** | `--surface-canvas`, `--surface-elevated`, `--surface-sand`, `--surface-forest` | `#faf7f2`, `#ffffff`, `#f2ede4`, `#163828` |
| **Encres** | `--ink-primary`, `--ink-secondary`, `--ink-muted`, `--ink-on-dark` | `#1c1b18`, `#4a463f`, `#635d53`, `#faf7f2` |
| **Marque** | `--brand-primary`, `--brand-primary-hover`, `--brand-soft` | `#1f5138`, `#143826`, `#e3efe7` |
| **Accents** | `--accent-terracotta`, `--accent-ochre` | `#b24c29` (latérite), `#8a5a10` (ocre) |
| **Lieux de mémoire** | `--memorial-surface`, `--memorial-border`, `--memorial-ink` | `#eef0f2`, `#9aa5b1`, `#2d3748` |
| **États** | `--status-success-*`, `--status-error-*`, `--status-warning-*` | Contrastes WCAG AA >= 4.5:1 |
| **Typographie** | `--font-display`, `--font-sans`, `--text-xs` .. `--text-3xl` | `Fraunces` (titres) + `Plus Jakarta Sans` (UI) |
| **Espacements & Rayons** | `--space-1`..`--space-12`, `--radius-xs`..`--radius-pill` | Échelle 4px, cartes 16px, pilules 9999px |

## 2. Composants partagés (`src/app/shared/components/`)

- `UiBreadcrumbComponent` : fil d'Ariane avec `aria-current="page"` et icône `LucideChevronRight`.
- `UiErrorBannerComponent` : bannière d'erreur `role="alert"` avec bouton « Réessayer ».
- `UiEmptyStateComponent` : état vide explicite avec action contextuelle.
- `UiSkeletonGridComponent` : chargement progressif `role="status"` (`cards` ou `rows`).
- `UiPatrimoineImageComponent` : chargement lazy de `/images/patrimoines/<code>.jpg` avec plaque architecturale de repli (`sobriete` pris en charge).
- `UiConfirmDialogComponent` : modale accessible (`@angular/cdk/dialog`, `aria-modal="true"`, `Escape`, piège focus).
- `UiHeritageMapComponent` : carte Leaflet interactive (marqueurs personnalisés, popups DOM sécurisés, polylignes pour les circuits).

## 3. Accessibilité & Mouvement réduit

- Lien d'évitement `.skip-link` vers `#main-content`.
- `@media (prefers-reduced-motion: reduce)` dans `src/styles/global.css`.
- Primitives `@angular/aria/toolbar` (`ngToolbar` / `ngToolbarWidget`) pour les sélecteurs et filtres à puces.
