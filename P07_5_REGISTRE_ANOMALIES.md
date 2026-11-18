# REGISTRE DES ANOMALIES ET ÉCARTS FONCTIONNELS — MISSION P07.5
**Plateforme de Valorisation du Patrimoine Touristique de la Casamance**  
*Université Assane Seck de Ziguinchor — Licence 3 Ingénierie Informatique*  
**Date d'audit** : 18 Novembre 2026  
**Branche d'audit** : `feature/p07-5-functional-audit` (base `develop` commit `818dbd25f1dfb3d87e613e9652a5472aecb8d5a8`)

---

## SOMMAIRE DU REGISTRE

| Identifiant | Sévérité | Titre de l'anomalie | Service / Composant Impacté |
| :--- | :--- | :--- | :--- |
| **ANOM-P0-01** | **Bloquante (P0)** | Incohérence RBAC : Blocage de la validation des guides par le Conservateur (403 Forbidden) | `api-gateway`, `ms-utilisateur`, `frontend-angular` |
| **ANOM-P0-02** | **Bloquante (P0)** | Deadlock fonctionnel sur les réservations d'offres gratuites (montant total = 0 XOF) | `ms-reservation`, `ms-paiement`, `frontend-angular` |
| **ANOM-P1-01** | **Majeure (P1)** | Absence de module de planification de visites avec détection de conflit guide | `ms-circuit`, `ms-reservation`, `frontend-angular` |
| **ANOM-P1-02** | **Majeure (P1)** | Absence d'agenda personnel et de calendrier de créneaux pour le guide | `ms-reservation`, `frontend-angular` |
| **ANOM-P1-03** | **Majeure (P1)** | Absence de droit de réponse du guide aux avis touristiques publiés | `ms-reservation`, `frontend-angular` |
| **ANOM-P1-04** | **Majeure (P1)** | Absence de recherche géographique à proximité (GPS touriste réel & Haversine) | `ms-patrimoine`, `frontend-angular` |
| **ANOM-P1-05** | **Majeure (P1)** | Absence de billetterie électronique avec QR Code sécurisé et contrôle d'accès | `ms-reservation`, `frontend-angular` |
| **ANOM-P2-01** | **Moyenne (P2)** | Gestion multimédia partielle : pas de multi-images, pas de vidéos, pas d'upload | `ms-patrimoine`, `frontend-angular` |
| **ANOM-P2-02** | **Moyenne (P2)** | Horaires d'ouverture non structurés et déconnectés de la réservation | `ms-patrimoine`, `ms-reservation`, `frontend-angular` |
| **ANOM-P2-03** | **Moyenne (P2)** | Annulation de réservation sans déclenchement de remboursement automatique | `ms-reservation`, `ms-paiement` |
| **ANOM-P2-04** | **Moyenne (P2)** | Désynchronisation TTL entre token CSRF (15 min) et session refresh (7 jours) | `api-gateway`, `frontend-angular` |
| **ANOM-P2-05** | **Moyenne (P2)** | Échec 500 sur mise à jour d'e-mail dupliqué dans l'administration utilisateur | `ms-utilisateur` |
| **ANOM-P2-06** | **Moyenne (P2)** | Absence de Dead-Letter Queue et d'auto-compensation dans l'Outbox Pattern | `ms-paiement`, `ms-reservation` |
| **ANOM-P3-01** | **Mineure (P3)** | Absence de normalisation des URL avec paramètres matriciels dans la Gateway | `api-gateway` |
| **ANOM-P3-02** | **Mineure (P3)** | Absence d'indicateur visuel d'affectation guide sur les fiches circuits | `frontend-angular` |

---

## 1. ANOMALIES BLOQUANTES (CRITICITÉ P0)

### FICHE ANOM-P0-01
- **Identifiant** : `ANOM-P0-01`
- **Titre** : Incohérence RBAC bloquante : Le rôle `CONSERVATEUR` ne peut pas valider ou gérer les guides touristiques (rejet 403 Forbidden).
- **Sévérité** : **P0 (Bloquante)**
- **Domaine / Modules** : RBAC, Sécurité, Gestion des Guides, Espace Conservateur.
- **Services concernés** :
  - `ms-utilisateur` : migration SQL `V7__p05_guides_and_permissions.sql`, service `GuideService.java`, contrôleur `GuideController.java`.
  - `api-gateway` : filtre `GatewayAuthorizationFilter.java`.
  - `frontend-angular` : composant `pro-guides-page.component.ts`.
