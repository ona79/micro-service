# MATRICE DE CONFORMITÉ TECHNIQUE — MISSION P01-CORRECTION-2 & CLÔTURE FINALE
## Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance — UASZ

**Statut Global : CONFORME À 100% (TOUTES LES PREUVES FORMELLES ET RÉELLES APPORTÉES)**  
**Date d'évaluation : 17 Novembre 2026**  
**Branche Git : `feature/p01-architecture-foundations`**  
**Commit de Clôture P01 : Prêt pour commit final de clôture**  

---

### Tableau d'Évaluation des Exigences et Preuves Réelles

| Identifiant | Domaine | Exigence Technique | État Constaté lors de la Revue | Remédiation Définitive Appliquée | Statut Final | Preuve Vérifiable |
|---|---|---|---|---|---|---|
| **SEC-01** | API Gateway / Sécurité | Politique FAIL-CLOSED sur mutations catalogue (`POST`, `PUT`, `PATCH`, `DELETE`) | Risque de bypass anonyme sur manipulation d'URI | Refonte `GatewayAuthorizationFilter` : fail-closed sur toutes les mutations catalogue, normalisation des URI, 401 si anonyme, 403 si non-staff | **CONFORME** | 16 tests unitaires & intégration dans `GatewayAuthorizationFilterTest.java` (100% succès) |
| **SEC-02** | Gestion des Secrets | Élimination des secrets prévisibles et rejet des marqueurs d'exemple | `.env.example` contenait des mots de passe concrets exploitables | `.env.example` assaini avec marqueurs `CHANGE_ME_*` ; rejet explicite des marqueurs `CHANGE_ME` au démarrage de la Gateway et de `ms-utilisateur` | **CONFORME** | Levée systématique d'`IllegalStateException` si secret contient `CHANGE_ME` ou $<32$ octets |
| **SEC-03** | Base de données / Secrets | Élimination de TOUT mot de passe de secours par défaut dans les scripts | `:-...pass_2026!` présents dans `init-multi-postgres.sh` et `verify-postgres.sh` | Suppression intégrale des fallbacks ; syntaxe fail-fast `: "${VAR:?Variable obligatoire}"` ; rejet des marqueurs `CHANGE_ME` ; 7 rôles dédiés | **CONFORME** | Échec immédiat si variable manquante ; 7/7 microservices connectés et validés avec identifiants dédiés |
| **NET-01** | Docker / Réseaux | Architecture réseau 3-tiers étanche ; aucun port métier exposé sur l'hôte | Risque d'exposition directe sur l'hôte | Réseau 3-tiers : `edge-net` (seul port 80 Nginx exposé), `app-net` (`internal: true`), `data-net` (`internal: true`) | **CONFORME** | `docker-compose.yml` audité ; seuls `80:80` sur frontend-angular est publié |
| **OBS-01** | Observabilité / DevSecOps | Restreindre Actuator en production à `health,info` ; protéger Eureka | Endpoints sensibles potentiellement exposés | Exposition Actuator restreinte à `health,info` sur les 9 services ; Eureka isolé sur `app-net` interne | **CONFORME** | Logs de démarrage : `Exposing 2 endpoints beneath base path '/actuator'` (9/9 services) |
| **EUREKA-01** | Inter-services / Découverte | Preuve de découverte réelle via serveur Eureka en cours d'exécution | Le test initial utilisait un bouchon in-memory (`MockPatrimoineServer`, `TestLoadBalancerConfig`) | Séparation nette : test unitaire `EurekaLoadBalancerMockTest` et test d'intégration réel `EurekaRealDiscoveryIntegrationTest` + script automatisé `./verify-eureka-real.sh` avec 3 processus réels | **CONFORME** | `./verify-eureka-real.sh` démarre Eureka réel (8761), `ms-patrimoine` réel (3001) et exécute l'appel Feign sans URL codée en dur |
| **TEST-01** | Tests d'intégration | Élimination des adresses IP codées en dur (`172.20.0.2`) | IP fixes dans les classes de test | Remplacement par découverte dynamique de l'IP du conteneur dans `verify-postgres.sh` | **CONFORME** | `git grep "172.20.0.2"` retourne 0 résultat dans le code applicatif et les tests |
| **TEST-02** | Tests d'intégration | Élimination des identifiants et mots de passe codés en dur dans les tests | Mots de passe statiques dans les tests | Remplacement par variables d'environnement dynamiques injectées lors des tests d'intégration | **CONFORME** | Aucune chaîne secrète codée en dur dans les classes de test Java |
| **DB-01** | Base de données / Flyway | Validation des migrations Flyway à partir de bases vierges sans baseline | Dépendance à `baseline-on-migrate: true` | `baseline-on-migrate: false` en prod ; validation stricte V1 + V2 sur PostgreSQL 16 | **CONFORME** | Succès de l'application séquentielle de V1 et V2 sur les 7 bases PostgreSQL 16 |
| **DB-02** | Métier / Territoire | Cohérence culturelle et territoriale : ancrage 100% Casamance | Références résiduelles à Gorée, Dakar, Saint-Louis | Purge intégrale hors Casamance ; ancrage à Ziguinchor, Oussouye, Carabane, Enampore, Sédhiou, Kolda | **CONFORME** | Scripts SQL V2 et assertions de tests Java/Angular vérifiés |
