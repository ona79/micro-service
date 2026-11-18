# RAPPORT D'AUDIT FONCTIONNEL ET TECHNIQUE GLOBAL — MISSION P07.5
**Plateforme de Valorisation du Patrimoine Touristique de la Casamance**  
*Université Assane Seck de Ziguinchor (UASZ) — Projet Tutoré de Licence 3 Ingénierie Informatique*  
**Date d'audit** : 18 Novembre 2026  
**Auditeur** : Antigravity (Architecte Logiciel Senior & Auditeur Technique Indépendant)  
**Branche d'audit** : `feature/p07-5-functional-audit`  
**Base Git d'ancrage** : `develop` — Commit exact : `818dbd25f1dfb3d87e613e9652a5472aecb8d5a8`  

---

## 1. CONTEXTE, OBJECTIFS ET GOUVERNANCE DU PROJET

### 1.1. Contexte Académique et Territorial
Le projet concerne la conception, le développement et le déploiement d'une plateforme numérique intégrée pour la gestion, la promotion, la réservation et la valorisation du patrimoine touristique de la région naturelle de Casamance au Sénégal (englobant les régions administratives de Ziguinchor, Sédhiou et Kolda).
Réalisé dans le cadre du projet tutoré de Licence 3 en Ingénierie Informatique à l'Université Assane Seck de Ziguinchor, ce système vise à offrir une solution moderne, modulaire, résiliente et sécurisée aux acteurs touristiques locaux (conservateurs du patrimoine, gestionnaires de sites, guides touristiques professionnels agréés, collectivités territoriales et touristes nationaux et internationaux).

### 1.2. Objectif de la Mission P07.5
Faisant suite à la finalisation et à la fusion de la phase P07 (Développement des espaces professionnels, gestionnaires et administration), la présente mission **P07.5** constitue un **audit fonctionnel et technique global, indépendant et exhaustif** de la plateforme intégrée.
L'objectif est d'évaluer la conformité réelle des fonctionnalités développées par rapport aux exigences du cahier des charges, de vérifier le bon fonctionnement des flux métier de bout en bout, de cartographier avec rigueur les anomalies bloquantes, les manques et les dettes techniques, et de préparer la stratégie de remédiation préalable à la mise en production (P08).

### 1.3. Règle de Gouvernance P07.5
Conformément aux directives strictes de la mission P07.5 :
- **AUCUNE MODIFICATION DE CODE SOURCE, DE CONFIGURATION OU DE BASE DE DONNÉES** n'est réalisée durant cette phase d'audit.
- Les travaux sont conduits exclusivement sur la branche dédiée `feature/p07-5-functional-audit`.
- L'audit se fonde sur l'inspection factuelle des 9 modules applicatifs, des scripts de migration Flyway, des schémas de base de données PostgreSQL 16, du front-end Angular 22.2 et de l'exécution des suites de tests automatisés.

---

## 2. ARCHITECTURE GLOBALE ET CARTOGRAPHIE DU SYSTÈME

La plateforme repose sur une architecture microservices distribuée, conteneurisée via Docker Compose, articulée autour de technologies modernes et standards du marché :

