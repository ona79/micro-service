# PLAN DE TESTS DE SÉCURITÉ ET DE VALIDATION — PHASE P02
## Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance — UASZ

---

## 1. STRATÉGIE DE TEST ET CRITÈRES D'ACCEPTATION

La validation de la sécurité de la plateforme repose sur une suite de tests automatisés combinant :
- Des tests unitaires ciblés pour les composants cryptographiques (hachage, signature, nonces).
- Des tests d'intégration avec Spring Boot (`@WebMvcTest` et `@SpringBootTest`) simulant les filtres de sécurité, l'accès à la base de données et les contextes d'exécution réels.
- Des tests de non-régression validant que les fonctionnalités publiques du catalogue et les scénarios P01 restent parfaitement opérationnels.

---

## 2. MATRICE DÉTAILLÉE DES TESTS DE SÉCURITÉ

### 2.1 Authentification et Gestion des Sessions (`ms-utilisateur`)

| Réf Test | Scénario / Condition Testée | Entrée | Résultat Attendu |
| :--- | :--- | :--- | :--- |
| `SEC-AUTH-01` | Connexion avec identifiants valides | Email et mot de passe corrects | HTTP 200, JWT Access Token émis (exp: 15m), Refresh Token opaque persistant généré |
| `SEC-AUTH-02` | Connexion avec mot de passe incorrect | Email valide, mot de passe erroné | HTTP 401, message générique anti-énumération, événement d'échec consigné dans `audit_securite` |
| `SEC-AUTH-03` | Connexion sur compte inexistant | Email inconnu | HTTP 401, réponse strictement identique à `SEC-AUTH-02` |
| `SEC-AUTH-04` | Connexion sur compte désactivé (`actif = false`) | Identifiants valides mais compte inactif | HTTP 401, accès refusé |
| `SEC-AUTH-05` | Présentation d'un Access Token expiré | Header Bearer ou Cookie avec exp < maintenant | HTTP 401, demande de ré-authentification ou de refresh |
| `SEC-AUTH-06` | Présentation d'un Access Token à signature falsifiée | Header Bearer avec signature modifiée | HTTP 401, signature invalide |
| `SEC-AUTH-07` | Rotation normale du Refresh Token | Cookie `PATRIMOINE_REFRESH` valide | HTTP 200, nouvel Access Token, nouveau Refresh Token, ancien refresh token marqué `revoked = true` |
| `SEC-AUTH-08` | Détection de rejeu d'un Refresh Token (Replay Attack) | Présentation d'un Refresh Token déjà révoqué | HTTP 401, révocation de TOUTE la famille `family_id`, session clôturée, audit `ALERT_TOKEN_REPLAY` |
| `SEC-AUTH-09` | Déconnexion explicite | Appel `/api/utilisateurs/deconnexion` | HTTP 200, session désactivée en base, cookies invalidés (Max-Age=0) |
| `SEC-AUTH-10` | Protection contre la force brute (Rate Limiting) | Plus de 5 échecs consécutifs en moins d'une minute | HTTP 429 Too Many Requests |

---

### 2.2 Contrôle d'Accès RBAC (5 Rôles Métier)

| Réf Test | Rôle Testé | Opération / Endpoint Tenté | Résultat Attendu |
| :--- | :--- | :--- | :--- |
| `SEC-RBAC-01` | `TOURISTE` | Lecture publique du catalogue (`GET /api/patrimoines`) | HTTP 200 OK |
| `SEC-RBAC-02` | `TOURISTE` | Création de fiche de patrimoine (`POST /api/patrimoines`) | HTTP 403 Forbidden |
| `SEC-RBAC-03` | `TOURISTE` | Consultation de la liste globale des utilisateurs | HTTP 403 Forbidden |
| `SEC-RBAC-04` | `TOURISTE` | Auto-inscription avec rôle forcé `ADMINISTRATEUR` dans JSON | HTTP 201 Created mais rôle forcé à `TOURISTE` côté serveur |
| `SEC-RBAC-05` | `CONSERVATEUR` | Création ou modification d'une fiche patrimoine | HTTP 200 / 201 OK |
| `SEC-RBAC-06` | `CONSERVATEUR` | Tentative d'accès à l'administration des utilisateurs | HTTP 403 Forbidden |
| `SEC-RBAC-07` | `GESTIONNAIRE_SITE` | Création ou modification d'un circuit ou d'un événement | HTTP 200 / 201 OK |
| `SEC-RBAC-08` | `GUIDE` | Consultation des circuits affectés | HTTP 200 OK |
| `SEC-RBAC-09` | `ADMINISTRATEUR` | Création d'un compte staff via `/api/utilisateurs/admin` | HTTP 201 Created |
| `SEC-RBAC-10` | `ADMINISTRATEUR` | Consultation des logs d'audit et gestion des utilisateurs | HTTP 200 OK |

---

### 2.3 Remédiation BOLA / IDOR (`ms-reservation` & `ms-paiement`)

