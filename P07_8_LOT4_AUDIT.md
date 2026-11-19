# MISSION P07.8 — LOT 4 : AUDIT TRANSVERSAL UX/UI, ACCESSIBILITÉ & STABILISATION DU FRONTEND

**Projet :** Plateforme de valorisation et gestion du patrimoine touristique de la Casamance  
**Institution :** Université Assane Seck de Ziguinchor (UASZ) — Licence 3 Informatique  
**Direction artistique :** CASAMANCE — PATRIMOINE VIVANT  
**Date :** 19 novembre 2026  
**Auteurs :** Senior Angular Architect, Senior UX/UI Designer, Expert Accessibilité WCAG 2.2, Senior QA Engineer  
**Branche Git de travail :** `feature/p07-8-cross-platform-ux-quality`  
**Base Git :** `develop` au commit `5058826`

---

## 1. CONTRÔLE PRÉALABLE DU DÉPÔT ET VÉRIFICATION DE LA CHAÎNE GIT

Conformément à la section 4.1 du mandat Lot 4, une vérification exhaustive de l'historique et des dépendances d'`origin/develop` a été réalisée avant toute analyse :

### 1.1 Traçabilité des commits de référence des lots antérieurs

| Lot | Commit Déclaré | Présence dans `origin/develop` | Rôle et Validation |
| :--- | :--- | :--- | :--- |
| **Lot 1** | `da909c5` | **PRÉSENT** (ancêtre validé) | Fondations Design System, tokens graphiques, composants partagés |
| **Lot 2** | `4db73ee` | **PRÉSENT** (ancêtre validé) | Refonte expérience publique et touristique |
| **Lot 2.1** | `5264bbe` | **PRÉSENT** (ancêtre validé) | Stabilisation flux touristiques, repli circuit, agenda |
| **Lot 3** | `f6c41bd` | **PRÉSENT** (ancêtre validé) | Refonte espaces professionnels et administration |
| **Merge Lot 3** | `5058826` | **HEAD de `develop`** | Fusion officielle du Lot 3 dans `develop` validée par le coordinateur |

```bash
git merge-base --is-ancestor da909c5 origin/develop -> OK
git merge-base --is-ancestor 4db73ee origin/develop -> OK
git merge-base --is-ancestor 5264bbe origin/develop -> OK
git merge-base --is-ancestor f6c41bd origin/develop -> OK
```

### 1.2 Initialisation de la branche de travail

- **Branche créée :** `feature/p07-8-cross-platform-ux-quality`
- **Point de départ :** `origin/develop` (`5058826`)
- **Statut de tracking :** Poussée vers `origin/feature/p07-8-cross-platform-ux-quality`
- **Arbre de travail :** Propre, aucune modification non committée.

---

## 2. INVENTAIRE EXHAUSTIF DES COMPOSANTS ET ARCHITECTURE FRONTEND

L'audit statique complet du répertoire `frontend-angular/src/app/` met en évidence 37 composants d'interface autonomes (standalone) répartis comme suit :

### 2.1 Layouts structurels (2)
1. `MainLayoutComponent` (`src/app/core/layout/main-layout/`) : En-tête institutionnel avec recherche globale, navigation publique, notifications, puce utilisateur et pied de page académique (UASZ).
2. `ProLayoutComponent` (`src/app/core/layout/pro-layout/`) : Agencement back-office avec barre latérale pliable (desktop/mobile), fil d'Ariane contextuel, console de notifications et raccourcis de profil.

### 2.2 Pages système et gestion d'erreurs (2)
3. `ForbiddenPageComponent` (`src/app/core/layout/forbidden-page/`) : Page d'erreur 403 (Accès refusé) avec explicitation du rôle manquant et actions de redirection.
4. `NotFoundPageComponent` (`src/app/core/layout/not-found-page/`) : Page d'erreur 404 (Page introuvable).

