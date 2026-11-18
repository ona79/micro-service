# RAPPORT TECHNIQUE DE MISSION — P07.8 (LOT 1)
## Refonte UX/UI : Design System, Fondations Visuelles & Architecture des Composants Partagés

> **Projet** : Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance  
> **Institution** : Université Assane Seck de Ziguinchor (UASZ) — Licence 3 Informatique  
> **Phase** : P07.8 — Lot 1 (Fondations du Design System)  
> **Branche de travail** : `feature/p07-8-design-system`  
> **Base de référence** : `develop` (intégrant P07.5 et P07.7)  

---

## 1. Contexte & État Initial

La mission **P07.7** a dressé l'inventaire visuel exhaustif de la plateforme à travers 116 captures d'écran réelles, 36 routes Angular et 34 pages métier actives pour les cinq rôles du système (`TOURISTE`, `GUIDE`, `CONSERVATEUR`, `GESTIONNAIRE_SITE`, `ADMINISTRATEUR`).

L'analyse de ces captures a révélé plusieurs opportunités d'amélioration structurelles :
1. **Contraste & Lisibilité** : Certains textes secondaires gris clair sur fond sable n'atteignaient pas le ratio WCAG AA de 4.5:1.
2. **Identité Visuelle** : Palette initiale propre mais sous-exploitant les teintes emblématiques de la Casamance (vert mangrove profond, latérite, ocre).
3. **Rigidité des Tableaux en Vue Mobile** : Sur écrans 390px et 768px, les tableaux administratifs généraient un défilement horizontal peu maniable.
4. **Composants Partagés Dispersés** : Absence de composants partagés standardisés pour les boutons, badges de statuts, formulaires accessibles et conteneurs de cartes.
5. **Dualité d'Administration** : Présence simultanée de la route historique `/administration` et du nouvel espace unifié `/pro/admin`.

Le **Lot 1 de la mission P07.8** a eu pour mandat exclusif d'établir les fondations techniques, visuelles et ergonomiques pérennes du nouveau système graphique (« CASAMANCE — PATRIMOINE VIVANT ») sans réécrire prématurément les 34 pages métier ni altérer le code backend ou les contrats d'API.

---

## 2. Direction Artistique & Choix Graphiques

Le concept visuel retenu est **« CASAMANCE — PATRIMOINE VIVANT »** :
- **Mangrove Profonde (`#153D30`)** : Navigation, bandeaux pro et titrages d'autorité.
- **Vert Forêt (`#28634B`)** : Boutons d'appel à l'action principaux, liens actifs.
- **Latérite Casamançaise (`#C36B45` / texte sombre `#944622`)** : Éléments culturels, circuits, repères géographiques.
- **Ocre Sahélien (`#D6A85D` / texte sombre `#7A4B08`)** : Notes, événements, mises en valeur dorées.
- **Lin Naturel (`#F5F0E5`)** : Fond éditorial reposant et chaleureux.
- **Blanc Pur (`#FFFFFF`)** : Cartes, panneaux et surfaces élevées.
- **Textes Haut Contraste** : `#161F1B` (principal, 14.5:1 sur lin, niveau AAA) et `#3D4942` (secondaire, 6.8:1 sur lin, niveau AA).
- **Typographie Duo** : Police éditoriale *Fraunces* pour les grands titres culturels + police sans-serif humaniste *Plus Jakarta Sans* pour les interfaces fonctionnelles.

---

## 3. Architecture des Composants Partagés Créés & Refactorisés

Les nouveaux composants ont été développés selon les standards Angular 22 les plus modernes (composants standalone, détection de changement `OnPush`, signaux Angular `input()` et `output()`, accessibilité native WAI-ARIA) :

### 3.1 `UiButtonComponent` (`<app-ui-button>`)
- **Variantes** : `primary`, `secondary`, `outline`, `ghost`, `danger`, `terracotta`.
- **Tailles** : `sm` (34px), `md` (42px), `lg` (50px), `iconOnly`.
- **Accessibilité** : Prise en charge de `loading` avec spinner CSS accessible, injection de `aria-busy="true"` et neutralisation des clics superflus.

