# PLAN DE TESTS DE SÉCURITÉ ET DE VALIDATION — PHASE P02 (RÉVISÉ P02-CORRECTION)
## Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance — UASZ

---

## 1. STRATÉGIE DE TEST ET CRITÈRES D'ACCEPTATION

La validation de la sécurité de la plateforme repose sur quatre niveaux complémentaires :
1. **Tests unitaires et cryptographiques** : Validation au démarrage des clés secrètes (rejet des clés courtes, de faible entropie ou contenant des motifs interdits), signatures HMAC, jetons CSRF et JWT.
2. **Tests de concurrence et de persistance transactionnelle** : Courses concurrentes multi-threads sur la rotation des refresh tokens et persistance garantie de la révocation de famille en cas de détection de rejeu (sur H2 en mode PostgreSQL et sur **PostgreSQL 16.15 réel**).
3. **Tests de contrôle d'accès (RBAC 5 rôles & BOLA/IDOR fail-closed)** : Vérification systématique des autorisations au Gateway et dans les services métier, y compris pour les ressources sans propriétaire (`utilisateurId == null`) et les contextes absents.
4. **Tests de signature Gateway et Interservices** : Intégrité de la méthode, du chemin normalisé, de l'audience, du corps (`X-Content-SHA256`), de l'identité propagée, de la matrice ACL et du cache anti-rejeu.

---

## 2. MATRICE DÉTAILLÉE DES TESTS DE SÉCURITÉ

### 2.1 Validation des Secrets Cryptographiques & Sessions (`ms-utilisateur`)

| Réf Test | Scénario / Condition Testée | Résultat Attendu |
| :--- | :--- | :--- |
| `SEC-SECRET-01` | Démarrage avec secret vide, `< 32` octets, motif `dev-secret-*` ou faible entropie | Échec immédiat au démarrage (`IllegalStateException`) |
| `SEC-SECRET-02` | Démarrage Gateway avec `SECURITY_SESSION_SECRET == SECURITY_INTERSERVICE_SECRET` | Échec immédiat au démarrage (séparation des clés obligatoire) |
| `SEC-AUTH-01` | Connexion valide | HTTP 200, cookies `PATRIMOINE_SESSION`, `PATRIMOINE_REFRESH` (`Path=/api/utilisateurs`), `XSRF-TOKEN` ; aucun en-tête `X-Refresh-Token` |
| `SEC-AUTH-02` | Rotation atomique normale du Refresh Token | HTTP 200, ancien token marqué `revoked = true`, nouveau token lié par `parent_token_hash` |
| `SEC-AUTH-03` | Course concurrente (10 threads simultanés avec le même Refresh Token sur PG 16) | Exactement **1 succès** (`200 OK`), **9 rejets** (`401 Unauthorized`), **1 seul successeur** créé en base |
| `SEC-AUTH-04` | Détection de rejeu d'un Refresh Token déjà consommé | HTTP 401 **ET** révocation persistée en base de toute la famille `family_id`, désactivation de `session_utilisateur` et entrée `ALERT_TOKEN_REPLAY` dans `audit_securite` |
| `SEC-AUTH-05` | Changement de rôle ou désactivation administrative d'un compte | Révocation immédiate de toutes les sessions et refresh tokens de l'utilisateur ; rejet 401 des anciens JWT |
| `SEC-CSRF-01` | Requête mutative par cookie sans `X-XSRF-TOKEN` ou avec jeton CSRF falsifié | HTTP 403 Forbidden |

### 2.2 Contrôle d'Accès RBAC (5 Rôles & 26 Permissions)

| Réf Test | Rôle Testé | Opération Tentée | Résultat Attendu |
| :--- | :--- | :--- | :--- |
| `SEC-RBAC-01` | `TOURISTE` | Création/modification/suppression de patrimoine, circuit ou événement | HTTP 403 Forbidden (Gateway & Service métier) |
| `SEC-RBAC-02` | `CONSERVATEUR` | Création, modification et suppression de fiche patrimoine (`PATRIMOINE:*`) | HTTP 200 / 201 OK |
| `SEC-RBAC-03` | `CONSERVATEUR` | Création de circuit ou d'événement (`CIRCUIT:CREER`, `EVENEMENT:CREER`) | HTTP 403 Forbidden |
| `SEC-RBAC-04` | `GESTIONNAIRE_SITE` | Création, modification et suppression de circuit et d'événement | HTTP 200 / 201 OK |
| `SEC-RBAC-05` | `GUIDE` | Modification d'un circuit (`CIRCUIT:MODIFIER`) et lecture des réservations | HTTP 200 OK |
| `SEC-RBAC-06` | `GUIDE` | Création ou suppression d'un circuit (`CIRCUIT:CREER`, `CIRCUIT:SUPPRIMER`) | HTTP 403 Forbidden |
| `SEC-RBAC-07` | `ADMINISTRATEUR` | Gestion des utilisateurs, rôles, audit, catalogue et réservations | HTTP 200 / 201 OK |

### 2.3 Protection BOLA / IDOR Fail-Closed (`ms-reservation` & `ms-paiement`)

| Réf Test | Scénario Testé | Résultat Attendu |
| :--- | :--- | :--- |
| `SEC-BOLA-01` | Touriste A tente de lire, annuler ou supprimer la réservation du Touriste B | HTTP 403 Forbidden |
| `SEC-BOLA-02` | Touriste A tente d'accéder ou de payer une réservation dont `utilisateurId` est `null` | HTTP 403 Forbidden (**Fail-Closed**) |
| `SEC-BOLA-03` | Appel de méthode privée avec `SecurityUserContext == null` ou `userId == null` | HTTP 401 Unauthorized (**Fail-Closed**) |
| `SEC-BOLA-04` | Touriste A tente de lire ou supprimer le paiement du Touriste B (ou un paiement sans propriétaire) | HTTP 403 Forbidden |
| `SEC-BOLA-05` | Touriste A tente d'envoyer ou de supprimer des notifications (`ms-notification`) | HTTP 403 Forbidden |

### 2.4 Signatures Gateway & Interservices (`api-gateway` & 7 Microservices)

| Réf Test | Scénario Testé | Résultat Attendu |
| :--- | :--- | :--- |
| `SEC-GW-01` | Réutilisation d'un `X-Internal-Gateway-Token` sur une autre méthode, un autre chemin ou un corps modifié | HTTP 403 Forbidden |
| `SEC-GW-02` | Rejeu du même `X-Internal-Gateway-Token` (même nonce) | HTTP 403 Forbidden |
| `SEC-SVC-01` | Appel interservice avec `X-Service-Audience` différent du service destinataire | HTTP 403 Forbidden |
| `SEC-SVC-02` | Appel interservice avec modification de `X-User-Id`, `X-User-Roles` ou du corps JSON (`X-Content-SHA256`) | HTTP 403 Forbidden |
| `SEC-SVC-03` | Appel interservice par un service non autorisé dans la matrice ACL (ex: `ms-circuit` $\rightarrow$ `ms-reservation` ou `POST` non autorisé) | HTTP 403 Forbidden |
