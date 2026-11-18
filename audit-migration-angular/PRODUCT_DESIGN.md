# PRODUCT DESIGN & DIRECTION ARTISTIQUE — PATRIMOINE DU SÉNÉGAL

**Phase 1 & 2 — Conception Produit, Identité Visuelle et Refonte UX/UI**

---

## 1. Compréhension du produit et des utilisateurs

### Utilisateurs cibles
1. **Visiteurs & Touristes (locaux et internationaux)** : souhaitent découvrir les sites patrimoniaux du Sénégal, les situer géographiquement, comparer les circuits (durée, distance, difficulté, tarif), consulter les événements culturels et réserver des places simplement.
2. **Public attaché à l'histoire et à la mémoire** : recherche des repères historiques clairs dans un cadre respectueux et sobre pour les lieux de mémoire (Maison des Esclaves de Gorée, Mémorial du Joola).
3. **Gestionnaires / Évaluateurs** : utilisent la page `/reserver` comme registre opérationnel pour créer, suivre et annuler des réservations réelles.

### Problèmes UX corrigés par rapport au frontend React
1. **Absence de visualisation géographique réelle** : React possédait les coordonnées GPS (`latitudePatrimoine`, `longitudePatrimoine`) mais se contentait d'un lien externe texte. La refonte intègre **Leaflet** pour situer les sites et tracer les itinéraires des circuits étape par étape.
2. **Pages catalogue et détail trop uniformes** : React utilisait la même grille générique pour Patrimoines, Circuits et Événements. Chaque domaine reçoit désormais une composition adaptée à son usage métier (archive avec vue carte pour les patrimoines, carnet d'itinéraires pour les circuits, agenda daté pour les événements, comptoir de réservation avec estimation en direct pour `/reserver`).
3. **Défauts fonctionnels identifiés dans l'audit** :
   - Désynchronisation de `?q=` sur `/patrimoines`.
   - Erreur d'annulation affichée dans le formulaire de création sur `/reserver`.
   - Annulation sans confirmation préalable.
   - Absence de titre de page dynamique et de retour en haut lors des transitions de route.

---

## 2. Direction Artistique : « Terre, Mangrove & Lin »

Une identité éditoriale sénégalaise chaleureuse, inspirée de la pierre de Gorée, de la latérite et des paysages verts de Casamance, rompant avec l'esthétique SaaS générique.

### Palette & Tokens
- **Fonds papier/lin** : `#FAF7F2` (`--surface-canvas`), `#FFFFFF` (`--surface-elevated`), `#F2EDE4` (`--surface-sand`), `#163828` (`--surface-forest` pour ancrages éditoriaux et footer).
- **Encres contrastées (WCAG AA >= 4.5:1)** : `#1C1B18` (`--ink-primary`), `#4A463F` (`--ink-secondary`), `#635D53` (`--ink-muted`).
- **Vert Casamance (action principale)** : `#1F5138` (`--brand-primary`), `#143826` (`--brand-primary-hover`), `#E3EFE7` (`--brand-soft`).
- **Terre cuite / Latérite (accent culturel modéré)** : `#B24C29` (`--accent-terracotta`), `#F9ECE7` (`--accent-terracotta-soft`).
- **Ocre doux** : `#8A5A10` / `#FDF4E3`.
- **Registre sobre « Lieu de mémoire »** : `#EEF0F2` fond ardoise, `#9AA5B1` bordure, `#2D3748` texte — activé automatiquement via `isLieuDeMemoire()`.

### Typographie
- **Titres** : `Fraunces` (serif éditorial chaleureux).
- **Interface & corps** : `Plus Jakarta Sans` (lisibilité nette, `font-variant-numeric: tabular-nums` pour les prix en FCFA, durées, distances et coordonnées).

---

## 3. Compositions distinctes par écran

| Route | Composition UX spécifique |
|---|---|
| `/` (Accueil) | Hero éditorial 2 colonnes avec aperçu géographique réel des sites API + index réel des rubriques + mise en avant asymétrique des patrimoines |
| `/patrimoines` | Archive culturelle avec bascule **Grille / Carte interactive (Leaflet)** + barre de filtres synchronisée avec `?q=` |
| `/patrimoines/:id` | Monographie culturelle : récit, repères historiques, notice mémorielle si applicable, carte Leaflet intégrée, encadré pratique et liste réelle des circuits/événements passant par ce site |
| `/circuits` | Carnet d'itinéraires : lignes/cartes horizontales affichant la chaîne ordonnée des étapes (`1 → 2 → 3`), difficulté, durée, distance Haversine, tarif FCFA |
| `/circuits/:id` | Split **Timeline verticale des étapes** + **Carte Leaflet avec tracé polyline réel entre les étapes** + encadré réservation |
| `/evenements` | Agenda culturel : chips filtrantes par type d'événement (`@angular/aria` / `aria-pressed`), filtre date minimale, blocs date Jour/Mois |
| `/evenements/:id` | Fiche programme : bandeau horaire, lien vers le site hôte + carte Leaflet, mode sobre hérité si lieu de mémoire |
| `/reserver` | Comptoir de réservation 2 colonnes : configurateur avec estimation montant en direct à gauche + registre filtrable avec modale de confirmation d'annulation (`@angular/cdk/dialog`) et notifications toast (`ngx-sonner`) à droite |
