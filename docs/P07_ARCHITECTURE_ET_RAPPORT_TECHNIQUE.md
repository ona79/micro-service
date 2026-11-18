# MISSION P07 — ARCHITECTURE BACK-OFFICE, SÉCURITÉ RBAC/BOLA ET RAPPORT TECHNIQUE

**Projet** : Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance (UASZ — Licence 3 Ingénierie Informatique)  
**Branche de réalisation** : `feature/p07-professional-admin-frontend` (issue de `origin/develop`)  
**Audit initial de référence** : [`docs/audits/P07_AUDIT_INITIAL.md`](audits/P07_AUDIT_INITIAL.md)  
**Stack** : Java 21 · Spring Boot 4.1.0 · Spring Cloud Gateway · Eureka · PostgreSQL 16 · Flyway · Angular 22.2 · Nginx

---

## 1. Principes d'Architecture & Séparation Public / Professionnel

P07 sépare strictement l'expérience touristique publique (`MainLayoutComponent` sur `/`, `/patrimoines`, `/circuits`, `/evenements`, `/guides`, `/mon-espace`) du back-office professionnel (`ProLayoutComponent` chargé en lazy-loading sur `/pro/**`), sans recourir à aucune donnée statique ni statistique simulée côté client :

- **Shell dédié `/pro/**`** (`frontend-angular/src/app/core/layout/pro-layout/pro-layout.component.*`) :
  - Barre latérale rétractable structurée en sections métier (`Pilotage`, `Catalogue & Opérations`, `Guides & Voyageurs`, `Transactions & Alertes`, `Sécurité & Gouvernance`), filtrée dynamiquement selon `RoleUtilisateur` et `PermissionService`.
  - Topbar utilitaire avec fil d'Ariane de route, compteur temps réel des notifications non lues, badge de rôle utilisateur et action directe `Site public` / `Déconnexion`.
  - Redirection post-connexion différenciée (`getDefaultPostLoginRoute`) : `TOURISTE` vers `/mon-espace`, acteurs professionnels (`ADMINISTRATEUR`, `GESTIONNAIRE_SITE`, `CONSERVATEUR`, `GUIDE`) vers `/pro/tableau-de-bord`.
- **Compatibilité & Corrections P07** :
  - `/administration` reste accessible aux rôles `ADMINISTRATEUR`, `GESTIONNAIRE_SITE` et `CONSERVATEUR` (excluant `GUIDE`) avec onglets filtrés par permissions.
  - `/espace-guide` redirige proprement vers `/pro/mon-profil-guide` (protégé par `authGuard`, `roleGuard(['GUIDE'])` et `permissionGuard(['GUIDE:GERER_PROPRE_PROFIL'])`).
  - Correction de `authInterceptor` : prise en charge des erreurs normalisées `ApiError` sur `401`, verrou `inFlightRefresh$` mutualisé lors des rafraîchissements concurrents, et résolution paresseuse de `Router` via `Injector` afin d'éviter toute dépendance circulaire `NG0200` pendant `provideAppInitializer`.
  - Correction d'`AccountPageComponent` (`myReservations`) : un compte staff ne charge plus toutes les réservations du système sur `/mon-espace` (réservations filtrées par utilisateur connecté) et dispose d'un raccourci vers `/pro/tableau-de-bord`.
  - Correction de `NotificationsCenterPageComponent` (lien `/pro/mon-profil-guide` et métadonnée SEO `description`).
  - Correction `frontend-angular/nginx.conf` (`proxy_buffer_size 16k`, `proxy_buffers 8 16k`, `proxy_busy_buffers_size 32k`) afin d'éviter l'erreur `502 upstream sent too big header` lors des connexions avec cookies JWT HttpOnly transportant les 47 permissions `ADMINISTRATEUR`.

---

## 2. Matrice RBAC, BOLA et Parcours par Rôle (`PermissionService` & Routes `/pro/**`)

Le modèle front-end (`frontend-angular/src/app/core/auth/permissions.ts`) aligne **48 permissions** (`47` attribuées à `ADMINISTRATEUR`, plus `GUIDE:GERER_PROPRE_PROFIL` réservée à `GUIDE`) avec `GatewayAuthorizationFilter` et `SecurityUserContext` :

