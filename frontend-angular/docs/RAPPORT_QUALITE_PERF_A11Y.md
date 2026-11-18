# RAPPORT QUALITÉ, COUVERTURE, PERFORMANCE ET ACCESSIBILITÉ

## 1. Couverture fonctionnelle (Parité React + Améliorations UX)

| Parcours | Statut | Détails |
|---|---|---|
| Accueil (`/`) | **Opérationnel** | Hero éditorial asymétrique, recherche rapide, compteurs réels API, sélection patrimoniale |
| Patrimoines (`/patrimoines`, `/patrimoines/:id`) | **Opérationnel** | Catalogue + Vue Carte Leaflet interactive, synchro bidirectionnelle `?q=`, mode sobre lieu de mémoire, croisements circuits/événements |
| Circuits (`/circuits`, `/circuits/:id`) | **Opérationnel** | Carnet d'itinéraires, filtres, carte polyline Leaflet des étapes ordonnées, timeline |
| Événements (`/evenements`, `/evenements/:id`) | **Opérationnel** | Agenda daté, puces de filtrage `@angular/aria`, héritage mode sobre, carte lieu |
| Réservations (`/reserver`) | **Opérationnel** | Formulaire réactif typé, estimation montant en direct, registre filtrable, modale confirmation `@angular/cdk/dialog`, toasts `ngx-sonner`, séparation `submitError`/`cancelError` |
| Page 404 (`**`) | **Opérationnel** | État vide guidé avec retour accueil |

## 2. Performance et Bundles

- Lazy loading sur l'ensemble des 9 routes (`app.routes.ts`), isolant également Leaflet dans un chunk différé.
- `PatrimoineStore.ensureLoaded()` évite les appels redondants à `GET /api/patrimoines` entre pages.
- `optimization.fonts: false` garantit des builds reproductibles sans dépendance réseau externe.

## 3. Accessibilité (WCAG 2.2 AA)

- Skip-link `#main-content`, hiérarchie de titres `h1` unique par vue, landmarks (`header`, `nav`, `main`, `footer`, `aside`).
- `PageTitleStrategy` met à jour dynamiquement `<title>` à chaque navigation.
- `@angular/cdk/dialog` gère piège de focus, `aria-modal="true"` et touche `Escape`.
- `@angular/aria/toolbar` fournit la navigation clavier sur les barres de filtres/bascule.
- Respect de `@media (prefers-reduced-motion: reduce)`.
