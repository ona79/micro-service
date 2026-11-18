# PHASE P05 — ARCHITECTURE ET RAPPORT TECHNIQUE : GUIDES TOURISTIQUES, AVIS VÉRIFIÉS, MODÉRATION ET NOTIFICATIONS

**Projet** : Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance (UASZ, Licence 3 Ingénierie Informatique)  
**Branche de développement** : `feature/p05-guides-reviews-notifications` (issue de `develop`)  
**Référence audit préalable** : [`docs/audits/P05_AUDIT_INITIAL.md`](audits/P05_AUDIT_INITIAL.md)  
**Spécification OpenAPI P05** : [`docs/api/OPENAPI_P05_GUIDES_AVIS_NOTIFICATIONS.yaml`](api/OPENAPI_P05_GUIDES_AVIS_NOTIFICATIONS.yaml)  

---

## 1. DÉCISIONS D'ARCHITECTURE DISTRIBUÉE

La Phase P05 s'intègre nativement dans les **7 microservices métier** et **7 bases PostgreSQL 16** existants, sans ajout artificiel d'un broker externe, grâce à une architecture événementielle transactionnelle basée sur le motif **Transactional Outbox** et des contrôles synchrones **OpenFeign HMAC-SHA256** :

1. **Gestion des Guides Touristiques (`ms-utilisateur` `:3005`, `utilisateur_db` Flyway `V7`)** :
   - Tables `guide_profil`, `guide_validation_historique` et `utilisateur_notification_outbox`.
   - Raison architecturale : le cycle de vie identitaire, l'habilitation `GUIDE` et la traçabilité de validation résident au plus près de l'entité `Utilisateur` (`@OneToOne`).
   - Masquage strict des données sensibles (`email`, `telephone`, `documentsJustificatifs`) sur les routes publiques `/api/guides` et `/api/guides/{id}`.
   - Cohérence inter-services avec `ms-circuit` (`V5__p05_circuit_guide_notifications.sql`) : lors de la création/mise à jour d'un circuit ou via `PATCH /api/circuits/{id}/guide`, `ms-circuit` interroge `GET /api/guides/internal/utilisateur/{utilisateurId}` (ACL HMAC `ms-circuit`) et exige `statutValidation == VALIDE` et `compteActif == true`.

2. **Avis Vérifiés et Modération (`ms-reservation` `:3004`, `reservation_db` Flyway `V5`)** :
   - Tables `avis`, `avis_signalement`, `avis_moderation_historique` et `reservation_notification_outbox`.
   - Raison architecturale : seul `ms-reservation` détient la source de vérité autoritative des réservations (`StatutReservation.CONFIRMEE`, `utilisateurId`, `datePrestation`, type de prestation). L'éligibilité et la vérification de l'expérience ne peuvent donc être ni contournées ni falsifiées côté client.
   - Contrainte d'unicité base de données `UNIQUE (reservation_id, cible_type, cible_id)` et `CHECK (note BETWEEN 1 AND 5)`.
   - Vérification des cibles externes via OpenFeign HMAC vers `ms-patrimoine` (`/api/patrimoines/{id}`), `ms-circuit` (`/api/circuits/{id}`), `ms-evenement` (`/api/evenements/{id}`) et `ms-utilisateur` (`/api/guides/internal/utilisateur/{utilisateurId}`).

3. **Centre de Notifications, Idempotence et Reprise (`ms-notification` `:3007`, `notification_db` Flyway `V3`)** :
   - Colonnes P05 ajoutées à `notifications` : `utilisateur_id`, `type_evenement`, `cible_type`, `cible_id`, `correlation_id`, `idempotency_key` (`UNIQUE`), `lue`, `date_lecture`, `tentatives`, `max_tentatives`, `dernier_erreur`, `prochaine_tentative_at`.
   - Correction Flyway `V3` du statut `'ENVOYE'` (hérité de `V2`) vers `'ENVOYEE'` afin d'assurer la cohérence avec `StatutNotification`.
   - Reprise automatique par ordonnanceur `@Scheduled` (`backoff` progressif) sur `ECHEC_TEMPORAIRE`, complétée par relance manuelle `ADMINISTRATEUR` (`POST /api/notifications/{id}/relancer` et `POST /api/notifications/relancer-echecs`).

---

## 2. SÉCURITÉ ZERO-TRUST, RBAC ET PROTECTION BOLA

- **14 nouvelles permissions P05** (48 au total dans `utilisateur_db` et `GatewayAuthorizationFilter`) :
  - `GUIDE:LIRE`, `GUIDE:GERER_PROPRE_PROFIL`, `GUIDE:VALIDER`, `GUIDE:SUSPENDRE`
  - `AVIS:LIRE`, `AVIS:CREER`, `AVIS:MODIFIER_PROPRE`, `AVIS:SUPPRIMER_PROPRE`, `AVIS:SIGNALER`, `AVIS:MODERER`
  - `NOTIFICATION:LIRE_PROPRE`, `NOTIFICATION:GERER_PROPRE`, `NOTIFICATION:LIRE_TOUT`, `NOTIFICATION:RELANCER`
