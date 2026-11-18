# AUDIT INITIAL DE SÉCURITÉ APPLICATIVE — PHASE P02
## Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance — UASZ

**Date de réalisation :** 18 Novembre 2026  
**Branche auditée :** `feature/p02-security-rbac` (issue de `develop` post-fusion P01 `532b74a`)  
**Auditeurs :** Collège d'experts cybersécurité applicative, architecture microservices & Spring Security  
**Périmètre :** `api-gateway`, `ms-utilisateur`, `ms-patrimoine`, `ms-circuit`, `ms-evenement`, `ms-reservation`, `ms-paiement`, `ms-notification`, `frontend-angular`.

---

## 1. CARTOGRAPHIE DES MÉCANISMES DE SÉCURITÉ EXISTANTS

### 1.1 `api-gateway`
- **Filtre actuel :** `GatewayAuthorizationFilter.java` (OncePerRequestFilter).
- **Mécanisme :** Validation d'un cookie `PATRIMOINE_SESSION` ou en-tête `Authorization: Bearer <token>` signé avec HMAC-SHA256 (`Base64(payload).signature`).
- **Limites majeures :**
  - **Aucune suppression des en-têtes d'identité entrants** : si un client tiers fournit `X-User-Id`, `X-User-Roles` ou `X-User-Email`, la passerelle les transmet tels quels en aval vers les microservices.
  - **Aucune injection d'en-têtes vérifiés** vers les microservices avec signature interne d'authenticité.
  - **Routes non couvertes** : `/api/reservations/**` et `/api/paiements/**` ne font l'objet d'aucun contrôle au Gateway et passent directement aux microservices.
  - **Absence de rate limiting** sur `/api/utilisateurs/connexion`.

### 1.2 `ms-utilisateur`
- **Composant d'authentification :** `SessionTokenService.java` et `UtilisateurController.java`.
- **Hachage des mots de passe :** `BCryptPasswordEncoder(10)` configuré dans `SecurityBeansConfig.java`.
- **Format du token :** Jeton HMAC-SHA256 opaque encodé en base64url (`userId|email|role|exp|jti`).
- **Limites majeures :**
  - Jeton unique d'une durée de vie fixe de 8 heures : absence totale de mécanisme **dual-token** (Access Token court + Refresh Token rotatif).
  - Révocation stockée dans un `ConcurrentHashMap` en mémoire vive (`revokedTokenIds`) : **perte intégrale des révocations** au redémarrage ou en cas de réplication du service.
  - Message d'erreur non unifié favorisant l'énumération des comptes.
  - Absence de modèle relationnel pour les rôles et permissions (simple chaîne `VARCHAR(50)` sur `utilisateur`).

### 1.3 `ms-reservation` & `ms-paiement` (Vulnérabilités Métier Critiques)
- **`ms-reservation` :**
  - `ReservationController.java` : Tous les endpoints sont exposés publiquement sans `spring-boot-starter-security`.
  - **BOLA / IDOR Critique (SEC-VULN-01)** : `POST /api/reservations` accepte n'importe quel `idUtilisateur` dans le DTO sans vérifier l'identité de l'appelant. Les endpoints `GET /api/reservations`, `GET /api/reservations/{id}`, `PUT /api/reservations/{id}/annuler`, `DELETE /api/reservations/{id}` ne vérifient aucun propriétaire de ressource. N'importe quel client peut annuler ou consulter les réservations d'autrui.
- **`ms-paiement` :**
  - `PaiementController.java` : `GET /api/paiements` et `GET /api/paiements/{id}` retournent l'intégralité des transactions et données financières à n'importe quel appelant sans contrôle d'autorisation.

### 1.4 Communications Interservices (OpenFeign)
- `CircuitClient.java` (dans `ms-reservation`), `NotificationClient.java` et `ReservationClient.java` (dans `ms-paiement`) :
  - Aucun intercepteur Feign n'injecte de signature de service ou de jeton d'autorisation.
  - Les requêtes circulent en clair sur le réseau interne sans preuve d'authenticité de l'émetteur.

### 1.5 `frontend-angular`
- `auth.store.ts` et `auth.interceptor.ts` :
  - Gestion de session par cookie `PATRIMOINE_SESSION`.
  - Pas de mécanisme de renouvellement transparent via refresh token.
  - Prise en charge incomplète des rôles : `formatRoleLabel()` et `isStaff` ignorent `GUIDE` et `CONSERVATEUR`.
  - Absence de protection CSRF standardisée (token double-submit / `X-XSRF-TOKEN`).

