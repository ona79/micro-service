# RAPPORT FINAL DE RÉALISATION, REMÉDIATION ET VALIDATION TECHNIQUE — PHASE P02 & P02-CORRECTION
## PLATEFORME DE GESTION ET DE VALORISATION DU PATRIMOINE TOURISTIQUE DE LA CASAMANCE
### UNIVERSITÉ ASSANE SECK DE ZIGUINCHOR (UASZ) — DÉPARTEMENT D'INFORMATIQUE

---

## FICHE D'IDENTIFICATION DU LIVRABLE

| Métadonnée | Valeur |
| :--- | :--- |
| **Projet** | Plateforme Microservices & Angular du Patrimoine de Casamance |
| **Livrable** | Rapport de Clôture Technique P02 (incluant la remédiation complète **P02-CORRECTION**) |
| **Branche de travail** | `feature/p02-security-rbac` |
| **Branche cible du PR** | `develop` (contenant la fusion validée de P01) |
| **Statut de validation** | **APPROUVÉ — 162 TESTS EXÉCUTÉS ET RÉUSSIS (H2 + POSTGRESQL 16.15 RÉEL + ANGULAR 22), 0 ÉCHEC** |
| **Audience** | Jury Universitaire, Direction Technique & Ingénierie Logicielle UASZ |
| **Date d'exécution** | 18 Novembre 2026 |

---

## 1. SYNTHÈSE DES REMÉDIATIONS P02-CORRECTION (REVUE INDÉPENDANTE)

Suite à la revue indépendante du code source de la phase P02 (commit `172a60e`), l'ensemble des anomalies critiques et majeures identifiées ont été corrigées de manière atomique et vérifiées expérimentalement :

| Réf Section | Anomalie Identifiée lors de la Revue | Remédiation Technique Implémentée |
| :--- | :--- | :--- |
| **Section 2** | Clés secrètes de secours codées en dur (`dev-secret-*`) dans les `application.yml` et constructeurs | Suppression totale de toutes les clés de secours dans les 8 microservices et `api-gateway`. Variables `${SECURITY_SESSION_SECRET}` et `${SECURITY_INTERSERVICE_SECRET}` obligatoires. Validation stricte au démarrage ($\ge 32$ octets, $\ge 10$ caractères distincts, rejet des motifs prévisibles, séparation des clés session/interservice). Génération CSPRNG éphémère en test (`TestEphemeralSecretsPostProcessor`). |
| **Section 3** | Rollback de la révocation de famille sur erreur 401, concurrence de rotation et exposition de `X-Refresh-Token` | Ajout de `@Transactional(noRollbackFor = {UnauthorizedException.class, ForbiddenException.class})` sur `AuthSessionManager.refreshSession`. Verrouillage pessimiste `SELECT ... FOR UPDATE` (`findByTokenHashForUpdate`), consommation atomique conditionnelle (`consumeTokenAtomically`) et migration Flyway **V4** (`parent_token_hash UNIQUE`). Suppression totale de l'en-tête `X-Refresh-Token` en lecture et en écriture (usage exclusif du cookie HttpOnly `PATRIMOINE_REFRESH` avec `Path=/api/utilisateurs`). |
| **Section 4** | Signatures Gateway et Interservices incomplètes et confiance au seul `X-Service-Name` | Enveloppe Gateway (`X-Internal-Gateway-Token`) désormais en 3 parties `<ts>.<nonce>.<sig>` signant **10 champs** (`METHOD\|PATH\|USER_ID\|ROLES\|PERMS\|EMAIL\|SESSION_ID\|TS\|NONCE\|BODY_SHA256`) avec cache anti-rejeu. Signature interservices (`X-Service-Signature`) signant **11 champs** (`METHOD\|PATH\|AUDIENCE\|CALLER\|TS\|NONCE\|USER_ID\|ROLES\|PERMS\|EMAIL\|BODY_SHA256`) sur OpenFeign, `RestTemplate` et `WebClient`, complétée par une **Matrice ACL** stricte par service destinataire. |
| **Section 5** | Contournement BOLA/IDOR lorsque `utilisateurId` est `null` ou contexte absent | Politique **Fail-Closed** dans `ReservationService` et `PaiementService` : rejet systématique (`401 Unauthorized` si `SecurityUserContext` ou `userId` est `null`, `403 Forbidden` si `reservation.utilisateurId` ou `paiement.utilisateurId` est `null` pour un non-privilégié). Isolation des routes de `ms-notification`. |
| **Section 6** | Modèle RBAC granulaire incomplet (rôles `GUIDE`, `CONSERVATEUR`, `GESTIONNAIRE_SITE`) | Initialisation complète des **26 permissions** et associations `role_permission` pour les **5 rôles**. Application effective des permissions dans `GatewayAuthorizationFilter` et dans les 7 services métier (`PatrimoineService`, `CircuitService`, `EvenementService`, `ReservationService`, `PaiementService`, `NotificationService`, `UtilisateurController`). |
| **Section 7** | Protection CSRF absente et attributs de cookies incomplets | Implémentation d'un jeton CSRF signé par HMAC lié à la session (`XSRF-TOKEN = HMAC-SHA256("CSRF:" + sessionId)`) vérifié via l'en-tête `X-XSRF-TOKEN` sur les requêtes mutatives par cookie. Cookies `PATRIMOINE_SESSION` (`Path=/`), `PATRIMOINE_REFRESH` (`Path=/api/utilisateurs`) et `XSRF-TOKEN` (`Path=/`) avec `SameSite=Strict`, `Secure` (HTTPS/Prod) et purge `Max-Age=0` à la déconnexion. |
| **Section 8** | Maintien des sessions actives après changement de rôle, désactivation ou suppression d'un compte | Révocation immédiate de toutes les sessions (`session_utilisateur`) et `refresh_token` lors d'un changement de rôle, d'une désactivation (`actif=false`) ou d'une suppression d'utilisateur, avec propagation d'invalidation au Gateway et vérification de cohérence du rôle actif. |