```
                                  [ Navigateur Web / Client Mobile ]
                                                  │
                                            (HTTP / REST)
                                                  ▼
                                      ┌───────────────────────┐
                                      │  api-gateway (8080)   │ ◄── [ Eureka Discovery (8761) ]
                                      └───────────┬───────────┘
                                                  │
                ┌─────────────────────────────────┼─────────────────────────────────┐
                ▼                                 ▼                                 ▼
       ┌─────────────────┐               ┌─────────────────┐               ┌─────────────────┐
       │  ms-patrimoine  │               │   ms-circuit    │               │  ms-evenement   │
       │     (8081)      │               │     (8082)      │               │     (8083)      │
       └────────┬────────┘               └────────┬────────┘               └────────┬────────┘
                │                                 │                                 │
                ▼ (JDBC)                          ▼ (JDBC)                          ▼ (JDBC)
       ┌─────────────────┐               ┌─────────────────┐               ┌─────────────────┐
       │ db_patrimoine   │               │ db_circuit      │               │ db_evenement    │
       └─────────────────┘               └─────────────────┘               └─────────────────┘
                │                                 │                                 │
                └────────────────────────┬────────┴─────────────────────────────────┘
                                         ▼
                ┌─────────────────────────────────┬─────────────────────────────────┐
                ▼                                 ▼                                 ▼
       ┌─────────────────┐               ┌─────────────────┐               ┌─────────────────┐
       │ ms-reservation  │               │ ms-utilisateur  │               │   ms-paiement   │
       │     (8084)      │               │     (8085)      │               │     (8086)      │
       └────────┬────────┘               └────────┬────────┘               └────────┬────────┘
                │                                 │                                 │
                ▼ (JDBC)                          ▼ (JDBC)                          ▼ (JDBC)
       ┌─────────────────┐               ┌─────────────────┐               ┌─────────────────┐
       │ db_reservation  │               │ db_utilisateur  │               │ db_paiement     │
       └─────────────────┘               └─────────────────┘               └─────────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │ ms-notification │
                                         │     (8087)      │
                                         └────────┬────────┘
                                                  │
                                                  ▼ (JDBC)
                                         ┌─────────────────┐
                                         │ db_notification │
                                         └─────────────────┘
```

### 2.1. Composants Fondamentaux
1. **discovery-server** (Spring Cloud Netflix Eureka Server, port 8761) : Annuaire dynamique d'enregistrement et de localisation des instances microservices.
2. **api-gateway** (Spring Cloud Gateway MVC, port 8080) : Point d'entrée unique de la plateforme, gestionnaire du routage dynamique, des sessions d'authentification par cookies HttpOnly, de la protection CSRF et du filtrage RBAC pré-routage.
3. **ms-patrimoine** (Spring Boot 3.4.1 / Java 21, port 8081) : Référentiel des sites culturels, naturels et historiques de Casamance, zonage, coordonnées GPS, catégories et tarification.
4. **ms-circuit** (Spring Boot 3.4.1 / Java 21, port 8082) : Gestion des itinéraires touristiques, étapes géolocalisées, affectation des guides et liaison avec les sites.
5. **ms-evenement** (Spring Boot 3.4.1 / Java 21, port 8083) : Gestion de l'agenda culturel, des festivals, cérémonies traditionnelles, jauges de capacité et tarification.
6. **ms-reservation** (Spring Boot 3.4.1 / Java 21, port 8084) : Moteur transactionnel de réservation (circuits et événements), gestion de la disponibilité par créneau avec verrous pessimistes (`SELECT FOR UPDATE`), outbox d'événements, avis vérifiés et modération.
7. **ms-utilisateur** (Spring Boot 3.4.1 / Java 21, port 8085) : Gestion des comptes, rôles et permissions RBAC, profils et agréments des guides touristiques, authentification JWT.
8. **ms-paiement** (Spring Boot 3.4.1 / Java 21, port 8086) : Passerelle de paiement simulé (Wave Sénégal et Orange Money Sénégal), journalisation financière, outbox transactionnelle et synchronisation des réservations.
9. **ms-notification** (Spring Boot 3.4.1 / Java 21, port 8087) : Moteur de notification asynchrone (e-mails et SMS simulés) pour les confirmations de réservation, alertes statut guide et réinitialisations de mot de passe.
10. **PostgreSQL 16** (Port 5432) : 7 bases de données relationnelles strictement étanches et isolées (`db_patrimoine`, `db_circuit`, `db_evenement`, `db_reservation`, `db_utilisateur`, `db_paiement`, `db_notification`).
11. **frontend-angular** (Angular 22.2.0, port 80 via Nginx ou 4200 en dev) : Application web monopage (SPA) intégrant le portail public pour les touristes et les back-offices professionnels dédiés (`/pro/*` et `/admin/*`).

---

## 3. MÉTHODOLOGIE DE L'AUDIT

L'évaluation a été conduite selon une démarche rigoureuse en cinq phases :

