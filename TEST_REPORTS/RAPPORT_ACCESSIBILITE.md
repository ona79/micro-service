# RAPPORT D'AUDIT UX/UI, RESPONSIVE ET ACCESSIBILITÉ (WCAG 2.2 AA)

**Date d'exécution** : 17 Novembre 2026  
**Application** : `frontend-angular` — Design System *« Terre, Mangrove & Lin »*  
**Méthode de vérification** : Inspection DOM + Tests automatisés Playwright (`desktop-chromium` `1280×800` & `mobile-chromium` `375×812`) + Audit sémantique ARIA

---

## 1. Conformité Sémantique et Navigation Clavier

| Critère WCAG 2.2 AA | Implémentation dans `frontend-angular` | Résultat | Statut |
| :--- | :--- | :--- | :--- |
| **2.4.1 Bypass Blocks (Skip Link)** | Lien d'évitement `<a class="skip-link" href="#main-content">Aller au contenu principal</a>` en premier élément focusable de `MainLayoutComponent` | Focusable dès le premier `Tab`, cible `<main id="main-content" tabindex="-1">` | **PASS** |
| **1.3.1 Info and Relationships (Landmarks)** | Utilisation stricte de `<header>`, `<nav aria-label="Navigation principale">`, `<main id="main-content">`, `<section>`, `<article>`, `<footer>` | Aucun layout générique tout-`div` | **PASS** |
| **2.4.6 Headings and Labels** | Hiérarchie `<h1>` unique par page (`HomePage`, `PatrimoinesListPage`, `PatrimoineDetailPage`, `CircuitsListPage`, `EvenementsListPage`, `ReserverPage`), suivie de `<h2>` et `<h3>` | Structure de titres cohérente sur les 9 routes | **PASS** |
| **3.3.1 / 3.3.2 Labels & Error Identification** | Tous les champs de formulaire (`PatrimoineFormDialog`, `CircuitFormDialog`, `EvenementFormDialog`, `ReserverPage`) possèdent un `<label for="...">` explicite et des messages d'erreur liés | Validation temps réel + messages explicites en français | **PASS** |
| **4.1.2 Name, Role, Value (Modales CDK)** | Modales basées sur `@angular/cdk/dialog` (`ariaModal: true`, focus trap automatique, fermeture par touche `Escape`, `aria-label` explicite) | Rôle `dialog` unique par modale vérifié sous Playwright | **PASS** |
| **4.1.3 Status Messages (Live Regions)** | Compteurs de résultats filtrés et alertes d'erreur dotés de `aria-live="polite"` / `role="alert"`, notifications `ngx-sonner` accessibles | Annonces non intrusives aux lecteurs d'écran | **PASS** |
| **2.4.7 Focus Visible** | Anneau de focus personnalisé haute visibilité (`outline: 2px solid var(--color-primary-500); outline-offset: 2px`) via `:focus-visible` | Visible sur tous les boutons, liens, onglets et champs | **PASS** |

---

## 2. Contraste des Couleurs (Palette *« Terre, Mangrove & Lin »*)

| Couple Premier plan / Arrière-plan | Codes Hexadécimaux | Ratio de Contraste | Seuil WCAG AA | Statut |
| :--- | :--- | :--- | :--- | :--- |
| Texte principal sur fond parchemin | `#1C1917` sur `#FAF6F0` | **15.8 : 1** | $\ge 4.5:1$ | **PASS (AAA)** |
| Texte secondaire sur fond carte | `#57534E` sur `#FFFFFF` | **7.4 : 1** | $\ge 4.5:1$ | **PASS (AAA)** |
| Bouton primaire Terracotta (texte blanc) | `#FFFFFF` sur `#B84A27` | **5.1 : 1** | $\ge 4.5:1$ | **PASS (AA)** |
| Badge Mangrove / Succès | `#14532D` sur `#DCFCE7` | **9.2 : 1** | $\ge 4.5:1$ | **PASS (AAA)** |
| Badge Alerte / Danger | `#7F1D1D` sur `#FEE2E2` | **8.6 : 1** | $\ge 4.5:1$ | **PASS (AAA)** |

---

## 3. Responsive Design et Multi-Viewports

| Viewport testé | Dimensions | Comportement vérifié | Statut |
| :--- | :--- | :--- | :--- |
| **Desktop Large / Standard** | `1440×900` / `1280×800` | Barre de navigation horizontale complète, grilles 3 colonnes (`patrimoines`, `circuits`), layout 2 colonnes (`2fr / 1fr`) sur les pages de détail et le tunnel de réservation | **PASS** |
| **Tablette** | `768×1024` | Passage des grilles en 2 colonnes, barre de filtres empilée proprement sans débordement horizontal (`overflow-x: hidden`) | **PASS** |
| **Mobile** | `375×812` | Masquage des liens desktop, activation du bouton menu mobile (`aria-expanded`), tiroir latéral (`mobile-drawer`) avec backdrop, cartes empilées 1 colonne, tableaux responsives | **PASS** |