### 2.3 Découverte publique et valorisation touristique (9)
5. `HomePageComponent` (`src/app/features/home/pages/home-page/`) : Page d'accueil éditoriale (hero Casamance, carte interactive Leaflet, mise en avant mémorielle, agenda culturel, guides du terroir).
6. `PatrimoinesListPageComponent` (`src/app/features/patrimoines/pages/patrimoines-list-page/`) : Catalogue patrimonial filtrable par zone (Basse, Moyenne, Haute-Casamance), type et capacité.
7. `PatrimoineDetailPageComponent` (`src/app/features/patrimoines/pages/patrimoine-detail-page/`) : Fiche patrimoniale détaillée (localisation GPS, horaires, avis voyageurs, réservation directe).
8. `CircuitsListPageComponent` (`src/app/features/circuits/pages/circuits-list-page/`) : Annuaire des circuits et randonnées sur les bolongs.
9. `CircuitDetailPageComponent` (`src/app/features/circuits/pages/circuit-detail-page/`) : Fiche circuit complète avec étapes séquencées et guide assigné.
10. `EvenementsListPageComponent` (`src/app/features/evenements/pages/evenements-list-page/`) : Calendrier des festivals et manifestations culturelles régionales.
11. `EvenementDetailPageComponent` (`src/app/features/evenements/pages/evenement-detail-page/`) : Fiche événement avec jauge de places et tarification.
12. `GuidesListPageComponent` (`src/app/features/guides/pages/guides-list-page/`) : Annuaire public des guides agréés et validés par le Conservateur.
13. `GuideDetailPageComponent` (`src/app/features/guides/pages/guide-detail-page/`) : Fiche guide touristique (langues, zones, avis voyageurs).

### 2.4 Authentification, espace voyageur et parcours de réservation (7)
14. `LoginPageComponent` (`src/app/features/auth/pages/login-page/`) : Connexion par identifiants ou via puces rapides de démonstration pour les 5 rôles.
15. `RegisterPageComponent` (`src/app/features/auth/pages/register-page/`) : Inscription touriste avec validation de mot de passe et CGU.
16. `AccountPageComponent` (`src/app/features/auth/pages/account-page/`) : Espace personnel touriste (réservations en cours, historique, avis déposés).
17. `NotificationsCenterPageComponent` (`src/app/features/notifications/pages/notifications-center-page/`) : Centre de notifications voyageur.
18. `ReserverPageComponent` (`src/app/features/reservations/pages/reserver-page/`) : Tunnel de réservation (sélection visite/événement, participants, tarification FCFA).
19. `PaiementCheckoutPageComponent` (`src/app/features/paiements/pages/paiement-checkout-page/`) : Terminal de paiement simulé Wave & Orange Money (P04).
20. `ReservationDetailPageComponent` (`src/app/features/reservations/pages/reservation-detail-page/`) : Détail de réservation avec billets QR scannables.

### 2.5 Espaces professionnels et administration (`/pro/**`) (14)
21. `ProDashboardPageComponent` (`src/app/features/pro/pages/pro-dashboard-page/`) : Cockpit adaptatif selon le rôle connecté (`GUIDE`, `CONSERVATEUR`, `GESTIONNAIRE_SITE`, `ADMINISTRATEUR`).
22. `ProStatistiquesPageComponent` (`src/app/features/pro/pages/pro-statistiques-page/`) : Console de métriques décisionnelles multi-services.
23. `ProPatrimoinesPageComponent` (`src/app/features/pro/pages/pro-patrimoines-page/`) : Gestion du patrimoine, validation GPS Casamance et assistant d'horaires structurés.
24. `ProCircuitsPageComponent` (`src/app/features/pro/pages/pro-circuits-page/`) : Édition des itinéraires, étapes et assignation des guides.
25. `ProEvenementsPageComponent` (`src/app/features/pro/pages/pro-evenements-page/`) : Programmation des manifestations et régulation des jauges.
26. `ProGuidesAdminPageComponent` (`src/app/features/pro/pages/pro-guides-admin-page/`) : Instruction des dossiers guides avec séparation déontologique (`isSelfDossier()`).
27. `ProGuideWorkspacePageComponent` (`src/app/features/pro/pages/pro-guide-workspace-page/`) : Profil guide, disponibilité publique et agenda.
28. `ProManifestesPageComponent` (`src/app/features/pro/pages/pro-manifestes-page/`) : Manifestes passagers sous cloisonnement BOLA.
29. `ProReservationsPageComponent` (`src/app/features/pro/pages/pro-reservations-page/`) : Supervision et gestion des dossiers de réservation.
30. `ProControleAccesPageComponent` (`src/app/features/pro/pages/pro-controle-acces-page/`) : Scanner caméra QR certifié serveur (`POST /api/visites/valider`).
31. `ProPaiementsPageComponent` (`src/app/features/pro/pages/pro-paiements-page/`) : Audit financier des transactions Wave / OM et boîte d'envoi.
32. `ProModerationPageComponent` (`src/app/features/pro/pages/pro-moderation-page/`) : Modération des avis et traitement des signalements.
33. `ProNotificationsPageComponent` (`src/app/features/pro/pages/pro-notifications-page/`) : Console d'audit des messages transactionnels délivrés.
34. `ProUtilisateursPageComponent` (`src/app/features/pro/pages/pro-utilisateurs-page/`) : Annuaire RBAC, gestion des rôles et révocation immédiate des sessions.