- **Description détaillée** :
  Le cahier des charges et la spécification fonctionnelle de la plateforme stipulent expressément que le `CONSERVATEUR` du patrimoine est l'acteur institutionnel chargé d'instruire, de valider, de rejeter ou de suspendre les candidatures et profils de guides touristiques opérant sur les sites et circuits de Casamance.
  Cependant, dans l'état actuel de la base de données et de la Gateway :
  1. Le script Flyway `V7__p05_guides_and_permissions.sql` (lignes 43-47) n'attribue au rôle `CONSERVATEUR` que les permissions `AVIS:SIGNALER`, `NOTIFICATION:LIRE_PROPRE` et `NOTIFICATION:GERER_PROPRE`. Les permissions critiques `GUIDE:VALIDER` et `GUIDE:SUSPENDRE` ne sont attribuées qu'aux rôles `GESTIONNAIRE_SITE` (lignes 50-51) et `ADMINISTRATEUR` (lignes 59-60).
  2. Le filtre de sécurité de la Gateway `GatewayAuthorizationFilter.java` (lignes 368-385) exige obligatoirement `GUIDE:VALIDER` pour les routes `/api/guides/admin/**`, `/api/guides/{id}/valider`, `/api/guides/{id}/rejeter`, `/api/guides/{id}/reactiver`, et `GUIDE:SUSPENDRE` pour `/api/guides/{id}/suspendre`.
  3. Dans `GuideService.java` (lignes 557-567), la méthode `formatForCaller` masque les profils de guides non encore validés (statut `SOUMIS`) à tout utilisateur ne disposant pas de `GUIDE:VALIDER` ou `GUIDE:SUSPENDRE` (renvoi d'une exception `ResourceNotFoundException 404`).
- **Cause racine exacte** :
  - Omission de l'association du rôle `CONSERVATEUR` aux permissions `GUIDE:VALIDER` et `GUIDE:SUSPENDRE` dans `ms-utilisateur/src/main/resources/db/migration/V7__p05_guides_and_permissions.sql`.
  - Alignement strict de la Gateway sur la permission `GUIDE:VALIDER` sans prise en compte des besoins métier du conservateur.
- **Impact métier** :
  Rupture complète du parcours métier d'agrément des guides : un conservateur connecté dans son back-office Angular accède à l'onglet "Validation des Guides", mais tout appel HTTP est rejeté avec un code `403 Forbidden`, bloquant tout agrément de guide en production.
- **Scénario de reproduction** :
  1. Se connecter avec le compte conservateur (`fatou.conservateur@patrimoine-casamance.sn`).
  2. Naviguer vers l'espace professionnel : `/pro/guides`.
  3. Observer le chargement de la liste des guides soumis : appel vers `GET /api/guides/admin/tous`.
  4. Réponse Gateway : `HTTP 403 Forbidden` (`Accès interdit : permission GUIDE:VALIDER requise.`).
  5. Tenter une validation directe via `POST /api/guides/2/valider` : `HTTP 403 Forbidden`.
- **Comportement attendu** :
  Le conservateur doit pouvoir consulter la liste complète des guides (quel que soit leur statut), instruire les candidatures, et émettre un avis favorable (`valider`) ou défavorable (`rejeter`) avec mise à jour immédiate du statut en base de données.
- **Comportement observé** :
  Accès interdit 403 Forbidden systématique pour le rôle `CONSERVATEUR`.
- **Solution recommandée** :
  1. Créer une nouvelle migration Flyway `V8__fix_conservateur_guide_permissions.sql` dans `ms-utilisateur` :
     ```sql
     INSERT INTO role_permission (role_code, permission_code) VALUES
         ('CONSERVATEUR', 'GUIDE:LIRE'),
         ('CONSERVATEUR', 'GUIDE:VALIDER'),
         ('CONSERVATEUR', 'GUIDE:SUSPENDRE')
     ON CONFLICT DO NOTHING;
     ```
  2. Vérifier que `GatewayAuthorizationFilter.java` permet bien l'accès dès lors que le JWT du conservateur contient `GUIDE:VALIDER`.
  3. Mettre à jour les tests unitaires et d'intégration de `ms-utilisateur` et `api-gateway`.
- **Tests de non-régression à mettre en place** :
  - `ms-utilisateur` : `GuideControllerIntegrationTest` avec token de rôle `CONSERVATEUR` validant avec succès un profil guide `SOUMIS`.
  - `api-gateway` : `GatewayAuthorizationFilterTest` validant l'accès d'un token `CONSERVATEUR` aux routes `/api/guides/admin/**` et `/api/guides/{id}/valider`.

---

### FICHE ANOM-P0-02
- **Identifiant** : `ANOM-P0-02`
- **Titre** : Deadlock fonctionnel sur les réservations gratuites (montant total = 0 XOF).
- **Sévérité** : **P0 (Bloquante)**
- **Domaine / Modules** : Réservation, Billetterie, Événements gratuits, Paiement simulé.
- **Services concernés** :
  - `ms-reservation` : `ReservationService.java`, entité `Reservation.java`, énumération `StatutReservation.java`.
  - `ms-paiement` : `PaiementService.java`.
  - `frontend-angular` : `reservation-modal.component.ts`.
- **Description détaillée** :
  Dans le patrimoine et l'agenda culturel de la Casamance, de nombreuses activités, journées du patrimoine et cérémonies traditionnelles sont à accès libre ou gratuit (`tarif = 0 XOF` ou `prix = 0 XOF`). Le touriste doit néanmoins pouvoir réserver sa place pour garantir la jauge de sécurité du site ou de l'événement.
  Le mécanisme actuel crée un blocage irrémédiable :
  1. Lors de la réservation via `ReservationService.saveReservation` (lignes 179-180) ou `soumettreReservation` (ligne 246), le statut cible est inconditionnellement positionné à `EN_ATTENTE_PAIEMENT`, même si `montantTotal.compareTo(BigDecimal.ZERO) == 0`.
  2. Le tableau des transitions autorisées `ALLOWED_TRANSITIONS` dans `ReservationService.java` (lignes 131-137) n'autorise que :
     - `BROUILLON -> EN_ATTENTE_PAIEMENT, ANNULEE`.
     - `EN_ATTENTE_PAIEMENT -> CONFIRMEE, EXPIREE, ANNULEE, ECHEC`.
     Il est donc **impossible** de passer directement de `BROUILLON` à `CONFIRMEE`.
  3. Pour passer à `CONFIRMEE`, la réservation attend un paiement validé via `POST /api/reservations/{id}/synchroniser` ou via l'événement outbox de `ms-paiement`.
  4. Or, dans `ms-paiement/PaiementService.java` (lignes 640-642), la méthode `validerEtExtraireMontantReservation` stipule formellement :
     ```java
     if (reservation.getMontantTotal() == null || reservation.getMontantTotal().compareTo(BigDecimal.ZERO) <= 0) {
         throw new BadRequestException("Le montant de la réservation doit être strictement positif.");
     }
     ```
  5. Tout appel vers `POST /api/paiements/simuler` échoue immédiatement avec une erreur `400 Bad Request`.
  6. La réservation reste bloquée au statut `EN_ATTENTE_PAIEMENT` jusqu'à son expiration automatique au bout de 30 minutes (`EXPIREE`), bloquant inutilement la capacité d'accueil.
- **Cause racine exacte** :
  - Absence de disjonction de flux dans `ReservationService` entre offre payante et offre gratuite.
  - Rejet systématique des montants nuls par `ms-paiement`.
  - Absence de la transition directe `BROUILLON -> CONFIRMEE` pour les montants nuls.
- **Impact métier** :
  Impossibilité absolue pour un touriste de réserver un événement culturel gratuit ou une visite gratuite d'un site patrimonial.
- **Scénario de reproduction** :
  1. Sélectionner un événement gratuit (ex: "Cérémonie du Bukut", prix = 0 XOF).
  2. Cliquer sur "Réserver ma place" (1 place).
  3. Cliquer sur "Confirmer et payer".
  4. La réservation est créée au statut `EN_ATTENTE_PAIEMENT`.
  5. La modale tente d'appeler `POST /api/paiements/simuler` avec montant 0 : rejet `HTTP 400 Bad Request` ("Le montant de la réservation doit être strictement positif.").
  6. La réservation reste bloquée et passe en `EXPIREE` 30 minutes plus tard.
- **Comportement attendu** :
  Si `montantTotal == 0`, la réservation doit être instantanément basculée au statut `CONFIRMEE`, sans générer d'échéance de paiement, sans appeler `ms-paiement`, avec notification immédiate de confirmation au touriste.
- **Comportement observé** :
  Blocage en `EN_ATTENTE_PAIEMENT` puis expiration systématique.
- **Solution recommandée** :
  1. Modifier `ALLOWED_TRANSITIONS` dans `ReservationService.java` pour autoriser la transition directe :
     `BROUILLON -> CONFIRMEE` (conditionnée à `montantTotal == 0`).
  2. Dans `ReservationService.saveReservation` et `soumettreReservation` :
     Si `montantTotal.compareTo(BigDecimal.ZERO) == 0` :
     - Assigner directement le statut `StatutReservation.CONFIRMEE`.
     - Définir `referencePaiement = "GRATUIT-" + reservation.getReference()`.
     - Fixer `datePaiement = now`.
     - Émettre immédiatement la notification de confirmation via `notificationClient.notifierConfirmation(...)`.
  3. Côté `frontend-angular` : dans `reservation-modal.component.ts`, si le montant est égal à 0, ne pas afficher l'étape de sélection Wave/OM et afficher directement l'écran de succès.
- **Tests de non-régression à mettre en place** :
  - Test unitaire dans `ReservationServiceTest` validant la création directe au statut `CONFIRMEE` pour un événement à 0 FCFA.
  - Test d'intégration de réservation gratuite vérifiant qu'aucun appel sortant vers `ms-paiement` n'est tenté.

---

## 2. ANOMALIES MAJEURES (CRITICITÉ P1)

### FICHE ANOM-P1-01
- **Identifiant** : `ANOM-P1-01`
- **Titre** : Absence du module de planification de visites avec détection de conflit horaire pour les guides (`CONS-06`).
- **Sévérité** : **P1 (Majeure)**
- **Domaine / Modules** : Gestion opérationnelle, Circuits, Guides, Planification.
- **Services concernés** : `ms-circuit`, `ms-reservation`, `frontend-angular`.
- **Description détaillée** :
  Le rôle `CONSERVATEUR` et le `GESTIONNAIRE_SITE` doivent pouvoir planifier des départs de visites guidées sur des créneaux précis et s'assurer qu'un guide n'est pas assigné à deux visites simultanées.
  Dans l'état actuel :
  - Il n'existe pas d'entité `Visite` ou `CreneauVisite` distincte de `Circuit`.
  - Aucun algorithme ne contrôle si un guide sélectionné est déjà affecté à un autre circuit ou événement le même jour et à la même heure.
- **Solution recommandée** :
  - Implémenter dans `ms-circuit` une vérification d'indisponibilité du guide avant assignation d'un départ de circuit.
  - Interroger `ms-reservation` pour valider que le guide n'a pas de prestation active sur le créneau ciblé.

---

### FICHE ANOM-P1-02
- **Identifiant** : `ANOM-P1-02`
- **Titre** : Absence d'agenda personnel et de vue calendrier pour le guide touristique (`GUIDE-03`).
- **Sévérité** : **P1 (Majeure)**
- **Domaine / Modules** : Espace Guide, Agenda, Gestion du temps.
- **Services concernés** : `ms-reservation`, `frontend-angular`.
- **Description détaillée** :
  L'espace professionnel du guide (`/pro/manifestes`) permet uniquement de consulter la liste des passagers d'un circuit donné. Il n'existe aucun écran ni API `/api/guides/mon-agenda` permettant au guide de visualiser son calendrier d'interventions par jour, semaine ou mois.
- **Solution recommandée** :
  - Créer l'endpoint `GET /api/reservations/guide/agenda` agrégeant les prestations confirmées par date pour le guide authentifié.
  - Développer un composant calendrier responsive dans `frontend-angular` (`pro-guide-agenda-page`).

---

### FICHE ANOM-P1-03
- **Identifiant** : `ANOM-P1-03`
- **Titre** : Absence de droit de réponse du guide aux avis le concernant (`GUIDE-05`).
- **Sévérité** : **P1 (Majeure)**
- **Domaine / Modules** : Avis touristiques, Espace Guide, Modération.
- **Services concernés** : `ms-reservation`, `frontend-angular`.
- **Description détaillée** :
  Les touristes peuvent évaluer un guide ou un circuit après prestation. Cependant, le guide ne dispose d'aucune interface ni d'aucun endpoint pour déposer une réponse publique ou une explication face à un avis client.
- **Solution recommandée** :
  - Ajouter les colonnes `reponse_guide` (TEXT) et `date_reponse_guide` (TIMESTAMP) dans la table `avis` de `ms-reservation`.
  - Créer l'endpoint sécurisé `POST /api/avis/{id}/reponse` vérifiant que l'appelant est bien le guide concerné.
  - Ajouter un bouton "Répondre" dans le back-office guide et afficher la réponse sous l'avis dans la fiche publique.

---

### FICHE ANOM-P1-04
- **Identifiant** : `ANOM-P1-04`
- **Titre** : Absence de recherche géographique à proximité (GPS réel du touriste et formule Haversine) (`TOUR-03` / `E2E-09`).
- **Sévérité** : **P1 (Majeure)**
- **Domaine / Modules** : Expérience Touriste, Géolocalisation, Mobilité.
- **Services concernés** : `ms-patrimoine`, `frontend-angular`.
- **Description détaillée** :
  La plateforme dispose de coordonnées GPS (latitude et longitude) pour les sites et les affiche sur une carte Leaflet. En revanche, le besoin "Recherche des sites à proximité immédiate de ma position" n'est pas implémenté :
  - Aucun appel à `navigator.geolocation` n'est présent dans le frontend.
  - Aucun calcul de distance orthodromique (formule de Haversine) n'est implémenté dans `ms-patrimoine`.
  - Il est impossible de filtrer les sites dans un rayon de 5 km, 10 km ou 25 km.
- **Solution recommandée** :
  - Ajouter dans `ms-patrimoine` l'endpoint `GET /api/patrimoines/proximite?latitude=...&longitude=...&rayonKm=...` avec calcul SQL de distance Haversine :
    `6371 * acos(cos(radians(:lat)) * cos(radians(latitude)) * cos(radians(longitude) - radians(:lon)) + sin(radians(:lat)) * sin(radians(latitude)))`
  - Ajouter dans `patrimoine-list-page` un bouton "Autour de moi" activant la géolocalisation navigateur avec demande de permission explicite.

---

### FICHE ANOM-P1-05
- **Identifiant** : `ANOM-P1-05`
- **Titre** : Absence complète du module Billetterie électronique avec QR Code sécurisé et contrôle d'accès (`TOUR-06` / `E2E-06`).
- **Sévérité** : **P1 (Majeure)**
- **Domaine / Modules** : Billetterie, Contrôle d'accès, Sécurité physique des sites.
- **Services concernés** : `ms-reservation`, `frontend-angular`.
- **Description détaillée** :
  L'exigence de génération de billets dématérialisés avec QR Code anti-fraude et contrôle d'accès à l'entrée des sites n'est pas implémentée :
  - Aucune table `billet` ou `ticket` n'existe dans le schéma Flyway de `ms-reservation`.
  - Aucun token cryptographique (HMAC/UUID sécurisé) n'est généré lors de la confirmation d'une réservation.
  - Aucun endpoint de validation de visite (`POST /api/visites/valider` ou `/api/billets/scan`) n'est présent.
  - Aucun composant de scan (caméra / saisie manuelle) n'est mis à disposition du gestionnaire de site.
- **Solution recommandée** :
  1. Créer la table `billet` dans `ms-reservation` avec `code_billet`, `token_qr`, `statut` (VALIDE, UTILISE, ANNULE), `date_utilisation`.
  2. Générer automatiquement un billet par place réservée lors du passage au statut `CONFIRMEE`.
  3. Fournir l'affichage du QR Code SVG dans l'espace touriste (`/profil/mes-reservations`).
  4. Créer l'endpoint `POST /api/billets/valider` avec contrôle de consommation atomique et droit `VISITE:VALIDER` pour le conservateur et gestionnaire de site.

---

## 3. ANOMALIES MOYENNES (CRITICITÉ P2)

### FICHE ANOM-P2-01
- **Identifiant** : `ANOM-P2-01`
- **Titre** : Gestion multimédia partielle : pas de multi-images, pas de vidéos, pas d'upload direct (`PAT-05`).
- **Sévérité** : **P2 (Moyenne)**
- **Domaine / Modules** : Patrimoine, Contenus multimédias.
- **Services concernés** : `ms-patrimoine`, `frontend-angular`.
- **Description détaillée** :
  Seul un champ textuel `imageUrl` est actuellement éditable et restitué. Le champ `galerieMedias` présent dans l'entité JPA n'est ni exposé dans le DTO ni dans l'interface Angular. Aucun support vidéo ni composant d'upload multipart n'est en place.
- **Solution recommandée** :
  Exposer une liste d'URLs d'images dans `SiteTouristiqueDto` et enrichir le formulaire du conservateur pour gérer une galerie d'images et des liens vidéo YouTube/Vimeo.

---

### FICHE ANOM-P2-02
- **Identifiant** : `ANOM-P2-02`
- **Titre** : Horaires d'ouverture non structurés et déconnectés de la réservation (`PAT-06` / `CONS-05`).
- **Sévérité** : **P2 (Moyenne)**
- **Domaine / Modules** : Patrimoine, Réservation.
- **Services concernés** : `ms-patrimoine`, `ms-reservation`.
- **Description détaillée** :
  Le champ `horairesOuverture` est un simple `VARCHAR(255)` de texte libre (ex: "8h - 18h sauf lundi"). Ce texte n'est pas interprété par le système de réservation, qui autorise la prise de réservation pour n'importe quel jour de la semaine sans vérifier les fermetures hebdomadaires ou saisonnières.
- **Solution recommandée** :
  Structurer les horaires sous forme d'objets JSON par jour de la semaine (`lundi`, `mardi`... avec `ouvert`, `ouverture`, `fermeture`) et valider la date de prestation demandée lors de la réservation.

---

### FICHE ANOM-P2-03
- **Identifiant** : `ANOM-P2-03`
- **Titre** : Absence de remboursement automatique lors de l'annulation d'une réservation confirmée (`E2E-05`).
- **Sévérité** : **P2 (Moyenne)**
- **Domaine / Modules** : Réservation, Paiement, Outbox.
- **Services concernés** : `ms-reservation`, `ms-paiement`.
- **Description détaillée** :
  Lorsqu'un touriste annule sa réservation via `PUT /api/reservations/{id}/annuler`, le statut passe bien en `ANNULEE` et les places sont libérées. Cependant, aucun événement n'est transmis à `ms-paiement` pour basculer la transaction en `REMBOURSEE` ou émettre une transaction de reversement Wave/OM.
- **Solution recommandée** :
  Insérer un événement d'outbox `RESERVATION_ANNULEE` dans `ms-reservation` consommé par `ms-paiement` pour passer la transaction associée au statut `REMBOURSEE`.

---

### FICHE ANOM-P2-04
- **Identifiant** : `ANOM-P2-04`
- **Titre** : Désynchronisation TTL entre token CSRF (15 min) et session refresh (7 jours) (`SEC-02`).
- **Sévérité** : **P2 (Moyenne)**
- **Domaine / Modules** : Sécurité, Passerelle, Cookies.
- **Services concernés** : `api-gateway`, `frontend-angular`.
- **Description détaillée** :
  Le cookie `XSRF-TOKEN` a une durée de validité de 15 minutes, tandis que le refresh token en cookie HttpOnly dure 7 jours. Si l'utilisateur reste inactif plus de 15 minutes sur une page, toute requête de mutation ultérieure (POST/PUT) échoue avec un code `403 CSRF Token Invalid`, même si la session utilisateur est parfaitement rafraîchie.
- **Solution recommandée** :
  Dans l'intercepteur Angular `CsrfInterceptor` et dans le gestionnaire de rafraîchissement, réémettre automatiquement un nouveau cookie CSRF lors de l'appel à `POST /api/auth/refresh`.

---

### FICHE ANOM-P2-05
- **Identifiant** : `ANOM-P2-05`
- **Titre** : Erreur 500 sur mise à jour d'un e-mail dupliqué dans la gestion des utilisateurs (`SEC-04`).
- **Sévérité** : **P2 (Moyenne)**
- **Domaine / Modules** : Administration, Utilisateurs, Intégrité des données.
- **Services concernés** : `ms-utilisateur`.
- **Description détaillée** :
  Dans `UtilisateurService.java`, lors de l'appel à `modifierUtilisateur(Long id, UtilisateurDto dto)`, si le nouvel e-mail appartient déjà à un autre utilisateur, aucune vérification `existsByEmailAndIdNot` n'est effectuée. La tentative de commit JPA déclenche une `DataIntegrityViolationException` qui se traduit par une erreur HTTP `500 Internal Server Error` au lieu d'un `409 Conflict`.
- **Solution recommandée** :
  Ajouter un contrôle explicite d'unicité dans `UtilisateurService` avant modification et lever `ConflictException("Cet e-mail est déjà utilisé par un autre compte.")`.

---

### FICHE ANOM-P2-06
- **Identifiant** : `ANOM-P2-06`
- **Titre** : Absence de Dead-Letter Queue et d'auto-compensation dans l'Outbox Pattern (`ARCH-02`).
- **Sévérité** : **P2 (Moyenne)**
- **Domaine / Modules** : Architecture asynchrone, Résilience.
- **Services concernés** : `ms-paiement`, `ms-reservation`.
- **Description détaillée** :
  La table `outbox_event` stocke les événements à synchroniser avec un compteur de tentatives `retry_count`. Si le service distant renvoie une erreur définitive (ex: 404 Réservation introuvable suite à une anomalie de données), l'événement continue d'être rejoué indéfiniment ou reste bloqué à `FAILED` sans déclencher de compensation financière (annulation du paiement).
- **Solution recommandée** :
  Après 5 tentatives infructueuses, basculer le statut en `DEAD_LETTER` et déclencher une alerte d'administration ou une tâche de compensation automatique.

---

## 4. ANOMALIES MINEURES (CRITICITÉ P3)

### FICHE ANOM-P3-01
- **Identifiant** : `ANOM-P3-01`
- **Titre** : Absence de normalisation des URL avec paramètres matriciels dans la Gateway.
- **Sévérité** : **P3 (Mineure)**
- **Domaine / Modules** : Sécurité réseau, Gateway.
- **Services concernés** : `api-gateway`.
- **Description détaillée** :
  Le filtre `GatewayAuthorizationFilter` normalise les URI en vérifiant les chemins absolus mais ne filtre pas spécifiquement les séparateurs de paramètres de matrice (`;`), ce qui peut engendrer des divergences de routage selon les conteneurs de servlets sous-jacents.
- **Solution recommandée** :
  Ajouter un assainissement d'URI supprimant toute portion `;param=value` avant évaluation des règles RBAC.

---

### FICHE ANOM-P3-02
- **Identifiant** : `ANOM-P3-02`
- **Titre** : Absence d'indicateur visuel d'affectation d'un guide sur les fiches circuits dans le back-office.
- **Sévérité** : **P3 (Mineure)**
- **Domaine / Modules** : Front-office / Back-office Circuits.
- **Services concernés** : `frontend-angular`.
- **Description détaillée** :
  Lors de la visualisation de la liste des circuits dans le back-office gestionnaire, le nom du guide assigné n'apparaît pas clairement sous forme de badge, nécessitant d'ouvrir le détail du circuit pour savoir s'il est pourvu d'un guide.
- **Solution recommandée** :
  Afficher un badge avec le nom complet du guide ou la mention "Aucun guide assigné" directement dans la table récapitulative des circuits.
