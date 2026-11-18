# RAPPORT DE VALIDATION BACKEND & MICROSERVICES (JAVA 21 / SPRING BOOT 4.1.0)

**Date d'exécution** : 17 Novembre 2026  
**Stack Backend** : Java `21.0.13` (Eclipse Temurin) — Spring Boot `4.1.0` — Spring Cloud `2025.1.1`  
**Persistance** : Spring Data JPA / Hibernate `7.4.1.Final` + Bases H2 (`2.4.240`) isolées par microservice  

---

## 1. Compilation et Tests Automatisés JUnit 5 / MockMvc (Phases 2 & 4)

Chaque microservice a été compilé et testé individuellement avec `./mvnw -B test` (`JAVA_HOME=/usr/lib/jvm/java-21-temurin-jdk`).

| Microservice | Port | Rôle architectural | Tests JUnit 5 / Spring Boot Test | Résultat Build | Statut |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `config-server` | `8888` | Serveur de configuration centralisée Spring Cloud Config | `1 / 1` (`ConfigServerApplicationTests`) | `BUILD SUCCESS` | **PASS** |
| `discovery-server` | `8761` | Registre de services Netflix Eureka Server | `1 / 1` (`DiscoveryServerApplicationTests`) | `BUILD SUCCESS` | **PASS** |
| `api-gateway` | `8090`* | Passerelle réactive Spring Cloud Gateway + CORS | `1 / 1` (`ApiGatewayApplicationTests`) | `BUILD SUCCESS` | **PASS** |
| `ms-patrimoine` | `3001` | Référentiel des sites patrimoniaux + Cache `@Cacheable` | `20 / 20` (`PatrimoineServiceTest` [10], `PatrimoineControllerTest` [9], `ApplicationTests` [1]) | `BUILD SUCCESS` | **PASS** |
| `ms-circuit` | `3002` | Circuits touristiques, calcul Haversine, clients `OpenFeign`/`RestTemplate`/`WebClient` | `11 / 11` (`CircuitServiceTest` [10], `ApplicationTests` [1]) | `BUILD SUCCESS` | **PASS** |
| `ms-evenement` | `3003` | Agenda culturel + validation capacité via `ms-patrimoine` | `6 / 6` (`EvenementServiceTest` [5], `ApplicationTests` [1]) | `BUILD SUCCESS` | **PASS** |
| `ms-reservation` | `3004` | Réservations circuits/événements + contrôle des places restantes | `4 / 4` (`ReservationServiceTest` [3], `ApplicationTests` [1]) | `BUILD SUCCESS` | **PASS** |
| `ms-utilisateur` | `3005` | Gestion des comptes, rôles (`TOURISTE`, `GUIDE`, `ADMIN`), hachage `BCrypt` | `5 / 5` (`UtilisateurServiceTest` [4], `ApplicationTests` [1]) | `BUILD SUCCESS` | **PASS** |
| `ms-paiement` | `3006` | Transactions (`WAVE`, `ORANGE_MONEY`, `CARTE_BANCAIRE`, `ESPECES`) + orchestration `ms-reservation` & `ms-notification` | `3 / 3` (`PaiementServiceTest` [2], `ApplicationTests` [1]) | `BUILD SUCCESS` | **PASS** |
| `ms-notification` | `3007` | Journalisation et envoi des notifications (`EMAIL`, `SMS`, `PUSH`) | `1 / 1` (`MsNotificationApplicationTests` [1]) | `BUILD SUCCESS` | **PASS** |
| **TOTAL** | — | **10 Microservices Spring Boot** | **53 / 53 tests réussis (`0` échec, `0` erreur)** | **10 / 10 `BUILD SUCCESS`** | **PASS** |

> *Note sur le port de `api-gateway` : Le port `8080` de la machine hôte étant occupé par un conteneur externe (`ecourtier-backend`) qu'il est interdit d'arrêter, `api-gateway` est exécuté sur le port libre `8090` (`-Dserver.port=8090`) et le proxy Angular (`proxy.conf.json`) cible `http://localhost:8090`.

---

## 2. Santé des Services Démarrés (`/actuator/health`)

Tous les microservices métier ainsi que `api-gateway` ont été démarrés et vérifiés en conditions réelles :

- `http://localhost:3001/actuator/health` (`ms-patrimoine`) : `{"status":"UP"}` (**PASS**)
- `http://localhost:3002/actuator/health` (`ms-circuit`) : `{"status":"UP"}` (**PASS**)
- `http://localhost:3003/actuator/health` (`ms-evenement`) : `{"status":"UP"}` (**PASS**)
- `http://localhost:3004/actuator/health` (`ms-reservation`) : `{"status":"UP"}` (**PASS**)
- `http://localhost:3005/actuator/health` (`ms-utilisateur`) : `{"status":"UP"}` (**PASS**)
- `http://localhost:3006/actuator/health` (`ms-paiement`) : `{"status":"UP"}` (**PASS**)
- `http://localhost:3007/actuator/health` (`ms-notification`) : `{"status":"UP"}` (**PASS**)
- `http://localhost:8090/actuator/health` (`api-gateway`) : `{"status":"UP"}` (**PASS**)

---

## 3. Intégrité des Bases de Données H2 et Seeding Initial (`CommandLineRunner`)

| Microservice | Base H2 | Données initiales au démarrage (`DataInitializer`) | Vérification CRUD & Contraintes | Statut |
| :--- | :--- | :--- | :--- | :--- |
| `ms-patrimoine` | `jdbc:h2:mem:patrimoinedb` | 3 sites majeurs pré-chargés : *Maison des Esclaves de Gorée* (`PAT-DKR-001`), *Monument de la Renaissance Africaine* (`PAT-DKR-002`), *Cathédrale Saint-Antoine de Padoue* (`PAT-ZIG-003`) | Création, lecture, mise à jour, suppression, invalidation du cache `@CacheEvict` | **PASS** |
| `ms-circuit` | `jdbc:h2:mem:circuitdb` | Table `circuits` + table `etape_circuits` (`@OneToMany(cascade = ALL, orphanRemoval = true)`) | Persistance des étapes ordonnées et calcul automatique de `dureeEstimee` (min) et `distanceTotale` (km Haversine) | **PASS** |
| `ms-evenement` | `jdbc:h2:mem:evenementdb` | Table `evenements` | Vérification de cohérence des dates (`dateFin > dateDebut`) et de la capacité par rapport au site patrimonial associé | **PASS** |
| `ms-reservation` | `jdbc:h2:mem:reservationdb` | Table `reservations` | Décompte des places réservées (`CONFIRMEE` + `EN_ATTENTE`), calcul du `montantTotal`, transition vers `ANNULEE` | **PASS** |
| `ms-utilisateur` | `jdbc:h2:mem:utilisateurdb` | 2 comptes pré-chargés : `amadou.diallo@zig.univ.sn` (`ADMIN`) et `moussa.diop@zig.univ.sn` (`TOURISTE`) | Unicité de l'email, hachage BCrypt, vérification d'identifiants sur `/api/utilisateurs/connexion` | **PASS** |
| `ms-paiement` | `jdbc:h2:mem:paiementdb` | Table `paiements` | Génération de référence unique `PAY-XXXXXXXX`, récupération automatique du montant depuis `ms-reservation` | **PASS** |
| `ms-notification` | `jdbc:h2:mem:notificationdb` | Table `notifications` | Enregistrement automatique de la notification d'email après paiement réussi | **PASS** |