---

## 2. ARCHITECTURE DE SÉCURITÉ DISTRIBUÉE ET PORTS RÉELS

| Service | Port | Base PostgreSQL 16 | Mécanismes de Sécurité Actifs |
| :--- | :---: | :--- | :--- |
| `discovery-server` | `:8761` | — | Registre Eureka |
| `api-gateway` | `:8090` | — | Sanitization, JWT HS256, CSRF HMAC, RBAC 26 permissions, Rate-Limiting, Enveloppe 10 champs |
| `ms-patrimoine` | `:3001` | `patrimoine_db` | `MicroserviceSecurityFilter` (Enveloppe + ACL Feign), RBAC (`PATRIMOINE:*`) |
| `ms-circuit` | `:3002` | `circuit_db` | `MicroserviceSecurityFilter`, Signatures Feign/RestTemplate/WebClient, RBAC (`CIRCUIT:*`) |
| `ms-evenement` | `:3003` | `evenement_db` | `MicroserviceSecurityFilter`, RBAC (`EVENEMENT:*`) |
| `ms-reservation` | `:3004` | `reservation_db` | `MicroserviceSecurityFilter`, BOLA/IDOR Fail-Closed, RBAC (`RESERVATION:*`), Feign signé |
| `ms-utilisateur` | `:3005` | `utilisateur_db` | IdP JWT, Rotation RTR `FOR UPDATE` + Flyway V4, CSRF, Audit, Invalidation immédiate |
| `ms-paiement` | `:3006` | `paiement_db` | `MicroserviceSecurityFilter`, BOLA/IDOR Fail-Closed, RBAC (`PAIEMENT:*`), Feign signé |
| `ms-notification` | `:3007` | `notification_db` | `MicroserviceSecurityFilter` (ACL `ms-reservation` & `ms-paiement`), RBAC Admin |

---

## 3. RÉSULTATS EXACTS ET VÉRIFIÉS DES SUITES DE TESTS

Conformément aux exigences de transparence documentaire, le tableau ci-dessous distingue strictement les tests exécutés et réussis en mode standard (`./verify-integration.sh`), les tests exécutés et réussis sur **PostgreSQL 16.15 réel** (`./verify-postgres.sh`), les tests échoués et les tests sautés :

