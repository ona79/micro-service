# MISSION P07.8 — LOT 3 : REGISTRE DES LIMITATIONS D'API ET TICKETS BACKEND

**Projet :** Plateforme de gestion et valorisation du patrimoine touristique de la Casamance  
**Institution :** Université Assane Seck de Ziguinchor (UASZ) — Licence 3 Informatique  
**Phase :** P07.8 — Lot 3 (Espaces Professionnels & Administration)  
**Date :** 18 novembre 2026  
**Auteur :** Senior Frontend Architect & Senior QA Specialist

---

## 1. PRINCIPE DE GOUVERNANCE

Conformément à la directive formelle de la section 2.4 du mandat Lot 3 :
> *« Le Lot 3 est une mission de refonte frontend. Ne modifier aucun microservice Java, contrôleur, DTO, entité JPA, migration Flyway, schéma PostgreSQL ou mécanisme de sécurité backend. Si une fonctionnalité métier est impossible à réaliser en raison d'une API absente ou insuffisante : documenter précisément le contrat manquant, identifier le service concerné, proposer un ticket backend distinct, et ne pas simuler une réponse serveur. »*

Ce document recense les limitations réelles constatées sur les 7 microservices métier et l'API Gateway, ainsi que les solutions de résilience appliquées côté frontend Angular sans simulation trompeuse.

---

## 2. REGISTRE DES TICKETS BACKEND

### 2.1 Ticket TKT-BACK-001 (Reconduit depuis Lot 2.1)
- **Composant :** `ms-circuit` & `api-gateway`
- **Fichier :** `ms-circuit/src/main/java/com/uasz/ms_circuit/clients/PatrimoineClient.java` (ligne 11) & `GatewayAuthorizationFilter.java`
- **Gravité :** Élevée (Cascade 503 / 403 Anti-Rejeu)
- **Description :**
  Lorsqu'une requête traverse la Gateway vers `ms-reservation` ou `ms-circuit` et nécessite d'appeler `ms-patrimoine` via Feign, l'URL de repli `${patrimoine.service.url:http://localhost:3001}` tente de se connecter sur `127.0.0.1:3001` à l'intérieur du conteneur `ms-circuit`. Cette connexion échoue par `ConnectException: Connection refused` -> HTTP 503.
  L'API Gateway (Apache HttpClient) intercepte le 503 et réexécute automatiquement la requête 1 seconde plus tard en réutilisant la même enveloppe HMAC et le même nonce `X-Internal-Gateway-Token`. Le microservice récepteur détecte alors ce nonce déjà consommé dans `seenNonces` et rejette l'appel avec l'erreur `403 Attaque par rejeu détectée sur l'enveloppe Gateway.`
- **Impacts constatés :**
  - Fiche circuit individuelle `/circuits/:id` (résolue côté frontend au Lot 2.1 via repli `ensureLoaded()`).
  - Manifeste des circuits assignés `GET /api/reservations/guide/circuits/:id` lorsque `ms-reservation` appelle `recupererCircuit(circuitId)`.
- **Solution recommandée backend :**
  1. Configurer la variable d'environnement `PATRIMOINE_SERVICE_URL=http://ms-patrimoine:3001` dans `docker-compose.yml` pour le service `ms-circuit`.
  2. Désactiver le retry automatique d'Apache HttpClient dans la Gateway pour les requêtes HTTP signées par nonce unique, ou régénérer un nonce distinct lors de chaque réémission.
- **Traitement frontend appliqué :**
  Affichage d'un `app-ui-error-banner` explicite dans `ProManifestesPageComponent` avec message d'information réseau clair et bouton d'actualisation sans plantage de l'interface.

---

### 2.2 Ticket TKT-BACK-002 (Reconduit depuis Lot 2.1)
- **Composant :** `ms-reservation`
- **Fichier :** `ms-reservation/src/main/java/com/uasz/ms_reservation/repositories/ReservationRepository.java` (ligne 21)
- **Méthode :** `sumPlacesByCircuitIdAndDateAndStatutIn`
- **Requête incriminée :**
  ```sql
  SELECT COALESCE(SUM(r.nombrePlaces), 0) FROM Reservation r 
  WHERE r.circuitId = :circuitId AND r.statut IN :statuts 
  AND (:datePrestation IS NULL OR r.datePrestation = :datePrestation)
  ```
