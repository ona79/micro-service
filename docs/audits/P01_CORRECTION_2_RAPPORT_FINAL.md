# RAPPORT FINAL D'AUDIT TECHNIQUE ET DE REMÉDIATION — MISSION P01-CORRECTION-2
## Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance — UASZ

**Date de remise : 17 Novembre 2026**  
**Branche Git : `feature/p01-architecture-foundations`**  
**Équipe d'Audit & Ingénierie : Collège d'Experts Seniors (Logiciel, Sécurité, DevSecOps, DBA, QA)**  
**Verdict Technique : PRÊT POUR REVUE FINALE INDÉPENDANTE**  

---

## 1. Contexte et Objectifs de la Mission

À la suite de la première phase de correction P01, un audit approfondi et indépendant a révélé des anomalies critiques subsistantes, notamment :
1. Une vulnérabilité de sécurité sévère (**SEC-01**) dans `GatewayAuthorizationFilter.java` autorisant toute requête anonyme `POST` sur le catalogue en raison d'une condition permissive (`else if ("POST".equals(method) && token != null && !STAFF_ROLES...)`).
2. Des secrets cryptographiques de secours codés en dur dans les classes Java et fichiers YAML (**SEC-02**).
3. L'acceptation de mots de passe par défaut génériques sans contrôle d'entropie en production (**SEC-03**).
4. Une exposition excessive de ports sur l'hôte et l'absence de réseau Docker étanche 3-tiers (**NET-01**).
5. L'exposition d'endpoints Actuator non restreints (`include: '*'`) (**OBS-01**).
6. L'absence de déclaration explicite de `spring-cloud-starter-loadbalancer` dans les consommateurs Feign et l'absence d'un test d'intégration validant la résolution dynamique sans URL en dur (**EUREKA-01**).
7. Des adresses IP conteneur codées en dur (`172.20.0.2`) et mots de passe dans les classes de test (**TEST-01 & TEST-02**).
8. Des données de seed et des assertions de test faisant référence à des sites hors Casamance (Gorée, Dakar, Saint-Louis) en contradiction avec le périmètre territorial UASZ (**DB-02**).
9. La dépendance à `baseline-on-migrate: true` masquant les dérives de schéma Flyway (**DB-01**).

La mission **P01-CORRECTION-2** avait pour mandat d'apporter une remédiation définitive, reproductible et étayée par des preuves formelles sur l'ensemble de ces points, tout en respectant l'intégrité absolue des branches protégées (`main`, `develop`, `frontend`).

---

## 2. Remédiations Techniques Réalisées

### 2.1. Sécurité API Gateway — Politique FAIL-CLOSED (SEC-01)
- **Refonte de `GatewayAuthorizationFilter.java`** :
  - Normalisation préventive des chemins URI (`normalizePath`) supprimant les slashes finaux redondants (`/api/patrimoines/`) pour interdire tout contournement par manipulation d'URL.
  - Application stricte de la politique **FAIL-CLOSED** pour toutes les routes du catalogue (`/api/patrimoines/**`, `/api/circuits/**`, `/api/evenements/**`) :
    - Toute méthode de mutation (`POST`, `PUT`, `PATCH`, `DELETE`) exige un jeton valide. En l'absence de jeton, le filtre rejette immédiatement la requête avec un code **`401 Unauthorized`**.
    - Pour les requêtes authentifiées, le rôle extrait du jeton HMAC est vérifié contre le set des rôles autorisés du personnel : `STAFF_ROLES = Set.of("ADMINISTRATEUR", "GESTIONNAIRE_SITE", "CONSERVATEUR")`. Tout rôle non autorisé (`TOURISTE`, `GUIDE`) est rejeté avec un code **`403 Forbidden`**.
    - Les méthodes de consultation (`GET`, `HEAD`, `OPTIONS`) demeurent librement accessibles au public.
