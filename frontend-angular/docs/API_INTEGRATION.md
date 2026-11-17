# INTÉGRATIONS API & CONTRATS BACKEND

Toutes les requêtes passent par le préfixe `/api` via `apiPrefixInterceptor` :
- **Développement (`ng serve`)** : `proxy.conf.json` redirige `/api/*` vers `http://localhost:8080` (`api-gateway`).
- **Production (Docker / Nginx)** : `nginx.conf` proxyfie `/api/` vers `http://api-gateway:8080/api/`.

## Endpoints consommés

| Domaine | Service | Endpoints | Contrat & Particularités |
|---|---|---|---|
| Patrimoines | `PatrimoineApiService` | `GET /api/patrimoines`, `GET /api/patrimoines/{id}` | 3 sites pré-chargés (`PAT-DKR-001`, `PAT-DKR-002`, `PAT-ZIG-003`). |
| Circuits | `CircuitApiService` | `GET /api/circuits`, `GET /api/circuits/{id}` | `GET /api/circuits` ne renvoie pas `etape.patrimoine` ; résolu côté front via `PatrimoineStore.byIdMap()`. |
| Événements | `EvenementApiService` | `GET /api/evenements`, `GET /api/evenements/{id}` | `GET /api/evenements` ne renvoie pas `patrimoine` ; résolu via `PatrimoineStore.byIdMap()`. |
| Réservations | `ReservationApiService` | `GET /api/reservations`, `GET /api/reservations/{id}`, `POST /api/reservations`, `PUT /api/reservations/{id}/annuler` | `POST` fixe `statut = CONFIRMEE` et calcule `montantTotal`. Erreur `400 {"erreur": "..."}` si capacité dépassée. |

## APIs backend non exposées (état documenté)
- `ms-utilisateur` (`/api/utilisateurs/**`) : pas de JWT ni de hachage mot de passe côté backend ; non exposé sans sécurisation Spring Security préalable.
- `ms-paiement` (`/api/paiements/**`) et `ms-notification` (`/api/notifications/**`) : prêts à être intégrés en Lot 7 si souhaité.