- **Gravité :** Moyenne (Annulation de réservations sans date fixe)
- **Cause racine :**
  Le pilote JDBC PostgreSQL 42.7 ne peut pas inférer le type de données du paramètre SQL `$4` lorsque `:datePrestation` vaut `null`, provoquant l'exception `PSQLException: ERROR: could not determine data type of parameter $4`.
- **Solution recommandée backend :**
  Typer explicitement le paramètre en JPQL/SQL natif via `cast(:datePrestation as date)` ou scinder en deux requêtes selon que la date est nulle ou non.

---

### 2.3 Ticket TKT-BACK-003 (Nouveau Lot 3 — Permissions Modération Conservateur)
- **Composant :** `ms-utilisateur` & `api-gateway`
- **Fichiers :**
  - `ms-utilisateur/src/main/resources/db/migration/V7__p05_guides_and_permissions.sql` (lignes 50-70)
  - `api-gateway/src/main/java/com/uasz/api_gateway/security/GatewayAuthorizationFilter.java` (lignes 454-458)
- **Gravité :** Fonctionnelle
- **Description :**
  La section 4.6 du mandat Lot 3 prévoit un espace de modération (avis, signalements) pour le rôle `CONSERVATEUR`.
  Cependant, l'inventaire des permissions en base de données et dans `ms-utilisateur` montre que seuls `GESTIONNAIRE_SITE` et `ADMINISTRATEUR` possèdent l'autorisation `AVIS:MODERER` :
  ```sql
  INSERT INTO role_permission (role, permission_code) VALUES
      ('GESTIONNAIRE_SITE', 'AVIS:MODERER'),
      ('ADMINISTRATEUR', 'AVIS:MODERER');
  ```
  L'API Gateway applique un contrôle strict bloquant tout appel à `/api/moderation/**` sans la permission `AVIS:MODERER` :
  ```java
  if (!isAvisHistoriqueGet && !token.hasPermission("AVIS:MODERER")) {
      writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
              "Accès interdit : permission AVIS:MODERER requise pour accéder aux opérations de modération.");
      return;
  }
  ```
  Un utilisateur connecté avec le rôle `CONSERVATEUR` essuie donc un refus HTTP 403 Forbidden systématique.
- **Solution recommandée backend :**
  Créer une migration Flyway `V14__grant_moderation_to_conservateur.sql` ajoutant :
  ```sql
  INSERT INTO role_permission (role, permission_code) VALUES ('CONSERVATEUR', 'AVIS:MODERER') ON CONFLICT DO NOTHING;
  ```
- **Traitement frontend appliqué :**
  La route `/pro/moderation` reste strictement protégée par `permissionGuard(['AVIS:MODERER'])` pour ne pas exposer une interface en échec. Les Conservateurs sont informés que la modération globale relève des comptes habilités `AVIS:MODERER`.

---

### 2.4 Ticket TKT-BACK-004 (Nouveau Lot 3 — Paramètre SQL Agenda Guide)
- **Composant :** `ms-reservation`
- **Fichier :** `ms-reservation/src/main/java/com/uasz/ms_reservation/repositories/ReservationRepository.java` (lignes 53-62)
- **Méthode :** `findGuideReservationsBetweenDates`
- **Requête incriminée :**
  ```java
  @Query("""
      SELECT r FROM Reservation r
      WHERE r.guideId = :guideId
        AND r.statut IN :statuts
        AND (:dateDebut IS NULL OR r.datePrestation >= :dateDebut)
        AND (:dateFin IS NULL OR r.datePrestation <= :dateFin)
      ORDER BY r.datePrestation ASC, r.creneauPrestation ASC
      """)
  List<Reservation> findGuideReservationsBetweenDates(...);
  ```