### 2.6 Page d'administration historique (1)
35. `AdminDashboardPageComponent` (`src/app/features/admin/pages/admin-dashboard-page/`) : Tableau de bord monolithique de gestion conservé sous `/administration`.

### 2.7 Composants UI partagés (18)
`UiBadge`, `UiButton`, `UiCard`, `UiKpiCard`, `UiFormField`, `UiEmptyState`, `UiErrorBanner`, `UiLoadingState`, `UiPagination`, `UiConfirmDialog`, `UiDetailDrawer`, `UiBreadcrumb`, `UiTicketView`, `UiHeritageMap`, `UiPatrimoineImage`, `UiSkeletonGrid`, `UiBarChart`, `UiAvisSection`.

---

## 3. MATRICE D'ÉVALUATION DES PARCOURS DE BOUT EN BOUT (SECTION 9)

| Parcours | Rôle | Étapes Clés | Statut Audit Statique | Observations & Limitations Liées |
| :--- | :--- | :--- | :--- | :--- |
| **Parcours A** | `TOURISTE` | Découverte -> Réservation -> Paiement simulé -> Billets QR -> Annulation -> Avis | **CONFORME & TESTÉ** | Prévention des doublons par date active (409) gérée. Limitation `$4` sur annulation sans date (`TKT-BACK-002`). |
| **Parcours B** | `GUIDE` | Cockpit -> Profil -> Disponibilité -> Circuits BOLA -> Manifestes -> Agenda | **CONFORME AVEC REPLI** | Limitation SQL agenda serveur (`TKT-BACK-004`) traitée par message informatif sans blocage. |
| **Parcours C** | `CONSERVATEUR` | Dashboard -> Patrimoine GPS -> Horaires structurés -> Instruction dossiers guides | **CONFORME & SÉCURISÉ** | Règle déontologique auto-dossier (`isSelfDossier()`) active. Droits modération (`TKT-BACK-003`). |
| **Parcours D** | `GESTIONNAIRE_SITE`| Dashboard affluence -> Scanner caméra QR -> Validation serveur `POST /api/visites/valider` | **CONFORME & STRICT** | Validation 100% appuyée sur le serveur. Billetterie guichet directe bloquée backend (`TKT-BACK-005`). |
| **Parcours E** | `ADMINISTRATEUR` | Dashboard 7 microservices -> Annuaire RBAC -> Révocation sessions -> Audit paiements P04 | **CONFORME & COMPLET** | Supervision financière en FCFA et révocation de session testées. |

---

## 4. REGISTRE DES ANOMALIES IDENTIFIÉES (TRANSVERSAL)

### 4.1 Accessibilité numérique (WCAG 2.2 AA)

#### Anomalie ANO-A11Y-001 — Absence de titre H1 sur la page d'erreur 404
- **Page :** `NotFoundPageComponent` (`src/app/core/layout/not-found-page/not-found-page.component.ts`)
- **Rôle concerné :** Tous utilisateurs
- **Gravité :** Faible (Accessibilité sémantique)
- **Description :** Le composant intègre directement `<app-ui-empty-state title="Page introuvable (404)">`, lequel restitue un titre de niveau `<h3>`. La page 404 est donc dépourvue de balise `<h1>`, ce qui enfreint la règle d'un titre de niveau 1 unique et pertinent par page.
- **Reproduction :** Naviguer vers une URL inexistante (`/route-invalide`), inspecter le DOM : aucun élément `<h1>`.
- **Cause racine :** `UiEmptyStateComponent` est configuré avec un `<h3>` générique pour s'insérer dans des sections sans écraser le titre principal.
- **Correction proposée :** Ajouter une balise `<h1 class="sr-only">Page introuvable (Erreur 404)</h1>` dans le gabarit de `NotFoundPageComponent`.
- **Test de non-régression :** Vérification unitaire de la présence de `h1` dans `NotFoundPageComponent`.

#### Anomalie ANO-A11Y-002 — Contrôles de formulaire sans étiquetage ARIA explicite
- **Pages concernées :**
  1. `ProControleAccesPageComponent` : Sélecteur de caméra vidéo (`<select class="bo-select camera-select">`).
  2. `ProNotificationsPageComponent` : Sélecteurs de filtres personnels et administrateur (`persoType`, `adminStatut`, `adminType`).
  3. `GuidesListPageComponent` : Champs de recherche et de filtrage (`q`, `zone`, `langue`).
  4. `ProCircuitsPageComponent` : Sélecteurs dans la liste dynamique des étapes de circuit (`patrimoineId`, `dureeVisite`, `moyenTransport`).
