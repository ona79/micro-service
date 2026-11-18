# RAPPORT D'AUDIT OBLIGATOIRE — PHASE P05 (AVANT IMPLÉMENTATION)
## Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance — UASZ

**Date** : 18 novembre 2026  
**Branche de travail** : `feature/p05-guides-reviews-notifications` (issue de `origin/develop` au commit `df94fa6`)  
**Validation de base Git & CI** :
- `origin/develop` (`df94fa6`, `Merge pull request #9 from ona79/feature/p04-reservation-payment`) intègre intégralement P01–P04.
- Workflow GitHub Actions `#44290272485` sur `develop` (`df94fa6`) : `status=completed`, `conclusion=success` (10 jobs `Build & Test`, `Test d'Intégration E2E Inter-Microservices`, `Validation Finale PR`).

---

## 1. SYNTHÈSE DE L'EXISTANT RÉUTILISABLE

| Domaine | Service / Emplacement | Éléments P01–P04 directement réutilisables |
| :--- | :--- | :--- |
| **Identité, Rôles & RBAC** | `ms-utilisateur` (`V1..V6`, `AuthSessionManager`, `AuditSecuriteService`) | Rôles `TOURISTE`, `GUIDE`, `CONSERVATEUR`, `GESTIONNAIRE_SITE`, `ADMINISTRATEUR` ; 34 permissions normalisées ; sessions JWT signées HMAC en cookies `HttpOnly` + rotation Refresh Token + `AuditSecurite`. |
| **Guides & Circuits** | `ms-circuit` (`Circuit.guideResponsableId`, `CircuitService.verifierPerimetreGuide`), `ms-reservation` (`getManifesteGuidePourCircuit`) | Affectation d'un `GUIDE` sur un circuit (`guideResponsableId`) ; contrôle BOLA de mise à jour/soumission du circuit ; consultation non financière du manifeste des participants (`/api/reservations/guide/circuits/{circuitId}`). |
| **Réservations & Prestations** | `ms-reservation` (`Reservation`, `StatutReservation`, `DisponibiliteLockService`) | États transactionnels P04 (`BROUILLON`, `EN_ATTENTE_PAIEMENT`, `CONFIRMEE`, `EXPIREE`, `ANNULEE`, `ECHEC`, `REMBOURSEE`), verrouillage pessimiste, historique immuable `reservation_historique`, `datePrestation` + `typeReservation`. |
| **Paiements & Fiabilité Outbox** | `ms-paiement` (`PaiementOutbox`, `PaiementOutboxRelayService`) | Modèle d'Outbox transactionnelle persistée avec backoff exponentiel et reprise `@Scheduled` sans infrastructure externe artificielle (ni Kafka ni RabbitMQ). |
| **Notifications** | `ms-notification` (`Notification`, `CanalNotification`, `StatutNotification`, `V1..V2`) | Stockage PostgreSQL `notification_db`, enveloppe Zero-Trust P02, clients Feign existants depuis `ms-reservation` et `ms-paiement`. |
| **API Gateway & Zéro-Trust** | `api-gateway` (`GatewayAuthorizationFilter`, `application.yml`) | Validation JWT + session active (`ms-utilisateur`), CSRF HMAC, enveloppe signée Gateway (10 champs), filtrage d'endpoints internes `/internal/**`. |
| **Frontend Angular 22** | `frontend-angular` (Standalone, Signals, `tokens.css`, Lucide) | Palette **Terre, Mangrove & Lin**, `AuthStore`, `roleGuard`, `ReservationApiService.getManifesteGuide`, `account-page`, `admin-dashboard-page`. |

---

## 2. LACUNES, ANOMALIES ET RISQUES IDENTIFIÉS