| Route `/pro/**` | Composant standalone | Rôles autorisés (`roleGuard`) | Permissions / Isolation BOLA |
| :--- | :--- | :--- | :--- |
| `/pro/tableau-de-bord` | `ProDashboardPageComponent` | `ADMINISTRATEUR`, `GESTIONNAIRE_SITE`, `CONSERVATEUR`, `GUIDE` | Ne sollicite que les endpoints `/statistiques` autorisés pour le rôle connecté |
| `/pro/statistiques` | `ProStatistiquesPageComponent` | `ADMINISTRATEUR`, `GESTIONNAIRE_SITE`, `CONSERVATEUR`, `GUIDE` | Graphiques en barres alimentés exclusivement par `/statistiques` serveur |
| `/pro/patrimoines` | `ProPatrimoinesPageComponent` | `ADMINISTRATEUR`, `CONSERVATEUR`, `GESTIONNAIRE_SITE` | `GESTIONNAIRE_SITE` strictement en **lecture seule** ; création/workflow réservés à `PATRIMOINE:CREER/MODIFIER/PUBLIER/SUPPRIMER` |
| `/pro/circuits` | `ProCircuitsPageComponent` | `ADMINISTRATEUR`, `GESTIONNAIRE_SITE`, `GUIDE` | Vérifie `CIRCUIT:CREER`, `CIRCUIT:MODIFIER`, `CIRCUIT:PUBLIER` ; côté backend `ms-circuit`, un `GUIDE` ne peut lire ni modifier un circuit non publié appartenant à autrui |
| `/pro/evenements` | `ProEvenementsPageComponent` | `ADMINISTRATEUR`, `GESTIONNAIRE_SITE` | Création, édition, publication, annulation, clôture et suppression sur `ms-evenement` |
| `/pro/guides` | `ProGuidesAdminPageComponent` | `ADMINISTRATEUR`, `GESTIONNAIRE_SITE` | Permission `GUIDE:VALIDER` : validation, rejet, suspension, réactivation, historique |
| `/pro/mon-profil-guide` | `ProGuideWorkspacePageComponent` | `GUIDE` | Permission `GUIDE:GERER_PROPRE_PROFIL` : édition profil public/justificatifs, soumission validation, activation/désactivation |
| `/pro/manifestes` | `ProManifestesPageComponent` | `GUIDE`, `GESTIONNAIRE_SITE`, `ADMINISTRATEUR` | Liste nominative opérationnelle des voyageurs par circuit sans exposition financière |
| `/pro/reservations` | `ProReservationsPageComponent` | `ADMINISTRATEUR`, `GESTIONNAIRE_SITE` | Permissions `RESERVATION:LIRE_TOUT` / `RESERVATION:GERER` : suivi multi-statuts, confirmation/expiration/annulation |
| `/pro/paiements` | `ProPaiementsPageComponent` | `ADMINISTRATEUR` | Permission `PAIEMENT:LIRE_TOUT` : suivi transactions simulées Wave/Orange Money, remboursements simulés (`PAIEMENT:REMBOURSER`), reprise outbox |
| `/pro/moderation` | `ProModerationPageComponent` | `ADMINISTRATEUR`, `GESTIONNAIRE_SITE` | Permission `AVIS:MODERER` : approbation, masquage, rejet d'avis, traitement des signalements |
| `/pro/notifications` | `ProNotificationsPageComponent` | `ADMINISTRATEUR`, `GESTIONNAIRE_SITE`, `CONSERVATEUR`, `GUIDE` | Boîte de réception personnelle + supervision globale & relance `ECHEC_TEMPORAIRE` réservées à `NOTIFICATION:LIRE_TOUT` / `NOTIFICATION:RELANCER` |
| `/pro/utilisateurs` | `ProUtilisateursPageComponent` | `ADMINISTRATEUR` | Permission `UTILISATEUR:LIRE_TOUT` : comptes paginés, création staff/admin, rôles/activation, révocation sessions, onglet journal d'audit sécurité |

Le rôle `TOURISTE` est systématiquement bloqué de tout `/pro/**` vers `/acces-refuse` côté front-end et par `403 Forbidden` au niveau de `GatewayAuthorizationFilter` et des microservices.

---

## 3. Endpoints Backend P07, Durcissement & Corrections Critiques

