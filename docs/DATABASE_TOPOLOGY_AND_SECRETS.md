# DOCUMENTATION TECHNIQUE — FONDATIONS ARCHITECTURE P01 (DURCISSEMENT INTÉGRAL)

## 1. Topologie et Isolation PostgreSQL 16 Multi-Utilisateurs (Database-per-Service)

Chaque microservice dispose de sa propre base de données relationnelle et d'un utilisateur applicatif dédié avec stricte isolation des privilèges (principe de moindre privilège). Le compte superadministrateur `postgres` n'est JAMAIS utilisé par les microservices applicatifs en production.

### Matrice des Utilisateurs et Bases

| Microservice | Base de données | Utilisateur dédié | Droits accordés | Droits sur autres bases |
|---|---|---|---|---|
| `ms-patrimoine` | `patrimoine_db` | `patrimoine_user` | OWNER / ALL sur `patrimoine_db` | AUCUN (`CONNECT` révoqué de `PUBLIC`) |
| `ms-circuit` | `circuit_db` | `circuit_user` | OWNER / ALL sur `circuit_db` | AUCUN (`CONNECT` révoqué de `PUBLIC`) |
| `ms-evenement` | `evenement_db` | `evenement_user` | OWNER / ALL sur `evenement_db` | AUCUN (`CONNECT` révoqué de `PUBLIC`) |
| `ms-reservation` | `reservation_db` | `reservation_user` | OWNER / ALL sur `reservation_db` | AUCUN (`CONNECT` révoqué de `PUBLIC`) |
| `ms-utilisateur` | `utilisateur_db` | `utilisateur_user` | OWNER / ALL sur `utilisateur_db` | AUCUN (`CONNECT` révoqué de `PUBLIC`) |
| `ms-paiement` | `paiement_db` | `paiement_user` | OWNER / ALL sur `paiement_db` | AUCUN (`CONNECT` révoqué de `PUBLIC`) |
| `ms-notification` | `notification_db` | `notification_user` | OWNER / ALL sur `notification_db` | AUCUN (`CONNECT` révoqué de `PUBLIC`) |

### Script d'initialisation Docker : `docker/postgres/init-multi-postgres.sh`
- Création conditionnelle de chaque rôle via bloc `DO $$ BEGIN IF NOT EXISTS ... END $$;`.
- Création de chaque base avec `OWNER = <user>`.
- Révocation explicite du privilège `CONNECT ON DATABASE <db> FROM PUBLIC` pour empêcher les accès transverses non autorisés.
- Octroi exclusif de `CONNECT, TEMPORARY ON DATABASE <db> TO <user>`.
- Assignation du schéma `public` à chaque utilisateur dédié avec `ALTER DEFAULT PRIVILEGES`.

---

## 2. Secrets, Entropie Cryptographique et Variables d'Environnement

### Variables Obligatoires en Production (Fail-Fast)
En profil `prod`, aucune valeur secrète ne provient des fallbacks Git. Toutes les variables d'environnement suivantes doivent impérativement être injectées via l'orchestrateur (Docker Compose / Kubernetes / HashiCorp Vault) sous peine de refus de démarrage immédiat (`${VAR:?Message}`) :

