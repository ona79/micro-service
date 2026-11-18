# DESIGN SYSTEM — « CASAMANCE : PATRIMOINE VIVANT »
## Fondations Visuelles, Tokens & Architecture UI

> **Projet** : Plateforme de Valorisation du Patrimoine Touristique de la Casamance  
> **Institution** : Université Assane Seck de Ziguinchor (UASZ) — Licence 3 Informatique  
> **Version** : 1.0.0 (Phase P07.8 — Lot 1)  
> **Auteur** : Senior Frontend Architect & Design System Architect  

---

## 1. Direction Artistique : « Casamance — Patrimoine Vivant »

### 1.1 Philosophie & Intention Graphique
La Casamance est un territoire singulier où la majesté naturelle des mangroves et des bolongs rencontre la richesse millénaire des royaumes traditionnels (Oussouye, Bandial, Fogny) et l'intensité des lieux de mémoire (Ziguinchor, Carabane).

La direction artistique **« Casamance — Patrimoine Vivant »** s'éloigne délibérément du folklore décoratif ou de l'exotisme superficiel pour adopter une esthétique **moderne, éditoriale, immersive et fonctionnelle** :
- **Authenticité & Nature** : Des teintes organiques évoquant l'eau saumâtre des mangroves, la terre latéritique rougeoyante et les toitures de chaume des cases à impluvium.
- **Clarté & Sérénité** : Des fonds chaleureux de lin naturel qui reposent le regard et rappellent le papier d'art et les carnets de voyage.
- **Rigueur & Fiabilité** : Une typographie d'interface hautement lisible, des contrastes respectant les normes d'accessibilité internationales (WCAG 2.2 niveau AA), et une structure modulaire adaptée à la fois au voyageur découvrant la région et au professionnel gérant son activité quotidienne.

### 1.2 Dualité Visuelle : Espace Touristique vs Espace Professionnel
Le Design System orchestre une distinction claire entre deux univers complémentaires :
1. **L'Univers Touristique & Public (Découverte & Émotion)** :
   - Fond éditorial lin naturel (`--color-surface-lin`), titrages expressifs en police serif (*Fraunces*), photographies de patrimoine valorisées, cartographie interactive et parcours guidés.
2. **L'Univers Professionnel & Back-Office (Rigueur & Efficacité)** :
   - Surfaces épurées blanches (`--color-surface-white`), barre latérale contrastée vert mangrove (`--color-brand-mangrove`), densité d'information optimisée, tableaux de données adaptatifs et barres d'outils contextuelles avec fil d'Ariane.

---

## 2. Palette de Couleurs & Ratios de Contraste

Toutes les couleurs ont été sélectionnées et testées pour satisfaire les critères de succès **WCAG 2.2 AA** (ratio minimum de **4.5:1** pour le texte normal et **3.0:1** pour le texte de grande taille et les composants interactifs).

### 2.1 Couleurs Identitaires de Marque

| Nom du Token | Valeur Hex | Usage Principal | Rôle Ergonomique |
| :--- | :--- | :--- | :--- |
| `--color-brand-mangrove` | `#153D30` | Navigation principale, en-têtes pro, titres d'autorité | Ancrage institutionnel fort |
| `--color-brand-forest` | `#28634B` | Boutons d'action principaux, liens actifs, états sélectionnés | Appel à l'action affirmé |
| `--color-brand-forest-hover` | `#1E4E3A` | Survol et focus des actions principales | Retour d'interaction net |
| `--color-brand-laterite` | `#C36B45` | Accents culturels, marqueurs circuits, badges découverte | Énergie et ancrage territorial |
| `--color-brand-laterite-dark`| `#944622` | Texte latérite sur fond clair (contraste 5.1:1 sur lin) | Lisibilité textuelle latérite |
| `--color-brand-ochre` | `#D6A85D` | Étoiles de notation, repères temporels, accents dorés | Valorisation patrimoniale |
| `--color-brand-ochre-dark` | `#7A4B08` | Texte ocre sur fond clair (contraste 5.8:1 sur lin) | Lisibilité textuelle ocre |

### 2.2 Surfaces, Fonds & Textes