### 2.1 Sécurité & Données critiques
1. **Incohérence d'enum Flyway bloquante en production (`ms-notification`)** : `V2__seed_notifications.sql` insère `statut = 'ENVOYE'` alors que l'énumération Java `StatutNotification` définit `ENVOYEE`. Le chargement JPA des données de seed sous PostgreSQL 16 (`prod`) échoue sans migration corrective (`UPDATE notification SET statut = 'ENVOYEE' WHERE statut = 'ENVOYE'`).
2. **Notifications inaccessibles aux utilisateurs (`ms-notification` + `api-gateway`)** : `GatewayAuthorizationFilter.java` et `ms-notification/.../MicroserviceSecurityFilter.java` bloquent l'accès à `/api/notifications/**` pour tout rôle autre qu'`ADMINISTRATEUR` (`403 Forbidden`). Le front `/mon-espace` avale silencieusement cette erreur 403.
3. **Divergence mineure de permissions `GUIDE` (`ms-circuit`)** : `ms-circuit/.../SecurityUserContext.java` attribue `RESERVATION:LIRE_TOUT` à `GUIDE` contrairement à `AuthSessionManager`, `GatewayAuthorizationFilter` et `ms-reservation` qui accordent `RESERVATION:LIRE_PROPRE`.
4. **Absence de vérifications sur `guideResponsableId` (`ms-circuit`)** : `CircuitService` n'interroge pas `ms-utilisateur` pour vérifier que l'identifiant affecté correspond à un utilisateur actif, de rôle `GUIDE`, au profil professionnel validé.
5. **Notifications prématurées possibles sur `ms-paiement`** : `PaiementService` appelle `envoyerNotificationNonBloquante(...)` après le relais outbox sans vérifier le succès de synchronisation (`outboxDelivered == true`) ni utiliser de clé d'idempotence partagée.
6. **Contournement Eureka sous profil `prod` Docker Compose** : `ms-circuit`, `ms-reservation` et `ms-paiement` utilisent des valeurs par défaut `http://localhost:300x` lorsqu'aucune variable d'environnement `*_URL` n'est fournie dans `docker-compose.yml`.

### 2.2 Lacunes fonctionnelles P05
- **Guides** : aucune entité de profil professionnel (`biographie`, langues, compétences/spécialités, zones Casamance, expérience, justificatifs), aucun workflow de validation/suspension/désactivation, aucun espace personnel guide dédié, aucune page catalogue/détail guide.
- **Avis & Modération** : aucune entité `Avis`, `SignalementAvis` ou historique de modération ; aucune vérification serveur d'expérience admissible sur les réservations P04 ; aucun agrégat de notes.
- **Notifications** : pas de `utilisateurId`, ni statut de lecture (`lue`, `dateLecture`), ni pagination/filtrage, ni idempotence (`idempotencyKey`), ni corrélation, ni mécanisme de reprise sur panne (`NotificationOutbox` côté émetteurs et retry côté `ms-notification`).
- **Angular 22** : `/administration` autorise `GUIDE` dans `app.routes.ts` sans lien de navigation (`isStaff()` exclut `GUIDE`) et sans masquer les onglets/actions réservés aux administrateurs ; aucune interface Guides, Avis, Modération ni Centre de Notifications.

---

## 3. DÉCISIONS ARCHITECTURALES PROPORTIONNÉES POUR P05

1. **Conserver l'architecture des 7 microservices et des 7 bases PostgreSQL 16** sans introduire de nouveau broker (Kafka/RabbitMQ) ni dupliquer les identités :
   - **Gestion des Profils Guides (`/api/guides/**`) dans `ms-utilisateur` (`utilisateur_db`, Flyway `V7`)** : couplage direct aux comptes `Utilisateur` (`role = GUIDE`), réutilisation d'`AuditSecuriteService` et des 14 nouvelles permissions P05.
   - **Avis, Évaluations & Modération (`/api/avis/**`, `/api/moderation/**`) dans `ms-reservation` (`reservation_db`, Flyway `V5`)** : vérification ACID locale et infalsifiable de la réservation admissible (`StatutReservation.CONFIRMEE`, propriété `utilisateurId`, `datePrestation <= today`), corrélée aux circuits (`ms-circuit`), événements (`ms-evenement`), sites (`ms-patrimoine`) et guides (`ms-utilisateur`).
   - **Notifications robustes (`/api/notifications/**`) dans `ms-notification` (`notification_db`, Flyway `V3`)** : correction `'ENVOYE'` -> `'ENVOYEE'`, pagination propriétaire, statut lu/non lu, déduplication stricte par `idempotency_key`, corrélation, reprise sur échec temporaire + outbox transactionnelle légère sur `ms-utilisateur`, `ms-circuit` et `ms-reservation`.
   - **API Gateway (`api-gateway`)** : ajout des routes `/api/guides/**`, `/api/avis/**`, `/api/moderation/**` (vers `lb://ms-utilisateur` et `lb://ms-reservation`), ouverture contrôlée des notifications utilisateur (`NOTIFICATION:LIRE_PROPRE` / `GERER_PROPRE`), blocage `403` des routes `/internal/**`.
