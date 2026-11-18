# AUDIT DES COMMUNICATIONS ET CONTRATS BACKEND (API)

**Règle impérative** : aucun contrat backend externe ne doit être modifié dans le cadre de la migration frontend. Le frontend Angular devra respecter strictement les DTO, endpoints, validations et formats d'erreur existants.

---

## 1. Mécanisme de transport et passerelle réseau

- **Protocole** : HTTP/1.1 REST JSON (UTF-8), sans authentification ni header d'autorisation.
- **Point d'entrée** : `api-gateway` (`:8080`), utilisant Spring Cloud Gateway Server WebMVC (`spring-cloud-starter-gateway-server-webmvc`).
- **Routage Gateway** (`api-gateway/src/main/resources/application.yml`) :
  - `ms-patrimoine` : `Path=/api/patrimoines/**` → `PATRIMOINE_URL` (`http://localhost:3001` ou `http://ms-patrimoine:3001`)
  - `ms-circuit` : `Path=/api/circuits/**` → `CIRCUIT_URL` (`http://localhost:3002`)
  - `ms-evenement` : `Path=/api/evenements/**` → `EVENEMENT_URL` (`http://localhost:3003`)
  - `ms-reservation` : `Path=/api/reservations/**` → `RESERVATION_URL` (`http://localhost:3004`)
  - `ms-utilisateur` : `Path=/api/utilisateurs/**` → `UTILISATEUR_URL` (`http://localhost:3005`)
  - `ms-paiement` : `Path=/api/paiements/**` → `PAIEMENT_URL` (`http://localhost:3006`)
  - `ms-notification` : `Path=/api/notifications/**` → `NOTIFICATION_URL` (`http://localhost:3007`)
- **Intercepteurs** : aucun intercepteur côté React ; `apiRequest()` (`frontend/src/api/client.js`) injecte systématiquement `Accept: application/json` et, lorsqu'un corps est fourni, `Content-Type: application/json`.

---

## 2. Format standardisé des réponses et des erreurs

Tous les microservices implémentent un `@RestControllerAdvice` (`GlobalExceptionHandler.java`) renvoyant un objet JSON uniforme en cas d'erreur :
```json
{
  "erreur": "Message descriptif de l'erreur"
}
```
Codes HTTP émis par le backend :
- `200 OK` : lectures (`GET`) et mises à jour (`PUT`).
- `201 Created` : créations (`POST`).
- `204 No Content` : suppressions (`DELETE`), corps vide.
- `400 Bad Request` : erreurs de validation `@Valid` (messages concaténés par `", "`), `BadRequestException`, JSON invalide, ou `MethodArgumentTypeMismatchException`.
- `404 Not Found` : `ResourceNotFoundException`.
- `503 Service Unavailable` : `ServiceIndisponibleException` (quand un appel OpenFeign inter-microservices échoue).
- `500 Internal Server Error` : `{"erreur": "Erreur interne du serveur"}`.

> **Remarque Jackson (Spring Boot 4)** : tous les `application.yml` activent `spring.jackson.deserialization.fail-on-null-for-primitives: false`, ce qui convertit à `0` les champs primitifs absents en entrée.

---

## 3. Contrats REST consommés par le Frontend actuel

### 3.1 `ms-patrimoine` (`/api/patrimoines`)
- `GET /api/patrimoines` → `PatrimoineDto[]`
- `GET /api/patrimoines/{id}` → `PatrimoineDto`
- *(Non consommés par React : `POST /api/patrimoines`, `PUT /api/patrimoines/{id}`, `DELETE /api/patrimoines/{id}`)*

**Modèle `PatrimoineDto`** (`ms-patrimoine/.../PatrimoineDto.java`) :
| Champ | Type Java | Type TS | Validation / Contrainte |
|---|---|---|---|
| `id` | `Long` | `number` | Généré en base |
| `nomPatrimoine` | `String` | `string` | `@NotBlank` |
| `codePatrimoine` | `String` | `string` | `@NotBlank` — sert de clé fichier image `/images/patrimoines/<codePatrimoine>.jpg` |
| `descriptionPatrimoine` | `String` | `string \| null` | `@Size(max = 2000)` |
| `historiquePatrimoine` | `String` | `string \| null` | `@Size(max = 2000)` |
| `adressePatrimoine` | `String` | `string \| null` | — |
| `capacitePatrimoine` | `int` | `number` | `@PositiveOrZero` |
| `latitudePatrimoine` | `float` | `number` | Coordonnée GPS |
| `longitudePatrimoine` | `float` | `number` | Coordonnée GPS |

