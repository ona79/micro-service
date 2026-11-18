# DIRECTIVES D'INTÉGRATION RESPONSIVE & MOBILE-FIRST
## Plateforme Casamance Patrimoine (Phase P07.8 — Lot 1)

Ce guide définit les règles d'architecture CSS et ergonomiques à appliquer sur l'ensemble de la plateforme pour garantir une consultation fluide et sans régression sur les quatre résolutions cibles : **390 px (mobile)**, **768 px (tablette portrait)**, **1024 px (tablette paysage / desktop portable)** et **1440 px (desktop large)**.

---

## 1. Grille des Breakpoints Officiels

| Identifiant CSS | Largeur Minimale | Appareils Types | Stratégie d'Affichage |
| :--- | :--- | :--- | :--- |
| `--bp-mobile` | `390px` | iPhone 12/13/14, Pixel standard | 1 colonne, contrôles tactiles min 44px, tableaux transformés en cartes |
| `--bp-mobile-large` | `480px` | Grands smartphones, phablettes | Grilles simples, formulaires 1 colonne, marges latérales réduites (16px) |
| `--bp-tablet` | `768px` | iPad portrait, tablettes Android | Grilles 2 colonnes, sidebar escamotable en drawer, menu burger public |
| `--bp-desktop` | `1024px` | iPad paysage, ordinateurs portables | Sidebar fixe pro (280px), grilles 3 colonnes, tables tabulaires actives |
| `--bp-wide` | `1440px` | Écrans de bureau 24"+, iMac | Conteneur borné (1240px public / 1440px pro), espaces aérés |

---

## 2. Règles par Composant d'Interface

### 2.1 Navigation & En-Têtes (Headers)
- **Sous 768 px** :
  - La navigation horizontale par onglets se replie dans un tiroir latéral accessible (drawer mobile).
  - Le déclencheur burger dispose d'un carré tactile minimal de **44 × 44 px** (`ui-btn--icon`).
  - L'ouverture du menu capture le focus, active un fond assombri (`.pro-backdrop`) et se ferme systématiquement lors de l'appui sur la touche **Échap** ou lors d'un clic sur un lien de navigation.
- **Au-dessus de 768 px** :
  - Navigation horizontale déployée (`.nav-desktop`), barre de recherche rapide intégrée dans le header avec bouton de soumission accessible.

### 2.2 Tableaux de Données (Back-Office & Manifestes)
L'audit visuel P07.7 a révélé que les tableaux administratifs classiques (ex: gestion des utilisateurs, suivi des paiements, manifestes de passagers) souffraient d'un défilement horizontal malaisé sur mobile.

**Règle d'or du Lot 1** :
- Sur desktop et tablette paysage (`>= 769px`), les tableaux s'affichent sous forme tabulaire conventionnelle (`.ui-table`).
- Sous `768px`, la classe `.ui-table--card-mobile` métamorphose le tableau :
  - L'élément `<thead>` est masqué graphiquement (`display: none`).
  - Chaque ligne `<tr>` devient un bloc isolé stylisé comme une carte (`border-radius: 12px`, fond blanc, ombre légère).
  - Chaque cellule `<td>` devient une ligne clé/valeur : le libellé de colonne est injecté automatiquement via le pseudo-élément CSS `td::before { content: attr(data-label); font-weight: 700; color: var(--color-text-muted); }`.
  - Aucune information métier n'est supprimée ou masquée : l'intégralité des données et actions reste visible et maniable au pouce.

### 2.3 Formulaires & Contrôles
- **Sous 640 px** :
  - Toutes les grilles de formulaires à deux colonnes (`.bo-form-grid`) basculent obligatoirement sur une seule colonne pleine largeur (`grid-template-columns: 1fr`).
  - Les contrôles de saisie (inputs, selects, textareas) conservent une hauteur tactile minimale de **42 px** (`--control-height-md`) pour éviter tout zoom intempestif sur mobile iOS.
  - Les boutons d'action du formulaire (soumettre, annuler) s'étirent sur toute la largeur ou s'empilent verticalement.

### 2.4 Cartes de Patrimoines, Circuits & Événements
- La disposition repose sur des grilles CSS Grid auto-adaptatives :
  ```css
  .catalog-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-5);
  }
  ```
- Sur mobile (`390px`), chaque carte occupe naturellement la largeur totale du conteneur (`1fr`), offrant une photographie d'accroche généreuse et des textes parfaitement aérés.

### 2.5 Cartographie Interactive (Leaflet)
- Sur mobile (`390px`), la carte interactive intégrée dans les pages de recherche et de détail doit avoir une hauteur bornée (`min-height: 280px`, `max-height: 380px`) pour éviter de bloquer le défilement vertical de la page.
- Le scroll tactile doit comporter un bouton d'interaction explicite pour activer le déplacement sur la carte, ou des boutons de zoom `+` / `-` largement espacés.

---

## 3. Checklist de Validation Responsive pour Chaque Écran

Avant de valider une interface, s'assurer des 6 points suivants :
1. **Zéro scroll horizontal non désiré** : La largeur de l'élément racine ne doit jamais excéder `100vw` (aucun débordement de texte ou de conteneur).
2. **Cibles tactiles conformes** : Tous les boutons, liens d'icône et puces cliquables mesurent au moins **44 × 44 px** (ou disposent d'un padding étendant la zone cliquable).
3. **Typographie lisible sans zoom** : La taille minimale du texte courant est de **14 px** (`--text-sm`) et les métadonnées de **12 px** (`--text-xs`).
4. **Formulaires fluides** : Les champs occupent 100% de la largeur utile sur écran inférieur à 480px.
5. **Modales et tiroirs** : Les boîtes de dialogue et fenêtres de détail s'affichent en plein écran ou tiroir bas (*bottom sheet*) sur mobile, avec bouton de fermeture clairement visible en haut à droite.
6. **Images réactives** : Toutes les balises `<img>` portent la règle `max-width: 100%; height: auto; display: block;` évitant toute distorsion d'aspect ratio.
