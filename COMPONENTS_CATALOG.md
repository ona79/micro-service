# CATALOGUE DES COMPOSANTS PARTAGÉS DU DESIGN SYSTEM
## Référentiel Technique & Guide d'Usage (Phase P07.8 — Lot 1)

Ce document répertorie l'ensemble des composants partagés disponibles dans le dossier `src/app/shared/components/`. Chaque composant est documenté avec ses variantes, propriétés, événements, règles d'accessibilité et exemples d'intégration.

---

## Sommaire des Composants

1. [UiButtonComponent (`app-ui-button`)](#1-uibuttoncomponent-app-ui-button)
2. [UiBadgeComponent (`app-ui-badge`)](#2-uibadgecomponent-app-ui-badge)
3. [UiCardComponent (`app-ui-card`)](#3-uicardcomponent-app-ui-card)
4. [UiFormFieldComponent (`app-ui-form-field`)](#4-uiformfieldcomponent-app-ui-form-field)
5. [UiLoadingStateComponent (`app-ui-loading-state`)](#5-uiloadingstatecomponent-app-ui-loading-state)
6. [UiEmptyStateComponent (`app-ui-empty-state`)](#6-uiemptystatecomponent-app-ui-empty-state)
7. [UiErrorBannerComponent (`app-ui-error-banner`)](#7-uierrorbannercomponent-app-ui-error-banner)
8. [UiBreadcrumbComponent (`app-ui-breadcrumb`)](#8-uibreadcrumbcomponent-app-ui-breadcrumb)
9. [UiConfirmDialogComponent (`app-ui-confirm-dialog`)](#9-uiconfirmdialogcomponent-app-ui-confirm-dialog)
10. [UiTicketViewComponent (`app-ui-ticket-view`)](#10-uiticketviewcomponent-app-ui-ticket-view)
11. [UiKpiCardComponent (`app-ui-kpi-card`)](#11-uikpicardcomponent-app-ui-kpi-card)
12. [UiPaginationComponent (`app-ui-pagination`)](#12-uipaginationcomponent-app-ui-pagination)

---

## 1. UiButtonComponent (`app-ui-button`)

- **Chemin** : `src/app/shared/components/ui-button/ui-button.component.ts`
- **Rôle** : Contrôle interactif déclenchant une action utilisateur ou soumettant un formulaire avec prise en charge native des états de chargement (`loading`) et d'accessibilité (`aria-busy`, focus ring).

### Propriétés (Inputs)
| Nom | Type | Valeur par défaut | Description |
| :--- | :--- | :--- | :--- |
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost' \| 'danger' \| 'terracotta'` | `'primary'` | Thématique visuelle du bouton |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Hauteur (34px, 42px, 50px) |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Type natif HTML du bouton |
| `disabled` | `boolean` | `false` | Désactivation logique et visuelle |
| `loading` | `boolean` | `false` | Affiche le spinner, désactive le clic et active `aria-busy="true"` |
| `iconOnly` | `boolean` | `false` | Format circulaire pour boutons icônes seuls |
| `ariaLabel` | `string` | `''` | Libellé vocal pour lecteurs d'écran (obligatoire si `iconOnly`) |

### Événements (Outputs)
- `clicked: output<MouseEvent>()` : Déclenché lors du clic (uniquement si le bouton n'est ni `disabled` ni `loading`).

### Exemple d'utilisation
```html
<app-ui-button variant="primary" size="md" [loading]="isSubmitting()" (clicked)="onSubmit()">
  <svg lucideCheck [size]="16" aria-hidden="true"></svg>
  <span>Confirmer la réservation</span>
</app-ui-button>

<app-ui-button variant="danger" size="sm" (clicked)="onDelete()">
  Supprimer
</app-ui-button>
```

---

## 2. UiBadgeComponent (`app-ui-badge`)

- **Chemin** : `src/app/shared/components/ui-badge/ui-badge.component.ts`
- **Rôle** : Indicateur compact transmettant un état métier ou une catégorie. Respecte la règle d'accessibilité WCAG selon laquelle la couleur ne doit jamais être le seul vecteur d'information (présence systématique d'un libellé textuel explicite).

### Propriétés (Inputs)
| Nom | Type | Valeur par défaut | Description |
| :--- | :--- | :--- | :--- |
| `status` | `UiBadgeStatus` | `'neutral'` | Statut métier (`publie`, `en_attente`, `confirme`, `paye`, `valide`, `rejete`, etc.) ou couleur sémantique (`success`, `warning`, `danger`, `info`, `terracotta`) |
| `label` | `string` | `''` | Surcharge facultative du libellé affiché |
| `showDot` | `boolean` | `true` | Affiche ou masque la puce ronde contrastée |
| `size` | `'sm' \| 'md'` | `'md'` | Taille standard ou compacte |

### Exemple d'utilisation
```html
<!-- Libellé automatique déduit : "Validé" avec fond vert forêt clair et bordure -->
<app-ui-badge status="valide" />

<!-- Libellé personnalisé avec statut d'avertissement -->
<app-ui-badge status="en_attente" label="Paiement Wave en cours" />

<!-- Badge thématique latérite pour un circuit -->
<app-ui-badge status="terracotta" label="Circuit Pédestre" />
```

---

## 3. UiCardComponent (`app-ui-card`)

- **Chemin** : `src/app/shared/components/ui-card/ui-card.component.ts`
- **Rôle** : Conteneur structuré de contenu découpé en zones sémantiques (média, en-tête, corps, pied de page). Prise en charge d'un mode interactif avec navigation clavier (`role="button"`, `tabindex="0"`, déclenchement par touche Entrée/Espace).

### Propriétés (Inputs)
| Nom | Type | Valeur par défaut | Description |
| :--- | :--- | :--- | :--- |
| `variant` | `'elevated' \| 'bordered' \| 'flat' \| 'interactive'` | `'elevated'` | Style d'élévation et bordures |
| `interactive` | `boolean` | `false` | Active l'accessibilité interactive et le hover avec surélévation |

### Slots de Projection (Transclusion)
- `[card-media]` : Emplacement supérieur dédié aux images ou cartes Leaflet
- `[card-header]` : Titre, sous-titre et badges
- `[card-body]` ou contenu standard : Description et métadonnées
- `[card-footer]` : Actions, prix ou boutons de consultation

### Exemple d'utilisation
```html
<app-ui-card variant="elevated" [interactive]="true" (cardClick)="viewDetails(item.id)">
  <div card-media>
    <img [src]="item.photoUrl" [alt]="item.nom" />
  </div>
  <div card-header>
    <app-ui-badge status="terracotta" [label]="item.categorie" />
    <h3>{{ item.nom }}</h3>
  </div>
  <p card-body>{{ item.description }}</p>
  <div card-footer>
    <span class="price">{{ item.prix | fcfaPrice }}</span>
    <app-ui-button variant="outline" size="sm">Découvrir</app-ui-button>
  </div>
</app-ui-card>
```

---

## 4. UiFormFieldComponent (`app-ui-form-field`)

- **Chemin** : `src/app/shared/components/ui-form-field/ui-form-field.component.ts`
- **Rôle** : Enveloppe de champ de formulaire assurant la liaison accessible entre le libellé `<label for="...">`, l'élément de saisie projeté, le message d'aide (`aria-describedby`) et le message d'erreur de validation (`role="alert" aria-live="polite"`).

### Propriétés (Inputs)
| Nom | Type | Valeur par défaut | Description |
| :--- | :--- | :--- | :--- |
| `label` | `string` | `''` | Texte du libellé |
| `forId` | `string` | `''` | Identifiant HTML du champ contrôlé |
| `hint` | `string` | `''` | Texte d'aide contextuelle sous le champ |
| `error` | `string \| null` | `null` | Message d'erreur de validation |
| `required` | `boolean` | `false` | Ajoute l'astérisque visuel et la sémantique de champ obligatoire |

### Exemple d'utilisation
```html
<app-ui-form-field
  label="Numéro de Téléphone (Orange Money / Wave)"
  forId="phone-input"
  hint="Format : +221 77 000 00 00"
  [error]="phoneError()"
  [required]="true"
>
  <input
    id="phone-input"
    type="tel"
    class="ui-input"
    [(ngModel)]="phoneNumber"
    [attr.aria-invalid]="!!phoneError()"
  />
</app-ui-form-field>
```

---

## 5. UiLoadingStateComponent (`app-ui-loading-state`)

- **Chemin** : `src/app/shared/components/ui-loading-state/ui-loading-state.component.ts`
- **Rôle** : Écran de chargement explicite garantissant qu'un utilisateur ou un lecteur d'écran ne perçoive pas un état vide accidentel pendant que les requêtes API sont en cours de transfert.

### Propriétés (Inputs)
| Nom | Type | Valeur par défaut | Description |
| :--- | :--- | :--- | :--- |
| `message` | `string` | `'Chargement des données en cours...'` | Message explicatif de l'attente |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Diamètre du spinner rotatif |
| `fullscreen` | `boolean` | `false` | Centre verticalement sur au moins 50vh |

### Exemple d'utilisation
```html
@if (loading()) {
  <app-ui-loading-state message="Chargement des réservations du site..." size="lg" />
} @else if (error()) {
  <app-ui-error-banner [message]="error()" (retry)="reload()" />
} @else {
  <!-- Contenu des données -->
}
```

---

## 6. UiEmptyStateComponent (`app-ui-empty-state`)

- **Chemin** : `src/app/shared/components/ui-empty-state/ui-empty-state.component.ts`
- **Rôle** : Affiche un état neutre et bienveillant lorsqu'une recherche ou un catalogue ne contient aucune donnée, enrichi par une illustration vectorielle inspirée de l'architecture casamançaise.

### Propriétés (Inputs)
- `title: input<string>('Aucun élément trouvé')`
- `description: input<string>('')`
- `actionLabel: input<string>('')`
- `actionTo: input<string>('')` (lien routerLink facultatif)
- `hasAction: input<boolean>(false)`
- `action: output<void>()` (clic bouton facultatif)

---

## 7. UiErrorBannerComponent (`app-ui-error-banner`)

- **Chemin** : `src/app/shared/components/ui-error-banner/ui-error-banner.component.ts`
- **Rôle** : Bannière d'alerte rouge latérite (`role="alert"`) signalant un échec réseau, une erreur de validation ou un problème de droit d'accès, avec bouton de réessai intégré.

### Propriétés (Inputs)
- `title: input<string>('Une erreur est survenue')`
- `message: input.required<string>()`
- `showRetry: input<boolean>(false)`
- `retry: output<void>()`

---

## 8. UiBreadcrumbComponent (`app-ui-breadcrumb`)

- **Chemin** : `src/app/shared/components/ui-breadcrumb/ui-breadcrumb.component.ts`
- **Rôle** : Fil d'Ariane accessible avec balisage `nav aria-label="Fil d'Ariane"` et micro-données pour situer l'utilisateur dans l'arborescence des patrimoines, circuits et cockpits.

---

## 9. UiConfirmDialogComponent (`app-ui-confirm-dialog`)

- **Chemin** : `src/app/shared/components/ui-confirm-dialog/ui-confirm-dialog.component.ts`
- **Rôle** : Boîte de dialogue modale accessible (`role="dialog" aria-modal="true"`) sollicitant une confirmation explicite avant toute action destructive (suppression, suspension, remboursement, rejet).

---

## 10. UiTicketViewComponent (`app-ui-ticket-view`)

- **Chemin** : `src/app/shared/components/ui-ticket-view/ui-ticket-view.component.ts`
- **Rôle** : Rendu sécurisé des e-billets touristiques avec génération automatique de codes QR infalsifiables, encadré officiel UASZ / Casamance Patrimoine et feuille de style dédiée à l'impression papier (`@media print`).

---

## 11. UiKpiCardComponent (`app-ui-kpi-card`)

- **Chemin** : `src/app/shared/components/ui-kpi-card/ui-kpi-card.component.ts`
- **Rôle** : Bloc d'indicateur clé de performance pour les cockpits professionnels (total réservations, montants collectés, taux d'occupation, alertes de modération) avec badge de variation et icône contextuelle.

---

## 12. UiPaginationComponent (`app-ui-pagination`)

- **Chemin** : `src/app/shared/components/ui-pagination/ui-pagination.component.ts`
- **Rôle** : Contrôle de pagination numérotée avec boutons précédent/suivant, état désactivé aux bornes et indication textuelle du nombre d'éléments visualisés.
