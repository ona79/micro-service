# RAPPORT TECHNIQUE ET FONCTIONNEL — PHASE P04 (SYSTÈME DE RÉSERVATION ET DE PAIEMENT SIMULÉ)
## Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance — UASZ

---

## 1. PÉRIMÈTRE ET ARCHITECTURE IMPLÉMENTÉE

La phase **P04** déploie un système transactionnel complet de réservation touristique et de paiement Mobile Money **simulé** (`WAVE` et `ORANGE_MONEY`, devise `XOF`), intégré aux fondations P01 (Eureka, Gateway, bases PostgreSQL 16 isolées, Flyway), à l'architecture Zero-Trust P02 (JWT HttpOnly, CSRF HMAC, enveloppe Gateway 10 champs, signatures interservices 11 champs et matrice ACL) et au catalogue P03.

> **Avertissement Simulation P04** : aucune clé marchande réelle, aucun prestataire bancaire réel et aucun flux financier réel ne sont appelés. Les opérations `WAVE` et `ORANGE_MONEY` s'exécutent dans un simulateur interne auditable (`SimulatedMobileMoneyProvider`), tracé avec `estSimule = true`.

| Composant | Port | Base / Stockage | Migrations / Fichiers Clés P04 | Capacités Métier P04 |
| :--- | :---: | :--- | :--- | :--- |
| **`ms-circuit`** | `:3002` | `circuit_db` | `V4__add_devise_p04.sql` | Exposition de la devise `XOF` pour tarification serveur par `ms-reservation`. |
| **`ms-evenement`** | `:3003` | `evenement_db` | `V4__add_reservation_readiness_p04.sql` | Opt-in explicite `ouvertReservation` (`FALSE` par défaut sur les mémoriaux / accès libres), devise `XOF`, route `/api/evenements/reservables`. |
| **`ms-utilisateur`** | `:3005` | `utilisateur_db` | `V6__add_p04_paiement_refund_permission.sql` | Permission `PAIEMENT:REMBOURSER` exclusivement attribuée au rôle `ADMINISTRATEUR` (34 permissions normalisées). |
| **`api-gateway`** | `:8090` | — | `GatewayAuthorizationFilter.java` | Ouverture contrôlée `GET /api/reservations/disponibilite`, blocage `403` de `/api/*/internal/**`, contrôle `PAIEMENT:REMBOURSER` / `PAIEMENT:LIRE_TOUT` / `RESERVATION:LIRE_TOUT`, blocage `PUT/PATCH/DELETE /api/paiements/**`. |
| **`ms-reservation`** | `:3004` | `reservation_db` | `V4__p04_reservation_domain.sql` | Domaine complet (`BROUILLON`, `EN_ATTENTE_PAIEMENT`, `CONFIRMEE`, `EXPIREE`, `ANNULEE`, `ECHEC`, `REMBOURSEE`), `NUMERIC(12,2)`, participants, historique immuable, verrouillage pessimiste `SELECT ... FOR UPDATE` (`DisponibiliteLockService` en `REQUIRES_NEW` via `TransactionTemplate`), idempotence, expiration automatique `@Scheduled`, manifeste guide BOLA. |
| **`ms-paiement`** | `:3006` | `paiement_db` | `V4__p04_paiement_domain.sql` | Transactions simulées `WAVE` / `ORANGE_MONEY`, cycle `INITIE -> EN_COURS -> ACCEPTE|REFUSE|EXPIRE|ANNULE|REMBOURSE`, idempotence, rejet strict de manipulation tarifaire, **Outbox transactionnelle** (`paiement_outbox` + `PaiementOutboxRelayService` asynchrone/planifié + reprise manuelle), remboursement intégral simulé admin-only. |
| **`frontend-angular`** | `:80` | — | Angular 22 Standalone + Signals | Vérification de disponibilité en direct, tunnel `/reserver`, caisse simulée `/paiements/:reservationId`, suivi utilisateur `/mon-espace`, back-office `Réservations` & `Paiements Simulés` (`/administration`), garde `authGuard`. |

---

## 2. WORKFLOW MÉTIER RÉSERVATION & PAIEMENT SIMULÉ