### 3.2 `UiBadgeComponent` (`<app-ui-badge>`)
- **Statuts Métier Pris en Charge** : `publie`, `brouillon`, `en_attente`, `confirme`, `annule`, `expire`, `paye`, `refuse`, `utilise`, `non_utilise`, `valide`, `rejete`.
- **Règle WCAG** : Intègre systématiquement un libellé textuel explicite déduit en français, avec puce visuelle contrastée optionnelle.

### 3.3 `UiCardComponent` (`<app-ui-card>`)
- **Variantes** : `elevated`, `bordered`, `flat`, `interactive`.
- **Architecture de Slots** : `[card-media]`, `[card-header]`, `[card-body]`, `[card-footer]`.
- **Navigation Clavier** : Support du mode interactif avec `role="button"`, `tabindex="0"` et déclenchement par touches Entrée / Espace.

### 3.4 `UiFormFieldComponent` (`<app-ui-form-field>`)
- **Rôle** : Liaison automatique et accessible entre le `<label for="...">`, le champ de saisie, le texte d'aide contextuelle et le message d'erreur (`role="alert"` et `aria-live="polite"`).

### 3.5 `UiLoadingStateComponent` (`<app-ui-loading-state>`)
- **Rôle** : État de chargement explicite (`role="status"`, `aria-live="polite"`) empêchant l'affichage intempestif d'états vides pendant la récupération asynchrone des données.

### 3.6 Refactorisation & Fiabilisation de `UiTicketViewComponent`
- Élimination de la dépendance temporelle arbitraire dans les tests unitaires grâce à une scrutation réactive des signaux de billets QR, garantissant un taux de succès de 100% en exécution concurrente.

---

## 4. Analyse & Diagnostic Indépendant des 2 Erreurs P07.7

Conformément à la section 12 du mandat, les deux anomalies constatées lors des captures P07.7 ont fait l'objet d'une expertise indépendante :

### 4.1 Anomalie PUB-005 : Détail d'un circuit (`GET /api/circuits/1`)
- **Constat initial** : Réponse HTTP 403 avec le message : `{"statut":403,"erreur":"Attaque par rejeu détectée sur l'enveloppe Gateway."}`.
- **Cause racine identifiée** :
  1. Lors d'un appel à `GET /api/circuits/1`, le microservice `ms-circuit` réalise un appel interservice Feign pour vérifier les données du guide ou du patrimoine.
  2. Si l'un des services interrogés répond temporairement en 503, le composant `HttpRequestRetryExec` d'Apache HttpClient dans `api-gateway` rejoue automatiquement la requête une seconde plus tard.
  3. L'enveloppe de sécurité réinjectée par la Gateway conserve le même nonce cryptographique `X-Internal-Gateway-Token`.
  4. Le filtre de sécurité de `ms-circuit` (`MicroserviceSecurityFilter.java`, ligne 187) détecte que ce nonce figure déjà dans sa table de nonces vus (`seenNonces`) et bloque légitimement la requête pour suspicion d'attaque par rejeu.
- **Préconisation pour le backend** : Ajuster la configuration de retry de l'API Gateway pour régénérer un nonce unique lors des réémissions automatiques, ou désactiver le retry HTTP automatique sur les routes d'API protégées par signature d'enveloppe Gateway.

### 4.2 Anomalie PUB-009 : Profil d'un guide introuvable (`/guides/5`)
- **Constat initial** : Erreur 404 sur la page `/guides/5`.
- **Cause racine identifiée** :
  - Dans la base de données, l'utilisateur Alassane Badji possède l'ID utilisateur `utilisateurId = 5`, mais son profil de guide officiel a pour clé primaire `id = 1`.
  - L'endpoint public attend la clé primaire du profil (`GET /api/guides/1` qui répond en 200 OK avec toutes les données), alors que le script de capture avait navigué vers l'ID utilisateur (`/guides/5`).
  - En interrogeant l'application avec `/guides/1`, le profil s'affiche impeccablement avec tous ses agréments et spécialités.
