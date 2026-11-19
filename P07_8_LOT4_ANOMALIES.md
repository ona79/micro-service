# MISSION P07.8 — LOT 4 : REGISTRE TRANSVERSAL DES ANOMALIES ET ÉTAT DES TICKETS BACKEND

**Projet :** Plateforme de gestion et valorisation du patrimoine touristique de la Casamance  
**Institution :** Université Assane Seck de Ziguinchor (UASZ) — Licence 3 Informatique  
**Direction artistique :** CASAMANCE — PATRIMOINE VIVANT  
**Date :** 19 novembre 2026  
**Auteurs :** Senior Angular Architect, Senior QA Specialist, Expert Accessibilité WCAG 2.2  
**Branche Git :** `feature/p07-8-cross-platform-ux-quality`

---

## 1. SYNTHÈSE DE GOUVERNANCE

Ce document répertorie l'ensemble des anomalies identifiées et traitées au cours du Lot 4 (Harmonisation transversale, audit UX/UI et stabilisation finale), ainsi que l'état d'intégrité des cinq limitations backend isolées depuis les lots précédents.

Conformément à la directive stricte :
> *« Ne pas modifier les microservices Java, les migrations, les schémas PostgreSQL ou les règles de sécurité backend. Le Lot 4 doit vérifier que les interfaces signalent honnêtement les limitations serveur sans fabriquer de résultat métier. »*

---

## 2. ANOMALIES FRONTEND CORRIGÉES AU LOT 4

| ID Anomalie | Domaine | Composant / Fichier | Gravité | Cause Racine | Correction Appliquée | Statut |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ANO-A11Y-001** | Accessibilité | `NotFoundPageComponent` (`not-found-page.component.ts`) | Moyenne | `UiEmptyStateComponent` génère un titre `<h3>`, privant la page 404 de titre de niveau 1. | Ajout de `<h1 class="sr-only">Page introuvable (Erreur 404)</h1>` pour conformité WCAG 2.2. | **CORRIGÉ** |
| **ANO-A11Y-002** | Accessibilité | `ProControleAccesPageComponent`, `ProNotificationsPageComponent`, `GuidesListPageComponent`, `ProCircuitsPageComponent` | Moyenne | Contrôles interactifs (sélecteur caméra, filtres admin/perso, étapes circuits) sans `aria-label` ni étiquetage associé. | Ajout d'attributs `aria-label` contextuels explicites sur l'ensemble des contrôles de saisie. | **CORRIGÉ** |
| **ANO-A11Y-003** | Accessibilité | `UiAvisSectionComponent` (`ui-avis-section.component.ts`) | Moyenne | Champs de réponse guide, motifs de signalement et boutons d'étoiles sans descriptions ARIA. | Ajout des attributs `aria-label` sur la notation, la réponse et le formulaire de signalement. | **CORRIGÉ** |
| **ANO-RESP-001** | Responsive | `MainLayoutComponent` (`main-layout.component.css`) | Faible | Encombrement de l'en-tête public sur très petit écran (360 × 800 px) par le sous-titre du logo. | Ajout de `@media (max-width: 480px) { .brand__tagline { display: none; } }` pour dégager les actions. | **CORRIGÉ** |
| **ANO-RESP-002** | Responsive | `ProCircuitsPageComponent` (`pro-circuits-page.component.ts`) | Faible | Risque d'étirement horizontal de la ligne d'étape de circuit sur smartphone. | Structuration adaptative responsive de la grille d'étapes (`bo-form-grid`) sous 640px. | **CORRIGÉ** |
| **ANO-DS-001** | Design System | `UiAvisSectionComponent` (`ui-avis-section.component.ts`) | Faible | Présence de couleurs de repli teal `#0d9488` obsolètes étrangères à la palette Casamance. | Remplacement par les tokens officiels `var(--color-brand-forest, #28634b)` et `var(--color-brand-mangrove, #153d30)`. | **CORRIGÉ** |
| **ANO-DS-002** | Design System | `UiTicketViewComponent` (`ui-ticket-view.component.ts`) | Faible | Utilisation de codes hexadécimaux bruts (`#064e3b`, `#047857`, `#64748b`) au lieu des tokens. | Harmonisation intégrale avec `tokens.css` (`var(--color-brand-forest)`, etc.). | **CORRIGÉ** |
| **ANO-NAV-001** | Navigation | `app.routes.ts` | Mineure | Saisie de `/interdit` conduisant à une erreur 404 au lieu de la page 403 (`/acces-refuse`). | Ajout d'un alias de redirection automatique `{ path: 'interdit', redirectTo: 'acces-refuse', pathMatch: 'full' }`. | **CORRIGÉ** |

