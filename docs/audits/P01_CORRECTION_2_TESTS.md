# CAHIER ET PREUVES D'EXÉCUTION DES TESTS — MISSION P01-CORRECTION-2 & CLÔTURE FINALE
## Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance — UASZ

**Date d'exécution : 17 Novembre 2026**  
**Environnement : Linux Ubuntu, OpenJDK 21.0.4, Docker 27+, PostgreSQL 16-alpine**  
**Branche Git : `feature/p01-architecture-foundations`**  
**Résultat Global : 100% SUCCÈS (0 échec, 0 régression, 0 simulation sur Eureka)**  

---

### 1. Synthèse Globale des Suites de Tests

| Suite de Tests | Script / Commande | Périmètre & Type | Nombre de Tests | Échecs | Statut |
|---|---|---|---|---|---|
| **Intégration Backend (9 services)** | `./verify-integration.sh` | Unitaire / Composant (H2, OpenFeign, Actuator, MVC) | **89 tests** | 0 | **SUCCÈS** |
| **Persistance & DDL PostgreSQL 16 (7 bases)** | `./verify-postgres.sh` | Intégration Réelle PostgreSQL 16 (Flyway V1+V2, Hibernate validate, rôles dédiés) | **7 tests** | 0 | **SUCCÈS** |
| **Découverte Dynamique Eureka Réelle** | `./verify-eureka-real.sh` | Intégration Réelle Multi-Processus (Eureka 8761 + ms-patrimoine 3001 + OpenFeign ms-circuit) | **1 test réel** | 0 | **SUCCÈS** |
| **Sécurité & RBAC Gateway** | `mvn test -Dtest=GatewayAuthorizationFilterTest` | Unitaire & Intégration (FAIL-CLOSED, anonymous block, roles, entropy, CHANGE_ME rejection) | **16 tests** | 0 | **SUCCÈS** |
| **Résolution LoadBalancer Mockée** | `mvn test -Dtest=EurekaLoadBalancerMockTest` | Unitaire / Résilience (LoadBalancer avec mock supplier) | **1 test** | 0 | **SUCCÈS** |
| **Frontend Angular 22** | `npm run build && npx ng test --watch=false` | Compilation & Vitest (Composants, stores, guards, interceptors) | **31 tests (13 fichiers)** | 0 | **SUCCÈS** |
| **Validation Docker Compose** | `docker compose config -q` | Validation de syntaxe, interpolation fail-fast et réseaux | **Configuration** | 0 | **SUCCÈS** |

---

### 2. Preuves d'Exécution Détaillées

#### 2.1. Sécurité API Gateway : `GatewayAuthorizationFilterTest` (SEC-01 & SEC-02)
```text
[INFO] Running com.uasz.api_gateway.security.GatewayAuthorizationFilterTest
[INFO] Tests run: 16, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.490 s -- in com.uasz.api_gateway.security.GatewayAuthorizationFilterTest
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
16. Validation d'entropie au constructeur ($< 32$ octets ou présence du marqueur `CHANGE_ME`) $\rightarrow$ **`IllegalStateException`**.

---

#### 2.2. Preuve Réelle de Découverte Eureka & OpenFeign : `./verify-eureka-real.sh` (EUREKA-01)
Architecture du test exécuté :
1. **`discovery-server`** : Vrai serveur Eureka démarré sur port 8761.
2. **`ms-patrimoine`** : Vraie instance Spring Boot démarrée sur port 3001, connectée à Eureka.
3. **`ms-circuit`** : Client OpenFeign réel (`PatrimoineClient`) avec `@FeignClient(name = "ms-patrimoine", url = "${patrimoine.url:}")` (URL vide), utilisant Spring Cloud LoadBalancer pour interroger le registre Eureka.
4. **AUCUN** `MockPatrimoineServer`, **AUCUN** `TestLoadBalancerConfig`, **AUCUN** bouchon in-memory.

Trace de l'exécution formelle :
```text
==================================================================
 PREUVE EUREKA-01 RÉELLE : DÉCOUVERTE & COMMUNICATION INTERSERVICES
 (discovery-server <-> ms-patrimoine <-> ms-circuit OpenFeign)
==================================================================
>>> [1/4] Démarrage du vrai serveur Eureka (discovery-server sur port 8761)...
    [OK] Serveur Eureka opérationnel (PID: 315301).
>>> [2/4] Démarrage de ms-patrimoine réel (port 3001, profil dev)...
    [OK] ms-patrimoine opérationnel (PID: 315557).
>>> [3/4] Attente de l'enregistrement de MS-PATRIMOINE dans le registre Eureka...
    [OK] MS-PATRIMOINE est enregistré dans Eureka avec statut UP !
