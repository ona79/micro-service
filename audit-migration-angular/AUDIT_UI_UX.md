# AUDIT UI/UX ET DESIGN SYSTEM

Ce document analyse l'identité visuelle, l'ergonomie, le responsive design, l'accessibilité et les comportements UI/UX du frontend React afin de garantir une **continuité visuelle et comportementale exacte** dans Angular.

---

## 1. Identité visuelle et Design System (`tokens.css`)

Le design system repose intégralement sur des variables CSS (`frontend/src/styles/tokens.css`, 107 lignes). **Aucune couleur en dur n'est écrite dans les autres fichiers CSS** : c'est une force architecturale majeure qui facilitera une reprise à 100 % dans Angular.

### 1.1 Palette chromatique
- **Dominante Vert clair & Blanc** :
  - Fond page : `#f9fdf9` (`--color-bg-page`), Surfaces/Cartes : `#ffffff` (`--color-bg-surface`), Encadrés subtils : `#eff8f0`, Vert doux badges/placeholders : `#e0f2e2`.
  - Vert identitaire : `#a5d6a7` (`--color-green-main`), `#66bb6a` (medium), `#2e7d32` (dark — boutons principaux et liens), `#1b5e20` (deeper — titres et hover).
- **Accents chauds modérés** : sable `#fff8e1`, doré `#f9a825`, texte `#6d4c00` (`.badge--warm`).
- **Mode sobre « Lieu de mémoire »** : `#f1f5f2` fond, `#b0bec5` bordure, `#37474f` texte (`.card--sobre`, `.info-box--sobre`, `.memorial-notice`, `.badge--memorial`, `.patrimoine-image-fallback--sobre`).
  - Déclenché automatiquement via `isLieuDeMemoire()` lorsque `nomPatrimoine`, `codePatrimoine` ou `descriptionPatrimoine` contient l'un des mots-clés `['joola', 'esclaves', 'memorial', 'mémorial']`.
- **États feedback** : erreur (`#fdecea` / `#b71c1c`), succès (`#e8f5e9` / `#1b5e20`).

### 1.2 Typographie, rayons et ombres
- **Police** : `'Nunito'` (chargée via Google Fonts dans `index.html`), graisses `400, 600, 700, 800`, taille de base `16px`, interligne `1.65`.
- **Rayons** : cartes `16px` (`--radius-card`), conteneurs `12px`/`24px`, boutons & badges en pilule `9999px` (`--radius-pill`).
- **Conteneur** : largeur maximale `1200px` centrée (`.container`).

---

## 2. Hiérarchie de l'information et gabarits (Layouts)

1. **Shell global (`Layout.jsx` / `Layout.css`)** :
   - **Header sticky (`z-index: 50`)** : nom du site + slogan à gauche, barre de recherche pilule centrée, menu burger sur mobile (`<= 860px`), barre de navigation horizontale sur fond vert doux dessous (`Accueil`, `Patrimoines`, `Circuits`, `Événements`, `Réserver`).
   - **Footer 3 colonnes (`1.4fr 1fr 1.4fr`)** : présentation plateforme, liens rubriques, mention académique UASZ + bandeau inférieur.
2. **Page d'accueil (`HomePage.jsx`)** :
   - **Hero** (`min-height: 440px`) : image `/images/hero.jpg` + overlay dégradé vert (ou fallback dégradé doux si absente), carte centrale blanche contenant badge Teranga, `h1`, accroche, barre de recherche rapide et 3 boutons CTA.
   - **3 piliers éditoriaux** (`.home-pillars`) + **3 patrimoines en vedette** (`.cards-grid`).
3. **Pages catalogue (`PatrimoinesPage`, `CircuitsPage`, `EvenementsPage`)** :
   - En-tête dégradé (`.page-header`) + barre de filtres configurable (`FilterBar`) avec compteur de résultats et bouton « Réinitialiser les filtres » + grille responsive (`repeat(auto-fill, minmax(320px, 1fr))`).
4. **Pages détail (`PatrimoineDetailPage`, `CircuitDetailPage`, `EvenementDetailPage`)** :
   - Fil d'Ariane (`Breadcrumb`) + en-tête badges/titre + grille 2 colonnes (`.detail-layout` : `1fr 350px`) avec image `420px` de haut + légende + corps éditorial + `InfoBox` sticky à droite + section « À voir aussi » (3 cartes max) en bas.
   - Particularité `CircuitDetailPage` : liste numérotée `.circuit-steps` avec badge `Étape X`, lien vers chaque patrimoine et durée sur place.
