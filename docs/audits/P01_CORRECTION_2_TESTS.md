# CAHIER ET PREUVES D'EXÉCUTION DES TESTS — MISSION P01-CORRECTION-2
## Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance — UASZ

**Date d'exécution : 17 Novembre 2026**  
**Environnement : Linux Ubuntu, OpenJDK 21.0.4, Docker 27+, PostgreSQL 16-alpine**  
**Résultat Global : 100% SUCCÈS (0 échec, 0 régression)**  

---

### 1. Synthèse Globale des Suites de Tests

| Suite de Tests | Périmètre | Nombre de Tests | Échecs | Statut |
|---|---|---|---|---|
| **Intégration Backend (9 services)** | `verify-integration.sh` (H2 dev/test, OpenFeign, LoadBalancer, Actuator, MVC) | **89 tests** | 0 | **SUCCÈS** |
| **Persistance & DDL PostgreSQL 16 (7 bases)** | `verify-postgres.sh` (Flyway V1+V2, Hibernate validate, rôles dédiés) | **7 tests** | 0 | **SUCCÈS** |
| **Sécurité & RBAC Gateway** | `GatewayAuthorizationFilterTest.java` (FAIL-CLOSED, anonymous block, roles) | **15 tests** | 0 | **SUCCÈS** |
| **Résolution Dynamique Eureka** | `EurekaLoadBalancerIntegrationTest.java` (LoadBalancer sans URL statique) | **1 test** | 0 | **SUCCÈS** |
| **Frontend Angular 22** | `npx ng test --watch=false` (Composants, stores, guards, interceptors) | **31 tests (13 fichiers)** | 0 | **SUCCÈS** |
| **Validation Docker Compose** | `docker compose --env-file .env.example config -q` (3-tier, mandatory secrets) | **Configuration** | 0 | **SUCCÈS** |

---

### 2. Preuves d'Exécution Détaillées

#### 2.1. Sécurité API Gateway : `GatewayAuthorizationFilterTest` (SEC-01 & SEC-02)
```text
[INFO] Running com.uasz.api_gateway.security.GatewayAuthorizationFilterTest
[INFO] Tests run: 15, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.169 s -- in com.uasz.api_gateway.security.GatewayAuthorizationFilterTest
```
Scénarios validés :
1. `GET /api/patrimoines` sans token $\rightarrow$ HTTP 200 (Consultation publique ouverte).
2. `POST /api/patrimoines` sans token $\rightarrow$ **HTTP 401 Unauthorized** (Bypass anonyme neutralisé).
3. `POST /api/patrimoines/` (trailing slash) sans token $\rightarrow$ **HTTP 401 Unauthorized**.
4. `PUT /api/patrimoines/1` sans token $\rightarrow$ **HTTP 401 Unauthorized**.
5. `PATCH /api/patrimoines/1` sans token $\rightarrow$ **HTTP 401 Unauthorized**.
6. `DELETE /api/patrimoines/1` sans token $\rightarrow$ **HTTP 401 Unauthorized**.
7. `POST /api/patrimoines` avec rôle `TOURISTE` $\rightarrow$ **HTTP 403 Forbidden**.
8. `POST /api/patrimoines` avec rôle `GUIDE` $\rightarrow$ **HTTP 403 Forbidden**.
9. `POST /api/patrimoines` avec rôle `GESTIONNAIRE_SITE` $\rightarrow$ HTTP 200 (Autorisé).
10. `POST /api/patrimoines` avec rôle `CONSERVATEUR` $\rightarrow$ HTTP 200 (Autorisé).
11. `POST /api/patrimoines` avec rôle `ADMINISTRATEUR` $\rightarrow$ HTTP 200 (Autorisé).
12. `POST /api/circuits` sans token $\rightarrow$ **HTTP 401 Unauthorized**.
13. `POST /api/evenements` sans token $\rightarrow$ **HTTP 401 Unauthorized**.
14. Jeton corrompu / signature invalide $\rightarrow$ **HTTP 401 Unauthorized**.
15. Jeton expiré $\rightarrow$ **HTTP 401 Unauthorized**.
16. Validation d'entropie au constructeur ($< 32$ octets) $\rightarrow$ `IllegalStateException`.

#### 2.2. Résolution Dynamique Eureka & LoadBalancer (EUREKA-01)
```text
[INFO] Running com.uasz.ms_circuit.clients.EurekaLoadBalancerIntegrationTest
2026-11-17T21:01:53.166Z  INFO 265950 --- [ms-circuit] [nio-9993-exec-1] o.a.c.c.C.[Tomcat].[localhost].[/] : Initializing Spring DispatcherServlet 'dispatcherServlet'
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 7.530 s -- in com.uasz.ms_circuit.clients.EurekaLoadBalancerIntegrationTest
```
- Client OpenFeign : `@FeignClient(name = "ms-patrimoine", url = "${patrimoine.url:}")`
- Propriété `patrimoine.url` intentionnellement vide dans le test.
- Spring Cloud LoadBalancer intercepte la requête vers `ms-patrimoine`, consulte dynamiquement le supplier de service instances et achemine l'appel HTTP sans URL codée en dur.

#### 2.3. Persistance PostgreSQL 16 & Flyway sur Bases Vierges (DB-01, DB-02, TEST-01, TEST-02)
```text
==================================================================
 VÉRIFICATION FLYWAY & HIBERNATE VALIDATE SUR POSTGRESQL 16 (7/7)
==================================================================
>>> Cible PostgreSQL : 172.20.0.2:5432 (découverte dynamique sans IP codée en dur)
>>> [POSTGRES 16 TEST] ms-patrimoine connecté avec succès ! Nombre de sites : 6
>>> [POSTGRES 16 TEST] ms-circuit connecté avec succès ! Nombre de circuits : 2
>>> [POSTGRES 16 TEST] ms-evenement connecté avec succès ! Nombre d'événements : 3
>>> [POSTGRES 16 TEST] ms-reservation connecté avec succès !
>>> [POSTGRES 16 TEST] ms-utilisateur connecté avec succès ! Nombre d'utilisateurs : 3
>>> [POSTGRES 16 TEST] ms-paiement connecté avec succès !
>>> [POSTGRES 16 TEST] ms-notification connecté avec succès ! Nombre de notifications : 2
==================================================================
 SUCCÈS : Les 7 microservices valident Flyway et Hibernate sur PG 16 !
==================================================================
```

#### 2.4. Tests Unitaires Frontend Angular 22
```text
$ npx ng test --watch=false
Test Files  13 passed (13)
Tests       31 passed (31)
Start at    20:56:45
Duration    6.08s
```
- Authentification & Cookie Session Store : PASS
- Gardes RBAC `roleGuard` (`ADMINISTRATEUR`, `GESTIONNAIRE_SITE`) : PASS
- Intercepteurs HTTP (préfixe `/api/` et mapping des erreurs `ApiError`) : PASS
- Fiche mémorielle, bannières éditoriales et catalogue : PASS

#### 2.5. Durcissement Docker Compose (NET-01 & SEC-03)
- `docker compose --env-file .env.example config -q` $\rightarrow$ Code retour 0 (Configuration valide).
- `docker compose config -q` (sans variables) $\rightarrow$ Rejet immédiat avec listing explicite des variables manquantes (`error while interpolating ... required variable is missing`).
- Réseaux : `edge-net` (public), `app-net` (`internal: true`), `data-net` (`internal: true`).
- Ports publiés sur l'hôte : Strictement `80:80` (Nginx). Ports 8090, 8761 et 5432 non exposés.