>>> [4/4] Exécution du test de découverte Eureka et appel OpenFeign depuis ms-circuit...
2026-11-17T21:30:44.957Z  INFO [ms-circuit] : For 'ms-patrimoine' URL not provided. Will try picking an instance via load-balancing.
==================================================================
>>> [PREUVE EUREKA RÉELLE] Instance découverte depuis Eureka :
    - Service ID  : MS-PATRIMOINE
    - Instance ID : mahou-dev:ms-patrimoine:3001
    - Hôte / Port : 10.158.115.114:3001
    - URI cible   : http://10.158.115.114:3001
==================================================================
>>> [PREUVE EUREKA RÉELLE] Données patrimoniales reçues avec succès :
    - ID          : 1
    - Nom         : Mémorial de la Tragédie du Joola
    - Code        : PAT-ZIG-001
    - Adresse     : Esplanade du Fleuve Casamance, Boucotte, Ziguinchor
==================================================================
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 20.47 s -- in com.uasz.ms_circuit.clients.EurekaRealDiscoveryIntegrationTest
[INFO] BUILD SUCCESS
==================================================================
 SUCCÈS : Preuve formelle EUREKA-01 validée à 100 % !
 La découverte dynamique Eureka et l'appel OpenFeign sont réels.
==================================================================
```

---

#### 2.3. Preuve d'Élimination des Secrets de Secours (SEC-03 & SEC-02)

1. **Test d'exécution sans variables obligatoires** :
```bash
env -i bash ./docker/postgres/init-multi-postgres.sh
# Résultat :
# ./docker/postgres/init-multi-postgres.sh: line 18: POSTGRES_ROOT_PASSWORD: Variable POSTGRES_ROOT_PASSWORD ou POSTGRES_PASSWORD obligatoire
# Code retour : != 0 (Échec immédiat fail-fast)

env -i bash ./verify-postgres.sh
# Résultat :
# ./verify-postgres.sh: line 26: PATRIMOINE_DB_PASSWORD: Variable PATRIMOINE_DB_PASSWORD obligatoire pour le test
# Code retour : != 0 (Échec immédiat fail-fast)
```

2. **Test de rejet des marqueurs d'exemple `CHANGE_ME`** :
```bash
env -i PATRIMOINE_DB_PASSWORD=CHANGE_ME ... bash ./docker/postgres/init-multi-postgres.sh
# Résultat :
# [ERREUR CRITIQUE DE SÉCURITÉ] La variable PATRIMOINE_DB_PASSWORD contient un marqueur d'exemple 'CHANGE_ME'. Définissez un secret cryptographique réel.
# Code retour : 1 (Rejet systématique)
```

3. **Test d'interpolation Docker Compose sans variables** :
```bash
env -i docker compose config -q
# Résultat :
# error while interpolating services.postgres.environment.[]: required variable POSTGRES_ROOT_PASSWORD is missing a value: Erreur_POSTGRES_ROOT_PASSWORD_obligatoire
# error while interpolating services.api-gateway.environment.[]: required variable SECURITY_SESSION_SECRET is missing a value: Erreur_SECURITY_SESSION_SECRET_obligatoire
# ... (17 variables obligatoires signalées manquantes)
```

---

#### 2.4. Validation PostgreSQL 16 des 7 Microservices : `./verify-postgres.sh`
```text
==================================================================
 VÉRIFICATION FLYWAY & HIBERNATE VALIDATE SUR POSTGRESQL 16 (7/7)
==================================================================
>>> Cible PostgreSQL : 172.20.0.2:5432
>>> [TEST POSTGRES 16] ms-patrimoine (PatrimoinePostgresIntegrationTest) ... [OK]
>>> [TEST POSTGRES 16] ms-circuit (CircuitPostgresIntegrationTest) ... [OK]
>>> [TEST POSTGRES 16] ms-evenement (EvenementPostgresIntegrationTest) ... [OK]
>>> [TEST POSTGRES 16] ms-reservation (ReservationPostgresIntegrationTest) ... [OK]
>>> [TEST POSTGRES 16] ms-utilisateur (UtilisateurPostgresIntegrationTest) ... [OK]
>>> [TEST POSTGRES 16] ms-paiement (PaiementPostgresIntegrationTest) ... [OK]
>>> [TEST POSTGRES 16] ms-notification (NotificationPostgresIntegrationTest) ... [OK]
==================================================================
 SUCCÈS : Les 7 microservices valident Flyway et Hibernate sur PG 16 !
==================================================================
```

---

#### 2.5. Validation Frontend Angular 22
```text
Application bundle generation complete. [8.098 seconds]
Output location: /home/mahou-dev/micro-service/frontend-angular/dist/frontend-angular

 RUN  v5.1.0 /home/mahou-dev/micro-service/frontend-angular

 Test Files  13 passed (13)
      Tests  31 passed (31)
   Start at  21:37:29
   Duration  41.11s
```