---

## 2. MATRICE COMPLÈTE DES VULNÉRABILITÉS CONFIRMÉES

| Identifiant | Vulnérabilité | Criticité | Composant(s) | Preuve de code / Cause racine | Impact et Risque |
|---|---|:---:|---|---|---|
| **SEC-VULN-01** | BOLA / IDOR sur les réservations | **CRITIQUE** | `ms-reservation`<br>([ReservationController.java](file:///home/mahou-dev/micro-service/ms-reservation/src/main/java/com/uasz/ms_reservation/controllers/ReservationController.java)) | Absence de vérification du propriétaire : `annulerReservation`, `getByIdReservation`, `saveReservation` utilisent directement les identifiants passés en paramètre sans les confronter à l'utilisateur connecté. | Usurpation d'identité, annulation malveillante des séjours d'autres touristes, fuite massive de données personnelles de voyage. |
| **SEC-VULN-02** | Absence de Spring Security et de filtres sur les 6 microservices métier | **CRITIQUE** | `ms-patrimoine`, `ms-circuit`, `ms-evenement`, `ms-reservation`, `ms-paiement`, `ms-notification` | Aucun starter de sécurité dans les `pom.xml`, aucun contrôle d'en-tête interne. Les services font une confiance aveugle au réseau interne `app-net`. | En cas de compromission d'un conteneur ou d'accès direct au réseau Docker, accès illimité et non authentifié à l'ensemble des données et opérations. |
| **SEC-VULN-03** | Falsification des en-têtes d'identité (`X-User-Id`, `X-User-Roles`, etc.) | **ÉLEVÉE** | `api-gateway`<br>([GatewayAuthorizationFilter.java](file:///home/mahou-dev/micro-service/api-gateway/src/main/java/com/uasz/api_gateway/security/GatewayAuthorizationFilter.java)) | La Gateway ne filtre ni ne supprime les en-têtes `X-User-*` injectés par un client externe avant de relayer la requête en aval. | Un attaquant externe peut forger `X-User-Roles: ADMINISTRATEUR` et contourner tous les contrôles avals qui se baseraient naïvement sur cet en-tête. |
| **SEC-VULN-04** | Absence de jeton de renouvellement (Refresh Token) et durée excessive du jeton d'accès | **ÉLEVÉE** | `ms-utilisateur`<br>([SessionTokenService.java](file:///home/mahou-dev/micro-service/ms-utilisateur/src/main/java/com/uasz/ms_utilisateur/security/SessionTokenService.java)) | Jeton de session unique à durée fixe de 8 heures. Pas de rotation de jeton ni de séparation entre jeton d'accès court et jeton de renouvellement long. | Tout jeton intercepté reste exploitable pendant 8 heures entières sans possibilité de détection de vol par rejeu. |
| **SEC-VULN-05** | Liste de révocation volatile en mémoire vive | **ÉLEVÉE** | `ms-utilisateur`<br>([SessionTokenService.java#L28](file:///home/mahou-dev/micro-service/ms-utilisateur/src/main/java/com/uasz/ms_utilisateur/security/SessionTokenService.java#L28)) | `revokedTokenIds` repose sur un simple `ConcurrentHashMap.newKeySet()`. | Lors du redémarrage du conteneur `ms-utilisateur` ou en cas de mise à l'échelle (plusieurs instances), les sessions déconnectées redeviennent valides. |
| **SEC-VULN-06** | Absence d'authentification et de signature interservices OpenFeign | **ÉLEVÉE** | `ms-reservation`, `ms-circuit`, `ms-paiement`, `ms-notification` | Les clients Feign émettent des requêtes HTTP directes sans jeton de service ni signature cryptographique de provenance. | Impossibilité pour un microservice de distinguer un appel légitime d'un autre microservice d'un appel malveillant interne direct. |
| **SEC-VULN-07** | Absence de limitation de débit (Rate Limiting) sur l'authentification | **ÉLEVÉE** | `api-gateway`, `ms-utilisateur` | L'endpoint `/api/utilisateurs/connexion` accepte un nombre illimité de requêtes par seconde sans blocage ni temporisation. | Vulnérabilité aux attaques par force brute distribuée et attaques par déni de service sur le hachage BCrypt. |
| **SEC-VULN-08** | Exposition non restreinte des données financières | **ÉLEVÉE** | `ms-paiement`<br>([PaiementController.java](file:///home/mahou-dev/micro-service/ms-paiement/src/main/java/com/uasz/ms_paiement/controllers/PaiementController.java)) | `GET /api/paiements` renvoie la liste intégrale de tous les paiements enregistrés à tout utilisateur. | Violation de la confidentialité financière et non-conformité aux exigences réglementaires. |
| **SEC-VULN-09** | Modèle RBAC incomplet et absence de permissions granulaires | **MOYENNE** | `ms-utilisateur`<br>([V1__create_utilisateur_schema.sql](file:///home/mahou-dev/micro-service/ms-utilisateur/src/main/resources/db/migration/V1__create_utilisateur_schema.sql)) | Le rôle est stocké sous forme de simple `VARCHAR(50)`. Les entités `Role`, `Permission`, `RolePermission` n'existent pas dans le modèle de données. | Impossibilité de gérer des délégations fines de droits ou d'attribuer des permissions dynamiques aux gestionnaires de site et conservateurs. |
| **SEC-VULN-10** | Absence de protection CSRF standardisée | **MOYENNE** | `api-gateway`, `frontend-angular` | L'authentification repose sur des cookies `SameSite=Lax` sans mécanisme de validation de jeton CSRF (`X-XSRF-TOKEN`). | Vulnérabilité potentielle lors d'actions sensibles déclenchées par navigation croisée de haut niveau. |
| **SEC-VULN-11** | Énumération possible des comptes utilisateurs | **FAIBLE** | `ms-utilisateur`<br>([UtilisateurService.java](file:///home/mahou-dev/micro-service/ms-utilisateur/src/main/java/com/uasz/ms_utilisateur/services/UtilisateurService.java)) | Messages d'erreur distincts lors de la connexion selon que l'adresse e-mail n'existe pas ou que le mot de passe est incorrect. | Permet à un tiers de dresser la liste des adresses électroniques inscrites sur la plateforme. |
| **SEC-VULN-12** | Prise en charge tronquée des rôles dans Angular | **FAIBLE** | `frontend-angular`<br>([auth.store.ts](file:///home/mahou-dev/micro-service/frontend-angular/src/app/core/auth/auth.store.ts)) | Seuls les rôles `ADMINISTRATEUR`, `GESTIONNAIRE_SITE` et `TOURISTE` sont reconnus dans le formatage et les guards UI ; `GUIDE` et `CONSERVATEUR` sont omis. | Expérience utilisateur dégradée et impossibilité d'exploiter les espaces réservés aux guides et conservateurs. |

---

## 3. PRIORITÉS D'ACTION POUR LA PHASE P02

1. **PRIORITÉ 1 (Critique)** : Remédiation BOLA/IDOR dans `ms-reservation` et `ms-paiement` en exigeant le contexte d'identité vérifié de l'appelant pour toute consultation ou modification.
2. **PRIORITÉ 2 (Critique)** : Mise en place du module de sécurité partagé pour les microservices métier, vérifiant un jeton interne signé par la Gateway (`X-Gateway-Auth` HMAC-SHA256 avec horodatage et nonce anti-rejeu) et nettoyant les en-têtes falsifiés à l'entrée.
3. **PRIORITÉ 3 (Élevée)** : Refonte de l'authentification dans `ms-utilisateur` :
   - Dual-token : Access Token JWT court (15 min) + Refresh Token opaque rotatif (7 jours) stocké sous forme de condensat SHA-256 en base PostgreSQL.
   - Détection de rejeu : invalidation immédiate de toute la famille de jetons en cas de tentative de réutilisation.
   - Persistance des sessions et de l'audit en base PostgreSQL (tables `session_utilisateur`, `refresh_token`, `audit_securite`).
4. **PRIORITÉ 4 (Élevée)** : Signature et authentification des appels interservices OpenFeign via intercepteur dédié.
5. **PRIORITÉ 5 (Moyenne)** : Introduction du schéma RBAC complet Flyway V3 dans `ms-utilisateur` (tables `permission`, `role_permission`) et couverture des 5 rôles dans Angular 22.
