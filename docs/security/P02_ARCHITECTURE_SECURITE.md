# ARCHITECTURE DE SÉCURITÉ CIBLE — PHASE P02
## Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance — UASZ

---

## 1. VISION D'ENSEMBLE ET FRONTIÈRES DE CONFIANCE

La sécurité de la plateforme repose sur une architecture de confiance zéro (Zero Trust Network Architecture) adaptée aux microservices Spring Cloud. Aucune composante ne fait aveuglément confiance au réseau interne sans validation cryptographique formelle.

```plantuml
@startuml P02_Security_Components
!theme plain
skinparam componentStyle rectangle

actor "Client Navigateur\n(Angular 22)" as Client
boundary "API Gateway\n(Spring Cloud Gateway :8090)" as Gateway

package "Identité & Sessions" {
  component "ms-utilisateur\n(:3005)" as IdP
  database "db_utilisateur\n(PostgreSQL 16)" as DB_Auth
}

package "Catalogue Touristique (Lectures Publiques / Mutations Staff)" {
  component "ms-patrimoine\n(:3001)" as MS_Patrimoine
  component "ms-circuit\n(:3002)" as MS_Circuit
  component "ms-evenement\n(:3003)" as MS_Evenement
}

package "Opérations Transactionnelles Privées" {
  component "ms-reservation\n(:3004)" as MS_Reservation
  component "ms-paiement\n(:3005)" as MS_Paiement
  component "ms-notification\n(:3006)" as MS_Notification
}

Client ==> Gateway : HTTPS (Cookie HttpOnly ACCESS_TOKEN & REFRESH_TOKEN\n+ Header X-XSRF-TOKEN)
Gateway --> IdP : Inscription / Connexion / Refresh / Profil
IdP --> DB_Auth : Tables utilisateur, sessions, refresh_tokens, audit

note right of Gateway
  <b>Frontière d'Entrée (Gateway) :</b>
  1. Nettoie systématiquement les en-têtes non fiables (X-User-*)
  2. Valide l'Access Token JWT (signature, exp, issuer, claims)
  3. Applique le Rate Limiting anti-bruteforce
  4. Injecte les en-têtes d'identité vérifiés (X-User-Id, X-User-Roles, X-User-Email)
  5. Signe l'enveloppe interne (X-Internal-Gateway-Token HMAC-SHA256)
end note

Gateway ==> MS_Patrimoine : Requête interne signée
Gateway ==> MS_Circuit : Requête interne signée
Gateway ==> MS_Evenement : Requête interne signée
Gateway ==> MS_Reservation : Requête interne signée
Gateway ==> MS_Paiement : Requête interne signée

MS_Reservation ..> MS_Circuit : OpenFeign + Signature Inter-Services (X-Service-Token)
MS_Reservation ..> MS_Evenement : OpenFeign + Signature Inter-Services (X-Service-Token)
MS_Paiement ..> MS_Reservation : OpenFeign + Signature Inter-Services (X-Service-Token)
MS_Paiement ..> MS_Notification : OpenFeign + Signature Inter-Services (X-Service-Token)
@enduml
```

---

## 2. DUAL-TOKEN PATTERN : GESTION DES JETONS ET ROTATION

### 2.1 Spécification de l'Access Token (JWT)
- **Format :** JSON Web Token (RFC 7519) standardisé.
- **Algorithme de signature :** HMAC-SHA256 (`HS256`) avec clé secrète minimale de 256 bits d'entropie.
- **Durée de vie (TTL) :** **15 minutes** (900 secondes).
- **Claims standard :**
  - `sub` : Identifiant de l'utilisateur (ex: `"2"`).
  - `email` : Adresse e-mail professionnelle ou personnelle (ex: `"moussa.diop@zig.univ.sn"`).
  - `roles` : Liste des rôles attribués (ex: `["TOURISTE"]`).
  - `iss` : `"uasz-patrimoine-auth"`.
  - `aud` : `"uasz-patrimoine-platform"`.
  - `iat` : Date d'émission en secondes Epoch.
  - `exp` : Date d'expiration en secondes Epoch (`iat + 900`).
  - `jti` : Identifiant unique de session UUID v4 liant le jeton à une entrée active en base de données.