---

## 3. ANOMALIES RESTANTES ET NIVEAU DE RISQUE

Aucune anomalie frontend bloquante ou majeure ne subsiste. L'ensemble des 107 tests unitaires passe avec succès et le build de production AOT est 100% propre (0 erreur, 0 avertissement).

---

## 4. REGISTRE OFFICIEL DES TICKETS BACKEND NON RÉSOLUS CÔTÉ SERVEUR

Ces 5 tickets sont gérés avec résilience et honnêteté par l'interface utilisateur, sans aucune fabrication de fausses données transactionnelles.

### 4.1 TKT-BACK-001 — Défaillance Feign & Retry Gateway HMAC
- **Composant :** `ms-circuit` / `api-gateway`
- **Impact :** Appel Feign interne tentant de joindre `localhost:3001` -> 503 -> Retry automatique de la Gateway avec même nonce HMAC -> 403 Attaque par rejeu détectée.
- **Statut backend :** Corrigé sur `origin/develop` par la PR #17 (ajout de `patrimoine.url: ${PATRIMOINE_URL:}` dans `application.yml`).
- **Traitement frontend :** Maintien du bandeau d'erreur non bloquant `app-ui-error-banner` et du bouton de rafraîchissement dans `CircuitDetailPageComponent` et `ProManifestesPageComponent`.
- **Niveau de risque :** Très faible (corrigé et sécurisé).

### 4.2 TKT-BACK-002 — Paramètre PostgreSQL non typifié lors d'annulation sans date
- **Composant :** `ms-reservation`
- **Requête :** `ReservationRepository.sumPlacesByCircuitIdAndDateAndStatutIn` avec `datePrestation IS NULL`.
- **Erreur :** `PSQLException: could not determine data type of parameter $4`.
- **Traitement frontend :** Gestion gracieuse de l'erreur dans le store de réservation avec notification claire au voyageur.
- **Niveau de risque :** Faible (concerne uniquement les réservations sans date fixe en cours d'annulation).

### 4.3 TKT-BACK-003 — Autorité `AVIS:MODERER` absente pour le Conservateur
- **Composant :** `ms-utilisateur` / Gateway
- **Impact :** La matrice Flyway V7 n'accorde pas `AVIS:MODERER` au rôle `CONSERVATEUR`. L'accès direct renvoie HTTP 403.
- **Traitement frontend :** La route `/pro/moderation` est protégée par `roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE'])`. Le Conservateur conserve la consultation des alertes dans son cockpit sans écran d'action invalide.
- **Niveau de risque :** Nul (cloisonnement de sécurité respecté).

### 4.4 TKT-BACK-004 — Paramètre PostgreSQL non typifié sur l'agenda guide
- **Composant :** `ms-reservation`
- **Requête :** `ReservationRepository.findGuideReservationsBetweenDates` avec `(:dateDebut IS NULL OR ...)`.
- **Erreur :** `PSQLException: could not determine data type of parameter $4` -> HTTP 500 sur `GET /api/reservations/guide/agenda`.
- **Traitement frontend :** Interception par `ProGuideWorkspacePageComponent`, affichage d'un bandeau d'information explicite expliquant la limitation serveur et indiquant au guide que ses prestations planifiées sont consultables via ses circuits assignés.
- **Niveau de risque :** Modéré (géré élégamment sans bloquer le profil ni les circuits).

### 4.5 TKT-BACK-005 — Absence d'autorité `RESERVATION:CREER` pour le Gestionnaire de site
- **Composant :** `ms-reservation` & `ms-utilisateur`
- **Impact :** Le gestionnaire de site ne peut pas émettre de billet directement au guichet via l'API publique `POST /api/reservations`.
- **Traitement frontend :** Respect de l'intégrité métier : aucun formulaire factice n'a été bricolé. Le terminal de contrôle d'accès sur site (`ProControleAccesPageComponent`) se focalise avec rigueur sur la validation vidéo et manuelle certifiée serveur via `POST /api/visites/valider`.
- **Niveau de risque :** Nul (comportement intègre et sécurisé).
