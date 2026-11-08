# Architecture Microservices — Gestion du Patrimoine Touristique (UASZ - L3-21)

**Université Assane Seck de Ziguinchor (UASZ)** — UFR Sciences et Technologies — Département Informatique  
**Cours** : Développement d'Applications Orientées Services (Licence 3 en Ingénierie Informatique)  
**Enseignant** : Dr Lamine FATY  
**Stack technique** : Java 21, Spring Boot `4.1.0`, Spring Cloud `2025.1.4`, Spring Data JPA, H2 Database, MapStruct `1.6.3`, Lombok, OpenFeign, RestTemplate, WebClient, Eureka, Config Server, Spring Cloud Gateway, Docker & Docker Compose.

---

## 1. Cloner le projet et gérer les branches Git

### a) Cloner le dépôt GitHub
```bash
git clone https://github.com/ona79/micro-service.git
cd micro-service
```

### b) Organisation des branches du dépôt
Le projet est structuré autour de **4 branches** :
- **`main`** : branche principale stable (version finale validée).
- **`develop`** : branche de développement actif des microservices.
- **`test`** : branche dédiée aux tests unitaires, d'intégration et de validation REST (`requests.http`).
- **`deploy`** : branche dédiée à la conteneurisation Docker (`Dockerfile`, `docker-compose.yml`).

Pour basculer sur l'une des branches après le `git clone` :
```bash
git checkout develop   # ou : git checkout test / git checkout deploy / git checkout main
```

---

## 2. Cartographie des 10 Microservices

| Microservice | Port | Base de données H2 | Rôle & Appels inter-services |
|---|---|---|---|
| **`ms-patrimoine`** | `3001` | `jdbc:h2:mem:patrimoinedb` | Fiches descriptives des sites, capacité maximale, coordonnées GPS (pré-chargé avec 3 sites au démarrage) |
| **`ms-circuit`** | `3002` | `jdbc:h2:mem:circuitdb` | Parcours de visite et étapes (`@OneToMany`/`@ManyToOne`), calcul automatique de la durée et de la distance GPS (Haversine). Appelle `ms-patrimoine` via **OpenFeign**, **RestTemplate** et **WebClient** |
| **`ms-evenement`** | `3003` | `jdbc:h2:mem:evenementdb` | Expositions, ateliers, visites guidées, festivals. Vérifie l'existence et la capacité maximale du site auprès de `ms-patrimoine` via **OpenFeign** |
| **`ms-reservation`** | `3004` | `jdbc:h2:mem:reservationdb` | Création, confirmation et annulation des réservations. Vérifie les places restantes auprès de `ms-circuit` et `ms-evenement` via **OpenFeign** |
| **`ms-utilisateur`** | `3005` | `jdbc:h2:mem:utilisateurdb` | Inscription, connexion (`/api/utilisateurs/connexion`), profils et rôles (`TOURISTE`, `ADMINISTRATEUR`, `GESTIONNAIRE_SITE`) |
| **`ms-paiement`** | `3006` | `jdbc:h2:mem:paiementdb` | Transactions financières (`WAVE`, `ORANGE_MONEY`, `CARTE_BANCAIRE`, `ESPECES`). Vérifie la réservation auprès de `ms-reservation` et déclenche un email via `ms-notification` |
| **`ms-notification`** | `3007` | `jdbc:h2:mem:notificationdb` | Envoi et historique des notifications (`EMAIL`, `SMS`) |
| **`api-gateway`** | `8080` | — | Point d'entrée unique routant `/api/**` vers les 7 microservices métier |
| **`discovery-server`** | `8761` | — | Annuaire de services Netflix Eureka (`http://localhost:8761`) |
| **`config-server`** | `8888` | — | Serveur de configuration centralisée Spring Cloud Config |

---

## 3. Compilation et Lancement (Maven)

Prérequis : **Java 21** installé. Dans le dossier du microservice souhaité (ex. `ms-patrimoine`) :

```bash
cd ms-patrimoine
./mvnw clean package
./mvnw spring-boot:run
```

Pour compiler tous les microservices d'un seul coup depuis la racine :
```bash
for s in config-server discovery-server ms-patrimoine ms-circuit ms-evenement ms-reservation ms-utilisateur ms-notification ms-paiement api-gateway; do
  (cd "$s" && ./mvnw clean package -DskipTests)
done
```

---

## 4. Endpoints REST principaux (via API Gateway `:8080` ou en direct)

- **Patrimoines (`:3001`)** : `GET/POST /api/patrimoines`, `GET/PUT/DELETE /api/patrimoines/{id}`
- **Circuits (`:3002`)** : `GET/POST /api/circuits`, `GET/PUT/DELETE /api/circuits/{id}`
  - **Démo TP2 (3 clients HTTP)** :
    - `GET /api/circuits/communication/feign/patrimoines/1`
    - `GET /api/circuits/communication/resttemplate/patrimoines/1`
    - `GET /api/circuits/communication/webclient/patrimoines/1`
- **Événements (`:3003`)** : `GET/POST /api/evenements`, `GET/PUT/DELETE /api/evenements/{id}`
- **Réservations (`:3004`)** : `GET/POST /api/reservations`, `GET/DELETE /api/reservations/{id}`, `PUT /api/reservations/{id}/annuler`
- **Utilisateurs (`:3005`)** : `GET/POST /api/utilisateurs`, `POST /api/utilisateurs/connexion`, `GET/PUT/DELETE /api/utilisateurs/{id}`
- **Paiements (`:3006`)** : `GET/POST /api/paiements`, `GET /api/paiements/{id}`
- **Notifications (`:3007`)** : `GET/POST /api/notifications`, `GET/DELETE /api/notifications/{id}`

---

## 5. Dockerisation (TP 3)

*(Assurez-vous d'avoir compilé les `.jar` avec `./mvnw clean package -DskipTests` avant de construire les images Docker).*

### a) Image individuelle (exemple `ms-patrimoine`)
```bash
cd ms-patrimoine
./mvnw clean package -DskipTests
docker build -t fatylamine/patrimoines:v1 .
docker run -p 3001:3001 fatylamine/patrimoines:v1
```

### b) Lancement complet des 10 conteneurs avec Docker Compose
```bash
docker compose up --build
```