### 3.2 `ms-circuit` (`/api/circuits`)
- `GET /api/circuits` → `CircuitDto[]` (**Important** : `etapes[].patrimoine` vaut `null`, seul `etapes[].patrimoineId` est renseigné — `CircuitService.getAllCircuits()` ligne 65)
- `GET /api/circuits/{id}` → `CircuitDto` (**Enrichissement tolérant** : `etapes[].patrimoine` est peuplé via OpenFeign, ou reste `null` si `ms-patrimoine` est injoignable — `CircuitService.getByIdCircuit()`)
- *(Non consommés : `POST /api/circuits`, `PUT /api/circuits/{id}`, `DELETE /api/circuits/{id}`, `GET /api/circuits/communication/{mode}/patrimoines/{patrimoineId}`)*

**Modèle `CircuitDto` & `EtapeDto`** :
| Champ | Type Java | Type TS | Règle métier |
|---|---|---|---|
| `id` | `Long` | `number` | — |
| `nomCircuit` | `String` | `string` | `@NotBlank` |
| `descriptionCircuit` | `String` | `string \| null` | `@Size(max = 2000)` |
| `difficulte` | `Difficulte` | `'FACILE' \| 'MOYEN' \| 'DIFFICILE' \| null` | Enum |
| `dureeEstimee` | `int` | `number` | Calculée serveur (somme `dureeVisite`, minutes) |
| `distanceTotale` | `double` | `number` | Calculée serveur (Haversine km, 2 décimales) |
| `placesMax` | `int` | `number` | `@PositiveOrZero` |
| `prix` | `double` | `number` | `@PositiveOrZero` (FCFA) |
| `etapes` | `List<EtapeDto>` | `EtapeDto[]` | `@NotEmpty` (`id`, `ordre`, `dureeVisite`, `patrimoineId`, `patrimoine?`) |

### 3.3 `ms-evenement` (`/api/evenements`)
- `GET /api/evenements` → `EvenementDto[]` (**Important** : `patrimoine` vaut `null`, seul `patrimoineId` est présent — `EvenementService.getAllEvenements()`)
- `GET /api/evenements/{id}` → `EvenementDto` (`patrimoine` enrichi via OpenFeign de manière tolérante)
- *(Non consommés : `POST`, `PUT`, `DELETE`)*

**Modèle `EvenementDto`** :
| Champ | Type Java | Type TS | Règle métier |
|---|---|---|---|
| `id` | `Long` | `number` | — |
| `nomEvenement` | `String` | `string` | `@NotBlank` |
| `descriptionEvenement` | `String` | `string \| null` | `@Size(max = 2000)` |
| `typeEvenement` | `TypeEvenement` | `'EXPOSITION' \| 'ATELIER' \| 'VISITE_GUIDEE' \| 'CONFERENCE' \| 'FESTIVAL'` | `@NotNull` |
| `dateDebut` | `LocalDateTime` | `string` (ISO-8601) | `@NotNull` |
| `dateFin` | `LocalDateTime` | `string` (ISO-8601) | `@NotNull`, `>= dateDebut` |
| `lieu` | `String` | `string \| null` | Repli serveur sur `patrimoine.adressePatrimoine` |
| `capaciteMax` | `int` | `number` | `@Positive`, `<= patrimoine.capacitePatrimoine` |
| `prix` | `double` | `number` | `@PositiveOrZero` |
| `patrimoineId` | `Long` | `number` | `@NotNull` |
| `patrimoine` | `PatrimoineDto` | `PatrimoineDto \| null` | Lecture seule (enrichi sur `GET /{id}`) |

### 3.4 `ms-reservation` (`/api/reservations`)
- `GET /api/reservations` → `ReservationDto[]` (liste non enrichie : `circuit` et `evenement` valent `null`)
- `GET /api/reservations/{id}` → `ReservationDto` (non appelé par React actuellement ; enrichit `circuit` ou `evenement`)
- `POST /api/reservations` → `201 Created` `ReservationDto` (crée immédiatement avec `statut = CONFIRMEE`, calcule `montantTotal = nombrePlaces * prix`, vérifie places restantes via `sumPlacesBy...AndStatutNot(..., ANNULEE)`)
- `PUT /api/reservations/{id}/annuler` → `200 OK` `ReservationDto` (corps vide, passe `statut` à `ANNULEE`)
- *(Non consommé : `DELETE /api/reservations/{id}`)*

