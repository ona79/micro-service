# PROMPTS CORRECTIFS PRÊTS À L'EMPLOI — MISSION P07.5
**Plateforme de Valorisation du Patrimoine Touristique de la Casamance**  
*Université Assane Seck de Ziguinchor — Licence 3 Ingénierie Informatique*  
**Date d'audit** : 18 Novembre 2026  
**Branche d'audit** : `feature/p07-5-functional-audit`  

---

## PRÉAMBULE D'UTILISATION

Ce document contient les **prompts opérationnels complets et prêts à l'exécution** pour corriger l'ensemble des anomalies identifiées lors de l'audit fonctionnel P07.5.
Chaque prompt est autonome, contextualisé, structuré selon les standards d'ingénierie logicielle d'Antigravity, et respecte la gouvernance Git du projet :
- Travailler sur des branches dédiées issues de `develop`.
- Préserver l'isolation stricte des 7 bases de données PostgreSQL 16.
- Assurer une non-régression absolue sur les 195 tests backend et 75 tests frontend existants.

---

## PROMPT CORRECTIF LOT 1 (URGENCE ABSOLUE P0)
### Intitulé : Déblocage RBAC du Conservateur & Résolution du Deadlock des Réservations Gratuites

```markdown
# MISSION DE CORRECTION P07.6 — LOT 1 : DÉBLOCAGE DES CRITICITÉS P0 (CONSERVATEUR & RÉSERVATIONS GRATUITES)

## 1. CONTEXTE ET OBJECTIF
Tu interviens sur le projet universitaire "Plateforme du Patrimoine Touristique de la Casamance" (UASZ, L3 Informatique).
L'audit fonctionnel P07.5 a identifié deux anomalies critiques bloquantes (P0) empêchant le fonctionnement normal de la plateforme :
1. **ANOM-P0-01** : Le rôle CONSERVATEUR ne peut ni valider, ni rejeter, ni suspendre les guides touristiques (erreur HTTP 403 Forbidden sur `/api/guides/*`).
2. **ANOM-P0-02** : Deadlock sur les offres gratuites : toute réservation à 0 FCFA est basculée en EN_ATTENTE_PAIEMENT et rejetée par ms-paiement (erreur HTTP 400), la bloquant jusqu'à expiration.

L'objectif de cette mission est de corriger intégralement ces deux anomalies sans aucune régression.

## 2. GOUVERNANCE GIT
- Vérifier que l'arbre de travail local est propre (`git status`).
- Créer la branche `fix/p07-6-lot1-p0-rbac-free-bookings` depuis le dernier commit de `develop`.
- Publier la branche sur `origin`.

## 3. TRAVAUX À RÉALISER

### A. Correction ANOM-P0-01 (RBAC Conservateur et Validation des Guides)
1. **Migration Flyway dans ms-utilisateur** :
   - Créer le fichier `ms-utilisateur/src/main/resources/db/migration/V8__add_conservateur_guide_permissions.sql`.
   - Insérer les associations :
     ```sql
     INSERT INTO role_permission (role_code, permission_code) VALUES
         ('CONSERVATEUR', 'GUIDE:LIRE'),
         ('CONSERVATEUR', 'GUIDE:VALIDER'),
         ('CONSERVATEUR', 'GUIDE:SUSPENDRE')
     ON CONFLICT DO NOTHING;
     ```
2. **Contrôle d'accès et visibilité dans ms-utilisateur** :
   - Dans `com.uasz.ms_utilisateur.services.GuideService` : vérifier la méthode `formatForCaller` afin qu'un utilisateur disposant du rôle `CONSERVATEUR` ou de la permission `GUIDE:VALIDER` puisse consulter les profils en statut `SOUMIS`.
3. **Gateway Authorization Filter** :
   - Dans `api-gateway/src/main/java/com/uasz/api_gateway/security/GatewayAuthorizationFilter.java` :
     Vérifier que les règles sur `/api/guides/admin/**`, `/api/guides/{id}/valider`, `/api/guides/{id}/rejeter`, `/api/guides/{id}/reactiver` et `/api/guides/{id}/suspendre` autorisent bien les tokens porteurs de `GUIDE:VALIDER` ou `GUIDE:SUSPENDRE`.
4. **Tests de non-régression** :
   - Ajouter un test dans `ms-utilisateur` validant qu'un compte au rôle `CONSERVATEUR` valide avec succès un profil de guide soumis.
   - Ajouter un test dans `api-gateway` validant le franchissement de la Gateway pour le conservateur sur les routes de gestion des guides.

### B. Correction ANOM-P0-02 (Réservations d'Offres Gratuites à 0 FCFA)
1. **Machine à états dans ms-reservation** :
   - Dans `ms-reservation/src/main/java/com/uasz/ms_reservation/services/ReservationService.java` :
     - Mettre à jour `buildTransitions()` pour autoriser la transition directe :
       `map.put(StatutReservation.BROUILLON, EnumSet.of(StatutReservation.EN_ATTENTE_PAIEMENT, StatutReservation.CONFIRMEE, StatutReservation.ANNULEE));`
     - Dans `saveReservation` et `soumettreReservation` :
       Détecter si `montantTotal.compareTo(BigDecimal.ZERO) == 0`.
       Si oui :
       - Basculer directement le statut cible à `StatutReservation.CONFIRMEE`.
       - Définir `referencePaiement = "GRATUIT-" + entity.getReference();`.
       - Définir `datePaiement = now;`.
       - Enregistrer l'historique de transition `BROUILLON -> CONFIRMEE` avec le motif "Validation automatique réservation gratuite".
       - Déclencher immédiatement l'envoi de la notification de confirmation via `notificationClient.notifierConfirmation(...)`.
2. **Interface utilisateur dans frontend-angular** :
   - Dans `frontend-angular/src/app/features/reservations/components/reservation-modal/reservation-modal.component.ts` (ou équivalent) :
     - Lorsque le montant total calculé est de 0 FCFA, adapter l'intitulé du bouton de soumission ("Confirmer ma réservation gratuite").
     - Ne pas appeler la passerelle de paiement simulé Wave/OM si le montant est égal à 0 ; rediriger directement vers la vue de succès avec confirmation instantanée.
3. **Tests de non-régression** :
   - Ajouter un test dans `ReservationServiceTest` vérifiant la création d'une réservation gratuite avec confirmation immédiate.
   - Vérifier qu'aucun appel sortant vers `ms-paiement` n'est tenté lors d'une réservation gratuite.

## 4. VALIDATION ET LIVRAISON
- Exécuter `./verify-integration.sh` et vérifier que les 9 modules Maven compilent et passent tous leurs tests.
- Exécuter `npx ng test --no-watch` et `npm run build` sur le frontend.
- Tester manuellement sur l'application locale :
  1. Connexion en tant que Conservateur (`fatou.conservateur@patrimoine-casamance.sn`) -> Validation d'un guide sur `/pro/guides`.
  2. Connexion en tant que Touriste -> Réservation d'un événement gratuit -> Statut confirmé immédiat.
- Committer avec un message conventionnel : `fix(p0): resolve conservateur guide rbac and free booking deadlock`.
- Pousser la branche et soumettre la Pull Request vers `develop`.
```

---

## PROMPT CORRECTIF LOT 2 (MODULE MAJEUR P1)
### Intitulé : Implémentation Complète de la Billetterie Électronique avec QR Code et Contrôle d'Accès

```markdown
# MISSION DE DÉVELOPPEMENT P07.6 — LOT 2 : BILLETTERIE ÉLECTRONIQUE ET SCAN QR CODE (ANOM-P1-05)

## 1. CONTEXTE ET OBJECTIF
Sur la plateforme touristique de la Casamance, l'audit P07.5 a constaté l'absence complète du système de billetterie dématérialisée et de contrôle d'accès physique aux sites (exigences TOUR-06 et E2E-06).
L'objectif est d'implémenter la chaîne complète de billetterie :
1. Génération de billets électroniques individuels avec token sécurisé anti-fraude lors de la confirmation d'une réservation.
2. Restitution du QR Code SVG dans l'espace touriste et sur le récapitulatif de commande.
3. API et interface de contrôle d'accès / scan pour les gestionnaires de sites et conservateurs.

## 2. GOUVERNANCE GIT
- Créer la branche `feature/p07-6-lot2-electronic-tickets-qr` depuis `develop`.

## 3. TRAVAUX À RÉALISER

### A. Backend ms-reservation
1. **Migration Flyway V8** :
   - Créer `db/migration/V8__create_billet_table.sql` :
     ```sql
     CREATE TABLE billet (
         id BIGSERIAL PRIMARY KEY,
         reservation_id BIGINT NOT NULL REFERENCES reservation(id) ON DELETE CASCADE,
         numero_billet VARCHAR(64) NOT NULL UNIQUE,
         token_qr VARCHAR(128) NOT NULL UNIQUE,
         nom_beneficiaire VARCHAR(150),
         statut VARCHAR(30) NOT NULL DEFAULT 'VALIDE', -- VALIDE, CONSOMME, ANNULE, EXPIRE
         date_utilisation TIMESTAMP,
         valide_par VARCHAR(100),
         created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
     );
     CREATE INDEX idx_billet_reservation ON billet(reservation_id);
     CREATE INDEX idx_billet_token ON billet(token_qr);
     ```
2. **Entité et Logique Métier** :
   - Créer l'entité JPA `Billet` et son repository `BilletRepository`.
   - Dans `ReservationService` : lors du passage à `CONFIRMEE` (payant ou gratuit), générer autant de billets que de places réservées (`nombrePlaces`).
   - Le champ `token_qr` doit être un token cryptographique sécurisé (ex: SHA-256 basé sur l'ID réservation, le numéro de place et un secret interne).
3. **Endpoints REST de Billetterie** :
   - `GET /api/reservations/{id}/billets` : liste des billets de la réservation (accessible au propriétaire ou admin).
   - `POST /api/visites/valider` : endpoint de contrôle d'accès prenant `{ "tokenQr": "..." }`.
     - Vérifie l'authenticité du token.
     - Vérifie que le statut du billet est `VALIDE` et que la date de la prestation correspond au jour courant (avec tolérance).
     - Bascule de façon atomique le statut à `CONSOMME`, horodate `date_utilisation` et renseigne `valide_par`.
     - En cas de double scan : renvoyer `HTTP 409 Conflict` avec l'heure exacte de la première utilisation.
     - Sécurisé par la permission `VISITE:VALIDER` ou `PATRIMOINE:VALIDER`.

### B. Passerelle et RBAC
- Dans `GatewayAuthorizationFilter` : autoriser `POST /api/visites/valider` pour les rôles `CONSERVATEUR`, `GESTIONNAIRE_SITE` et `ADMINISTRATEUR`.

### C. Frontend Angular 22
1. **Affichage du Billet pour le Touriste** :
   - Créer un composant d'affichage de billet électronique (`ticket-view-component`).
   - Utiliser une librairie ou un utilitaire SVG léger sans dépendance lourde pour générer le visuel du QR Code.
   - Permettre l'impression ou le téléchargement PDF/HTML du billet.
2. **Interface de Contrôle d'Accès pour le Personnel** :
   - Créer la page `/pro/controle-acces` accessible aux gestionnaires et conservateurs.
   - Proposer la saisie/scan du code billet ou l'activation de la caméra via l'API standard `Html5Qrcode` / navigateur.
   - Affichage immédiat d'un feedback visuel vert (Billet valide, accès autorisé) ou rouge (Billet déjà consommé / faux billet).

## 4. VALIDATION
- Tests unitaires et d'intégration validant la génération des billets, l'unicité des tokens et la protection contre le double-scan.
- Exécution de `./verify-integration.sh` et des tests Vitest.
```

---

## PROMPT CORRECTIF LOT 3 (EXPÉRIENCE MÉTIER P1)
### Intitulé : Géolocalisation Réelle à Proximité, Agenda Guide & Droit de Réponse aux Avis

```markdown
# MISSION DE DÉVELOPPEMENT P07.6 — LOT 3 : GÉOLOCALISATION GPS, AGENDA DU GUIDE ET GESTION DES AVIS

## 1. CONTEXTE ET OBJECTIF
Combler les fonctionnalités manquantes identifiées dans l'audit P07.5 :
1. **ANOM-P1-04** : Recherche à proximité par géolocalisation réelle du touriste (`TOUR-03` / `E2E-09`).
2. **ANOM-P1-02** : Agenda personnel et calendrier de visites pour le guide connecté (`GUIDE-03`).
3. **ANOM-P1-03** : Droit de réponse aux avis pour les guides (`GUIDE-05`).

## 2. GOUVERNANCE GIT
- Créer la branche `feature/p07-6-lot3-gps-agenda-reviews` depuis `develop`.

## 3. TRAVAUX À RÉALISER

### A. Recherche Géographique à Proximité (ms-patrimoine & Frontend)
1. **Backend ms-patrimoine** :
   - Ajouter dans `SiteTouristiqueRepository` une méthode avec calcul de formule de Haversine :
     ```java
     @Query(value = """
         SELECT s.*, 
                (6371 * acos(cos(radians(:lat)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(:lon)) + sin(radians(:lat)) * sin(radians(s.latitude)))) AS distance
         FROM site_touristique s
         WHERE s.statut_publication = 'PUBLIE'
         HAVING (6371 * acos(cos(radians(:lat)) * cos(radians(s.latitude)) * cos(radians(s.longitude) - radians(:lon)) + sin(radians(:lat)) * sin(radians(s.latitude)))) <= :rayonKm
         ORDER BY distance ASC
         """, nativeQuery = true)
     List<SiteTouristique> findSitesProximite(@Param("lat") double lat, @Param("lon") double lon, @Param("rayonKm") double rayonKm);
     ```
   - Exposer l'endpoint `GET /api/patrimoines/proximite?lat=...&lon=...&rayonKm=...`.
2. **Frontend Angular** :
   - Dans `PatrimoineListPage` : ajouter le bouton "Autour de moi" exploitant `navigator.geolocation.getCurrentPosition()`.
   - Afficher la distance calculée (ex: "à 2,4 km de votre position") sur chaque carte de site.

### B. Agenda Personnel du Guide (ms-reservation & Frontend)
1. **Backend ms-reservation** :
   - Exposer l'endpoint `GET /api/reservations/guide/agenda?mois=...&annee=...`.
   - Récupérer les circuits assignés au guide connecté et agréger les réservations confirmées par date et heure de départ.
2. **Frontend Angular** :
   - Créer le composant `pro-guide-agenda-page.component.ts` dans `/pro/agenda`.
   - Afficher une vue calendrier hebdomadaire/mensuelle claire indiquant le nombre de touristes attendus et l'heure du rassemblement.

### C. Droit de Réponse aux Avis (ms-reservation & Frontend)
1. **Backend ms-reservation** :
   - Migration Flyway : ajouter `reponse_guide TEXT`, `date_reponse TIMESTAMP` dans la table `avis`.
   - Endpoint `POST /api/avis/{id}/reponse` permettant au guide évalué de soumettre une réponse officielle.
2. **Frontend Angular** :
   - Permettre au guide de rédiger sa réponse depuis son espace pro.
   - Restituer la réponse du guide directement sous l'avis client dans la fiche publique du circuit ou du guide.

## 4. VALIDATION
- Vérification intégrale `./verify-integration.sh` et suite de tests front-end.
```

---

## PROMPT CORRECTIF LOT 4 (DURCISSEMENT TECHNIQUE P2)
### Intitulé : Synchronisation CSRF, Remboursement Outbox et Intégrité des Données

```markdown
# MISSION DE MAINTENANCE P07.6 — LOT 4 : SÉCURITÉ CSRF, OUTBOX COMPENSATION ET INTÉGRITÉ

## 1. CONTEXTE ET OBJECTIF
Traiter les anomalies de sévérité P2 identifiées dans l'audit P07.5 :
1. **ANOM-P2-04** : Désynchronisation CSRF (15 min) vs Refresh token (7 jours).
2. **ANOM-P2-03** : Absence de remboursement automatique lors de l'annulation d'une réservation confirmée.
3. **ANOM-P2-05** : Détection d'unicité d'e-mail dans ms-utilisateur (renvoi 409 Conflict au lieu d'une 500).
4. **ANOM-P2-06** : Dead-letter queue et politique de résilience pour l'outbox de ms-paiement.

## 2. GOUVERNANCE GIT
- Créer la branche `fix/p07-6-lot4-security-and-outbox` depuis `develop`.

## 3. TRAVAUX À RÉALISER
1. **CSRF & Sessions dans api-gateway** :
   - Assurer que l'endpoint `/api/auth/refresh` renouvelle simultanément le cookie `XSRF-TOKEN` avec une durée calquée sur la session active.
   - Dans le frontend `CsrfInterceptor`, rafraîchir le token CSRF à la volée avant de rejouer une requête rejetée pour cause de token expiré.
2. **Remboursement Outbox** :
   - Dans `ms-reservation` : lors d'une annulation d'une réservation confirmée (`PUT /api/reservations/{id}/annuler`), insérer un événement d'outbox `RESERVATION_ANNULEE`.
   - Dans `ms-paiement` : consommer l'événement d'annulation pour mettre à jour la transaction au statut `REMBOURSEE` et notifier le client.
3. **Contrôle BOLA & Unicité e-mail** :
   - Dans `ms-utilisateur/UtilisateurService` : vérifier préventivement `utilisateurRepository.existsByEmailAndIdNot(...)` et lever `ConflictException` si l'adresse est déjà attribuée.
4. **Résilience Outbox ms-paiement** :
   - Limiter les retries à 5 tentatives ; au-delà, basculer l'événement en statut `DEAD_LETTER` et journaliser une alerte d'erreur critique pour l'administrateur.

## 4. VALIDATION
- Vérification intégrale de non-régression backend et frontend.
```