### 2.2 Spécification du Refresh Token et Rotation Anti-Rejeu
- **Format :** Jeton opaque aléatoire cryptographiquement fort (64 caractères hexadécimaux / 256 bits générés via `SecureRandom`).
- **Durée de vie (TTL) :** **7 jours** (604 800 secondes).
- **Stockage en base :** Seul le condensat **SHA-256** du jeton est persisté en base de données (`token_hash`).
- **Algorithme de rotation atomique :**
  1. Lors de l'utilisation d'un refresh token $RT_n$, le serveur vérifie si $RT_n$ existe en base.
  2. **Détection de vol/rejeu :** Si $RT_n$ a déjà le drapeau `consumed = TRUE`, une tentative de réutilisation frauduleuse est détectée. Le serveur invalide immédiatement **toute la famille de sessions (`family_id`)** et journalise un incident critique dans `audit_securite`.
  3. Si $RT_n$ est valide et non consommé :
     - Il est marqué `consumed = TRUE` avec `consumed_at = CURRENT_TIMESTAMP`.
     - Un nouveau refresh token $RT_{n+1}$ est généré et stocké dans la même famille.
     - Un nouvel Access Token JWT est émis.

---

## 3. DIAGRAMMES DE SÉQUENCE SÉCURISÉE (PlantUML)

### 3.1 Authentification et Connexion

```plantuml
@startuml P02_Sequence_Connexion
autonumber
actor "Utilisateur" as User
participant "Frontend Angular" as UI
participant "API Gateway\n(:8090)" as GW
participant "ms-utilisateur\n(:3005)" as IdP
database "PostgreSQL\n(db_utilisateur)" as DB

User -> UI : Saisit e-mail + mot de passe
UI -> GW : POST /api/utilisateurs/connexion\n(Rate Limiter par IP & Email)
GW -> IdP : Transfère requête de connexion
IdP -> DB : SELECT * FROM utilisateur WHERE email = ?
DB --> IdP : Données utilisateur (dont mot_de_passe haché BCrypt/Argon2)
IdP -> IdP : Vérifie mot de passe (temps constant)\nVérifie actif == TRUE
alt Identifiants invalides
    IdP -> DB : INSERT INTO audit_securite(action='LOGIN_FAILED')
    IdP --> GW : 401 Unauthorized ("Identifiants invalides")
    GW --> UI : 401 Unauthorized
    UI --> User : Affichage erreur générique
else Authentification réussie
    IdP -> IdP : Génère Session ID (JTI), Access Token JWT (15m),\nRefresh Token opaque RT1 (7j)
    IdP -> DB : INSERT INTO session_utilisateur(id=JTI, ...)\nINSERT INTO refresh_token(hash=SHA256(RT1), family_id=FAM, ...)
    IdP -> DB : INSERT INTO audit_securite(action='LOGIN_SUCCESS')
    IdP --> GW : 200 OK (UtilisateurDto)\nSet-Cookie: ACCESS_TOKEN (HttpOnly, Lax, Path=/)\nSet-Cookie: REFRESH_TOKEN (HttpOnly, Strict, Path=/api/utilisateurs/refresh)\nSet-Cookie: XSRF-TOKEN (Non-HttpOnly, Path=/)
    GW --> UI : 200 OK + Données profil utilisateur
    UI --> User : Redirection vers l'espace personnel / tableau de bord
end
@enduml
```

### 3.2 Renouvellement de Jeton avec Rotation Atomique

```plantuml
@startuml P02_Sequence_Refresh
autonumber
participant "Frontend Angular" as UI
participant "API Gateway\n(:8090)" as GW
participant "ms-utilisateur\n(:3005)" as IdP
database "PostgreSQL\n(db_utilisateur)" as DB

UI -> GW : POST /api/utilisateurs/refresh\nCookie: REFRESH_TOKEN=RT1
GW -> IdP : Transfère la demande de rafraîchissement
IdP -> DB : SELECT * FROM refresh_token WHERE token_hash = SHA256(RT1)
alt Jeton inexistant ou déjà consommé (Tentative de Rejeu / Vol)
    IdP -> DB : UPDATE session_utilisateur SET active = FALSE WHERE id IN (SELECT session_id FROM refresh_token WHERE family_id = FAM)\nINSERT INTO audit_securite(action='REPLAY_ATTACK_DETECTED')
    IdP --> GW : 401 Unauthorized ("Session compromise")
    GW --> UI : 401 + Set-Cookie expiration immédiate
    UI -> UI : Purge session locale & redirection /connexion
else Jeton valide et non expiré
    IdP -> DB : UPDATE refresh_token SET consumed = TRUE, consumed_at = NOW() WHERE id = RT1_ID
    IdP -> IdP : Génère nouvel Access Token JWT (AT2) + nouveau Refresh Token RT2
    IdP -> DB : INSERT INTO refresh_token(hash=SHA256(RT2), family_id=FAM, session_id=...)
    IdP --> GW : 200 OK\nSet-Cookie: ACCESS_TOKEN (AT2)\nSet-Cookie: REFRESH_TOKEN (RT2)
    GW --> UI : 200 OK (Renouvellement transparent)
end
@enduml
```