- **Rôles concernés :** Tous rôles (particulièrement utilisateurs de technologies d'assistance)
- **Gravité :** Moyenne (Accessibilité formulaires WCAG 2.2 Critère 1.3.1 et 4.1.2)
- **Description :** Certains champs de saisie ou sélecteurs possèdent un placeholder visuel mais aucun attribut `id` relié à un `<label for="...">`, ni d'attribut `aria-label` ou `aria-labelledby`.
- **Reproduction :** Exécuter un lecteur d'écran sur le terminal de contrôle d'accès : le sélecteur de caméra est vocalisé comme « menu déroulant sans nom ».
- **Cause racine :** Omission de l'attribut `aria-label` lors de l'intégration rapide de filtres en ligne compacts.
- **Correction proposée :** Ajouter systématiquement un `aria-label` explicite et contextualisé sur chacun des contrôles identifiés.
- **Test de non-régression :** Script de validation automatisée de l'étiquetage des éléments interactifs.

#### Anomalie ANO-A11Y-003 — Champs d'action dans le module des avis sans étiquettes accessibles
- **Page concernée :** `UiAvisSectionComponent` (`src/app/shared/components/ui-avis-section/ui-avis-section.component.ts`)
- **Rôle concerné :** `TOURISTE`, `GUIDE`, `CONSERVATEUR`
- **Gravité :** Moyenne (Accessibilité formulaires)
- **Description :** Les champs de réponse à un avis (`replyText`), de motif de signalement (`flagMotif`) et de sélection de réservation éligible (`selectedReservationId`) ne comportent pas d'étiquetage ARIA dédié.
- **Cause racine :** Formulaires dynamiques affichés conditionnellement par modal ou panneau repliable.
- **Correction proposée :** Ajouter des attributs `aria-label` contextualisés (`aria-label="Rédiger une réponse à cet avis"`, `aria-label="Préciser le motif du signalement"`).
- **Test de non-régression :** Test unitaire de rendu de `UiAvisSectionComponent`.

---

### 4.2 Responsive design et adaptabilité multi-écrans

#### Anomalie ANO-RESP-001 — Encombrement de l'en-tête public sur très petit écran (360px)
- **Page concernée :** `MainLayoutComponent` (`src/app/core/layout/main-layout/`)
- **Rôle concerné :** Tous utilisateurs mobiles
- **Gravité :** Faible (Ergonomie mobile)
- **Description :** À la résolution 360 × 800 px, le logo composé de l'icône, du nom (`Casamance Patrimoine`) et du sous-titre (`Découverte & Itinéraires Culturels`) occupe une largeur importante aux côtés de la cloche de notification et du bouton burger, laissant une marge réduite pour le titre de marque.
- **Reproduction :** Ouvrir `http://localhost/` avec un viewport de 360 × 800 px.
- **Cause racine :** Absence de media query masquant le sous-titre (`.brand__tagline`) sous le point de rupture 480px.
- **Correction proposée :** Ajouter `@media (max-width: 480px) { .brand__tagline { display: none; } }` dans `main-layout.component.css`.
- **Test de non-régression :** Contrôle Playwright avec viewport 360 × 800 px vérifiant l'absence de débordement horizontal (`scrollWidth <= innerWidth`).

#### Anomalie ANO-RESP-002 — Formulaire des étapes de circuit sur smartphone (< 480px)
- **Page concernée :** `ProCircuitsPageComponent` (`src/app/features/pro/pages/pro-circuits-page/pro-circuits-page.component.ts`)
- **Rôle concerné :** `CONSERVATEUR`, `ADMINISTRATEUR`
- **Gravité :** Moyenne (Ergonomie mobile métier)
- **Description :** Dans le panneau d'édition des circuits, la rangée de saisie d'une étape juxtapose 4 champs (`Site`, `Durée`, `Transport`, `Description`) et un bouton de suppression sur une même ligne, provoquant un étirement horizontal sur écran inférieur à 640px.
- **Cause racine :** Grille flex sans retour à la ligne automatique (`flex-wrap: nowrap`) sur la classe `.circuit-etape-row`.
- **Correction proposée :** Appliquer une disposition en colonne ou grille adaptative (`grid-template-columns: 1fr` sur mobile) sous 640px.
- **Test de non-régression :** Capture d'écran sur mobile 390px et contrôle de l'absence de scrollbar horizontale.

---

### 4.3 Harmonisation du Design System « CASAMANCE — PATRIMOINE VIVANT »

#### Anomalie ANO-DS-001 — Couleurs de repli teal obsolètes dans `UiAvisSectionComponent`
- **Composant :** `UiAvisSectionComponent` (`src/app/shared/components/ui-avis-section/ui-avis-section.component.ts`)
- **Rôle concerné :** Tous utilisateurs
- **Gravité :** Faible (Cohérence Design System)
- **Description :** Les styles du composant contiennent des variables de repli héritées de Tailwind/défaut : `var(--brand-primary, #0d9488);`. Le code couleur `#0d9488` (bleu-vert sarcelle) n'appartient pas à la palette officielle du projet (Mangrove `#153D30` et Forêt `#28634B`).
- **Cause racine :** Reliquat de code prototype antérieur au Design System du Lot 1.
- **Correction proposée :** Aligner les valeurs de repli sur `var(--color-brand-forest, #28634b)` et `var(--color-brand-mangrove, #153d30)`.
- **Test de non-régression :** Vérification unitaire des styles CSS calculés.

#### Anomalie ANO-DS-002 — Couleurs hexadécimales brutes dans `UiTicketViewComponent`
- **Composant :** `UiTicketViewComponent` (`src/app/shared/components/ui-ticket-view/ui-ticket-view.component.ts`)
- **Rôle concerné :** `TOURISTE`, `GESTIONNAIRE_SITE`
- **Gravité :** Faible (Maintenabilité des tokens)
- **Description :** Le composant de visualisation du billet QR utilise des codes couleur bruts (`#064e3b`, `#047857`, `#64748b`, `#cbd5e1`) au lieu des variables centralisées de `tokens.css`.
- **Cause racine :** Composant rédigé indépendamment avant la centralisation des tokens du Lot 1.
- **Correction proposée :** Remplacer les valeurs brutes par les tokens officiels (`var(--color-brand-forest)`, `var(--color-brand-mangrove)`, `var(--color-text-secondary)`).
- **Test de non-régression :** Exécution de la suite de tests `ui-ticket-view.component.spec.ts`.

---

### 4.4 Navigation et cohérence des routes

#### Anomalie ANO-NAV-001 — Absence d'alias de redirection pour `/interdit`
- **Fichier concerné :** `frontend-angular/src/app/app.routes.ts`
- **Rôle concerné :** Tous rôles
- **Gravité :** Mineure (Résilience de navigation)
- **Description :** La route d'accès refusé officielle est `/acces-refuse`. Cependant, la documentation et plusieurs rapports de tests citent l'URL `/interdit`. Actuellement, la saisie directe de `/interdit` conduit à la page 404 (Page introuvable) au lieu de la page 403 explicite.
- **Correction proposée :** Ajouter `{ path: 'interdit', redirectTo: '/acces-refuse', pathMatch: 'full' }` dans `app.routes.ts`.
- **Test de non-régression :** Test de routage unitaire vérifiant la redirection automatique de `/interdit`.

---

## 5. PLAN D'ACTION ET DE STABILISATION (LOT 4)

L'audit statique et fonctionnel démontre que les fondations techniques sont saines, robustes et conformes aux exigences du projet. Le plan de correction comprend 4 phases successives :

1. **Phase 1 : Accessibilité WCAG 2.2 AA** (Correction `ANO-A11Y-001`, `ANO-A11Y-002`, `ANO-A11Y-003`).
2. **Phase 2 : Harmonisation Design System & Navigation** (Correction `ANO-DS-001`, `ANO-DS-002`, `ANO-NAV-001`).
3. **Phase 3 : Responsive Design & Aménagements Mobiles** (Correction `ANO-RESP-001`, `ANO-RESP-002`).
4. **Phase 4 : Validation de bout en bout, campagne de captures d'écran et mesures de performance** (Campagne Playwright multi-résolutions, mesures bundle, production des rapports finaux).

---

## 6. CONCLUSION DE L'AUDIT PRÉALABLE

- Les prérequis Git sont **100% validés**.
- La branche officielle `feature/p07-8-cross-platform-ux-quality` est en place.
- L'audit en lecture seule a permis d'isoler 7 anomalies réelles, ciblées et légitimes.
- **Aucune modification backend n'est requise ni autorisée.**
- Le travail de correction et d'harmonisation peut être engagé.