| Nom du Token | Valeur Hex | Ratio vs Lin (`#F5F0E5`) | Ratio vs Blanc (`#FFFFFF`) | Conformation WCAG |
| :--- | :--- | :--- | :--- | :--- |
| `--color-surface-lin` | `#F5F0E5` | Surface de référence | - | Fond éditorial chaleureux |
| `--color-surface-white` | `#FFFFFF` | - | Surface de référence | Cartes, tables, formulaires |
| `--color-text-primary` | `#161F1B` | **14.5:1** | **16.5:1** | Niveau AAA (Excellence) |
| `--color-text-secondary`| `#3D4942` | **6.8:1** | **7.3:1** | Niveau AA (Supérieur à 4.5:1) |
| `--color-text-muted` | `#5A665E` | **4.6:1** | **4.9:1** | Niveau AA (Supérieur à 4.5:1) |
| `--color-border-subtle` | `#E2DAC9` | Séparateur doux | 1.3:1 | Délimitation légère |
| `--color-border-strong` | `#C2B5A0` | Bordure de contrôle | 2.1:1 | Champs, boutons secondaires |

### 2.3 Couleurs Sémantiques & États d'Action

| Sémantique | Fond (`-bg`) | Bordure (`-border`) | Encre / Texte (`-ink`) | Ratio Encre / Fond |
| :--- | :--- | :--- | :--- | :--- |
| **Succès** (Validé, Payé, Confirmé) | `#DCF2E5` | `#8BC6A3` | `#135035` | **7.4:1** (AAA) |
| **Avertissement** (En attente, Simulation) | `#FEF3D6` | `#E7C87E` | `#7A4B08` | **6.2:1** (AA) |
| **Erreur** (Rejeté, Annulé, Expiré) | `#FDE8E6` | `#E8ADA7` | `#92231C` | **6.9:1** (AA) |
| **Information** (Guides, Données neutres) | `#E1F0F8` | `#8EC5E2` | `#154C6D` | **7.1:1** (AAA) |

---

## 3. Typographie

### 3.1 Familles de Polices
1. **Police Éditoriale Display** : `'Fraunces', Georgia, 'Times New Roman', serif`
   - Utilisée pour : Les titres de niveau `h1`, `h2`, `h3`, les bannières patrimoniales, les citations culturelles.
   - Propriétés : Serif contemporain à empattements doux et expressifs, conférant prestige et profondeur historique.
2. **Police d'Interface (UI Sans)** : `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
   - Utilisée pour : Navigation, formulaires, tableaux, boutons, cartes, corps de texte.
   - Propriétés : Géométrie humaniste, excellente distinction des glyphes (notamment `I`, `l`, `1`), hauteur d'x généreuse pour un confort de lecture optimal sur écran mobile.
3. **Police Monospace** : `'JetBrains Mono', 'Fira Code', 'Courier New', monospace`
   - Utilisée pour : Numéros de billets, tokens QR cryptographiques, identifiants de transaction, montants financiers en variante tabulaire (`.tabular-nums`).

### 3.2 Échelle Typographique

| Nom du Token | Taille (rem / px) | Line Height | Usage Type |
| :--- | :--- | :--- | :--- |
| `--text-xs` | 0.75rem (12px) | 1.35 | Badges, tags, métadonnées, légendes sous-champs |
| `--text-sm` | 0.875rem (14px) | 1.45 | Boutons secondaires, cellules de table, formulaires |
| `--text-base` | 1.00rem (16px) | 1.60 | Corps de texte standard, paragraphes de lecture |
| `--text-md` | 1.125rem (18px) | 1.50 | Sous-titres éditoriaux, introductions |
| `--text-lg` | 1.25rem (20px) | 1.35 | Titres de cartes, rubriques secondaires (`h3`) |
| `--text-xl` | 1.50rem (24px) | 1.30 | Titres de sections (`h2`), KPI metrics |
| `--text-2xl` | 1.875rem (30px) | 1.25 | Titres de pages back-office, en-têtes d'espace |
| `--text-3xl` | 2.25rem (36px) | 1.20 | Grands titres d'articles ou de fiches détails |
| `--text-4xl` | `clamp(2.2rem, 4.5vw, 3.25rem)` | 1.15 | Hero banner d'accueil (adaptatif mobile/desktop) |

---

## 4. Système d'Espacement & Grille

L'échelle d'espacement repose sur un système modulaire basé sur un pas de **4px** / **8px** :

