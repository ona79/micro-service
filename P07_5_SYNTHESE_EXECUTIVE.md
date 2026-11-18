# SYNTHÈSE EXÉCUTIVE — AUDIT GLOBAL P07.5
**Plateforme de Valorisation du Patrimoine Touristique de la Casamance**  
*Université Assane Seck de Ziguinchor — Licence 3 Ingénierie Informatique*  
**Date** : 18 Novembre 2026  
**Auditeur** : Antigravity (Architecte Logiciel Senior)  
**Branche d'audit** : `feature/p07-5-functional-audit` (base `develop` commit `818dbd25f1dfb3d87e613e9652a5472aecb8d5a8`)

---

## 1. VISION GLOBALE DU STATUT DE LA PLATEFORME

À l'issue de la phase P07, la plateforme touristique de la Casamance démontre un **niveau d'ingénierie et de maturité technique particulièrement remarquable** pour un projet universitaire de fin de cycle de Licence :
- L'architecture distribuée à **sept microservices métier** et passerelle réactive respecte rigoureusement les bonnes pratiques du Domain-Driven Design (DDD).
- Le principe fondamental **"Une base de données par microservice"** est scrupuleusement respecté sur les 7 bases PostgreSQL 16 sans aucune violation d'isolation.
- La sécurité d'authentification par **double cookie HttpOnly (Access + Refresh JWT)** et la protection CSRF offrent un niveau de défense en profondeur exemplaire.
- Le front-end **Angular 22.2** utilisant l'architecture réactive par Signals et composants autonomes est robuste, fluide et ergonomique.
- Les suites de tests automatisés sont au vert : **195 tests backend JUnit/Testcontainers** et **75 tests frontend Vitest** passent sans le moindre échec.

Néanmoins, l'audit fonctionnel approfondi a mis en lumière **2 anomalies bloquantes critiques (P0)** et **5 fonctionnalités majeures non implémentées (P1)** qui empêchent de valider la plateforme en l'état pour une exploitation réelle ou une soutenance académique complète.

---

## 2. TABLEAU DE BORD ET CHIFFRES CLÉS DE L'AUDIT

| Métrique Clé | Valeur observée | Commentaire d'audit |
| :--- | :---: | :--- |
| **Périmètre des fonctionnalités auditées** | **50 exigences** | Couverture intégrale : PAT, CONS, GUIDE, TOUR, GEST, ADM, E2E, SEC, DB, ARCH. |
| **Fonctionnalités Totalement Opérationnelles (`COMPLETE`)** | **33 (66%)** | Socle robuste : catalogue, recherche, paiement simulé, avis, outbox, admin, auth. |
| **Fonctionnalités Partiellement Implémentées (`PARTIAL`)** | **6 (12%)** | Médias limités, horaires non structurés, remboursement outbox, BOLA e-mail. |
| **Fonctionnalités Défectueuses / Bloquées (`DEFECTIVE`)** | **4 (8%)** | RBAC Conservateur (P0), Deadlock réservations gratuites (P0), E2E-02, E2E-03. |
| **Fonctionnalités Totalement Absentes (`ABSENT`)** | **7 (14%)** | Billetterie QR (P1), Scan contrôle d'accès, Recherche GPS (P1), Agenda guide (P1). |
| **Taux de Conformité Globale Actuel** | **66 %** | Insuffisant pour la validation finale P08 sans remédiation. |
| **Taux de Succès des Tests Automatisés** | **100 %** | 195/195 tests Java + 75/75 tests Vitest au vert. |

---

## 3. LES DEUX POINTS DE BLOCAGE CRITIQUES (CRITICITÉ P0)

Toute démonstration ou exploitation est actuellement compromise par deux défauts majeurs identifiés dans le code :

1. **Blocage de l'Espace Conservateur (ANOM-P0-01)** :
   - *Problème* : Le rôle `CONSERVATEUR` est l'autorité chargée de valider les guides touristiques en Casamance. Or, le script de migration `V7__p05_guides_and_permissions.sql` et le filtre `GatewayAuthorizationFilter` ne lui octroient pas la permission `GUIDE:VALIDER`.
   - *Conséquence* : Rejet systématique par une erreur **HTTP 403 Forbidden** lorsque le conservateur tente d'instruire ou de valider une candidature guide depuis son back-office `/pro/guides`.
2. **Deadlock sur les Réservations d'Offres Gratuites (ANOM-P0-02)** :
   - *Problème* : Toute réservation d'événement ou de visite gratuite (tarif = 0 FCFA) est basculée au statut `EN_ATTENTE_PAIEMENT`. Or, le service `ms-paiement` refuse catégoriquement tout montant inférieur ou égal à 0 (HTTP 400 Bad Request) et la machine à états de `ms-reservation` interdit le passage direct de `BROUILLON` à `CONFIRMEE`.
   - *Conséquence* : Tout touriste tentant de réserver un événement gratuit reste bloqué indéfiniment jusqu'à l'expiration de sa réservation au bout de 30 minutes.

---

## 4. LES MANQUES FONCTIONNELS MAJEURS (CRITICITÉ P1)

Cinq modules essentiels prévus au cahier des charges ne sont pas encore matérialisés dans le code :
1. **Billetterie Électronique et Contrôle d'Accès QR Code (`ANOM-P1-05`)** : Aucune entité de billet, aucun token cryptographique, aucun endpoint de validation d'entrée (`/api/visites/valider`) et aucun scanner.
2. **Recherche Géographique à Proximité par GPS Réel (`ANOM-P1-04`)** : Pas d'interrogation de l'API de géolocalisation navigateur ni de calcul de distance orthodromique (formule de Haversine) dans `ms-patrimoine`.
3. **Agenda Personnel du Guide (`ANOM-P1-02`)** : Pas de vue calendrier des visites planifiées pour le guide connecté.
4. **Droit de Réponse du Guide aux Avis Touristiques (`ANOM-P1-03`)** : Impossible pour un guide d'apporter une réponse publique à une évaluation.
5. **Détection de Conflit Horaire des Guides (`ANOM-P1-01`)** : Pas de contrôle de chevauchement de créneaux lors de la planification de circuits.

---

## 5. RECOMMANDATION DÉCISIONNELLE DE L'AUDITEUR

### Décision Recommandée : AJOURNEMENT DU PASSAGE EN P08 & OUVERTURE DU SPRINT P07.6
Il est formellement déconseillé d'engager la phase P08 (mise en production et préparation de soutenance) sur l'état actuel de la branche `develop`.

### Feuille de Route Opérationnelle Recommandée (Sprint P07.6) :
1. **Semaine 1 (Lot 1 - Priorité Absolue)** : Déploiement des correctifs P0 (déblocage du conservateur et des réservations gratuites). *Durée : 1 jour*.
2. **Semaine 1 (Lot 2 - Cœur Métier)** : Implémentation de la billetterie électronique avec génération de QR Code et API de contrôle d'accès. *Durée : 2 jours*.
3. **Semaine 2 (Lot 3 - Expérience Utilisateur)** : Implémentation du module GPS à proximité (Haversine) et de l'agenda personnel du guide. *Durée : 2 jours*.
4. **Semaine 2 (Lot 4 - Durcissement & Clôture)** : Synchronisation du cycle de vie CSRF et fiabilisation de l'Outbox Pattern. *Durée : 1 jour*.

**Objectif cible post-P07.6** : Atteindre un **taux de conformité de 96%**, 9 parcours de bout en bout (`E2E-01` à `E2E-09`) 100% opérationnels, et une plateforme prête pour une démonstration sans faille devant le jury universitaire de l'UASZ.
