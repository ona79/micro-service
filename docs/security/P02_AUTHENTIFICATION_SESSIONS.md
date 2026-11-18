# ARCHITECTURE D'AUTHENTIFICATION ET DE GESTION DES SESSIONS — PHASE P02 (RÉVISÉE P02-CORRECTION)
## Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance — UASZ

---

## 1. STRATÉGIE GLOBALE : LE PATTERN DUAL-TOKEN DURCI

Pour concilier performance des microservices et contrôle immédiat du cycle de vie des sessions (révocation, changement de rôle, détection de rejeu), la plateforme implémente le pattern **Dual-Token avec vérification d'état de session** :

```
Client (Angular 22)
       │
       ├─── Requêtes métier ─────────►  Access Token (JWT HS256, 15 min, Cookie HttpOnly PATRIMOINE_SESSION)
       │                                + Protection CSRF (Cookie XSRF-TOKEN + En-tête X-XSRF-TOKEN)
       │                                + Contrôle de non-révocation de session et de cohérence de rôle
       │
       └─── Expiration du JWT (401) ─►  Refresh Token (Opaque 256-bit, 7 jours, Cookie HttpOnly PATRIMOINE_REFRESH)
                                        Verrouillage pessimiste SELECT ... FOR UPDATE & rotation atomique sur PostgreSQL 16
```

---

## 2. SPÉCIFICATIONS DU JETON D'ACCÈS (ACCESS TOKEN JWT)

L'Access Token est un JSON Web Token (RFC 7519) signé avec l'algorithme HMAC-SHA256 (`HS256`) via la clé obligatoire `${SECURITY_SESSION_SECRET}` ($\ge 256$ bits, entropie vérifiée au démarrage).

### Structure du Header :
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Structure du Payload (Claims) :
```json
{
  "iss": "casamance-auth-service",
  "sub": "2",
  "email": "moussa.diop@zig.univ.sn",
  "role": "TOURISTE",
  "permissions": [
    "PATRIMOINE:LIRE",
    "CIRCUIT:LIRE",
    "EVENEMENT:LIRE",
    "RESERVATION:CREER",
    "RESERVATION:LIRE_PROPRE",
    "RESERVATION:ANNULER_PROPRE",
    "PAIEMENT:INITIER",
    "PAIEMENT:LIRE_PROPRE",
    "UTILISATEUR:LIRE_PROFIL",
    "UTILISATEUR:MODIFIER_PROPRE"
  ],
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "jti": "987fcdeb-51a2-4321-fedc-ba0987654321",
  "iat": 1731888000,
  "exp": 1731888900
}
```

---

## 3. SPÉCIFICATIONS DU REFRESH TOKEN ET CONCURRENCE ATOMIQUE

Le Refresh Token est une chaîne opaque cryptographiquement aléatoire (32 octets / 64 caractères hexadécimaux générés par `SecureRandom`).

### 3.1 Transport exclusivement par Cookie HttpOnly
- Le Refresh Token est transmis **exclusivement** via le cookie `PATRIMOINE_REFRESH` (`HttpOnly; SameSite=Strict; Path=/api/utilisateurs`).
- L'en-tête `X-Refresh-Token` a été intégralement supprimé en écriture (`UtilisateurController`) comme en lecture (`SessionTokenService`).

### 3.2 Rotation Atomique et Protection contre les Courses Concurrentes
Dans `AuthSessionManager.refreshSession` :
1. **Verrouillage pessimiste (`SELECT ... FOR UPDATE`)** : `refreshTokenRepository.findByTokenHashForUpdate(tokenHash)` acquiert un verrou exclusif `PESSIMISTIC_WRITE` sur la ligne du jeton dans PostgreSQL 16.
2. **Consommation atomique conditionnelle** : `refreshTokenRepository.consumeTokenAtomically(id, newHash, now)` exécute `UPDATE refresh_token SET revoked = true, revoked_at = :now, replaced_by_hash = :newHash WHERE id = :id AND revoked = false` et vérifie que le nombre de lignes affectées vaut exactement `1`.
3. **Contrainte d'unicité en base (Flyway V4)** : La colonne `parent_token_hash VARCHAR(64)` porte la contrainte unique `uk_refresh_token_parent_hash`. Il est mathématiquement et transactionnellement impossible que deux requêtes concurrentes utilisant le même refresh token produisent deux jetons successeurs valides. Sur $N$ requêtes concurrentes simultanées, exactement **1** réussit (`200 OK`) et **$N-1$** sont rejetées (`401 Unauthorized`).