| Composant | Total Tests Déclarés | Exécutés & Réussis (`verify-integration.sh` H2/MockMvc) | Exécutés & Réussis (`verify-postgres.sh` PG 16.15 Réel) | Échecs | Sautés (Mode H2 seul) | Sautés après exécution PG 16 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **discovery-server** | 1 | 1 | — | 0 | 0 | 0 |
| **ms-patrimoine** | 22 | 21 | 1 | 0 | 1 (`PatrimoinePostgresIntegrationTest`) | 0 |
| **ms-circuit** | 16 | 14 | 1 | 0 | 2 (`CircuitPostgresIntegrationTest`, `EurekaRealDiscoveryIntegrationTest`) | **1** (`EurekaRealDiscoveryIntegrationTest`*) |
| **ms-evenement** | 8 | 7 | 1 | 0 | 1 (`EvenementPostgresIntegrationTest`) | 0 |
| **ms-reservation** | 13 | 12 | 1 | 0 | 1 (`ReservationPostgresIntegrationTest`) | 0 |
| **ms-utilisateur** | 29 | 27 | 2 | 0 | 2 (`UtilisateurPostgresIntegrationTest` : Flyway + Concurrence 10 threads) | 0 |
| **ms-notification** | 7 | 6 | 1 | 0 | 1 (`NotificationPostgresIntegrationTest`) | 0 |
| **ms-paiement** | 11 | 10 | 1 | 0 | 1 (`PaiementPostgresIntegrationTest`) | 0 |
| **api-gateway** | 23 | 23 | — | 0 | 0 | 0 |
| **Sous-total Backend (9 services)** | **130** | **121** | **8** | **0** | **9** | **1*** |
| **frontend-angular (Vitest)** | **33** | **33** | — | **0** | **0** | **0** |
| **TOTAL CONSOLIDÉ** | **163** | **154** (H2 + UI) | **+8** (PG 16.15) = **162 exécutés & réussis** | **0** | **9** (sans PG 16) | **1 sauté / 0 non exécuté** |

*\*Note sur l'unique test sauté hors E2E : `EurekaRealDiscoveryIntegrationTest` (`ms-circuit`) est annoté `@EnabledIfSystemProperty(named = "eureka.real.test", matches = "true")` et requiert des processus externes `discovery-server` (:8761) et `ms-patrimoine` (:3001) démarrés simultanément. Il n'est **jamais** compté parmi les tests unitaires réussis.*

### Preuve d'Exécution de Concurrence et de Persistance sur PostgreSQL 16.15 (`UtilisateurPostgresIntegrationTest`)
- **Base cible :** `jdbc:postgresql://172.20.0.2:5432/utilisateur_db` (PostgreSQL 16.15, isolation `READ_COMMITTED` + verrouillage `SELECT ... FOR UPDATE`).
- **Migrations Flyway appliquées :** `V1`, `V2`, `V3`, `V4__concurrent_refresh_and_session_invalidation.sql` (`schema version 4`).
- **Résultat du test de course concurrente (10 threads simultanés présentant le même Refresh Token) :**
  - `Threads = 10`
  - `Succès = 1` (exactement 1 rotation réussie)
  - `Rejets = 9` (9 rejets atomiques `401 Unauthorized`)
  - `SuccesseursCréés = 1` (garanti par `SELECT ... FOR UPDATE`, `consumeTokenAtomically` et la contrainte `uk_refresh_token_parent_hash`)
- **Résultat du test de rejeu sur PostgreSQL 16.15 :**
  - La réutilisation du jeton parent déjà consommé lève `401 Unauthorized` **tout en committant** la révocation de toute la famille (`allRevoked = true`), la désactivation de `session_utilisateur` (`active = false`, `revocation_reason = 'TOKEN_REPLAY_DETECTED'`) et l'enregistrement de `ALERT_TOKEN_REPLAY` dans `audit_securite`.

---

## 4. COMMANDES DE VÉRIFICATION REPRODUCTIBLES

```bash
# 1. Exécution des 121 tests unitaires/intégration Backend (9 services)
./verify-integration.sh

# 2. Exécution des 8 tests d'intégration & concurrence sur PostgreSQL 16 réel (7 microservices)
eval "$(docker inspect postgres --format '{{range .Config.Env}}{{println "export " .}}{{end}}' | grep '_PASSWORD=')" && ./verify-postgres.sh

# 3. Exécution des 33 tests Frontend Angular 22 (13 suites Vitest)
npm --prefix frontend-angular run test -- --watch=false
```

---
*Fin du rapport technique P02 / P02-CORRECTION — Université Assane Seck de Ziguinchor.*