1. **Audit statique du code source et de l'architecture** : Inspection exhaustive des entités JPA, des contrôleurs REST, des services métier, des clients OpenFeign, des migrations Flyway, des composants Angular et des guards de navigation.
2. **Audit de conformité RBAC et de sécurité** : Comparaison croisée matrice des rôles/permissions en base SQL (`role_permission`) vs filtrage passerelle (`GatewayAuthorizationFilter`) vs contexte de sécurité applicatif (`SecurityUserContextHolder`).
3. **Audit de la persistance et de l'isolation des données** : Vérification des schémas relationnels, des contraintes d'unicité, des index, de l'étanchéité des 7 bases PostgreSQL et de l'absence totale de clés étrangères physiques inter-bases.
4. **Audit dynamique et exécution des tests automatisés** :
   - Exécution de la chaîne complète d'intégration backend : `./verify-integration.sh` (9 modules Maven).
   - Exécution de la suite de tests unitaires et composants front-end : `npx ng test --no-watch` (Vitest).
   - Vérification de la compilation de production front-end : `npm run build`.
5. **Analyse des flux transactionnels et parcours de bout en bout** : Évaluation des 9 scénarios de bout en bout (`E2E-01` à `E2E-09`), de la résilience de l'Outbox Pattern et de la gestion des cas aux limites (concurrence, montants nuls, erreurs réseau).

---

## 4. RÉSULTATS DE L'AUDIT FONCTIONNEL PAR DOMAINE MÉTIER

Chaque exigence fonctionnelle a été qualifiée selon l'un des cinq statuts normés :
`COMPLETE` (Totalement opérationnel), `PARTIAL` (Partiellement implémenté), `DEFECTIVE` (Défectueux / Erreur bloquante), `ABSENT` (Non implémenté), `NOT VERIFIED` (Non vérifié).