### 3.3 Requête Authentifiée Traversant le Gateway vers un Microservice

```plantuml
@startuml P02_Sequence_Gateway_To_Service
autonumber
actor "Touriste Connecté" as User
participant "Frontend Angular" as UI
participant "API Gateway\n(:8090)" as GW
participant "ms-reservation\n(:3004)" as MS_Resa
database "db_reservation" as DB_Resa

User -> UI : Cliquer "Mes Réservations"
UI -> GW : GET /api/reservations/mes-reservations\nCookie: ACCESS_TOKEN=JWT\nEn-têtes forgés malveillants X-User-Roles: ADMINISTRATEUR (ignorer)
GW -> GW : 1. Nettoie TOUS les en-têtes entrants X-User-*\n2. Valide signature & expiration du JWT\n3. Extrait userId=2, roles=['TOURISTE']\n4. Injecte X-User-Id: 2, X-User-Roles: TOURISTE\n5. Calcule X-Internal-Gateway-Token = HMAC-SHA256(userId + roles + timestamp, INTERNAL_KEY)
GW -> MS_Resa : GET /api/reservations/mes-reservations\nEn-têtes validés et signés
MS_Resa -> MS_Resa : Filtre Interne : Valide X-Internal-Gateway-Token\n(Rejette immédiatement tout appel direct non signé)\nInstancie SecurityContext Spring avec id=2 et rôle TOURISTE
MS_Resa -> DB_Resa : SELECT * FROM reservation WHERE utilisateur_id = 2
DB_Resa --> MS_Resa : Liste des réservations appartenant à l'utilisateur 2
MS_Resa --> GW : 200 OK (JSON)
GW --> UI : 200 OK (JSON)
UI --> User : Affichage des réservations
@enduml
```

### 3.4 Communication Interservices Sécurisée (OpenFeign)

```plantuml
@startuml P02_Sequence_Interservice_Feign
autonumber
participant "ms-reservation\n(:3004)" as Caller
participant "ms-circuit\n(:3002)" as Target
database "db_circuit" as DB_Circ

Caller -> Caller : Prépare appel Feign: getCircuitById(id=1)\nIntercepteur Feign : génère nonce UUID + timestamp actuel\nCalcule Signature = HMAC-SHA256("ms-reservation:ms-circuit:" + id + ":" + timestamp + ":" + nonce, SERVICE_SECRET)
Caller -> Target : GET /api/circuits/1\nHeaders:\n  X-Service-Name: ms-reservation\n  X-Service-Timestamp: 1731888000\n  X-Service-Nonce: 4b281f9a-...\n  X-Service-Signature: 8f9b...
Target -> Target : Filtre Interne Interservice :\n1. Vérifie horodatage (|now - ts| < 30s)\n2. Vérifie unicité du nonce (protection anti-rejeu)\n3. Re-calcule HMAC-SHA256 et compare en temps constant\n4. Vérifie que ms-reservation est autorisé à appeler cet endpoint
Target -> DB_Circ : SELECT * FROM circuit WHERE id = 1
DB_Circ --> Target : Circuit data
Target --> Caller : 200 OK (CircuitDto)
@enduml
```

---

## 4. MODÈLE DE MENACES ET MITIGATIONS

| Menace | Vecteur d'attaque | Mesure de protection P02 |
|---|---|---|
| **BOLA / IDOR** | Modification de `id` dans l'URL pour accéder aux réservations d'un tiers | Vérification côté serveur dans le contrôleur et service métier : `utilisateurId == currentUser.id` ou `ADMINISTRATEUR`. |
| **Falsification d'en-têtes** | Envoi de `X-User-Roles: ADMINISTRATEUR` par le client | Suppression obligatoire de ces en-têtes en entrée de la Gateway ; injection exclusive par la Gateway avec signature HMAC interne. |
| **Vol de Refresh Token** | Interception d'un jeton de rafraîchissement | Détection de réutilisation : toute tentative de réutiliser un refresh token déjà consommé révoque immédiatement toute la session et sa famille de jetons. |
| **Attaque par Rejeu Interne** | Capture d'une requête interservice Feign | Horodatage strict ($\pm$ 30 secondes) + Nonce unique consommé une seule fois en cache / registre d'invalidation. |
| **Force Brute Connexion** | Tentatives massives sur `/api/utilisateurs/connexion` | Limitation de débit (Rate Limiting) au niveau de la Gateway et journalisation des échecs d'authentification. |
| **Énumération de comptes** | Comparaison des messages d'erreur à la connexion | Message d'erreur unique : *"Identifiants de connexion invalides."* quel que soit le cas d'erreur. |