**Modèle `ReservationDto`** :
| Champ | Type Java | Type TS | Contraintes |
|---|---|---|---|
| `id` | `Long` | `number` | Généré |
| `nomClient` | `String` | `string` | `@NotBlank` |
| `emailClient` | `String` | `string` | `@NotBlank`, `@Email` |
| `telephoneClient` | `String` | `string \| null` | Optionnel |
| `nombrePlaces` | `int` | `number` | `@Positive` (`>= 1`) |
| `dateReservation` | `LocalDateTime` | `string` (ISO) | Fixé serveur (`LocalDateTime.now()`) |
| `typeReservation` | `TypeReservation` | `'CIRCUIT' \| 'EVENEMENT'` | `@NotNull` |
| `statut` | `StatutReservation` | `'EN_ATTENTE' \| 'CONFIRMEE' \| 'ANNULEE'` | Fixé serveur (`CONFIRMEE` à la création) |
| `montantTotal` | `double` | `number` | Calculé serveur |
| `circuitId` / `evenementId` | `Long` | `number \| null` | L'un requis selon `typeReservation` |
| `circuit` / `evenement` | `CircuitDto` / `EvenementDto` | nullable | Enrichis sur `POST` et `GET /{id}` |

---

## 4. Contrats REST Backend non encore consommés par le Frontend

1. **`ms-utilisateur` (`/api/utilisateurs`)** :
   - `POST /api/utilisateurs` (`UtilisateurDto` avec `motDePasse` `@JsonProperty(WRITE_ONLY)`, `role` défaut `TOURISTE`)
   - `POST /api/utilisateurs/connexion` (`ConnexionRequest { email, motDePasse }` → retourne `UtilisateurDto` **sans token JWT**)
   - `GET /api/utilisateurs`, `GET/PUT/DELETE /api/utilisateurs/{id}`
   - Enum `RoleUtilisateur` : `TOURISTE`, `ADMINISTRATEUR`, `GESTIONNAIRE_SITE`.
2. **`ms-paiement` (`/api/paiements`)** :
   - `POST /api/paiements` (`{ reservationId, modePaiement }`, `ModePaiement` = `CARTE_BANCAIRE | ORANGE_MONEY | WAVE | ESPECES`) → vérifie réservation non annulée et non déjà payée (`REUSSI`), déclenche `ms-notification`.
   - `GET /api/paiements`, `GET /api/paiements/{id}`.
3. **`ms-notification` (`/api/notifications`)** :
   - `POST /api/notifications`, `GET /api/notifications`, `GET/DELETE /api/notifications/{id}`.
   - Enum `CanalNotification` (`EMAIL`, `SMS`), `StatutNotification`.

---

## 5. Contraintes d'interface à respecter pendant la migration Angular

1. **Non-enrichissement des listes** : `GET /api/circuits`, `GET /api/evenements` et `GET /api/reservations` renvoient uniquement des IDs étrangers (`patrimoineId`, `circuitId`, `evenementId`). Le client Angular devra donc conserver l'agrégation côté front (tout en l'optimisant via un cache/store en mémoire pour éviter les re-téléchargements répétés).
2. **Gestion `null` / `0` sur champs primitifs** : les `int`/`double`/`float` Java peuvent valoir `0` plutôt que `null` (notamment `latitudePatrimoine: 0`, `longitudePatrimoine: 0`, `prix: 0` → `"Gratuit"`). Conserver la logique d'`InfoBox` et `formatPrixFCFA` à l'identique.
3. **Extraction des erreurs** : tout intercepteur Angular `HttpClient` devra extraire `err.error?.erreur || err.error?.message || err.message` pour rester 100 % compatible avec le format `{"erreur": "..."}`.
4. **Absence de pagination/filtrage serveur** : aucun endpoint `GET` ne supporte `?page=`, `?size=` ou `?q=`. Le filtrage et le tri restent donc côté client dans la version actuelle.