### 4.1. Domaine Patrimoine Culturel et Naturel (PAT-01 à PAT-08)
- **PAT-01 (Consultation du patrimoine - COMPLETE)** : La consultation des fiches de sites patrimoniaux est parfaitement opérationnelle (`GET /api/patrimoines` et `GET /api/patrimoines/{id}`). La page publique affiche l'historique, la description, les conditions d'accès et les coordonnées géographiques.
- **PAT-02 (Typologie et catégorisation - COMPLETE)** : La classification (Historique, Naturel, Immatériel, Culturel, etc.) est gérée via l'entité `CategoriePatrimoine` et l'endpoint `GET /api/categories`.
- **PAT-03 (Zonage géographique Casamance - COMPLETE)** : La segmentation en Basse-Casamance, Moyenne-Casamance et Haute-Casamance (avec filtres par département : Ziguinchor, Oussouye, Bignona, Sédhiou, Kolda, etc.) est effective et réactive sur l'interface utilisateur.
- **PAT-04 (Géolocalisation des sites - COMPLETE)** : Les sites disposent de coordonnées `latitude` et `longitude` valides en base, projetées sur une carte interactive Leaflet avec marqueurs cliquables et tuiles OpenStreetMap.
- **PAT-05 (Gestion des médias - PARTIAL / ANOM-P2-01)** : Seule l'URL principale d'illustration (`imageUrl`) est exposée et modifiable. Le champ `galerieMedias` présent dans le modèle JPA n'est pas exposé dans le DTO REST ni exploité dans l'interface Angular. Aucun support vidéo ni composant d'upload direct de fichiers n'est implémenté.
- **PAT-06 (Horaires d'ouverture - PARTIAL / ANOM-P2-02)** : Le champ `horairesOuverture` est stocké sous forme de texte libre (`VARCHAR(255)`). Il n'est pas structuré par jour de la semaine et n'est pas connecté au moteur de réservation pour interdire les créneaux fermés.
- **PAT-07 (Tarification différenciée - COMPLETE)** : Les grilles tarifaires (adulte, enfant, résident sénégalais, étranger) sont persistées et correctement affichées aux visiteurs.
- **PAT-08 (Validation et publication - COMPLETE)** : Le workflow de statut de publication (`BROUILLON`, `PUBLIE`, `ARCHIVE`) est sécurisé par la permission `PATRIMOINE:VALIDER` et utilisable dans les espaces professionnels.

### 4.2. Espace Conservateur du Patrimoine (CONS-01 à CONS-06)
- **CONS-01 (Validation des guides - DEFECTIVE / ANOM-P0-01 - P0)** : **Anomalie bloquante majeure.** Le conservateur est désigné comme l'autorité de validation des guides touristiques. Or, le script de migration `V7__p05_guides_and_permissions.sql` et le filtre `GatewayAuthorizationFilter` ne lui octroient pas la permission `GUIDE:VALIDER` (réservée à `GESTIONNAIRE_SITE` et `ADMINISTRATEUR`). Tout appel du conservateur vers `POST /api/guides/{id}/valider`, `rejeter`, `reactiver` ou `GET /api/guides/admin/tous` échoue avec une erreur **HTTP 403 Forbidden**. De plus, les profils non validés lui sont masqués par un **HTTP 404** dans `GuideService.formatForCaller`.
- **CONS-02 (Gestion des fiches patrimoniales - COMPLETE)** : Le conservateur dispose d'un CRUD complet et fonctionnel pour enrichir les fiches de sites (`/pro/patrimoines`).
- **CONS-03 (Modération des avis - COMPLETE)** : L'espace `/pro/moderation` permet de consulter les avis signalés, de les approuver ou de les rejeter avec enregistrement obligatoire d'un motif de modération.
- **CONS-04 (Statistiques de fréquentation - COMPLETE)** : L'espace `/pro/statistiques` restitue fidèlement les KPIs de fréquentation, le nombre de visites, les notes moyennes et la répartition des avis.
- **CONS-05 (Définition des périodes et horaires - PARTIAL / ANOM-P2-02)** : Saisie textuelle non structurée, sans prise en compte des saisons touristiques ou de l'hivernage.
- **CONS-06 (Planification de visites avec conflit - ABSENT / ANOM-P1-01 - P1)** : Absence complète d'un moteur de détection de conflit d'agenda pour les guides lors de la planification d'un départ de circuit.

### 4.3. Espace Guide Touristique (GUIDE-01 à GUIDE-06)
- **GUIDE-01 (Candidature guide - COMPLETE)** : Le formulaire public d'inscription et de candidature guide (`/guides/candidature`) collecte le numéro de carte professionnelle, les zones d'intervention, les langues parlées et initialise le statut à `SOUMIS`.
- **GUIDE-02 (Gestion du profil public - COMPLETE)** : L'espace `/pro/guide/profil` permet au guide agréé de mettre à jour sa biographie, ses langues, ses zones et de basculer sa visibilité publique.
- **GUIDE-03 (Agenda personnel du guide - ABSENT / ANOM-P1-02 - P1)** : Aucun composant d'agenda ou de calendrier de créneaux n'est disponible pour le guide. L'exigence de visualisation chronologique des visites à effectuer n'est pas couverte.
- **GUIDE-04 (Manifeste des passagers - COMPLETE)** : L'écran `/pro/manifestes` permet au guide de consulter la liste exhaustive des participants inscrits à ses circuits confirmés (noms, téléphones, nombre de places).
- **GUIDE-05 (Droit de réponse aux avis - ABSENT / ANOM-P1-03 - P1)** : Le guide ne dispose d'aucun moyen technique de répondre publiquement à une évaluation déposée par un touriste.
- **GUIDE-06 (Suivi des prestations et KPIs - COMPLETE)** : Consultation des statistiques de guidage (nombre de réservations, total de participants guidés, note moyenne reçue).

### 4.4. Espace Touriste et Expérience Utilisateur (TOUR-01 à TOUR-08)
- **TOUR-01 (Découverte du catalogue public - COMPLETE)** : Navigation fluide entre sites patrimoniaux, circuits guidés et agenda culturel sur le front-end Angular.
- **TOUR-02 (Recherche multicritères - COMPLETE)** : Filtres réactifs combinant localisation géographique, département, budget maximal et dates.
- **TOUR-03 (Recherche géographique GPS à proximité - ABSENT / ANOM-P1-04 - P1)** : L'application n'exploite pas l'API de géolocalisation du navigateur (`navigator.geolocation`) et le backend `ms-patrimoine` ne propose aucun calcul de distance orthodromique (Haversine) par rayon kilométrique.
- **TOUR-04 (Réservation d'offres payantes - COMPLETE)** : Flux complet opérationnel : vérification des disponibilités avec verrouillage pessimiste, réservation au statut `EN_ATTENTE_PAIEMENT`, paiement simulé Wave ou Orange Money, propagation outbox et confirmation instantanée.
- **TOUR-05 (Réservation d'offres gratuites - DEFECTIVE / ANOM-P0-02 - P0)** : **Deadlock critique.** Lorsqu'un touriste tente de réserver un événement ou une visite à tarif gratuit (0 XOF), la réservation est positionnée en `EN_ATTENTE_PAIEMENT`. Le microservice `ms-paiement` rejette formellement tout montant inférieur ou égal à 0 avec une erreur **HTTP 400 Bad Request**. Comme le modèle de transition interdit le passage direct de `BROUILLON` à `CONFIRMEE`, la réservation reste indéfiniment bloquée jusqu'à son expiration (30 minutes).
- **TOUR-06 (Billets électroniques QR Code - ABSENT / ANOM-P1-05 - P1)** : Absence totale de génération de billets sécurisés avec token QR Code et d'interface de contrôle d'accès / scan à l'entrée des sites.
- **TOUR-07 (Dépôt d'avis vérifié - COMPLETE)** : Un touriste ne peut déposer un avis qu'après avoir réalisé une prestation confirmée. Le système associe la réservation et empêche les faux avis.
- **TOUR-08 (Espace personnel touriste - COMPLETE)** : Consultation de l'historique des réservations, gestion des statuts et favoris locaux dans `/profil`.

### 4.5. Espaces Gestionnaire de Site et Administrateur (GEST-01, ADM-01 à ADM-04)
- **GEST-01 (Gestion des sites du périmètre - COMPLETE)** : Le gestionnaire de site peut administrer les fiches de sites et les circuits relevant de sa zone géographique.
- **ADM-01 (Tableau de bord consolidé - COMPLETE)** : L'espace `/admin` offre une vue synthétique des KPIs transversaux (chiffre d'affaires simulé, volume de réservations, guides en attente, utilisateurs inscrits).
- **ADM-02 (Gestion centralisée des utilisateurs - COMPLETE)** : Table d'administration complète avec pagination, recherche, activation/désactivation de comptes, modification de rôles et réinitialisation sécurisée de mot de passe.
- **ADM-03 (Supervision des transactions et Outbox - COMPLETE)** : Visualisation du journal des paiements Wave/OM et des événements d'outbox transactionnels.
- **ADM-04 (Supervision des notifications - COMPLETE)** : Journal d'audit des e-mails et SMS simulés envoyés aux utilisateurs.

---

## 5. ANALYSE DES PARCOURS DE BOUT EN BOUT (E2E-01 À E2E-09)

| Scénario | Intitulé du parcours | Statut | Observations et Points de Blocage |
| :--- | :--- | :--- | :--- |
| **E2E-01** | Découverte d'un site -> Réservation circuit -> Paiement Wave -> Confirmation | **COMPLETE** | Fonctionne parfaitement. Verrou pessimiste, propagation Outbox, notification émise. |
| **E2E-02** | Réservation événement gratuit -> Confirmation directe -> Réception billet | **DEFECTIVE** | **Bloqué à 100%.** Deadlock réservation gratuite (ANOM-P0-02) et absence de billet QR (ANOM-P1-05). |
| **E2E-03** | Candidature guide -> Instruction/Validation Conservateur -> Profil public | **DEFECTIVE** | **Bloqué à l'étape conservateur.** Rejet 403 Forbidden sur `/api/guides/{id}/valider` (ANOM-P0-01). |
| **E2E-04** | Prestation effectuée -> Avis vérifié -> Modération -> Publication | **COMPLETE** | Contrôle d'antériorité de réservation, modération conservateur, affichage public. |
| **E2E-05** | Annulation réservation -> Libération places -> Remboursement automatique | **PARTIAL** | La réservation est annulée et les places sont libérées, mais aucun remboursement automatique n'est émis vers ms-paiement (ANOM-P2-03). |
| **E2E-06** | Présentation sur site -> Scan QR Code billet -> Validation atomique | **ABSENT** | Composants de billetterie électronique et de contrôle d'accès non implémentés (ANOM-P1-05). |
| **E2E-07** | Concurrence sur dernière place disponible -> Prévention de surréservation | **COMPLETE** | Le verrouillage pessimiste SQL (`SELECT FOR UPDATE`) garantit l'intégrité de la capacité. |
| **E2E-08** | Échec de paiement simulé -> Relâchement de la réservation et des places | **COMPLETE** | Détection d'échec, transition vers statut `ECHEC`, notification et décrémentation des places. |
| **E2E-09** | Touriste en mobilité -> Recherche à proximité GPS -> Fiche du site le plus proche | **ABSENT** | Ni l'API navigateur ni la formule de calcul de distance ne sont implémentées (ANOM-P1-04). |

---

## 6. AUDIT TECHNIQUE APPROFONDI DES MICROSERVICES BACKEND

### 6.1. Respect des Principes Microservices et Frontières de Responsabilité
L'architecture découpe les responsabilités conformément aux règles de l'art du Domain-Driven Design (DDD) :
- Les frontières métier sont nettes : `ms-patrimoine` n'a aucune dépendance sur les réservations, `ms-paiement` ne gère aucun concept de circuit ou de site.
- La communication interservices est assurée via des clients OpenFeign déclaratifs intégrant des mécanismes de repli et de gestion des délais d'attente (timeouts).
- **Point de vigilance** : L'accès direct aux endpoints `/internal/**` est rigoureusement bloqué au niveau de la passerelle `api-gateway` (`GatewayAuthorizationFilter`), garantissant l'étanchéité du réseau interne.

### 6.2. Évaluation de l'Outbox Pattern et de la Cohérence Transactionnelle
Pour assurer la cohérence à terme (eventual consistency) sans transactions distribuées lourdes (2PC), `ms-paiement` et `ms-reservation` utilisent une table d'Outbox transactionnelle :
- Les événements (`PAIEMENT_ACCEPTE`, `PAIEMENT_REFUSE`, etc.) sont persistés dans la même transaction SQL que l'entité métier.
- Un ordonnanceur planifié (cron) dépile les événements non traités et les transmet via REST vers le service récepteur.
- **Faiblesse identifiée (ANOM-P2-06)** : Absence d'un mécanisme de Dead-Letter Queue et d'auto-compensation (remboursement) en cas d'échec définitif répété de synchronisation vers `ms-reservation`.

---

## 7. AUDIT TECHNIQUE DU FRONTEND ANGULAR 22

### 7.1. Structure, Modularité et Architecture Réactive
L'application front-end est conçue avec **Angular 22.2.0** et tire pleinement parti des fonctionnalités modernes du framework :
- **Composants autonomes (Standalone Components)** généralisés, sans modules NgModule hérités.
- Utilisation des **Signals** (`signal()`, `computed()`) pour la réactivité fine de l'état local et des formulaires.
- Séparation claire entre les composants publics (`/features/home`, `/features/patrimoines`, `/features/circuits`, `/features/evenements`) et les espaces back-office professionnels (`/features/pro`, `/features/admin`).
- Formatage monétaire centralisé via un pipe personnalisé `fcfaPrice` garantissant l'affichage rigoureux en Francs CFA (XOF).

### 7.2. Sécurité de la Navigation et Gestion des Sessions
- **Guards de navigation** : `authGuard` et `roleGuard` vérifient l'authentification et les permissions avant d'autoriser l'accès aux routes protégées.
- **Intercepteurs HTTP** :
  - `AuthInterceptor` injecte les en-têtes et gère le rafraîchissement transparent du token d'accès en cas de retour HTTP 401.
  - `CsrfInterceptor` capture le token CSRF déposé dans les cookies et l'injecte dans l'en-tête `X-XSRF-TOKEN` pour toute requête de mutation.
  - **Défaut de synchronisation (ANOM-P2-04)** : Après 15 minutes d'inactivité, le token CSRF expire alors que le refresh token est toujours valide, provoquant un rejet HTTP 403 sur la prochaine action de l'utilisateur.

---

## 8. AUDIT DE LA PERSISTANCE ET DES BASES DE DONNÉES POSTGRESQL 16

### 8.1. Isolation Stricte des 7 Bases de Données
Le principe fondamental de microservices "Database per Service" est rigoureusement respecté :
- 7 bases de données distinctes tournent sur l'instance PostgreSQL 16 (`db_patrimoine`, `db_circuit`, `db_evenement`, `db_reservation`, `db_utilisateur`, `db_paiement`, `db_notification`).
- Chaque microservice possède ses propres identifiants de connexion JDBC.
- Aucune requête cross-database ni vue inter-schémas n'existe dans le système.
- Les liaisons entre entités de microservices distincts s'effectuent exclusivement par identifiants logiques (`circuitId`, `evenementId`, `utilisateurId`), sans aucune contrainte de clé étrangère physique inter-services.

### 8.2. Qualité et Reproductibilité des Migrations Flyway
- Tous les schémas sont gérés par Flyway avec un historique de versions clair (`V1` à `V8`).
- Les contraintes d'unicité, les index sur les colonnes de recherche (`email`, `statut`, `date_prestation`, `reference`) et les contraintes d'intégrité référentielle internes à chaque base sont en place et reproductibles sans erreur.

---

## 9. AUDIT DE SÉCURITÉ APPLICATIVE ET MATRICE RBAC

### 9.1. Sécurité de l'Authentification et Gestion des Tokens
- L'authentification repose sur un système à double jeton JWT : un jeton d'accès court (15 minutes) et un jeton de rafraîchissement long (7 jours).
- Les jetons sont transportés dans des **cookies HttpOnly**, `SameSite=Strict` et `Secure`, protégeant l'application contre les attaques par vol de jeton (XSS).
- La rotation du jeton de rafraîchissement invalide l'ancien jeton à chaque utilisation pour prévenir le rejeu.

### 9.2. Analyse de la Matrice des Habilitations RBAC (5 Rôles x 48 Permissions)
La plateforme gère 5 rôles métier : `TOURISTE`, `GUIDE`, `CONSERVATEUR`, `GESTIONNAIRE_SITE`, `ADMINISTRATEUR`.

| Domaine de Permissions | TOURISTE | GUIDE | CONSERVATEUR | GESTIONNAIRE_SITE | ADMINISTRATEUR |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **PATRIMOINE** (LIRE / ECRIRE / VALIDER) | LIRE | LIRE | TOUS | TOUS | TOUS |
| **CIRCUIT** (LIRE / ECRIRE / VALIDER) | LIRE | LIRE | TOUS | TOUS | TOUS |
| **EVENEMENT** (LIRE / ECRIRE / VALIDER) | LIRE | LIRE | TOUS | TOUS | TOUS |
| **RESERVATION** (CREER / LIRE_PROPRE / ANNULER) | TOUS | - | - | - | GERER |
| **RESERVATION_GUIDE** (LIRE_GUIDE) | - | OUI | - | OUI | OUI |
| **GUIDE** (GERER_PROPRE_PROFIL) | - | OUI | - | - | OUI |
| **GUIDE** (VALIDER / SUSPENDRE) | - | - | **NON (ANOM-P0-01)** | OUI | OUI |
| **AVIS** (CREER / SIGNALER / MODERER) | CREER | - | SIGNALER / MODERER | SIGNALER / MODERER | TOUS |
| **PAIEMENT** (SIMULER / ADMIN) | SIMULER | - | - | - | ADMIN |
| **UTILISATEUR** (GERER) | - | - | - | - | OUI |

*Constat majeur* : L'absence des permissions `GUIDE:VALIDER` et `GUIDE:SUSPENDRE` pour le rôle `CONSERVATEUR` est la cause directe du blocage `ANOM-P0-01`.

---

## 10. SYNTHÈSE DES TESTS AUTOMATISÉS ET DE L'ASSURANCE QUALITÉ

L'ensemble de la batterie de tests automatisés a été exécutée avec succès sur le commit d'ancrage `818dbd2` :

### 10.1. Tests Backend (Java 21 / Spring Boot / JUnit 5 / Testcontainers)
Résultats consolidés de l'exécution de `./verify-integration.sh` :
- **discovery-server** : 1 test réussi / 0 échec.
- **ms-patrimoine** : 30 tests réussis / 0 échec (1 test PostgreSQL réel ignoré sous profil CI H2).
- **ms-circuit** : 26 tests réussis / 0 échec (2 tests ignorés).
- **ms-evenement** : 19 tests réussis / 0 échec (1 test ignoré).
- **ms-reservation** : 28 tests réussis / 0 échec (1 test ignoré).
- **ms-utilisateur** : 35 tests réussis / 0 échec (2 tests ignorés).
- **ms-notification** : 14 tests réussis / 0 échec (1 test ignoré).
- **ms-paiement** : 16 tests réussis / 0 échec (1 test ignoré).
- **api-gateway** : 26 tests réussis / 0 échec.
- **Total Backend** : **195 tests passés avec succès**, 0 régression technique.

### 10.2. Tests Frontend (Angular 22 / Vitest)
Résultats consolidés de l'exécution de `npx ng test --no-watch` :
- **23 suites de tests** exécutées.
- **75 tests unitaires et de composants validés**, 0 échec.
- Build de production (`npm run build`) : **Succès** sans erreur de typage TypeScript ni dépassement de budget bundle critique.

---

## 11. BILAN DES ANOMALIES, RISQUES ET DETTES TECHNIQUES

### 11.1. Synthèse par Sévérité
- **Bloquantes (P0)** : **2 anomalies**
  - `ANOM-P0-01` : Conservateur bloqué 403 Forbidden sur la validation des guides.
  - `ANOM-P0-02` : Deadlock fonctionnel sur les réservations gratuites (montant 0 XOF).
- **Majeures (P1)** : **5 anomalies**
  - Modules absents : Billetterie QR / Contrôle d'accès (`ANOM-P1-05`), Recherche GPS à proximité (`ANOM-P1-04`), Agenda guide (`ANOM-P1-02`), Planification avec conflit guide (`ANOM-P1-01`), Droit de réponse aux avis (`ANOM-P1-03`).
- **Moyennes (P2)** : **6 anomalies**
  - Médias partiels, horaires non structurés, remboursement outbox, désynchronisation CSRF, unicité e-mail BOLA, résilience Dead-Letter Outbox.
- **Mineures (P3)** : **2 anomalies**
  - Normalisation URL Gateway, affichage guide dans table circuits.

### 11.2. Évaluation des Risques Projet
1. **Risque Métier** : Impossibilité pour le conservateur de valider les guides et impossibilité pour les usagers de réserver des événements gratuits. Ce sont deux fonctionnalités fondamentales pour une soutenance de projet universitaire.
2. **Risque Sécurité** : Déconnexion CSRF intempestive après 15 minutes et risque d'erreur 500 sur mise à jour d'e-mail dupliqué.
3. **Risque Opérationnel** : Absence de billetterie électronique empêchant le contrôle physique des flux de touristes à l'entrée des monuments et réserves naturelles.

---

## 12. CONCLUSION GÉNÉRALE ET AVIS D'AUDIT

La plateforme de valorisation du patrimoine touristique de la Casamance présente un **niveau de conception architecturale et technique remarquable** pour un projet universitaire de Licence 3 :
- Le découpage en microservices est exemplaire.
- L'isolation des 7 bases PostgreSQL est scrupuleusement respectée.
- La sécurité d'authentification par double JWT HttpOnly et le filtrage Gateway sont robustes.
- Le front-end Angular 22 avec Signals est moderne et performant.

Cependant, en raison des **2 anomalies bloquantes critiques (P0)** et des **5 fonctionnalités majeures absentes (P1)**, la plateforme **ne peut pas être validée en l'état pour une mise en production ou une soutenance finale (Phase P08)**.

### Avis de l'Auditeur
**AVIS : CONFORME AVEC RÉSERVES MAJEURES — REMÉDIATION OBLIGATOIRE EN PHASE P07.6**

Le passage à la phase P08 (déploiement final et soutenance) doit impérativement être conditionné à l'exécution d'un plan de corrections ciblé (P07.6) traitant prioritairement les anomalies P0 et les fonctionnalités clés de billetterie et de géolocalisation.
