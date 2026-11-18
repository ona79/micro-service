# SÉCURISATION DES COMMUNICATIONS GATEWAY ET INTERSERVICES — PHASE P02 (RÉVISÉE P02-CORRECTION)
## Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance — UASZ

---

## 1. ARCHITECTURE DE SIGNATURE DE BOUT EN BOUT

Pour empêcher tout contournement du Gateway, toute falsification d'identité ou toute modification de requête en transit sur le réseau interne, deux protocoles cryptographiques basés sur `HMAC-SHA256` et la clé obligatoire `${SECURITY_INTERSERVICE_SECRET}` protègent l'intégralité des échanges :
1. **Enveloppe Gateway liée à la requête (`X-Internal-Gateway-Token`)** pour le trafic Nord-Sud (`api-gateway` $\rightarrow$ microservices).
2. **Signature Canonique Interservices (`X-Service-Signature`)** + **Matrice ACL** pour le trafic Est-Ouest (`OpenFeign`, `RestTemplate`, `WebClient`).

---

## 2. TRAFIC NORD-SUD : ENVELOPPE GATEWAY LIÉE À LA REQUÊTE

### 2.1 En-têtes injectés par `GatewayAuthorizationFilter`
Après assainissement des en-têtes entrants (`SanitizedGatewayRequestWrapper`), validation du JWT et contrôle RBAC/CSRF, le Gateway injecte :
- `X-User-Id` : Identifiant utilisateur vérifié (ou `"ANONYMOUS"` pour les lectures publiques).
- `X-User-Roles` : Rôle vérifié (ou `"PUBLIC"`).
- `X-User-Permissions` : Liste des permissions vérifiées séparées par virgule.
- `X-User-Email` : Email vérifié.
- `X-Session-Id` : Identifiant de session actif.
- `X-Content-SHA256` : Condensat SHA-256 hexadécimal du corps HTTP de la requête.
- `X-Internal-Gateway-Token` : `<timestamp_epoch_seconds>.<nonce_uuid>.<signature_base64url>`

### 2.2 Chaîne Canonique de l'Enveloppe Gateway (10 champs)
La signature de l'enveloppe Gateway couvre l'intégralité du contexte de la requête :
```
CanonicalGatewayPayload = METHOD + "|" + NORMALIZED_PATH + "|" + USER_ID + "|" + ROLES + "|" + PERMISSIONS + "|" + EMAIL + "|" + SESSION_ID + "|" + TIMESTAMP + "|" + NONCE + "|" + BODY_SHA256
```
$$\text{Signature} = \text{Base64Url}\left(\text{HMAC-SHA256}_{K_{\text{interservice}}}(\text{CanonicalGatewayPayload})\right)$$

### 2.3 Vérification côté Microservice (`MicroserviceSecurityFilter`)
Chaque microservice vérifie à la réception :
1. La validité de la fenêtre temporelle ($|\text{now} - \text{timestamp}| \le 30\text{ s}$).
2. L'unicité du `nonce` dans le cache anti-rejeu (`gateway:<nonce>`).
3. L'égalité entre `X-Content-SHA256` et le condensat SHA-256 réel du corps reçu (`CachedBodyHttpServletRequest`).
4. La signature HMAC-SHA256 en temps constant (`MessageDigest.isEqual`) sur le chemin normalisé (`URI.normalize()`).
Un jeton capturé sur `GET /api/patrimoines` est donc inutilisable sur `POST /api/reservations` ou avec un corps modifié.

---

## 3. TRAFIC EST-OUEST : SIGNATURE CANONIQUE INTERSERVICES & ACL

### 3.1 En-têtes injectés (`InterserviceFeignSecurityInterceptor` & `HttpClientsConfig`)
Tous les appels interservices (`OpenFeign`, `RestTemplate`, `WebClient`) injectent :