| Réf Test | Utilisateur Connecté | Cible | Opération Tentée | Résultat Attendu |
| :--- | :--- | :--- | :--- | :--- |
| `SEC-BOLA-01` | Touriste A (ID: 2) | Réservation appartenant au Touriste B (ID: 4) | `GET /api/reservations/{id_B}` | HTTP 403 Forbidden |
| `SEC-BOLA-02` | Touriste A (ID: 2) | Réservation appartenant au Touriste B (ID: 4) | `PUT /api/reservations/{id_B}/annuler` | HTTP 403 Forbidden |
| `SEC-BOLA-03` | Touriste A (ID: 2) | Réservation appartenant au Touriste B (ID: 4) | `DELETE /api/reservations/{id_B}` | HTTP 403 Forbidden |
| `SEC-BOLA-04` | Touriste A (ID: 2) | Réservation appartenant au Touriste A (ID: 2) | `GET /api/reservations/{id_A}` | HTTP 200 OK |
| `SEC-BOLA-05` | Touriste A (ID: 2) | Réservation appartenant au Touriste A (ID: 2) | `PUT /api/reservations/{id_A}/annuler` | HTTP 200 OK |
| `SEC-BOLA-06` | Touriste A (ID: 2) | Création réservation avec `utilisateurId: 4` dans JSON | `POST /api/reservations` | HTTP 201 Created mais `utilisateurId` forcé à l'ID 2 du token |
| `SEC-BOLA-07` | Touriste A (ID: 2) | Transaction de paiement du Touriste B | `GET /api/paiements/{id_B}` | HTTP 403 Forbidden |
| `SEC-BOLA-08` | Administrateur (ID: 1)| Réservation de n'importe quel utilisateur | `GET /api/reservations/{id}` | HTTP 200 OK (Accès superviseur autorisé) |

---

### 2.4 Sécurisation du Gateway (`api-gateway`)

| Réf Test | Scénario Testé | Entrée | Résultat Attendu |
| :--- | :--- | :--- | :--- |
| `SEC-GW-01` | Falsification d'en-tête client | Client injecte `X-User-Roles: ADMINISTRATEUR` sans JWT | En-tête supprimé par le Gateway, requête traitée comme anonyme |
| `SEC-GW-02` | Signature de l'enveloppe interne | Requête légitime avec JWT valide traversant le Gateway | Gateway injecte `X-Internal-Gateway-Token` HMAC-SHA256 valide |
| `SEC-GW-03` | Mutation catalogue non authentifiée | `POST /api/patrimoines` sans JWT | HTTP 401 Unauthorized |
| `SEC-GW-04` | Mutation catalogue avec rôle insuffisant | `POST /api/patrimoines` avec token `TOURISTE` | HTTP 403 Forbidden |
| `SEC-GW-05` | Consultation catalogue publique | `GET /api/patrimoines` sans JWT | HTTP 200 OK (Catalogue librement accessible) |

---

### 2.5 Communications Interservices OpenFeign

| Réf Test | Scénario Testé | Entrée | Résultat Attendu |
| :--- | :--- | :--- | :--- |
| `SEC-FEIGN-01` | Appel interservice signé et conforme | Requête Feign avec HMAC valide, timestamp actuel et nonce unique | HTTP 200 OK, accepté par le service cible |
| `SEC-FEIGN-02` | Appel direct non authentifié | Appel HTTP sur le port du microservice sans en-têtes `X-Service-*` | HTTP 401 Unauthorized |
| `SEC-FEIGN-03` | Signature HMAC interservice altérée | En-têtes présents mais signature erronée | HTTP 403 Forbidden |
| `SEC-FEIGN-04` | Requête interservice asynchrone / expirée | `X-Service-Timestamp` décalé de plus de 30 secondes | HTTP 401 Unauthorized |
| `SEC-FEIGN-05` | Attaque par rejeu de nonce | Deuxième requête soumise avec un `X-Service-Nonce` identique | HTTP 403 Forbidden (Replay detected) |

---

### 2.6 Frontend Angular 22

| Réf Test | Scénario Testé | Résultat Attendu |
| :--- | :--- | :--- |
| `SEC-UI-01` | Navigation vers `/mon-espace` sans être connecté | Redirection automatique vers `/connexion?returnUrl=/mon-espace` |
| `SEC-UI-02` | Navigation vers `/admin` par un `TOURISTE` | Redirection vers `/acces-refuse` |
| `SEC-UI-03` | Expiration de session en cours d'utilisation | Intercepteur déclenche silencieusement `/api/utilisateurs/refresh` ; si échec, redirection vers `/connexion` |
| `SEC-UI-04` | Prise en charge des 5 rôles dans l'interface | Affichage adéquat des badges et des menus pour `TOURISTE`, `GUIDE`, `CONSERVATEUR`, `GESTIONNAIRE_SITE`, `ADMINISTRATEUR` |