- **Préconisation** : Aucune anomalie logicielle sur le composant ; aligner les liens de navigation sur `guide.id` (déjà géré dans le catalogue public des guides).

---

## 5. Résultats des Tests & Vérifications Techniques

| Type de Test | Commande Exécutée | Résultat Obtenu | Remarques |
| :--- | :--- | :--- | :--- |
| **Compilation Angular** | `ng build` | **Succès (0 erreur, 0 avertissement)** | Bundle optimisé, budgets calibrés à 800 kB |
| **Tests Unitaires Frontend** | `ng test --watch=false` | **31 / 31 fichiers réussis (104 / 104 tests OK)** | 100% de réussite en 36.2 secondes |
| **Tests des Nouveaux Composants** | Specs dédiées | **16 nouveaux tests unitaires ajoutés** | Couverture sur `ui-button`, `ui-badge`, `ui-card`, `ui-form-field`, `ui-loading-state` |
| **Non-régression des Parcours** | Suites existantes | **Aucune régression détectée** | Auth, réservations, paiements, scanner, cockpits 100% fonctionnels |
| **Contrôle Git & Backend** | `git status` / `git diff` | **0 modification backend** | Aucun contrat d'API, permission ou code Java modifié |

---

## 6. Documentation Produite

Cinq documents de référence exhaustifs ont été rédigés et placés à la racine du projet :
1. [`DESIGN_SYSTEM.md`](file:///home/mahou-dev/micro-service/DESIGN_SYSTEM.md) : Charte graphique, palette de couleurs, typographie, espacements, rayons, ombres, breakpoints et directives de mouvement réduit.
2. [`COMPONENTS_CATALOG.md`](file:///home/mahou-dev/micro-service/COMPONENTS_CATALOG.md) : Inventaire technique complet des composants partagés réutilisables.
3. [`RESPONSIVE_GUIDELINES.md`](file:///home/mahou-dev/micro-service/RESPONSIVE_GUIDELINES.md) : Règles d'adaptation sur 390px, 768px, 1024px et 1440px, et stratégie mobile des tableaux de données.
4. [`ACCESSIBILITY_GUIDELINES.md`](file:///home/mahou-dev/micro-service/ACCESSIBILITY_GUIDELINES.md) : Référentiel de conformité WCAG 2.2 AA (contrastes, focus visibles, ARIA, formulaires accessibles).
5. [`P07_8_LOT1_RAPPORT.md`](file:///home/mahou-dev/micro-service/P07_8_LOT1_RAPPORT.md) : Présent rapport de clôture du Lot 1.

---

## 7. Limites Actuelles & Recommandations pour le Lot 2

### 7.1 Périmètre Délimité du Lot 1
Le Lot 1 s'est concentré sur les fondations transversales, les tokens, les styles fondamentaux et les composants partagés. En application stricte de la consigne, les 34 pages métier existantes n'ont pas encore été refondues individuellement.

### 7.2 Recommandations pour le Lot 2 (Expérience Publique & Découverte Touristique)
1. **Refonte de la Page d'Accueil (`home-page`)** :
   - Exploiter le nouveau composant `UiCardComponent` et la typographie *Fraunces* sur la bannière héroïque.
   - Mettre en valeur les circuits phares et le sélecteur géographique de Casamance.
2. **Refonte du Catalogue du Patrimoine (`patrimoines-list-page`)** :
   - Intégrer les filtres avec `UiFormFieldComponent` et `UiBadgeComponent`.
   - Améliorer l'expérience mobile de la carte Leaflet (bouton tactile d'expansion plein écran).
3. **Refonte des Fiches Détails (`patrimoine-detail-page`, `circuit-detail-page`, `evenement-detail-page`, `guide-detail-page`)** :
   - Standardiser les blocs d'information avec la nouvelle échelle d'espacement et les badges de statut.
4. **Transition de la route `/administration` vers `/pro/admin`** :
   - Grâce à la bannière de convergence introduite dans ce lot, accompagner les administrateurs vers le cockpit modulaire `/pro/admin` avant dépréciation formelle de l'ancienne page monolithique.