- **Isolation BOLA** :
  - Un `TOURISTE` ne peut publier, modifier ou supprimer un avis que sur ses propres réservations/avis ; il ne peut ni modérer (`403`) ni lire/marquer lues les notifications d'autrui (`403`).
  - Un `GUIDE` ne peut altérer aucun champ de validation dans `PUT /api/guides/mon-profil` (`403`), ne peut pas s'auto-valider (`403`), et ne peut modifier que les circuits où `guideResponsableId == caller.userId()`.
- **Isolation interne** :
  - Les routes `/api/guides/internal/**` sont bloquées à `api-gateway` (`403 Forbidden`) et protégées par signature HMAC-SHA256 + ACL inter-services (`ms-circuit`, `ms-reservation`).

---

## 3. DIAGRAMMES PLANTUML ET CONTRATS D'INTERFACE

Les diagrammes d'architecture, de transitions d'états et de séquences transactionnelles sont fournis en PlantUML :
- Architecture distribuée globale : [`docs/architecture/p05-architecture-globale.puml`](architecture/p05-architecture-globale.puml)
- Machines à états Guide, Avis et Notifications : [`docs/architecture/p05-workflow-guide-etats.puml`](architecture/p05-workflow-guide-etats.puml)
- Séquence transactionnelle Avis / Signalement / Modération / Outbox : [`docs/architecture/p05-sequence-avis-modere-notification.puml`](architecture/p05-sequence-avis-modere-notification.puml)

---

## 4. INTERFACE UTILISATEUR ANGULAR 22

Les écrans suivants ont été intégrés selon le système visuel *Terre, Mangrove & Lin* :
- `/guides` (`GuidesListPageComponent`) et `/guides/:id` (`GuideDetailPageComponent`) : annuaire public filtrable, fiche détaillée, circuits encadrés et avis vérifiés sur le guide.
- `/espace-guide` (`GuideWorkspacePageComponent`, rôle `GUIDE`) : édition du dossier professionnel, soumission pour validation, gestion de disponibilité/visibilité, désactivation et liste des circuits assignés.
- Composant réutilisable `UiAvisSectionComponent` intégré aux fiches Patrimoine, Circuit, Événement et Guide : histogramme 1–5 étoiles, badge *Expérience vérifiée*, vérification d'éligibilité côté serveur (uniquement pour utilisateurs authentifiés), création/édition/suppression, signalement modéré.
- `/notifications` (`NotificationsCenterPageComponent`) + badge temps réel dans `MainLayoutComponent` (`NotificationStore`) et section sur `/mon-espace`.
- `/administration` (`AdminDashboardPageComponent`) enrichi des onglets **Validation Guides**, **Modération Avis** et **Notifications Système**, ainsi que du sélecteur de guide responsable validé dans l'onglet Circuits.

---

## 5. PREUVES D'EXÉCUTION ET VÉRIFICATIONS LOCALES

- **Tests d'intégration et sécurité Maven (`./verify-integration.sh`, 9 services Java 21)** :
  - `discovery-server` (`1` test), `ms-patrimoine` (`29` actifs, `1` conditionnel), `ms-circuit` (`25` actifs, `2` conditionnels), `ms-evenement` (`18` actifs, `1` conditionnel), `ms-reservation` (`27` actifs incluant Testcontainers PG 16, `1` conditionnel), `ms-utilisateur` (`32` actifs, `2` conditionnels), `ms-notification` (`13` actifs, `1` conditionnel), `ms-paiement` (`16` actifs incluant Testcontainers PG 16, `1` conditionnel), `api-gateway` (`25` tests) — soit `186` tests actifs exécutés avec `0` échec.
- **Vérification PostgreSQL 16 + Flyway + Hibernate `validate` (`./verify-postgres.sh`, 7 bases)** :
  - `7/7` services validés avec succès contre PostgreSQL 16.15 (`patrimoine_db`, `circuit_db`, `evenement_db`, `reservation_db`, `utilisateur_db`, `paiement_db`, `notification_db`).
- **Front-End Angular 22 (`npx ng test --no-watch` & `npm run build`)** :
  - `16/16` suites Vitest, `45/45` tests passés avec `0` échec ; build de production AOT généré sans erreur.
- **Suite E2E inter-microservices sur 7 JVM métier (script `.github/workflows/ci-cd.yml` étapes `0..11`)** :
  - Rejet accès directs non signés `401`, communication HMAC OpenFeign/RestTemplate/WebClient, création circuit + réservation + paiement Wave simulé + RBAC remboursement, cycle complet guide (`BROUILLON -> EN_ATTENTE -> VALIDE -> affectation circuit -> SUSPENDU`), avis vérifié + rejet réservation remboursée `403` + doublon `409` + BOLA `403`, modération & recalcul de moyenne, notification BOLA `403 -> 200` et idempotence (`id1 == id2`).