### 3.3 Persistance Garantie de la Détection de Rejeu
- La méthode `refreshSession` est annotée `@Transactional(noRollbackFor = {UnauthorizedException.class, ForbiddenException.class})`.
- Lorsqu'un jeton déjà révoqué (`revoked == true`) est présenté :
  1. `refreshTokenRepository.revokeEntireFamily(familyId, now)` révoque immédiatement tous les jetons de la famille (y compris le jeton successeur légitime).
  2. La session `session_utilisateur` est désactivée (`active = false`, `revoked_at = now`, `revocation_reason = 'TOKEN_REPLAY_DETECTED'`).
  3. `auditSecuriteService.logEvent("ALERT_TOKEN_REPLAY", ...)` persiste l'alerte dans une transaction indépendante (`Propagation.REQUIRES_NEW`).
  4. L'exception `UnauthorizedException` (HTTP 401) est levée **sans annuler (noRollbackFor)** la transaction de révocation.

---

## 4. PROTECTION CSRF DOUBLE-SUBMIT SIGNÉE PAR HMAC

Pour protéger toutes les opérations mutatives (`POST`, `PUT`, `PATCH`, `DELETE`) lorsque l'authentification repose sur le cookie `PATRIMOINE_SESSION` :
1. À la connexion et au rafraîchissement, `SessionTokenService.generateCsrfToken(sessionId)` calcule :
   $$\text{XSRF-TOKEN} = \text{Base64Url}\left(\text{HMAC-SHA256}_{K_{\text{session}}}(\text{"CSRF:"} \parallel \text{sessionId})\right)$$
2. Le navigateur stocke ce jeton dans le cookie `XSRF-TOKEN` (`HttpOnly=false`, `SameSite=Strict`, `Path=/`) et l'intercepteur Angular `authInterceptor` l'injecte dans l'en-tête `X-XSRF-TOKEN`.
3. `GatewayAuthorizationFilter` et `UtilisateurController` vérifient en temps constant (`MessageDigest.isEqual`) que :
   - Le cookie `XSRF-TOKEN` et l'en-tête `X-XSRF-TOKEN` sont présents et identiques (ou que l'en-tête est valide),
   - La valeur correspond exactement au HMAC calculé à partir du `sessionId` contenu dans le JWT.

---

## 5. INVALIDATION IMMÉDIATE DES SESSIONS LORS DES ACTIONS ADMINISTRATIVES

Lorsqu'un administrateur :
- modifie le rôle d'un utilisateur (`PUT /api/utilisateurs/{id}/role`),
- désactive un compte (`PUT /api/utilisateurs/{id}` avec `actif = false`),
- supprime un utilisateur (`DELETE /api/utilisateurs/{id}`), ou
- révoque ses sessions (`POST /api/utilisateurs/{id}/revoquer-sessions`),

le système :
1. Révoque immédiatement toutes les entrées `session_utilisateur` et `refresh_token` de l'utilisateur en base de données (`AuthSessionManager.revokeAllUserSessions`).
2. Publie l'invalidation au niveau du Gateway (`X-Revoke-User-Id` / `X-Revoke-User-Active-Role`) et vérifie la cohérence entre le rôle porté par le JWT et le rôle actif en base (`AuthSessionManager.validateActiveSessionAndRole`). Tout Access Token déjà émis avec l'ancien rôle ou appartenant à une session révoquée est immédiatement rejeté (`401 Unauthorized`).
