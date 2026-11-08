# Architecture Microservices & Front-End React — Gestion du Patrimoine Touristique (UASZ - L3-21)

**Université Assane Seck de Ziguinchor (UASZ)** — UFR Sciences et Technologies — Département Informatique  
**Cours** : Développement d'Applications Orientées Services (Licence 3 en Ingénierie Informatique)  
**Enseignant** : Dr Lamine FATY  
**Stack technique** :
- **Back-End (10 microservices)** : Java 21, Spring Boot `4.1.0`, Spring Cloud `2025.1.4`, Spring Data JPA, H2 Database, MapStruct `1.6.3`, Lombok, OpenFeign, RestTemplate, WebClient, Eureka, Config Server, Spring Cloud Gateway, Docker & Docker Compose.
- **Front-End (`frontend/`)** : React 19, Vite 6, React Router 7, CSS natif par variables (`tokens.css`).

---

## 🚀 GUIDE DE DÉMARRAGE RAPIDE (Pour lancer le projet complet en 5 minutes)

### Prérequis à installer sur la machine
1. **Java 21** (JDK 21) — vérifier avec `java -version`
2. **Docker Desktop** (ou Docker Engine + Docker Compose) — vérifier avec `docker --version` (assurez-vous que Docker Desktop est bien lancé !)
3. **Node.js** (v18+ ou v20+) et **npm** — vérifier avec `node -v` et `npm -v`
4. **Git**

---

### Étape 1 : Cloner le dépôt
```bash
git clone https://github.com/ona79/micro-service.git
cd micro-service
```

---

### Étape 2 : Compiler les 10 microservices (obligatoire avant Docker)
Les `Dockerfile` copient les fichiers `.jar` générés dans `target/`. Il faut donc compiler les microservices une première fois avec Maven :

```bash
for s in config-server discovery-server ms-patrimoine ms-circuit ms-evenement ms-reservation ms-utilisateur ms-notification ms-paiement api-gateway; do
  echo ">>> Compilation de $s..."
  (cd "$s" && chmod +x ./mvnw && ./mvnw clean package -DskipTests)
done
```

*(Sous Windows PowerShell, si la boucle `for` bash ne fonctionne pas, utilisez :)*
```powershell
$services = "config-server","discovery-server","ms-patrimoine","ms-circuit","ms-evenement","ms-reservation","ms-utilisateur","ms-notification","ms-paiement","api-gateway"
foreach ($s in $services) { Push-Location $s; ./mvnw.cmd clean package -DskipTests; Pop-Location }
```

---

### Étape 3 : Démarrer les 10 microservices avec Docker Compose
Assurez-vous qu'aucun ancien conteneur n'occupe déjà les ports `3001` à `3007` ou `8080`, puis lancez :

```bash
docker compose up -d --build
```

Attendez environ **15 à 20 secondes** que tous les microservices Spring Boot démarrent, puis vérifiez que l'API Gateway répond bien sur le port `8080` :
```bash
curl http://localhost:8080/api/patrimoines
```
*(Vous devez voir les 3 patrimoines initiaux en JSON : Maison des Esclaves de Gorée, Monument de la Renaissance Africaine, Cathédrale Saint-Antoine de Padoue).*

---

### Étape 4 : Lancer le Front-End React (`frontend/`)
Ouvrez un nouveau terminal à la racine du projet :

```bash
cd frontend
npm install
npm run dev
```

👉 Ouvrez ensuite votre navigateur sur : **http://localhost:5173**

Le serveur Vite redirige automatiquement tous les appels `/api/...` vers l'API Gateway (`http://localhost:8080/api/...`).

---

### Étape 5 (Optionnel) : Injecter un Circuit et un Événement de démonstration
Au démarrage, `ms-patrimoine` pré-charge **3 sites patrimoniaux**, tandis que `ms-circuit`, `ms-evenement` et `ms-reservation` démarrent avec une base H2 vide. Pour peupler immédiatement les pages **Circuits** et **Événements**, exécutez ces deux commandes dans un terminal :

```bash
# 1. Créer un circuit touristique reliant Gorée, Dakar et Ziguinchor
curl -X POST http://localhost:8080/api/circuits \
  -H "Content-Type: application/json" \
  -d '{
    "nomCircuit": "De Gorée à la Casamance : Mémoire et Teranga",
    "descriptionCircuit": "Un parcours culturel reliant les grands monuments historiques de Dakar au patrimoine architectural de Ziguinchor.",
    "difficulte": "FACILE",
    "placesMax": 25,
    "prix": 15000,
    "etapes": [
      { "ordre": 1, "dureeVisite": 90, "patrimoineId": 1 },
      { "ordre": 2, "dureeVisite": 60, "patrimoineId": 2 },
      { "ordre": 3, "dureeVisite": 75, "patrimoineId": 3 }
    ]
  }'

# 2. Créer un événement culturel à Ziguinchor
curl -X POST http://localhost:8080/api/evenements \
  -H "Content-Type: application/json" \
  -d '{
    "nomEvenement": "Journées du Patrimoine de la Casamance",
    "descriptionEvenement": "Visite guidée et exposition photographique autour de l histoire architecturale de Ziguinchor.",
    "typeEvenement": "VISITE_GUIDEE",
    "dateDebut": "2026-12-15T09:30:00",
    "dateFin": "2026-12-15T17:00:00",
    "lieu": "Centre-ville, Ziguinchor",
    "capaciteMax": 80,
    "prix": 5000,
    "patrimoineId": 3
  }'
```
Rafraîchissez **http://localhost:5173** : vous pouvez maintenant parcourir les circuits, consulter les événements et effectuer ou annuler des réservations depuis l'onglet **Réserver** !