1. **Passerelle API (`api-gateway` — `GatewayAuthorizationFilter`)** :
   - Blocage strict `403` des routes internes `/api/utilisateurs/internal/**` (s'ajoutant à `/api/guides/internal/**`, `/api/paiements/internal/**`, etc.).
   - Contrôles RBAC explicites ajoutés sur `/api/utilisateurs/statistiques`, `/api/utilisateurs/recherche`, `/api/utilisateurs/audit`, `/api/utilisateurs/{id}/revoquer-sessions`, `/api/guides/statistiques` et sur l'ensemble des endpoints `/statistiques` catalogue/opérations.
   - Correction du mapping d'action `resolveRequiredCatalogPermission` : `/soumettre` exige `:MODIFIER` (permettant à un `GUIDE` de soumettre son propre circuit sur `ms-circuit`), et `/terminer` exige `EVENEMENT:MODIFIER`.

2. **Microservices métier (`GET /statistiques`, recherche, audit & BOLA)** :
   - `ms-patrimoine` : `GET /api/patrimoines/statistiques` (`PatrimoineStatsDto`).
   - `ms-circuit` : `GET /api/circuits/statistiques` (`CircuitStatsDto`) et **isolation BOLA en lecture** dans `CircuitService` (`getAllCircuits`, `rechercherCircuits`, `getByIdCircuit`) empêchant un `GUIDE` de consulter les brouillons d'un autre guide.
   - `ms-evenement` : `GET /api/evenements/statistiques` (`EvenementStatsDto`).
   - `ms-reservation` : réutilisation de `/api/reservations/statistiques` + ajout de `GET /api/moderation/statistiques` (`ModerationStatsDto`).
   - `ms-notification` : `GET /api/notifications/statistiques` (`NotificationStatsDto`) et protection null-safe sur l'e-mail appelant (`safeEmail`).
   - `ms-utilisateur` :
     - Correction PostgreSQL 16 `ERROR: function lower(bytea) does not exist` dans `GuideProfilRepository` (`searchPublicGuides` et `findAllAdminFiltered` scindés en requêtes JPQL sans paramètres `LIKE` nullables complétées par un filtrage côté service).
     - Ajout de `GET /api/utilisateurs/recherche`, `GET /api/utilisateurs/statistiques` (`UtilisateurStatsDto`), `GET /api/utilisateurs/audit` (`AuditSecuriteDto` paginé via `JpaSpecificationExecutor`) et `GET /api/guides/statistiques` (`GuideStatsDto`).

---

## 4. Composants UI Réutilisables

Sous `frontend-angular/src/app/shared/components/` :
- `UiKpiCardComponent` : cartes KPI uniformisées (alignement vertical complet en grille, variante cliquable, ton sémantique Casamance).
- `UiBarChartComponent` : barres horizontales comparatives accessibles et proportionnelles pour les distributions réelles serveur.
- `UiPaginationComponent` : pagination serveur unifiée (`page`, `totalPages`, `totalElements`).
- `UiDetailDrawerComponent` : panneau latéral accessible de détail pour inspecter fiches, réservations, paiements ou logs sans perdre le contexte de liste.

---

## 5. Vérifications et Commandes de Preuve

Les vérifications automatisées exécutées sur la branche `feature/p07-professional-admin-frontend` :
- Suite backend multi-services : `./verify-integration.sh`
- Validation Flyway & Hibernate Validate sur PostgreSQL 16 (`7/7`) : `POSTGRES_TEST_ENV_FILE=.env ./verify-postgres.sh`
- Tests unitaires & d'intégration front-end (Vitest) : `cd frontend-angular && npx ng test --no-watch`
- Build production Angular 22 : `cd frontend-angular && npm run build`
- Tests E2E Playwright (Desktop `1280x800` & Mobile `375x812`) : `cd frontend-angular && npx playwright test e2e/p06-tourism.spec.ts e2e/p07-backoffice.spec.ts`
- Validation en conditions réelles Docker Compose (`http://localhost` via Nginx -> `api-gateway` -> microservices -> PostgreSQL 16) des flux de connexion cookie HttpOnly, des 10+ endpoints `/statistiques`, `/recherche`, `/audit`, de `/api/guides` et des rejets RBAC `403`.