5. **Page Réservation (`ReserverPage`)** :
   - Grille 2 colonnes (`440px 1fr`) : formulaire de création à gauche, liste des réservations avec bouton « Actualiser » et « Annuler la réservation » à droite.

---

## 3. Responsive Design et comportement mobile

Breakpoints observés dans les CSS :
- `960px` (`ReserverPage.css`) : passage du layout formulaire/liste en 1 colonne.
- `920px` (`global.css`) : `.detail-layout` passe en 1 colonne (l'`InfoBox` passe sous le contenu), hauteur image détail réduite de `420px` à `280px`.
- `860px` (`Layout.css`) : activation du menu burger, la barre de recherche passe en ligne 3 pleine largeur (`order: 3`), navigation empilée verticalement, footer en 1 colonne.
- `720px` (`FilterBar.css`) : le champ recherche ne s'étend plus sur 2 colonnes.
- `680px` (`Hero.css`) : barre de recherche Hero empilée verticalement.
- `600px` (`global.css`, `CircuitDetailPage.css`) : grille `.cards-grid` à `1fr`, `.circuit-step` en colonne.

---

## 4. États de chargement, d'erreur, vides et images

- **Chargement** : `Loader.jsx` affiche un spinner CSS animé dans un encadré `role="status"` `aria-live="polite"`.
- **Erreur** : `ErrorMessage.jsx` affiche un encadré rouge doux `role="alert"` avec bouton « Réessayer » optionnel.
- **État vide** : `EmptyState.jsx` affiche un encadré informatif avec bouton d'action (réinitialiser ou retour accueil).
- **Images absentes** : `PatrimoineImage.jsx` (`loading="lazy"`) et `Hero.jsx` gèrent élégamment `onError` sans icône d'image cassée (placeholder vert doux ou sobre avec code + nom). *Fait important* : aucune photo `.jpg` n'est livrée dans `frontend/public/images/`, les utilisateurs voient donc les placeholders par défaut.

---

## 5. Accessibilité & Lacunes UX identifiées

### Points positifs
- Balisage sémantique présent (`<header>`, `<nav>`, `<main>`, `<footer>`, `<article>`, `<aside>`, `<figure>`, `<figcaption>`, `<dl>/<dt>/<dd>`).
- Attributs ARIA corrects sur les éléments clés : `aria-label`, `aria-expanded` sur le burger, `aria-current="page"` sur `Breadcrumb`, `role="search"`, `role="alert"`, `role="status"`.
- Focus visible soigné sur boutons et champs (`.btn:focus-visible`, `:focus` avec `--shadow-focus`).

### Lacunes UX / Accessibilité à corriger lors de la migration Angular
1. **Absence de lien d'évitement (« Aller au contenu principal »)** en haut de `Layout`.
2. **Menu burger mobile** : ne se ferme pas sur touche `Escape` ni clic extérieur ; pas de gestion de focus.
3. **Absence de scroll-to-top** lors de la navigation vers une page de détail (risque de rester en milieu de page).
4. **Titre d'onglet (`<title>`) statique** : manque de mise à jour dynamique via le Router Angular (`TitleStrategy` / `title` sur les routes).
5. **Troncature description sans infobulle/indicateur** (`.card__description` coupe à 3 lignes avec `-webkit-line-clamp: 3`).
6. **Annulation immédiate sans confirmation** sur `ReserverPage` (clic sur « Annuler la réservation » appelle directement `PUT /annuler`) + erreur affichée dans la mauvaise colonne.
7. **Absence d'indication du nombre de places restantes** dans la liste déroulante des circuits/événements sur `/reserver` (seule la capacité maximale `placesMax`/`capaciteMax` est affichée, alors que le backend soustrait les places déjà réservées non annulées).
8. **Contraste à surveiller** : le texte `--color-text-muted` (`#6e7d71`) sur `--color-bg-subtle` (`#eff8f0`) ou `--color-bg-soft-green` (`#e0f2e2`) mérite un contrôle WCAG AA (`>= 4.5:1`) lors de la reprise des tokens.