---

## 🛠️ Dépannage fréquent (Troubleshooting)

- **Erreur `Bind for 0.0.0.0:3001 failed: port is already allocated` lors du `docker compose up`** :
  Un ancien conteneur tourne déjà sur ce port. Nettoyez les conteneurs actifs puis relancez :
  ```bash
  docker rm -f $(docker ps -aq)
  docker compose up -d
  ```
- **Erreur `COPY target/*.jar: not found` lors du `docker compose up --build`** :
  Vous avez oublié l'Étape 2 (compilation Maven des `.jar` avant de construire les images Docker).
- **Pour arrêter proprement tous les conteneurs** :
  ```bash
  docker compose down
  ```

---

## 1. Organisation des branches Git et CI/CD (GitHub Actions)

Le projet est structuré autour de **4 branches** contrôlées par le pipeline [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) :
- **`develop`** : déclenche la compilation Maven (Java 21 + MapStruct) des 10 microservices et les tests d'intégration E2E.
- **`test`** : exécute les suites de tests unitaires (`JUnit 5`, `Mockito`, `@WebMvcTest`, `@SpringBootTest`) et le scénario d'intégration inter-microservices (`OpenFeign`, `RestTemplate`, `WebClient`).
- **`deploy`** : conditionnée par la réussite des tests (`needs: [build-and-test, integration-e2e]`), valide `docker-compose.yml` et construit les images Docker (`fatylamine/patrimoines:v1`, `fatylamine/circuits:v1`, etc.).
- **`main`** : branche principale stable qui exécute l'intégralité de la chaîne (Build + Tests Unitaires + Tests E2E + Build Docker).

Pour lancer localement toutes les vérifications d'intégration (compilation + tests unitaires des 10 microservices) en une seule commande :
```bash
./verify-integration.sh
```

---

## 2. Cartographie des 10 Microservices & du Front-End

| Service / Application | Port | Base de données H2 | Rôle & Appels inter-services |
|---|---|---|---|
| **`frontend`** *(React + Vite)* | `5173` | — | Interface web utilisateur (Patrimoines, Circuits, Événements, Réservations). Appelle uniquement `api-gateway` (`:8080`) |
| **`api-gateway`** | `8080` | — | Point d'entrée unique routant `/api/**` vers les 7 microservices métier |
| **`ms-patrimoine`** | `3001` | `jdbc:h2:mem:patrimoinedb` | Fiches descriptives des sites, capacité maximale, coordonnées GPS (pré-chargé avec 3 sites au démarrage) |
| **`ms-circuit`** | `3002` | `jdbc:h2:mem:circuitdb` | Parcours de visite et étapes (`@OneToMany`/`@ManyToOne`), calcul automatique de la durée et de la distance GPS (Haversine). Appelle `ms-patrimoine` via **OpenFeign**, **RestTemplate** et **WebClient** |
| **`ms-evenement`** | `3003` | `jdbc:h2:mem:evenementdb` | Expositions, ateliers, visites guidées, festivals. Vérifie l'existence et la capacité maximale du site auprès de `ms-patrimoine` via **OpenFeign** |
| **`ms-reservation`** | `3004` | `jdbc:h2:mem:reservationdb` | Création, confirmation et annulation des réservations. Vérifie les places restantes auprès de `ms-circuit` et `ms-evenement` via **OpenFeign** |
| **`ms-utilisateur`** | `3005` | `jdbc:h2:mem:utilisateurdb` | Inscription, connexion (`/api/utilisateurs/connexion`), profils et rôles (`TOURISTE`, `ADMINISTRATEUR`, `GESTIONNAIRE_SITE`) |
| **`ms-paiement`** | `3006` | `jdbc:h2:mem:paiementdb` | Transactions financières (`WAVE`, `ORANGE_MONEY`, `CARTE_BANCAIRE`, `ESPECES`). Vérifie la réservation auprès de `ms-reservation` et déclenche un email via `ms-notification` |
| **`ms-notification`** | `3007` | `jdbc:h2:mem:notificationdb` | Envoi et historique des notifications (`EMAIL`, `SMS`) |
| **`discovery-server`** | `8761` | — | Annuaire de services Netflix Eureka (`http://localhost:8761`) |
| **`config-server`** | `8888` | — | Serveur de configuration centralisée Spring Cloud Config |

---

## 3. Endpoints REST principaux (via API Gateway `:8080` ou en direct)

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

## 4. Images du Front-End (`frontend/public/images/`)

Le front-end fonctionne même sans photos grâce au composant `PatrimoineImage` qui affiche un bloc vert clair de remplacement avec le code et le nom du patrimoine. Pour afficher de vraies photos, placez vos fichiers `.jpg` aux emplacements suivants :
- `frontend/public/images/hero.jpg` : Grande bannière de la page d'accueil.
- `frontend/public/images/patrimoines/PAT-DKR-001.jpg` : Maison des Esclaves de Gorée.
- `frontend/public/images/patrimoines/PAT-DKR-002.jpg` : Monument de la Renaissance Africaine.
- `frontend/public/images/patrimoines/PAT-ZIG-003.jpg` : Cathédrale Saint-Antoine de Padoue (Ziguinchor).
- `frontend/public/images/patrimoines/<codePatrimoine>.jpg` : Tout autre patrimoine ajouté via l'API.
