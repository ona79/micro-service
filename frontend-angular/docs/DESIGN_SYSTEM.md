# DESIGN SYSTEM — « CASAMANCE : MANGROVE, LATÉRITE & LIN » (P06)

## 1. Palette & Tokens (`src/styles/tokens.css`)

| Famille | Tokens principaux | Valeurs / Rôle |
|---|---|---|
| **Palette Casamance** | `--brand-primary`, `--accent-terracotta`, `--accent-ochre-gold`, `--accent-ochre`, `--surface-sand` | `#245B45` (Vert mangrove), `#B75F3B` (Terre latérite), `#D9A441` (Ocre doré décoratif), `#82560C` (Ocre texte >= 4.5:1), `#F1EBDD` (Lin naturel) |
| **Surfaces** | `--surface-canvas`, `--surface-elevated`, `--surface-forest` | `#FAF7F0` (Lin clair), `#FFFFFF`, `#173D2D` (Mangrove sombre) |
| **Encres** | `--ink-primary`, `--ink-secondary`, `--ink-muted`, `--ink-on-dark` | `#1C1B18`, `#444038`, `#5E584E`, `#FAF7F0` |
| **Lieux de mémoire** | `--memorial-bg`, `--memorial-border`, `--memorial-ink` | Traitement sobre dédié aux sites mémoriels (ex. *Mémorial du Joola* `PAT-ZIG-001`) |
| **Typographie** | `--font-display`, `--font-sans` | `Fraunces` (titres éditoriaux) + `Plus Jakarta Sans` (interface lisible), `.tabular-nums` sur tous les chiffres/prix |

## 2. Composants partagés P06 (`src/app/shared/`)

- `SeoService` & `PageTitleStrategy` : mise à jour dynamique par route et par fiche de `<title>`, `<meta name="description">`, `og:*` et `<link rel="canonical">`.
- `DateFrPipe` & `parseDakarIsoDate` : formatage français homogène calé sur `Africa/Dakar` (support complet `dd`, `MMM yyyy`, `date`, `d MMM yyyy`, `datetime`).
- `UiPatrimoineImageComponent` : résolution d'actifs locaux Casamance (`/images/patrimoines/PAT-*.jpg` / `.svg`) et normalisation des URLs de migration `/assets/patrimoines/*`, avec `aspect-ratio: 16/10` limitant le CLS et `sobriete` pour lieux mémoriels.
- `UiHeritageMapComponent` : carte Leaflet lazy-loadée avec marqueurs différenciés et tracé polyligne d'itinéraires.
- `UiAvisSectionComponent` : résumés batch, dépôt d'avis vérifié et signalement.
- `UiConfirmDialogComponent`, `UiErrorBannerComponent`, `UiEmptyStateComponent`, `UiSkeletonGridComponent`.

## 3. Accessibilité (WCAG 2.2 AA)

- Skip-link `#main-content`, un seul `<h1>` par vue, landmarks (`header`, `nav`, `main`, `footer`, `aside`).
- Navigation clavier sur barres d'onglets/vues (`ngToolbar`), focus visible (`:focus-visible`), piège de focus CDK pour les modales.
- Respect de `@media (prefers-reduced-motion: reduce)`.
