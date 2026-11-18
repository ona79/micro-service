# DIRECTIVES D'ACCESSIBILITÉ NUMÉRIQUE (WCAG 2.2 AA)
## Référentiel pour la Plateforme Touristique de la Casamance (Lot 1)

Ce document formalise les exigences d'accessibilité numérique applicables à l'ensemble du code frontend (templates HTML, styles CSS/SCSS, composants Angular). L'objectif est de garantir une conformité stricte au niveau **AA des Web Content Accessibility Guidelines (WCAG 2.2)**.

---

## 1. Contrastes Typographiques & Visuels

### 1.1 Ratios Obligatoires
- **Texte normal (< 18pt / 24px ou < 14pt / 18.5px gras)** : Ratio de contraste minimal de **4.5:1** contre son arrière-plan.
- **Texte de grande taille (>= 18pt / 24px ou >= 14pt / 18.5px gras)** : Ratio minimal de **3.0:1**.
- **Composants d'interface & Éléments graphiques signifiants** (bordures d'inputs, icônes fonctionnelles, puces) : Ratio minimal de **3.0:1**.

### 1.2 Table de Vérification des Ratios du Design System
| Élément Graphique | Couleur de Texte | Couleur d'Arrière-Plan | Ratio Obtenu | Statut WCAG |
| :--- | :--- | :--- | :--- | :--- |
| **Texte Principal sur Lin** | `#161F1B` | `#F5F0E5` | **14.5:1** | **Conforme AAA** |
| **Texte Principal sur Blanc**| `#161F1B` | `#FFFFFF` | **16.5:1** | **Conforme AAA** |
| **Texte Secondaire sur Lin** | `#3D4942` | `#F5F0E5` | **6.8:1** | **Conforme AA (Excellence)** |
| **Texte Secondaire sur Blanc**| `#3D4942` | `#FFFFFF` | **7.3:1** | **Conforme AA (Excellence)** |
| **Texte Muted sur Blanc** | `#5A665E` | `#FFFFFF` | **4.9:1** | **Conforme AA** |
| **Texte Muted sur Lin** | `#5A665E` | `#F5F0E5` | **4.6:1** | **Conforme AA** |
| **Bouton Primaire (Blanc/Vert)**| `#FFFFFF` | `#28634B` | **5.8:1** | **Conforme AA** |
| **Bouton Mangrove (Blanc/Sombre)**| `#FFFFFF` | `#153D30` | **11.2:1**| **Conforme AAA** |
| **Badge Succès (Vert foncé/Vert clair)**| `#135035` | `#DCF2E5` | **7.4:1** | **Conforme AAA** |
| **Badge Erreur (Rouge foncé/Rose clair)**| `#92231C` | `#FDE8E6` | **6.9:1** | **Conforme AA** |
| **Badge Avertissement** | `#7A4B08` | `#FEF3D6` | **6.2:1** | **Conforme AA** |

---

## 2. Navigation au Clavier & Indicateur de Focus

### 2.1 Visibilité du Focus
- Tout élément interactif (liens, boutons, champs, onglets) doit disposer d'un indicateur de focus hautement visible.
- L'utilisation de `outline: none` ou `outline: 0` sans alternative graphique est formellement prohibée.
- Le Design System applique l'anneau de focalisation centralisé :
  ```css
  :focus-visible {
    outline: 2px solid var(--color-brand-forest);
    outline-offset: 2px;
  }
  ```
- Les boutons d'action utilisent la variable d'élévation `--shadow-focus` (`0 0 0 3px rgba(40, 99, 75, 0.32)`).

### 2.2 Ordre Logique de Tabulation
- L'ordre de parcours à la touche `Tab` doit correspondre strictement à la hiérarchie visuelle et logique de la page.
- Les attributs `tabindex` supérieurs à `0` sont interdits (seuls `tabindex="0"` pour rendre un élément interactif ou `tabindex="-1"` pour un focus programmatique sont autorisés).

### 2.3 Piégeage du Focus & Touche Échap
- Dans toute modale (`UiConfirmDialogComponent`) ou tiroir latéral mobile, le focus doit être piégé à l'intérieur tant que la fenêtre est ouverte.
- La touche **Échap** (`Escape`) doit refermer immédiatement la modale ou le menu mobile sans recharger la page.

---

## 3. Sémantique HTML5 & Hiérarchie des Titres

### 3.1 Structure de Page
Chaque page doit comporter :
- Un lien d'évitement en début de document : `<a href="#main-content" class="skip-link">Aller au contenu principal</a>`.
- Une zone d'en-tête `<header>`.
- Une zone de navigation principale `<nav aria-label="...">`.
- Une zone de contenu unique `<main id="main-content">`.
- Une zone de pied de page `<footer>`.

### 3.2 Hiérarchie des Niveaux de Titres
- Chaque page doit contenir **un seul et unique titre `<h1>`**, décrivant précisément le sujet de l'écran.
- Les niveaux de titres (`<h2>`, `<h3>`, `<h4>`) ne doivent jamais sauter de niveau (ex: passer directement de `<h2>` à `<h4>` est invalide).
- Ne jamais choisir une balise de titre pour son style graphique : utiliser les balises sémantiques adéquates et appliquer les classes CSS de taille (`.text-lg`, `.text-2xl`).

---

## 4. Formulaires & Messages d'Erreur

### 4.1 Liaison des Libellés
- Chaque champ de formulaire (`<input>`, `<select>`, `<textarea>`) doit obligatoirement posséder un libellé `<label>` associé par un attribut `for` correspondant à l'`id` du champ.
- Si le champ est obligatoire, il doit porter l'attribut HTML `required` et être signalé visuellement avec un texte explicite ou astérisque commenté.

### 4.2 Annonce Accessible des Erreurs
- En présence d'une erreur de saisie :
  1. Le champ doit porter `[attr.aria-invalid]="true"`.
  2. Le champ doit être lié au message d'erreur via `[attr.aria-describedby]="errorId"`.
  3. Le message d'erreur doit être balisé avec `role="alert"` et `aria-live="polite"` pour être immédiatement restitué par la synthèse vocale du lecteur d'écran.
- Le composant partagé `UiFormFieldComponent` automatise cette triple liaison de manière fiable.

---

## 5. Règle d'Indépendance de la Couleur pour les Statuts

La couleur ne doit **jamais** être l'unique moyen de transmettre une information, un statut métier ou une action requise.
- Tout badge de statut (`UiBadgeComponent`) affiche obligatoirement un libellé textuel explicite (ex : *« Validé »*, *« En attente de paiement »*, *« Billet Consommé »*).
- Les graphiques et jauges de statistiques doivent intégrer des légendes textuelles et des étiquettes de valeur directes (`.tabular-nums`).

---

## 6. Prise en Charge des Technologies d'Assistance

### 6.1 Images & Photographies
- **Images informatives** (photos de patrimoine, de guides ou de circuits) : attribut `alt` décrivant précisément le sujet (ex: `alt="Façade traditionnelle de la case à impluvium d'Enampore"`).
- **Images décoratives ou icônes de style** : `aria-hidden="true"` ou `alt=""`.

### 6.2 Réduction des Animations (Motion Sensitivity)
Les utilisateurs souffrant de troubles vestibulaires ou de sensibilité aux mouvements rapides doivent pouvoir naviguer sans cinétose.
Le Design System intègre la directive globale :
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