```text
[Touriste authentifié]
   |
   +--> POST /api/reservations (Idempotency-Key, prix ignoré côté client, calcul serveur XOF)
   |      |-- soumettrePourPaiement=false --> BROUILLON (sans blocage de jauge)
   |      '-- soumettrePourPaiement=true  --> EN_ATTENTE_PAIEMENT (+ verrou SELECT FOR UPDATE + expiresAt)
   |
   +--> POST /api/paiements (Idempotency-Key, modePaiement WAVE | ORANGE_MONEY)
   |      '-- Vérification montant serveur & état EN_ATTENTE_PAIEMENT --> paiement EN_COURS (estSimule=true)
   |
   +--> POST /api/paiements/{id}/simuler (decision: ACCEPTER | REFUSER | EXPIRER | ANNULER)
          |-- TX Phase 1 : transition Paiement + insertion PaiementOutbox (statut EN_ATTENTE) -> COMMIT
          |-- Relay Post-Commit (REQUIRES_NEW) : POST /api/reservations/internal/{id}/evenement-paiement
          |     '-- ms-reservation (PESSIMISTIC_WRITE + table reservation_evenement_recu pour déduplication eventId)
          |           |-- Si reservation EXPIREE & PAIEMENT_ACCEPTE --> rejet documenté EXPIRE_BEFORE_PAYMENT
          |           '-- Si valide --> CONFIRMEE + historique + referencePaiement -> ACK { accepte: true }
          '-- Si ms-reservation indisponible --> paiement reste ACCEPTE, outbox EN_ATTENTE + @Scheduled backoff
```

---

## 3. GARANTIES DE COHÉRENCE DISTRIBUÉE & CONCURRENCE

1. **Protection anti-surréservation sous concurrence (`ms-reservation`)** :
   - La table `disponibilite_prestation` matérialise la capacité par couple `(type_prestation, prestation_id, date_prestation)`.
   - `DisponibiliteLockService` isole la création paresseuse de la ligne dans une transaction dédiée (`TransactionDefinition.PROPAGATION_REQUIRES_NEW`, évitant tout auto-appel AOP), puis `findForUpdate` exécute un verrou pessimiste `PESSIMISTIC_WRITE` (`SELECT ... FOR UPDATE`) complété par un verrou optimiste `@Version`.
   - Test de charge concurrente réel sur PostgreSQL 16 (`ReservationPostgres16ConcurrencyTest`) : 5 threads simultanés demandant chacun 3 places sur une capacité de 8 aboutissent exactement à **2 succès (6 places)** et **3 rejets contrôlés**, sans jamais dépasser 8 places.

2. **Fiabilité inter-services par Outbox Transactionnelle (`ms-paiement` -> `ms-reservation`)** :
   - La transition du paiement (`ACCEPTE`, `REFUSE`, `EXPIRE`, `ANNULE`, `REMBOURSE`) et la création de l'événement `PaiementOutbox` sont commitées ensemble en base (`paiement_db`).
   - Après commit, `PaiementOutboxRelayService.tenterLivraison()` livre l'événement signé HMAC/ACL vers `/api/reservations/internal/{id}/evenement-paiement`.
   - En cas de panne temporaire de `ms-reservation`, le paiement simulé validé n'est **jamais perdu** (`synchroReservationStatut = EN_ATTENTE_REPRISE`) : une tâche `@Scheduled(fixedDelay = 15000)` avec backoff exponentiel ou une relance manuelle (`POST /api/paiements/outbox/rejouer`) ou réconciliation pull (`POST /api/reservations/{id}/synchroniser`) résorbe automatiquement l'écart (`PaiementPostgres16OutboxTest`).
   - Côté `ms-reservation`, la table `reservation_evenement_recu` (contrainte `UNIQUE(event_id)`) garantit une consommation strictement idempotente et verrouille l'interdiction de confirmer une réservation déjà `EXPIREE`.

---

## 4. RÈGLES DE SÉCURITÉ ZERO-TRUST & RBAC P04

- **Zéro manipulation financière côté client** : `prixUnitaire`, `montantTotal`, `devise`, `statut` envoyés par le navigateur ou par un appelant tiers sont ignorés ou explicitement rejetés (`BadRequestException` en cas d'écart sur le montant).
- **Contrôle BOLA & fail-closed** :
  - `TOURISTE` ne peut lire, payer, simuler ou annuler que ses propres réservations/paiements (`caller.userId().equals(entity.getUtilisateurId())`).
  - `GUIDE` accède uniquement au manifeste non financier des circuits dont il est `guideResponsableId` (`/api/reservations/guide/circuits/{circuitId}`).
  - Les ressources internes `/api/reservations/internal/**` et `/api/paiements/internal/**` sont bloquées en `403` à l'API Gateway et contrôlées côté microservice sur l'enveloppe service HMAC (`ms-paiement` / `ms-reservation`).
  - Le remboursement intégral simulé (`POST /api/paiements/{id}/rembourser`) requiert explicitement `PAIEMENT:REMBOURSER`, détenue uniquement par `ADMINISTRATEUR`.
- **Aucune suppression destructrice d'historique** : les réservations confirmées, payées ou remboursées ne peuvent jamais être supprimées physiquement (`DELETE` rejeté en `409 Conflict`).