```
--space-1  : 0.25rem (4px)   -> Micro-espacement interne d'icônes ou puces
--space-2  : 0.50rem (8px)   -> Espacement entre libellé et contrôle, gap compact
--space-3  : 0.75rem (12px)  -> Rembourrage interne de contrôles compacts (sm)
--space-4  : 1.00rem (16px)  -> Gouttière standard de formulaires et de listes
--space-5  : 1.25rem (20px)  -> Rembourrage standard des cartes et panneaux
--space-6  : 1.50rem (24px)  -> Marges de sous-sections, headers de modales
--space-8  : 2.00rem (32px)  -> Marges majeures entre blocs de contenu
--space-10 : 2.50rem (40px)  -> Respirations entre sections éditoriales
--space-12 : 3.00rem (48px)  -> Marge basse des grands héros
--space-16 : 4.00rem (64px)  -> Séparations inter-sections desktop
```

---

## 5. Rayons de Courbure (Border Radii)

| Token | Rayon (px) | Application |
| :--- | :--- | :--- |
| `--radius-xs` | 4px | Puces de statut, sous-indicateurs, tooltips |
| `--radius-sm` | 8px | Contrôles de formulaires (inputs, selects), boutons compacts |
| `--radius-md` | 12px | Panneaux, conteneurs de tableaux, drawers |
| `--radius-lg` | 16px | Cartes patrimoniales, modales de confirmation |
| `--radius-xl` | 24px | Conteneurs héros arrondis |
| `--radius-card`| 14px | Rayon universel des cartes de contenu |
| `--radius-pill`| 9999px | Boutons d'action, badges de statut, chips utilisateurs |

---

## 6. Élévation & Ombres Portées

Les ombres imitent la lumière naturelle et progressive sans assombrir artificiellement les interfaces :
- `--shadow-xs` : `0 1px 2px rgba(22, 31, 27, 0.05)` (subtile séparation de surface)
- `--shadow-sm` : `0 2px 8px rgba(22, 31, 27, 0.06)` (boutons et éléments survolables)
- `--shadow-md` : `0 6px 20px rgba(22, 31, 27, 0.08)` (cartes élevées, dropdowns, menus)
- `--shadow-lg` : `0 12px 32px rgba(21, 61, 48, 0.12)` (modales, tiroirs latéraux)
- `--shadow-focus` : `0 0 0 3px rgba(40, 99, 75, 0.32)` (anneau de focalisation accessible vert forêt)
- `--shadow-focus-danger` : `0 0 0 3px rgba(146, 35, 28, 0.28)` (anneau de focalisation d'erreur)

---

## 7. Système d'Iconographie

- **Bibliothèque unique** : `@lucide/angular` (icônes vectorielles SVG cohérentes, modernes, légères).
- **Règles d'intégration** :
  - Chaque icône purement décorative porte `aria-hidden="true"`.
  - Toute icône interactive sans texte explicite possède obligatoirement `aria-label` ou `title`.
  - Les dimensions standards sont calibrées : `14px` (micro/badges), `16px` (boutons/menus), `20px` (titres/en-têtes), `24px` (cartes/illustrations).

---

## 8. Breakpoints & Règles Responsive

Le Design System est rigoureusement responsive dès sa conception :
- **Mobile standard** (`390px` à `479px`) : Affichage plein écran sans débordement horizontal, transformation des tableaux denses en cartes empilées (`.ui-table--card-mobile`), navigation par drawer tactile.
- **Mobile large** (`480px` à `767px`) : Formulaires en grille simple colonne, boutons pleine largeur ou flex wrap.
- **Tablette portrait** (`768px` à `1023px`) : Sidebar escamotable avec overlay, grilles de 2 colonnes pour les catalogues.
- **Desktop standard** (`1024px` à `1439px`) : Sidebar déployée fixe, layout 3 colonnes pour les catalogues, vue tabulaire classique pour le back-office.
- **Grand écran** (`1440px` et plus) : Conteneur centré borné à 1240px (public) et 1440px (pro), typographie stabilisée.

---

## 9. Animation & Respect du Mouvement Réduit

- **Transitions standards** : `150ms` à `240ms` avec courbe d'accélération naturelle `cubic-bezier(0.2, 0.9, 0.3, 1)`.
- **Préférence Utilisateur (Reduced Motion)** :
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
