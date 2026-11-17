# DOCUMENTATION TECHNIQUE — FONDATIONS ARCHITECTURE P01 (DURCISSEMENT)

## 1. Topologie et Isolation PostgreSQL 16 Multi-Utilisateurs

Chaque microservice dispose de sa propre base de données relationnelle et d'un rôle (utilisateur) dédié avec stricte isolation des privilèges (principe de moindre privilège). Le compte superadministrateur `postgres` n'est JAMAIS utilisé par les microservices applicatifs.

### Matrice des Utilisateurs et Bases

| Microservice | Base de données | Utilisateur dédié | Mot de passe (dev/docker) | Droits accordés | Droits sur autres bases |
|---|---|---|---|---|---|
| ms-patrimoine | `patrimoine_db` | `patrimoine_user` | `patrimoine_pass_2026!` | OWNER / ALL sur `patrimoine_db` | AUCUN (CONNECT révoqué de PUBLIC) |
| ms-circuit | `circuit_db` | `circuit_user` | `circuit_pass_2026!` | OWNER / ALL sur `circuit_db` | AUCUN (CONNECT révoqué de PUBLIC) |
| ms-evenement | `evenement_db` | `evenement_user` | `evenement_pass_2026!` | OWNER / ALL sur `evenement_db` | AUCUN (CONNECT révoqué de PUBLIC) |
| ms-reservation | `reservation_db` | `reservation_user` | `reservation_pass_2026!` | OWNER / ALL sur `reservation_db` | AUCUN (CONNECT révoqué de PUBLIC) |
| ms-utilisateur | `utilisateur_db` | `utilisateur_user` | `utilisateur_pass_2026!` | OWNER / ALL sur `utilisateur_db` | AUCUN (CONNECT révoqué de PUBLIC) |
| ms-paiement | `paiement_db` | `paiement_user` | `paiement_pass_2026!` | OWNER / ALL sur `paiement_db` | AUCUN (CONNECT révoqué de PUBLIC) |
| ms-notification | `notification_db` | `notification_user` | `notification_pass_2026!` | OWNER / ALL sur `notification_db` | AUCUN (CONNECT révoqué de PUBLIC) |

### Script d'initialisation Docker : `docker/postgres/init-multi-postgres.sh`
- Création conditionnelle de chaque rôle via bloc `DO $$ BEGIN IF NOT EXISTS ... END $$;`.
- Création de chaque base avec `OWNER = <user>`.
- Révocation explicite du privilège `CONNECT ON DATABASE <db> FROM PUBLIC` pour empêcher les accès transverses non autorisés.
- Octroi exclusif de `CONNECT ON DATABASE <db> TO <user>`.

---

## 2. Secrets et Variables d'Environnement

### Variables Obligatoires en Production
En profil `prod`, aucune valeur secrète ne doit provenir des fallbacks Git. Toutes les variables d'environnement suivantes doivent être injectées via orchestrateur (Docker Compose / Kubernetes / Vault) :

- `POSTGRES_ROOT_PASSWORD` : Mot de passe superadmin du cluster PostgreSQL.
- `PATRIMOINE_DB_PASSWORD`, `CIRCUIT_DB_PASSWORD`, `EVENEMENT_DB_PASSWORD`, `RESERVATION_DB_PASSWORD`, `UTILISATEUR_DB_PASSWORD`, `PAIEMENT_DB_PASSWORD`, `NOTIFICATION_DB_PASSWORD` : Mots de passe respectifs des microservices.
- `SECURITY_SESSION_SECRET` : Clé secrète cryptographique partagée HMAC-SHA256 (minimum 32 caractères / 256 bits) partagée de manière identique entre `api-gateway` et `ms-utilisateur` pour la signature et la vérification des sessions et tokens.

### Profils Spring Boot Définis
- **dev** : Base H2 en mémoire (`jdbc:h2:mem:...`), console H2 activée, `ddl-auto: update`, Flyway désactivé.
- **test** : Base H2 en mémoire isolée (`jdbc:h2:mem:..._test`), `ddl-auto: create-drop`, Flyway désactivé, tests rapides et reproductibles en CI offline.
- **prod** : PostgreSQL 16 distant, `ddl-auto: validate` (Hibernate valide strictement la concordance du schéma sans modifier la structure), Flyway activé (`spring.flyway.enabled: true`, `locations: classpath:db/migration`).

---

## 3. Topologie Réseau Docker et Exposition des Ports

### Réseaux
- `micro-service_public-net` (bridge) : Réseau d'exposition publique.
  - `frontend-angular` (Nginx) : Port 80 (HTTP) accessible de l'extérieur.
  - `api-gateway` : Port 8090 accessible (ou restreint à Nginx).
  - `discovery-server` : Port 8761 accessible en dev/monitoring.
- `micro-service_internal-net` (bridge) : Réseau privé isolé.
  - `postgres` (port 5432) : Aucun port publié sur l'hôte, accessible uniquement depuis `internal-net`.
  - Tous les 7 microservices métier (`ms-patrimoine`, `ms-circuit`, etc.) sont connectés exclusivement à `internal-net`. Aucun port applicatif hôte (3001 à 3007) n'est exposé.

---

## 4. Eureka & OpenFeign — Routage Dynamique

### Configuration OpenFeign
Tous les clients OpenFeign utilisent la syntaxe :
```java
@FeignClient(name = "ms-<nom>", url = "${<nom>.url:}")
```
- En environnement nominal (Docker Compose / Prod) : la propriété `<nom>.url` est vide ou omise. Feign utilise alors Eureka (`lb://ms-<nom>`) pour découvrir dynamiquement l'adresse et équilibrer la charge.
- En environnement de test ou debug unitaire : `<nom>.url` peut être surchargé (ex: `http://localhost:9991`) pour pointer vers un mock ou une instance précise.

---

## 5. Migrations Flyway et Validation Hibernate

### Scripts SQL Versionnés
Chaque service comporte deux scripts Flyway sous `src/main/resources/db/migration/` :
1. `V1__create_<service>_schema.sql` : DDL strict (tables, contraintes PRIMARY KEY, FOREIGN KEY, CHECK, index, types PostgreSQL adaptés).
2. `V2__seed_<service>s.sql` : DML avec données initiales réalistes sur le patrimoine de la Casamance, réinitialisation de séquence via `SELECT setval(pg_get_serial_sequence('...', 'id'), (SELECT MAX(id) FROM ...));`.
3. Compatibilité : Validation à 100% avec Hibernate 7.4.1 sous `ddl-auto: validate`.