- **Gravité :** Élevée (Indisponibilité de l'endpoint `/api/reservations/guide/agenda`)
- **Exception déclenchée lors de l'appel :**
  `org.postgresql.util.PSQLException: ERROR: could not determine data type of parameter $4`
- **Cause racine :**
  Même problème Hibernate 6 / PostgreSQL que `TKT-BACK-002` : les clauses `(? is null or r.date_prestation >= ?)` avec passage de `null` sur `:dateDebut` ou `:dateFin` empêchent PostgreSQL de typifier le paramètre SQL `$4`.
- **Solution recommandée backend :**
  ```java
  AND (cast(:dateDebut as LocalDate) IS NULL OR r.datePrestation >= :dateDebut)
  AND (cast(:dateFin as LocalDate) IS NULL OR r.datePrestation <= :dateFin)
  ```
  ou utiliser l'API JPA Criteria / deux méthodes Spring Data distinctes.
- **Traitement frontend appliqué :**
  Dans `ProGuideWorkspacePageComponent`, l'appel `loadAgenda()` intercepte l'erreur 500 et affiche un message informatif contextualisé sans bloquer l'édition du profil guide ni la consultation des circuits et manifestes.

---

### 2.5 Ticket TKT-BACK-005 (Nouveau Lot 3 — Réservation Guichet Gestionnaire de Site)
- **Composant :** `ms-reservation` & `ms-utilisateur`
- **Fichier :** `ms-reservation/src/main/java/com/uasz/ms_reservation/controllers/ReservationController.java`
- **Gravité :** Fonctionnelle (Section 5.3 Billetterie Guichet)
- **Description :**
  La section 5.3 du mandat demande d'auditer la possibilité pour le `GESTIONNAIRE_SITE` de créer une réservation directe au guichet.
  L'audit de sécurité backend établit que l'endpoint `POST /api/reservations` est protégé par l'autorité `RESERVATION:CREER`.
  Or, la matrice de permissions `ms-utilisateur` n'accorde au `GESTIONNAIRE_SITE` que `RESERVATION:LIRE_TOUT` et `RESERVATION:GERER`. Il lui est donc interdit par le serveur de créer une réservation (`403 Forbidden`).
- **Solution recommandée backend :**
  Créer un endpoint dédié à la billetterie sur place :
  `POST /api/visites/guichet` protégé par l'autorité `VISITE:EMETTRE_GUICHET` ou `RESERVATION:GERER`.
- **Traitement frontend appliqué :**
  Conformément à la consigne « Si l'API ne permet pas une réservation au guichet, documenter le blocage sans fabriquer un parcours transactionnel factice », aucun faux formulaire guichet simulant un encaissement n'a été bricolé. Le gestionnaire utilise le terminal de contrôle QR certifié serveur.

---

## 3. TABLEAU SYNTHÉTIQUE DES LIMITATIONS

| ID Ticket | Service Backend | Endpoint Concerné | Rôle Impacté | Statut Frontend |
| :--- | :--- | :--- | :--- | :--- |
| **TKT-BACK-001** | `ms-circuit` / Gateway | `GET /api/reservations/guide/circuits/:id` | GUIDE, GESTIONNAIRE | Résilience avec bandeau d'erreur non bloquant |
| **TKT-BACK-002** | `ms-reservation` | `PUT /api/reservations/:id/annuler` | TOURISTE, GESTIONNAIRE | Gestion gracieuse des erreurs de calcul places |
| **TKT-BACK-003** | `ms-utilisateur` / Gateway | `GET /api/moderation/**` | CONSERVATEUR | Permission `AVIS:MODERER` requise documentée |
| **TKT-BACK-004** | `ms-reservation` | `GET /api/reservations/guide/agenda` | GUIDE | Bannière informative agenda serveur sans simulation |
| **TKT-BACK-005** | `ms-reservation` | `POST /api/reservations` (Guichet) | GESTIONNAIRE_SITE | Absence de faux parcours, focus sur contrôle QR |
