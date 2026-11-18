# AUDIT INITIAL P07 — ESPACES PROFESSIONNELS, GESTIONNAIRES ET ADMINISTRATION

**Projet** : Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance (UASZ — Licence 3 Ingénierie Informatique)  
**Branche de travail** : `feature/p07-professional-admin-frontend`  
**Base Git vérifiée** : `origin/develop` @ `7e9bb4b6119c11b705979beb7f69b00c45e6ee1b` (PR #11 P06 fusionnée)  
**CI de référence sur `develop`** : Run `#40` (`44323617445`) — `completed` / `success`  
**Date** : 2026-11-18  

---

## 1. Synthèse de l’Audit Front-End (`frontend-angular/`)

### 1.1 Existant P01–P06
- Angular `22.2.0` (100 % standalone components, `OnPush`, Signals, `@angular/cdk` Dialog, `@angular/aria/toolbar`, `leaflet`, `ngx-sonner`, Vitest `5.1`, Playwright `1.65.1`).
- Aucune bibliothèque de graphiques tiers ni de data-grid lourd n’est installée (`DEPENDENCIES_DECISIONS.md`) : les visualisations statistiques seront construites en composants SVG / CSS accessibles sans alourdir le bundle.
- Services HTTP déjà en place : `PatrimoineApiService`, `CircuitApiService`, `EvenementApiService`, `ReservationApiService`, `PaiementApiService`, `GuideApiService`, `AvisApiService`, `NotificationApiService`, `AuthStore`, `NotificationStore`.

### 1.2 Écarts et anomalies critiques identifiés avant P07
1. **Absence d’environnement privé distinct du site public** :
   - Toutes les routes (`/administration`, `/espace-guide`, `/notifications`) utilisent `MainLayoutComponent` (en-tête touristique public, recherche patrimoine globale, CTA *Réserver*, footer public).
   - Aucune navigation latérale dédiée, ni barre utilitaire professionnelle, ni fil d’Ariane dans le back-office, ni routes enfants profondes.
2. **Anomalie critique de chaîne d’intercepteurs (`app.config.ts` L34 / `auth.interceptor.ts` L41)** :
   - `httpErrorInterceptor` étant exécuté après `authInterceptor` dans la réponse, il convertit `HttpErrorResponse` en `ApiError` avant que `authInterceptor` ne le reçoive. L’expression `error instanceof HttpErrorResponse && error.status === 401` dans `auth.interceptor.ts` est toujours fausse : le rafraîchissement silencieux `/api/utilisateurs/refresh` et la redirection `/connexion?expired=1` ne se déclenchent jamais.
   - `httpErrorInterceptor` classe actuellement `401` et `403` sous `'business'` plutôt qu’en types distincts `'unauthorized'` / `'forbidden'`.
3. **Failles de séparation des rôles dans l’interface (`app.routes.ts` & `admin-dashboard-page.component.ts`)** :
   - `/administration` autorise `GUIDE` dans `roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR', 'GUIDE'])`.
   - `AdminDashboardPageComponent` est un composant monolithique de **2 992 lignes** où 6 des 9 onglets (`patrimoines`, `circuits`, `evenements`, `reservations`, `paiements`, `utilisateurs`) ne vérifient pas le rôle connecté et exposent les boutons *Créer / Publier / Archiver / Supprimer / Créer staff* à des rôles non autorisés (même si le backend rejette ensuite en 403).
4. **Données non paginées / non filtrées / manquantes** :
   - Les onglets admin Patrimoines, Circuits, Événements et Utilisateurs n’utilisent ni recherche, ni filtres, ni pagination serveur (`GET /api/*/recherche?inclureNonPublies=true` déjà disponible côté API n’est pas utilisé).
   - Aucun tableau de bord analytique d’accueil ni page de statistiques multi-domaines ; seuls 4 indicateurs sur 14 de `ReservationStats` et 4 sur 15 de `PaiementStats` sont affichés.
   - Aucune édition de rôle / statut `actif` sur les utilisateurs (malgré `PUT /api/utilisateurs/{id}`), aucune fiche détaillée de dossier guide avant décision admin, aucun bouton `soumettre()` dans Patrimoines/Circuits/Événements admin, et `NotificationsCenterPageComponent` passe un attribut erroné `message=` au lieu de `description=` à `UiEmptyStateComponent`.
   - Plusieurs actions sensibles (`GuideWorkspacePage.desactiverProfil()`, archivages, annulation d’événement, suppression d’avis, reprise en masse notifications) manquent de confirmation via `UiConfirmDialogComponent`, et certaines erreurs API (401/403/500/503) sont avalées silencieusement via `.catch(() => null)`.
5. **Couverture de tests insuffisante** :
   - Aucun test unitaire pour `auth.guard.ts`, `auth.interceptor.ts`, `GuideWorkspacePageComponent`, `NotificationsCenterPageComponent`, ni pour les workflows RBAC/CRUD Patrimoines, Circuits, Événements, Réservations et Utilisateurs de l’administration.

---

## 2. Synthèse de l’Audit Backend (`api-gateway` & 7 Microservices)

### 2.1 Sécurité & Autorisations existantes
- **Gateway (`GatewayAuthorizationFilter`)** + **`MicroserviceSecurityFilter`** dans chaque microservice valident systématiquement la session (`PATRIMOINE_SESSION` Cookie ou `Authorization: Bearer`), le jeton CSRF `X-XSRF-TOKEN` sur les mutations cookie, les signatures HMAC-SHA256 interservices et le RBAC à **48 permissions granulaires**.
- `GET /api/utilisateurs/me` retourne `UtilisateurDto` (`id`, `nom`, `prenom`, `email`, `telephone`, `role`, `actif`, `dateInscription`) sans liste de permissions : la liste de permissions d’un rôle côté front est dérivée de la table autoritaire P02/P05 (les vérifications backend restant l’unique autorité).
- Contrôles métier & BOLA vérifiés et inviolables :
  - `ms-reservation` interdit la création/confirmation directe d’une réservation sans paiement validé (`ms-paiement` ou `POST /synchroniser`), et restreint le manifeste `/guide/circuits/{circuitId}` au `guideResponsableId` affecté ou à `RESERVATION:LIRE_TOUT`.
  - `ms-paiement` interdit `PUT`/`PATCH`/`DELETE` et réserve `POST /rembourser` et `GET /statistiques` à `ADMINISTRATEUR` (`PAIEMENT:REMBOURSER`, `PAIEMENT:LIRE_TOUT`).
  - `ms-utilisateur` interdit l’auto-validation d’un guide et réserve `GET /guides/admin/tous`, `/valider`, `/rejeter`, `/suspendre`, `/reactiver` à `GESTIONNAIRE_SITE` et `ADMINISTRATEUR`.
  - `ms-notification` réserve `/api/notifications/toutes`, `/relancer`, `/relancer-echecs`, `DELETE` à `ADMINISTRATEUR` (`NOTIFICATION:LIRE_TOUT`, `NOTIFICATION:RELANCER`).

### 2.2 Anomalies & Lacunes Backend identifiées (justifiant des évolutions ciblées)
1. **Défaut PostgreSQL 16 démontré dans `ms-utilisateur` (`GuideProfilRepository.searchPublicGuides`)** :
   - L’usage JPQL de `LOWER(CONCAT('%', :zone, '%'))` lorsque `:zone`, `:langue` ou `:q` est `null` provoque sous PostgreSQL 16 / Hibernate 7 : `ERROR: function lower(bytea) does not exist` (`HTTP 500` sur `GET /api/guides`). À corriger sans modifier le contrat REST.
   - Même durcissement défensif recommandé dans `ms-notification` (`NotificationService`) si `caller.email()` est null.
2. **Absence d’endpoints `/statistiques` sur 5 services et sur la modération** :
   - Seuls `ms-reservation` (`GET /api/reservations/statistiques`) et `ms-paiement` (`GET /api/paiements/statistiques`) exposent des statistiques agrégées côté serveur.
   - Pour respecter l’exigence P07 *"Ne pas récupérer toutes les données en mémoire frontend pour calculer des statistiques globales"*, des endpoints dédiés `GET /statistiques` strictement restreints par rôle/permission sont nécessaires dans :
     - `ms-patrimoine` (`/api/patrimoines/statistiques` — périmètre public pour `GESTIONNAIRE_SITE`/`GUIDE`, complet pour `CONSERVATEUR`/`ADMINISTRATEUR`)
     - `ms-circuit` (`/api/circuits/statistiques` — global pour `GESTIONNAIRE_SITE`/`ADMINISTRATEUR`, filtré au guide connecté pour `GUIDE`)
     - `ms-evenement` (`/api/evenements/statistiques` — `GESTIONNAIRE_SITE`, `ADMINISTRATEUR`)
     - `ms-reservation` (`/api/moderation/statistiques` — `AVIS:MODERER` : `GESTIONNAIRE_SITE`, `ADMINISTRATEUR`)
     - `ms-utilisateur` (`/api/guides/statistiques` pour `GUIDE:VALIDER|SUSPENDRE`, `/api/utilisateurs/statistiques` pour `UTILISATEUR:LIRE_TOUT`, `/api/utilisateurs/audit` pour `AUDIT:LIRE`)
     - `ms-notification` (`/api/notifications/statistiques` — `ADMINISTRATEUR` / `NOTIFICATION:LIRE_TOUT`)
3. **Sécurisation passerelle (`/api/utilisateurs/internal/**` & nouveaux `/statistiques`/`/audit`)** :
   - `GatewayAuthorizationFilter` doit bloquer explicitement `/api/utilisateurs/internal/**` en `403` (comme `/reservations/internal/**`, `/paiements/internal/**`, `/guides/internal/**`) et exiger les permissions appropriées sur `/statistiques` et `/audit`.

---

## 3. Matrice Finale Rôle × Fonctionnalité Back-Office (P07)

| Domaine / Écran (`/pro/...`) | Permissions Backend requises | `GUIDE` | `CONSERVATEUR` | `GESTIONNAIRE_SITE` | `ADMINISTRATEUR` |
|---|---|---|---|---|---|
| **Tableau de bord (`/pro/tableau-de-bord`)** | Selon périmètre | KPIs guide (circuits affectés, avis, notif) | KPIs patrimoines (brouillons/soumis/publiés/archivés) | KPIs circuits, événements, réservations, guides, modération | KPIs globaux multi-services + paiements + notifications + audit |
| **Patrimoines (`/pro/patrimoines`)** | `PATRIMOINE:LIRE` / `CREER` / `MODIFIER` / `PUBLIER` / `ARCHIVER` / `SUPPRIMER` | Consultation fiche publique uniquement | **Complet** (CRUD, soumettre, publier, archiver, supprimer, carte GPS) | **Lecture / Supervision** (sans boutons créer/modifier/publier/archiver/supprimer) | **Complet** |
| **Circuits (`/pro/circuits`)** | `CIRCUIT:LIRE` / `CREER` / `MODIFIER` / `PUBLIER` / `ARCHIVER` / `SUPPRIMER` | **Périmètre BOLA** : ses circuits affectés (`/guide/mes-circuits`), éditer étapes, soumettre (jamais publier/affecter/supprimer) | Lecture seule | **Complet** (+ affectation guide `PATCH /{id}/guide`, soumettre, publier, archiver, supprimer) | **Complet** (+ test comm interservice TP2) |
| **Événements (`/pro/evenements`)** | `EVENEMENT:*` (`CREER`, `MODIFIER`, `PUBLIER`, `ANNULER`, `ARCHIVER`, `SUPPRIMER`) | Consultation publique | Consultation | **Complet** (CRUD, soumettre, publier, terminer, annuler, archiver, supprimer) | **Complet** |
| **Mon Profil Guide (`/pro/mon-profil-guide`)** | `GUIDE:GERER_PROPRE_PROFIL` | **Accès exclusif** (édition, soumission validation, disponibilité/visibilité, désactivation confirmée, historique) | *Refusé* | *Refusé* | *Refusé* (backend interdit) |
| **Admin Guides (`/pro/guides`)** | `GUIDE:VALIDER` / `GUIDE:SUSPENDRE` | *Interdit (403)* | *Interdit (403)* | **Complet** (détail dossier, valider, rejeter, suspendre, réactiver, désactiver, historique) | **Complet** |
| **Réservations (`/pro/reservations`)** | `RESERVATION:LIRE_TOUT`, `RESERVATION:GERER` | *Accès manifestes ci-dessous* | *Interdit (403)* | **Complet** (recherche paginée, dates, détail, synchroniser, annuler ; jamais forcer confirmation) | **Complet** |
| **Manifestes Guide (`/pro/manifestes`)** | `"GUIDE"` ou `RESERVATION:LIRE_TOUT` | **Circuits affectés uniquement** (participants sans données financières) | *Interdit (403)* | Supervision manifestes circuits | Supervision manifestes circuits |
| **Paiements Simulés (`/pro/paiements`)** | `PAIEMENT:LIRE_TOUT`, `PAIEMENT:REMBOURSER` | *Interdit (403)* | *Interdit (403)* | *Interdit (403)* | **Complet** (lecture paginée, stats Wave/OM, remboursement confirmé, replay outbox ; zéro altération manuelle statut) |
| **Modération Avis (`/pro/moderation`)** | `AVIS:MODERER` | *Interdit (403)* | *Interdit (403)* | **Complet** (signalements, décisions motivées, historique, anti-conflit BOLA) | **Complet** |
| **Notifications (`/pro/notifications`)** | `NOTIFICATION:LIRE_PROPRE` vs `LIRE_TOUT` / `RELANCER` | Boîte personnelle uniquement | Boîte personnelle uniquement | Boîte personnelle uniquement | Boîte personnelle **+** Supervision globale, stats, relance échecs |
| **Utilisateurs & Audit (`/pro/utilisateurs`)** | `UTILISATEUR:LIRE_TOUT`, `CREER_STAFF`, `GERER_ROLES`, `SUPPRIMER`, `AUDIT:LIRE` | *Interdit (403)* | *Interdit (403)* | *Interdit (403)* | **Complet** (liste paginée/filtrée, création, rôle/activation via `PUT /{id}`, révocation sessions, suppression, audit sécurité) |
| **Statistiques (`/pro/statistiques`)** | Endpoints `/statistiques` par domaine | Vue guide | Vue patrimoine | Vue exploitation & modération | Vue analytique complète |

*(Le rôle `TOURISTE` et les utilisateurs anonymes n’ont accès à aucune route `/pro/**` et restent cantonnés au site public et à `/mon-espace`.)*
