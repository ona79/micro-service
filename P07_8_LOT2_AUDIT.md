# AUDIT TECHNIQUE INITIAL & CARTOGRAPHIE DES INTERFACES (LOT 2)
## Mission P07.8 — Refonte UX/UI de l'Expérience Publique et Touristique

> **Projet** : Plateforme de Valorisation du Patrimoine Touristique de la Casamance  
> **Institution** : Université Assane Seck de Ziguinchor (UASZ) — Licence 3 Informatique  
> **Phase** : P07.8 — Lot 2 (Expérience Publique et Touristique)  
> **Date de l'audit** : 18 Novembre 2026  
> **Auteurs** : Équipe Senior Frontend Architecture & UI/UX Design  

---

## 1. Contrôle de Gouvernance Git & Rapport de Dépendance Bloquante

Conformément à la **section 4.1 du mandat P07.8 - Lot 2**, un contrôle strict de l'état Git et des dépendances a été effectué avant toute modification de code :

### 1.1 État Constaté des Dépôts et Branches
- **Branche locale actuelle** : `feature/p07-8-design-system`
- **Dernier commit du Lot 1** : [`da909c5`](file:///home/mahou-dev/micro-service/DESIGN_SYSTEM.md) (*feat(p07.8): lot 1 - design system foundations, centralized tokens, shared components and guidelines*)
- **État de l'arbre de travail (working tree)** : 100% propre (aucune modification locale non sauvegardée).
- **Branche distante `origin/develop`** : Actuellement positionnée sur le commit `041c989` (*Merge remote-tracking branch 'origin/feature/p07-5-functional-audit' into develop*).
- **Statut d'intégration du Lot 1 dans `origin/develop`** : **NON ENCORE INTÉGRÉ DANS `origin/develop`**.
  - La commande `git merge-base --is-ancestor da909c5 origin/develop` confirme que le commit `da909c5` n'est pas encore un ancêtre de `origin/develop`.
  - La branche `origin/feature/p07-8-design-system` contient bien le commit `da909c5`, mais la fusion vers `develop` est en attente d'approbation humaine.

### 1.2 Déclaration de Dépendance Bloquante (Condition de Démarrage 4.1)
Le mandat stipule formellement :
> *« Condition de démarrage : vérifier que le commit `da909c5` et ses modifications sont intégrés dans `origin/develop`. S'ils ne le sont pas : ne pas prétendre que le Design System est disponible dans `develop` ; ne pas démarrer une branche concurrente basée sur un socle incomplet ; produire un rapport de dépendance bloquante ; indiquer précisément la fusion ou l'intégration préalable nécessaire. Ne jamais fusionner une PR sans autorisation humaine. »*

En conséquence :
1. **Le démarrage de la branche `feature/p07-8-public-tourist-experience` est suspendu** jusqu'à l'autorisation ou l'intégration effective du Lot 1 (`da909c5`) dans `origin/develop`.
2. **Aucune branche concurrente ou orpheline** n'a été créée prématurément.
3. **Analyse de fusion préalable** : Une analyse d'arbre de fusion (`git merge-tree`) a été exécutée entre `origin/develop` (`041c989`) et `da909c5` : **0 conflit détecté**. La fusion sera 100% propre (fast-forward ou merge commit standard sans heurt).
4. **Action préalable requise** : Autorisation humaine pour intégrer `feature/p07-8-design-system` dans `develop` (via validation de la PR GitHub ou commande `git merge feature/p07-8-design-system && git push origin develop`).

---

## 2. Cartographie Complète des Pages & Composants du Lot 2

L'audit technique du répertoire [`frontend-angular/src/app`](file:///home/mahou-dev/micro-service/frontend-angular/src/app) a permis de recenser l'ensemble des 12 écrans et composants du parcours public et touristique.

### Matrice d'Audit des Interfaces (Section 4.3)

| Identifiant / Route | Composant Angular Actuel | État Actuel & Limites Constatées | Action de Refonte Prévue (Lot 2) | API Backend Associée |
| :--- | :--- | :--- | :--- | :--- |
| **PUB-001**<br>`/accueil` | [`HomePageComponent`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/home/pages/home-page/home-page.component.ts) | Structure basique, hero peu immersif, filtres rapides absents, typographie sans relief éditorial. | Nouveau Hero Casamance immersif, typographie *Fraunces*, cartes `app-ui-card`, filtres d'accès direct, mise en avant des bolongs et circuits. | `GET /api/patrimoines`<br>`GET /api/circuits`<br>`GET /api/evenements`<br>`GET /api/guides` |
| **PUB-002**<br>`/patrimoines` | [`PatrimoinesListPageComponent`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/patrimoines/pages/patrimoines-list-page/patrimoines-list-page.component.ts) | Carte Leaflet bloquant le scroll mobile, filtres bruts, cartes de contenu peu contrastées, pas de rayon GPS configurable. | Intégration `app-ui-form-field` et `app-ui-badge`, mode tactile Leaflet plein écran avec bouton d'expansion, recherche GPS avec sélecteur de rayon (5-50 km). | `GET /api/patrimoines` (filtres categorie, zone, q, lat/lon) |
| **PUB-003**<br>`/patrimoines/:id` | [`PatrimoineDetailPageComponent`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/patrimoines/pages/patrimoine-detail-page/patrimoine-detail-page.component.ts) | Hiérarchie plate, pas d'indication claire sur la réservabilité directe du site, disposition des avis perfectible. | Fiche immersive avec galerie photo haute résolution, fil d'Ariane, coordonnées GPS vérifiées, distinction claire si visite réservable ou libre. | `GET /api/patrimoines/:id`<br>`GET /api/avis/cible/PATRIMOINE/:id`<br>`GET /api/reservations/disponibilite` |
| **PUB-004**<br>`/circuits` | [`CircuitsListPageComponent`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/circuits/pages/circuits-list-page/circuits-list-page.component.ts) | Cartes circuits denses, étapes peu visuelles, absence d'indication sur le guide responsable. | Cartes enrichies avec durée, distance estimée explicite (orthodromique), badge de difficulté latérite, profil succinct du guide. | `GET /api/circuits` |
| **PUB-005**<br>`/circuits/:id` | [`CircuitDetailPageComponent`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/circuits/pages/circuit-detail-page/circuit-detail-page.component.ts) | Carte d'étapes austère, bouton de réservation présent même si complet, gestion des erreurs d'enveloppe à sécuriser. | Itinéraire séquencé visuellement avec étapes ordonnées, carte Leaflet avec tracés et marqueurs numérotés, calcul dynamique du devis. | `GET /api/circuits/:id`<br>`GET /api/guides/:id`<br>`GET /api/avis/cible/CIRCUIT/:id` |
| **PUB-006**<br>`/evenements` | [`EvenementsListPageComponent`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/evenements/pages/evenements-list-page/evenements-list-page.component.ts) | Filtres temporels limités, distinction insuffisante entre événements passés, en cours et à venir. | Agenda culturel dynamique, fuseau horaire `Africa/Dakar` explicite, badge ocre d'état (`PUBLIE`, `TERMINE`, `COMPLET`). | `GET /api/evenements` |
| **PUB-007**<br>`/evenements/:id` | [`EvenementDetailPageComponent`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/evenements/pages/evenement-detail-page/evenement-detail-page.component.ts) | Date et lieu peu mis en avant, absence de compte à rebours ou d'avertissement de places limitées. | Bannière horaire et géographique valorisée, bouton de réservation conditionné par la capacité résiduelle temps réel. | `GET /api/evenements/:id`<br>`GET /api/avis/cible/EVENEMENT/:id`<br>`GET /api/reservations/disponibilite` |
| **PUB-008**<br>`/guides` | [`GuidesListPageComponent`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/guides/pages/guides-list-page/guides-list-page.component.ts) | Grille uniforme, absence de filtrage par langues ou zones d'intervention, badges de validation absents. | Annuaire avec filtres spécialités/langues, cartes valorisant l'expérience locale et l'accréditation du Conservateur. | `GET /api/guides` |
| **PUB-009**<br>`/guides/:id` | [`GuideDetailPageComponent`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/guides/pages/guide-detail-page/guide-detail-page.component.ts) | Vulnérabilité de confusion entre `utilisateurId` et `id` du profil, gestion 404 brute. | Utilisation stricte de la clé primaire du profil (`guide.id`), biographie structurée, liste des circuits guidés, avis clients vérifiés. | `GET /api/guides/:id`<br>`GET /api/circuits` (filtre guide)<br>`GET /api/avis/cible/GUIDE/:id` |
| **AUTH-001/002**<br>`/connexion`<br>`/inscription` | [`LoginPageComponent`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/auth/pages/login-page/login-page.component.ts)<br>[`RegisterPageComponent`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/auth/pages/register-page/register-page.component.ts) | Formulaires fonctionnels mais visuellement froids, messages d'erreurs non associés par `aria-describedby`. | Intégration `UiFormFieldComponent`, illustration culturelle en fond, indicateur de sécurité mot de passe, focus trap accessible. | `POST /api/utilisateurs/auth/connexion`<br>`POST /api/utilisateurs/auth/inscription` |
| **TOUR-001**<br>`/mon-espace` | [`AccountPageComponent`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/auth/pages/account-page/account-page.component.ts) | Onglets peu hiérarchisés, pas de vue d'ensemble des prochaines visites, annulation sans délai d'attente. | Cockpit voyageur ergonomique : prochaine visite en avant, onglets réservations / e-billets / notifications, confirmation d'annulation. | `GET /api/reservations/mes-reservations`<br>`GET /api/notifications/mes-notifications` |
| **TOUR-002/003/004**<br>`/reserver/:type/:id`<br>`/paiement/:id`<br>`/reservations/:id` | [`ReserverPageComponent`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/reservations/pages/reserver-page/reserver-page.component.ts)<br>[`PaiementCheckoutPageComponent`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/paiements/pages/paiement-checkout-page/paiement-checkout-page.component.ts)<br>[`ReservationDetailPageComponent`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/features/reservations/pages/reservation-detail-page/reservation-detail-page.component.ts) | Calcul serveur du devis opaque, bannière de simulation Wave/OM peu pédagogique, visualisation des billets isolée. | Parcours en étapes claires, devis confirmé par l'API, bannière de simulation explicite, e-billet avec QR infalsifiable (`UiTicketViewComponent`). | `POST /api/reservations`<br>`GET /api/reservations/disponibilite`<br>`POST /api/paiements/simuler`<br>`GET /api/reservations/:id/billets` |

---

## 3. Analyse des Services HTTP & Modèles Existants

L'audit confirme qu'**aucun nouveau service HTTP ni aucune modification de contrat backend** n'est nécessaire :
- `PatrimoineApiService` et `PatrimoineStore` : Gèrent déjà le chargement avec cache, la recherche géographique et le détail par identifiant.
- `CircuitApiService` et `CircuitStore` : Fournissent les circuits avec étapes enrichies et triées.
- `EvenementApiService` et `EvenementStore` : Assurent la gestion du calendrier et des créneaux.
- `GuideApiService` : Assure la consultation publique des guides validés (`/api/guides` et `/api/guides/:id`).
- `ReservationApiService` : Gère le calcul des disponibilités, la création et l'annulation de réservation.
- `PaiementApiService` : Gère la simulation des paiements Wave et Orange Money.
- `BilletApiService` : Fournit les e-billets d'accès et génère les QR codes locaux de haute fidélité.
- `AvisApiService` : Gère la publication, la consultation et la réponse aux avis vérifiés.

Toutes ces briques sont parfaitement opérationnelles et prêtes à être sublimées par les composants du Design System Lot 1.

---

## 4. Audit Architectural Angular (Section 4.2)

### 4.1 Guards, Intercepteurs & Sécurité
- **`AuthGuard`** ([`auth.guard.ts`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/core/guards/auth.guard.ts)) : Protège `/mon-espace`, `/reserver/*`, `/paiement/*`, `/reservations/*`. Redirige vers `/connexion?returnUrl=...`. Doit être préservé tel quel.
- **`HttpErrorInterceptor`** ([`http-error.interceptor.ts`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/core/interceptors/http-error.interceptor.ts)) : Normalise les réponses d'erreurs en `ApiError`. La couche UI affichera `app-ui-error-banner` de manière non intrusive.
- **`AuthInterceptor`** ([`auth.interceptor.ts`](file:///home/mahou-dev/micro-service/frontend-angular/src/app/core/interceptors/auth.interceptor.ts)) : Injection automatique du token Bearer via cookies HttpOnly / session.

### 4.2 Composants Partagés & Réutilisabilité (Design System Lot 1)
| Composant Partagé | Rôle dans l'Expérience Publique (Lot 2) |
| :--- | :--- |
| `<app-ui-button>` | Boutons d'action primaire (Réservation, Connexion, Filtres), secondaire (Retour, Annuler), ghost (Partager, Fermer). Support de l'état `loading` accessible. |
| `<app-ui-badge>` | Statuts de réservation (`EN_ATTENTE`, `CONFIRMEE`, `ANNULEE`), de circuits (`FACILE`, `MOYEN`, `DIFFICILE`), d'événements (`PUBLIE`, `COMPLET`). |
| `<app-ui-card>` | Cartes immersives pour la grille de patrimoine, circuits, événements, guides, avec ratio d'image calibré (16/9, 4/3), slot `header`, `body`, `footer`. |
| `<app-ui-form-field>` | Champs de formulaire avec libellé, indice et message d'erreur relié par `aria-describedby` (login, register, filtres, devis). |
| `<app-ui-loading-state>` | Remplacement systématique des textes bruts « Chargement en cours... » par des états visuels `role="status"` prévenant les décalages de layout (CLS). |
| `<app-ui-empty-state>` | Remplacement des zones vides par des visuels éditoriaux avec bouton d'action contextuel (« Aucun événement trouvé », « Aucune réservation »). |
| `<app-ui-error-banner>` | Affichage des erreurs réseau ou serveur (404, 500) avec option de réessai. |
| `<app-ui-ticket-view>` | Affichage haute fidélité du e-billet avec QR code dynamique généré côté client, conforme aux règles ANOM-P1-05. |
| `<app-ui-heritage-map>` | Carte Leaflet responsive avec désactivation du zoom molette intempestif sur mobile (`scrollWheelZoom: false`) et bouton plein écran. |

### 4.3 Règle d'Intégrité Backend & Zéro Régression
- Aucun endpoint backend, contrôleur, entité ou DTO ne sera modifié.
- Les paiements Wave et Orange Money restent formellement et visuellement simulés.
- Les réservations gratuites (montant total = 0 FCFA) génèrent directement des billets `CONFIRMEE` sans redirection vers la passerelle de paiement.
- Les avis ne peuvent être soumis que par des utilisateurs ayant une réservation effective et passée (`statut = TERMINEE` ou `CONFIRMEE`), conformément aux règles de gestion existantes.

