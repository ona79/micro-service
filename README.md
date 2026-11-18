# Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance

**Université Assane Seck de Ziguinchor (UASZ)** — UFR Sciences et Technologies — Département Informatique  
**Projet** : Développement d'Applications Orientées Services (Licence 3 en Ingénierie Informatique)  
**Enseignant** : Dr Lamine FATY  
**Architecture cible (P01)** :
- **Front-End (`frontend-angular/`)** : Angular 22 (Standalone Components, Signals, Router, Nginx SPA fallback + reverse proxy `/api`).
- **Back-End (9 services)** : Java 21, Spring Boot `4.1.0`, Spring Cloud `2025.1.4`, Spring Data JPA, PostgreSQL 16 (Database-per-Service), Flyway 10, MapStruct `1.6.3`, Lombok, OpenFeign, RestTemplate, WebClient, Netflix Eureka, Spring Cloud Gateway.
- **Base de données** : PostgreSQL 16 (7 bases indépendantes : `patrimoine_db`, `circuit_db`, `evenement_db`, `reservation_db`, `utilisateur_db`, `paiement_db`, `notification_db`).
- **Déploiement** : Docker Compose avec isolation réseau (seuls Nginx `:80` et API Gateway `:8090` sont exposés).

---

## 🚀 DÉMARRAGE RAPIDE

### Prérequis
1. **Java 21** (JDK 21 Temurin / OpenJDK)
2. **Node.js 22** et **npm**
3. **Docker Engine & Docker Compose**

---

### Étape 1 : Compilation et vérification des microservices (Java 21)

```bash
# Vérifier et compiler l'ensemble des 9 services
./verify-integration.sh
```

---

### Étape 2 : Lancement avec Docker Compose (PostgreSQL, 9 services, Frontend Angular)

```bash
docker compose up -d --build
```

Services démarrés :
- `postgres` (port interne `5432` - 7 bases initialisées)
- `discovery-server` (Eureka sur `http://localhost:8761`)
- `ms-patrimoine`, `ms-circuit`, `ms-evenement`, `ms-reservation`, `ms-utilisateur`, `ms-notification`, `ms-paiement` (réseau privé `internal-net`)
- `api-gateway` (port `8090` sur `http://localhost:8090`)
- `frontend-angular` (port `80` sur `http://localhost`)

---

### Étape 3 : Accès aux applications

- **Application Web (Angular 22)** : [http://localhost](http://localhost)
- **API Gateway** : [http://localhost:8090](http://localhost:8090)
- **Console Eureka Discovery** : [http://localhost:8761](http://localhost:8761)

---

## 🏛️ CARTOGRAPHIE DES SERVICES & BASES DE DONNÉES

| Service | Port Interne | Port Hôte | Base PostgreSQL (prod) | Rôle & Communications |
|---|---|---|---|---|
| **`frontend-angular`** | `80` | `80` | — | Interface utilisateur Angular 22 servie par Nginx |
| **`api-gateway`** | `8090` | `8090` | — | Point d'entrée unique HTTP routant `/api/**` vers les microservices |
| **`discovery-server`** | `8761` | `8761` | — | Annuaire de services Netflix Eureka |
| **`ms-patrimoine`** | `3001` | *Réseau privé* | `patrimoine_db` | Inventaire des sites patrimoniaux, coordonnées GPS, capacité |
| **`ms-circuit`** | `3002` | *Réseau privé* | `circuit_db` | Circuits touristiques, étapes, calcul durée/distance (OpenFeign -> `ms-patrimoine`) |
| **`ms-evenement`** | `3003` | *Réseau privé* | `evenement_db` | Manifestations culturelles, festivals, ateliers (OpenFeign -> `ms-patrimoine`) |
| **`ms-reservation`** | `3004` | *Réseau privé* | `reservation_db` | Gestion des réservations (OpenFeign -> `ms-circuit`, `ms-evenement`) |
| **`ms-utilisateur`** | `3005` | *Réseau privé* | `utilisateur_db` | Comptes utilisateurs, profils et gestion des rôles |
| **`ms-paiement`** | `3006` | *Réseau privé* | `paiement_db` | Simulation des transactions financières (OpenFeign -> `ms-reservation`, `ms-notification`) |
| **`ms-notification`** | `3007` | *Réseau privé* | `notification_db` | Envoi d'alertes email et confirmations de réservations |

---

## 🛡️ RÔLES DU SYSTÈME (ARCHITECTURE CIBLE P01 / P02)

Le système cible distingue 5 rôles métier aux responsabilités strictes :
1. **TOURISTE** : Consultation du catalogue patrimonial, circuits, événements ; création et suivi de réservations personnelles ; paiement simulé.
2. **GUIDE** : Prise en charge des visites terrain, consultation des circuits assignés, validation des présences des touristes.
3. **CONSERVATEUR** : Gestion scientifique et documentaire des patrimoines, validation culturelle et historique des fiches patrimoniales.
4. **GESTIONNAIRE_SITE** : Gestion logistique, jauges de fréquentation, planification des créneaux de visite et événements locaux.
5. **ADMINISTRATEUR** : Administration technique et gouvernance globale, habilitations des utilisateurs et supervision de la plateforme.

---

## 📂 STRATÉGIE DE CONFIGURATION MULTI-PROFILS

Chaque microservice dispose de profils Spring Boot indépendants de Config Server :
- **`dev`** (par défaut) : Base H2 en mémoire (`jdbc:h2:mem:...`), console H2 activée, DDL update, démarrage sans dépendance externe.
- **`test`** : Base H2 en mémoire isolée, DDL create-drop, optimisé pour l'exécution rapide des tests automatisés (`mvn test`).
- **`prod`** : PostgreSQL (`jdbc:postgresql://${DB_HOST:postgres}:${DB_PORT:5432}/${DB_NAME}`), validation stricte Hibernate (`ddl-auto: validate`), exécution des migrations versionnées Flyway (`db/migration/V1__...`, `V2__...`).

---

## 🧪 EXÉCUTION DES TESTS AUTOMATISÉS

```bash
# Tests unitaires et intégration de l'ensemble des modules backend Java (62 tests)
./verify-integration.sh

# Tests unitaires et composants du frontend Angular (31 tests)
cd frontend-angular && npm test -- --watch=false
```