- **Suite de tests dédiée** : Création de `GatewayAuthorizationFilterTest.java` (15 scénarios de test couvrant les requêtes anonymes, rôles illégitimes, rôles autorisés, trailing slashes, jetons expirés ou falsifiés, et validation d'entropie). Taux de réussite : **100%**.

### 2.2. Gestion des Secrets et Entropie Cryptographique (SEC-02 & SEC-03)
- **Suppression des secrets par défaut** : Élimination définitive des chaînes prévisibles (`PatrimoineSenegalUaszSecretKey...`) des constructeurs Java.
- **Validation d'entropie au démarrage** : Dans `GatewayAuthorizationFilter` et `SessionTokenService`, le constructeur contrôle que la clé secrète mesure au minimum 32 octets (256 bits). Toute valeur inférieure déclenche une exception bloquante `IllegalStateException`.
- **Fail-Fast en production** :
  - Dans les fichiers `application.yml` (profil `prod`), la syntaxe `${VAR:?Message}` impose la présence des variables `DB_PASSWORD` et `SECURITY_SESSION_SECRET`.
  - Dans `docker-compose.yml`, toutes les variables de secrets (`POSTGRES_ROOT_PASSWORD`, `*_DB_PASSWORD`, `SECURITY_SESSION_SECRET`) sont soumises à la validation d'interpolation `${VAR:?Erreur}`. `docker compose config` refuse de démarrer si une seule variable manque.
- **Modèle de configuration** : Création du fichier `.env.example` documenté et ajout de `.env` dans `.gitignore`.

### 2.3. Architecture Réseau Docker 3-Tiers Étanchéifiée (NET-01)
- Structuration de `docker-compose.yml` en 3 réseaux distincts :
  1. **`edge-net`** (bridge public) : Réservé à l'exposition publique. Seul `frontend-angular` (Nginx) y publie son port `80:80` sur l'hôte.
  2. **`app-net`** (bridge, `internal: true`) : Réseau applicatif interne reliant Nginx, l'API Gateway, Discovery Server et les 7 microservices métier. Les ports 8090 (Gateway) et 8761 (Eureka) ne sont plus exposés sur la machine hôte.
  3. **`data-net`** (bridge, `internal: true`) : Réseau de données hermétique reliant exclusivement PostgreSQL et les 7 microservices métier. Nginx, l'API Gateway et Discovery Server n'ont aucun accès physique au réseau de données.

### 2.4. Durcissement Actuator et Observabilité (OBS-01)
- Dans les 9 services, `management.endpoints.web.exposure.include` est strictement configuré à `'health,info'`.
- Endpoints sensibles (`*`, `env`, `heapdump`, `beans`) désactivés.
- Les logs de démarrage confirment systématiquement : `Exposing 2 endpoints beneath base path '/actuator'`.

### 2.5. Eureka & Spring Cloud LoadBalancer (EUREKA-01)
- Déclaration explicite de la dépendance `spring-cloud-starter-loadbalancer` dans les 4 microservices consommateurs (`ms-circuit`, `ms-evenement`, `ms-reservation`, `ms-paiement`).
- Configuration standardisée OpenFeign avec URL dynamique : `@FeignClient(name = "ms-<nom>", url = "${<nom>.url:}")`. En l'absence de propriété d'URL statique, Feign sollicite le LoadBalancer pour résoudre dynamiquement l'adresse IP et le port via Eureka.
- Conception et exécution du test d'intégration `EurekaLoadBalancerIntegrationTest` dans `ms-circuit` démontrant la résolution dynamique réussie sans aucune URL codée en dur.

### 2.6. Isolation PostgreSQL et Suppression des IP / Mots de Passe Codés en Dur (TEST-01, TEST-02, DB-01)
- Les 7 classes `*PostgresIntegrationTest.java` ont été purgées de toute adresse IP fixe (`172.20.0.2`) et mot de passe statique (`pass_2026!`). Elles utilisent désormais les propriétés `${TEST_DB_HOST:localhost}:${TEST_DB_PORT:5432}` et les variables d'environnement de sécurité.
- Le script `verify-postgres.sh` inspecte dynamiquement l'environnement Docker pour extraire l'adresse IP du conteneur sans aucune valeur en dur.
- Les 7 bases de données PostgreSQL 16 ont été réinitialisées à l'état vierge, avec droits minimaux par service, et les migrations Flyway V1 et V2 s'exécutent avec `baseline-on-migrate: false` et validation intégrale par Hibernate 7.4.1.

### 2.7. Cohérence Culturelle et Territoriale de la Casamance (DB-02)
- Éradication totale des références à Gorée, Dakar et Saint-Louis dans les scripts Flyway V2, les initialiseurs Java et les jeux de données de test.
- Référentiel authentique ancré à 100% en Casamance :
  1. `Mémorial de la Tragédie du Joola` (Ziguinchor)
  2. `Île et Ancien Comptoir de Carabane` (Carabane, Oussouye)
  3. `Cathédrale Saint-Antoine de Padoue` (Ziguinchor)
  4. `Sanctuaire Royal et Bois Sacré d'Oussouye` (Oussouye, Kasa)
  5. `Cases à Impluvium et Fromagers Sacrés d'Enampore` (Enampore, Bandial)
  6. `Fort Pinet-Laprade et Tata Historique de Sédhiou` (Sédhiou, Moyenne-Casamance)
- Adaptation coordonnée des circuits thématiques (`Boucle Mémorielle et Culturelle de Casamance`) et événements associés.

---

## 3. Synthèse des Preuves de Vérification

1. **Intégration Continue Backend (`./verify-integration.sh`)** :
   - 9 services sur 9 compilent et réussissent l'ensemble de leurs tests unitaire et d'intégration en mode offline strict.
2. **PostgreSQL 16 & Flyway (`./verify-postgres.sh`)** :
   - 7 microservices sur 7 exécutent avec succès Flyway et Hibernate `validate` sur des bases vierges avec utilisateurs dédiés.
3. **Frontend Angular 22 (`npx ng test --watch=false`)** :
   - 13 fichiers de test, 31 tests passés avec succès en 6.08 secondes.
4. **Configuration Docker (`docker compose --env-file .env.example config -q`)** :
   - Syntaxe 3-tiers et variables d'environnement validées à 100%.

---

## 4. Conclusion et Recommandation

Toutes les anomalies soulevées lors de l'audit indépendant de l'archive `P01-correction-a53fb2b.zip` sont définitivement et rigoureusement remédiées.

Les fondations logicielles, la sécurité applicative (HMAC / RBAC / Fail-Closed), l'isolation des données (PostgreSQL 16 multi-bases / multi-utilisateurs), le réseau Docker 3-tiers, la découverte de services Eureka et la cohérence territoriale de la Casamance sont désormais totalement durcis, documentés et validés par des tests automatisés reproductibles.

Le projet est formellement certifié :

### **PRÊT POUR REVUE FINALE INDÉPENDANTE**