- `POSTGRES_ROOT_PASSWORD` : Mot de passe superadmin du cluster PostgreSQL (initialisation uniquement).
- `PATRIMOINE_DB_PASSWORD`, `CIRCUIT_DB_PASSWORD`, `EVENEMENT_DB_PASSWORD`, `RESERVATION_DB_PASSWORD`, `UTILISATEUR_DB_PASSWORD`, `PAIEMENT_DB_PASSWORD`, `NOTIFICATION_DB_PASSWORD` : Mots de passe individuels des microservices.
- `SECURITY_SESSION_SECRET` : Clé secrète cryptographique partagée HMAC-SHA256 (minimum 32 octets / 256 bits d'entropie) partagée de manière identique entre `api-gateway` et `ms-utilisateur` pour la signature et la vérification des sessions et cookies HTTP-Only.

### Validation d'Entropie au Démarrage (SEC-02)
Les constructeurs de `GatewayAuthorizationFilter` (`api-gateway`) et `SessionTokenService` (`ms-utilisateur`) valident au démarrage que la clé secrète n'est ni nulle, ni vide, et comporte strictement au moins 32 octets UTF-8 (256 bits). Toute clé inférieure déclenche immédiatement une exception `IllegalStateException` bloquant le conteneur.

### Profils Spring Boot Définis
- **dev** : Base H2 en mémoire (`jdbc:h2:mem:...`), console H2 activée, `ddl-auto: update`, Flyway désactivé.
- **test** : Base H2 en mémoire isolée (`jdbc:h2:mem:..._test`), `ddl-auto: create-drop`, Flyway désactivé, tests rapides et reproductibles en CI offline.
- **prod** : PostgreSQL 16 distant, `ddl-auto: validate` (Hibernate valide strictement la concordance du schéma sans modifier la structure), Flyway activé (`spring.flyway.enabled: true`, `baseline-on-migrate: false`, `locations: classpath:db/migration`).

---

## 3. Topologie Réseau Docker 3-Tiers et Exposition des Ports (NET-01)

### Architecture Réseau 3-Tiers
```
[ Client / Web Browser ]
         │ (port 80:80)
         ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ EDGE TIER : edge-net (bridge public)                        │
 │  • frontend-angular (Nginx Reverse Proxy & Static SPA)      │
 └──────────────────────┬──────────────────────────────────────┘
                        │ (interne : http://api-gateway:8090)
 ┌──────────────────────▼──────────────────────────────────────┐
 │ APPLICATION TIER : app-net (bridge interne, internal: true) │
 │  • api-gateway (Spring Cloud Gateway Server WebMVC)         │
 │  • discovery-server (Netflix Eureka Server :8761)           │
 │  • 7 Microservices Métier (Spring Cloud LoadBalancer / Feign)│
 └──────────────────────┬──────────────────────────────────────┘
                        │ (interne : jdbc:postgresql://postgres:5432)
 ┌──────────────────────▼──────────────────────────────────────┐
 │ DATA TIER : data-net (bridge interne, internal: true)       │
 │  • postgres:16-alpine (7 bases isolées, 7 utilisateurs)     │
 │  • 7 Microservices Métier (accès JDBC direct)               │
 └─────────────────────────────────────────────────────────────┘
```

- **`edge-net`** : Seul le port 80 de `frontend-angular` (Nginx) est publié sur l'hôte.
- **`app-net` (`internal: true`)** : Réseau applicatif interne sans accès direct depuis l'hôte. Aucun port publié pour l'API Gateway (8090) ni pour Eureka (8761) en production.
- **`data-net` (`internal: true`)** : Réseau de données hautement sécurisé. Ni Nginx, ni l'API Gateway, ni Discovery Server, ni l'hôte n'y ont accès. Seuls les 7 microservices métier peuvent communiquer avec le conteneur PostgreSQL sur le port 5432.

---

## 4. Politique de Sécurité Gateway : Fail-Closed & RBAC (SEC-01)

L'API Gateway applique une politique stricte **FAIL-CLOSED** pour toutes les routes du catalogue (`/api/patrimoines`, `/api/circuits`, `/api/evenements`) :
- **Consultation publique (`GET`, `HEAD`, `OPTIONS`)** : Autorisée sans authentification préalable (catalogue ouvert aux visiteurs).
- **Mutations de données (`POST`, `PUT`, `PATCH`, `DELETE`)** :
  - Absence de jeton ou jeton invalide/expiré : Rejet immédiat avec code **`401 Unauthorized`**.
  - Jeton authentifié mais rôle non-staff (`TOURISTE`, `GUIDE`) : Rejet immédiat avec code **`403 Forbidden`**.
  - Jeton authentifié avec rôle staff (`ADMINISTRATEUR`, `GESTIONNAIRE_SITE`, `CONSERVATEUR`) : Autorisation accordée.
- **Normalisation des chemins** : Traitement des slashes finaux (`/api/patrimoines/`) pour interdire toute tentative de contournement d'URL.

---

## 5. Observabilité et Durcissement Actuator (OBS-01)

- Dans tous les microservices applicatifs et services d'infrastructure, l'exposition HTTP Actuator est strictement restreinte à :
  ```yaml
  management:
    endpoints:
      web:
        exposure:
          include: 'health,info'
    endpoint:
      health:
        show-details: when_authorized
  ```
- Les endpoints sensibles (`*`, `env`, `heapdump`, `beans`, `configprops`) sont désactivés et inaccessibles publiquement.
- Le tableau de bord Eureka n'est accessible que sur le réseau interne `app-net`.

---

## 6. Eureka & OpenFeign — Résolution Dynamique LoadBalanced (EUREKA-01)

- Dépendance `spring-cloud-starter-loadbalancer` déclarée explicitement dans tous les services consommateurs (`ms-circuit`, `ms-evenement`, `ms-reservation`, `ms-paiement`).
- Déclaration standardisée OpenFeign :
  ```java
  @FeignClient(name = "ms-<nom>", url = "${<nom>.url:}")
  ```
- En production / nominal : La propriété `<nom>.url` est vide (`${...:}`). OpenFeign délègue la résolution du serviceId (`ms-<nom>`) à Spring Cloud LoadBalancer qui interroge dynamiquement le registre Eureka pour router les requêtes et répartir la charge.
- En test unitaire : La propriété `<nom>.url` peut être surchargée pour cibler un mock HTTP ou un serveur local.

---

## 7. Migrations Flyway et Validation Hibernate (DB-01 & DB-02)

- **Migrations depuis base vierge (DB-01)** : `baseline-on-migrate: false` en profil `prod`. Chaque base de données démarre vierge et applique séquentiellement les scripts `V1` et `V2`.
- **Ancrage territorial Casamance (DB-02)** : Toutes les données d'initialisation et tests font référence exclusivement au patrimoine authentique de la Casamance (Ziguinchor, Carabane, Oussouye, Enampore, Sédhiou, Kolda).
- **Validation Hibernate** : `hibernate.ddl-auto: validate` certifie la conformité absolue à 100% entre les entités JPA (Hibernate 7.4.1) et les schémas PostgreSQL 16.