| En-tête | Description |
| :--- | :--- |
| `X-Service-Name` | Identifiant du microservice appelant (ex: `ms-reservation`, `ms-paiement`, `ms-circuit`) |
| `X-Service-Audience` | Identifiant du microservice destinataire (ex: `ms-circuit`, `ms-reservation`, `ms-notification`) |
| `X-Service-Timestamp` | Horodatage Unix en secondes |
| `X-Service-Nonce` | UUID v4 unique par requête |
| `X-Content-SHA256` | Condensat SHA-256 hexadécimal du corps de la requête |
| `X-Service-Signature` | Signature HMAC-SHA256 encodée en Base64URL |
| `X-User-Id`, `X-User-Roles`, `X-User-Permissions`, `X-User-Email` | Contexte utilisateur propagé et protégé par la signature |

### 3.2 Chaîne Canonique Interservices (11 champs)
```
CanonicalInterserviceString = METHOD + "|" + NORMALIZED_PATH + "|" + AUDIENCE + "|" + CALLER_SERVICE + "|" + TIMESTAMP + "|" + NONCE + "|" + USER_ID + "|" + ROLES + "|" + PERMISSIONS + "|" + EMAIL + "|" + BODY_SHA256
```
$$\text{X-Service-Signature} = \text{Base64Url}\left(\text{HMAC-SHA256}_{K_{\text{interservice}}}(\text{CanonicalInterserviceString})\right)$$

### 3.3 Vérification Stricte et Matrice ACL par Service Destinataire
Le microservice destinataire ne fait **jamais** confiance au seul en-tête `X-Service-Name` :
1. Il vérifie que `X-Service-Audience` correspond exactement à son propre `spring.application.name`.
2. Il vérifie l'horodatage ($\pm 30\text{ s}$), le `nonce` unique, le hash `X-Content-SHA256` du corps et la signature HMAC-SHA256 complète (incluant l'identité et les rôles propagés).
3. Il applique sa **Matrice ACL des services autorisés** avant d'autoriser l'exécution :

| Service Destinataire (`Audience`) | Services Appelants Autorisés (`Caller`) | Méthodes & Chemins Autorisés | Justification Métier |
| :--- | :--- | :--- | :--- |
| `ms-patrimoine` | `ms-circuit`, `ms-reservation` | `GET /api/patrimoines/**` | Lecture des sites patrimoniaux d'un circuit |
| `ms-circuit` | `ms-reservation` | `GET /api/circuits/**` | Vérification de disponibilité et tarif d'un circuit |
| `ms-evenement` | `ms-reservation` | `GET /api/evenements/**` | Vérification de disponibilité d'un événement |
| `ms-reservation` | `ms-paiement` | `GET /api/reservations/*` | Vérification du montant et du propriétaire avant paiement |
| `ms-notification` | `ms-reservation`, `ms-paiement` | `POST /api/notifications/envoyer`, `POST /api/notifications` | Envoi de confirmation de réservation ou de reçu de paiement |
| `ms-utilisateur` | *(Aucun appel interservice métier autorisé)* | — | Isolation stricte du fournisseur d'identité |
| `ms-paiement` | *(Aucun appel interservice entrant autorisé)* | — | Isolation stricte des transactions de paiement |

Tout appel interservice provenant d'un service non listé ou ciblant une méthode/route non autorisée est rejeté avec `403 Forbidden`.

---

## 4. PROTECTION ANTI-REJEU ET HYPOTHÈSE D'ARCHITECTURE

Chaque microservice maintient un registre atomique des nonces consommés (`usedNonces` avec purge des entrées expirées au-delà de la fenêtre de tolérance de $\pm 30\text{ s}$) en utilisant `putIfAbsent(nonceKey, timestamp) != null`.
- **Architecture déployée (Docker Compose mono-instance par microservice)** : Chaque microservice s'exécutant en instance unique derrière Eureka et le Gateway, le registre en mémoire locale garantit une détection anti-rejeu déterministe et sans latence réseau.
- **Évolution multi-instances (Scale-out horizontal)** : Si plusieurs répliques d'un même microservice sont déployées en production, la vérification du nonce doit être déléguée à un magasin atomique partagé (`Redis SET key value NX EX 60`) afin d'empêcher le rejeu croisé entre deux instances distinctes dans la fenêtre de 30 secondes.
