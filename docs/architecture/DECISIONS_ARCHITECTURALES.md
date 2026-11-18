# REGISTRE DES DÉCISIONS ARCHITECTURALES (ADR)
**Projet : Gestion du Patrimoine Touristique de la Casamance**  
**Cycle de reprise technique : Phase P01**

---

## ADR-01 : Suppression du frontend React au profit d'Angular 22 comme frontend unique

### Statut
Accepté et Exécuté (Validation humaine P00 - Décision 1).

### Contexte
Le dépôt comportait deux applications clientes concurrentes : un frontend React historique (`frontend/`) développé avec Vite/React 19 et un nouveau frontend Angular 22 (`frontend-angular/`) doté de composants Standalone, Signals et du design system officiel. Le maintien de deux frontends dispersait l'effort d'intégration, créait des duplications de code et complexifiait le packaging Docker.

### Décision
- Suppression définitive du dossier `frontend/` (React) du dépôt actif tout en préservant l'historique Git.
- Angular 22 est acté comme l'unique frontend de référence du projet.
- Nginx est configuré pour servir l'application Angular pré-compilée et agir en proxy transparent vers l'API Gateway sur le port `8090`.

### Conséquences
- **Positives** : Élimination de la redondance, stack frontend unifiée sur Angular 22, simplification des scripts de build et de la chaîne CI/CD.
- **Négatives** : Aucune ; toutes les fonctionnalités nécessaires sont implémentées et couvertes par 31 tests unitaires dans `frontend-angular`.

---

## ADR-02 : Abandon du Config Server au profit des profils Spring Boot et variables d'environnement

### Statut
Accepté et Exécuté (Validation humaine P00 - Décision 2).

### Contexte
Le module `config-server` (port 8888) imposait un ordre de démarrage strict et complexe sous Docker Compose, ajoutait une dépendance fragile au boot de chaque microservice et stockait des configurations en dur dans un sous-dossier non sécurisé. Pour une architecture de 7 microservices métier, un serveur de configuration distribué représentait une sur-ingénierie source de pannes.

### Décision
- Suppression complète du module `config-server` et retrait de la dépendance `spring-cloud-starter-config` de tous les `pom.xml`.
- Adoption d'une stratégie multi-profils native Spring Boot :
  - `dev` : base H2 en mémoire avec démarrage sans dépendances externes.
  - `test` : base H2 isolée pour l'exécution rapide des tests de non-régression (`mvn test`).
  - `prod` : base PostgreSQL avec validation Hibernate stricte et exécution des migrations Flyway.
- Centralisation des surcharges via variables d'environnement standardisées (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `EUREKA_URI`, `PORT`, etc.).

### Conséquences
- **Positives** : Démarrage plus rapide des conteneurs, élimination du Single Point of Failure (SPOF) que constituait le Config Server, portabilité totale selon le standard Twelve-Factor App (Config in Environment).
- **Négatives** : Nécessité de documenter exhaustivement l'ensemble des variables d'environnement (cf. `ENVIRONMENT_VARIABLES.md`).

---

## ADR-03 : Structuration des 5 Rôles Métier Cibles

### Statut
Accepté pour cadrage P01 — Implémentation de sécurité prévue en P02 (Validation humaine P00 - Décision 3).

### Contexte
Le modèle initial mélangeait les responsabilités ou manquait de granularité (par exemple confusion possible entre Guide touristique et Conservateur du patrimoine). L'audit P00 a conclu à la nécessité de distinguer 5 acteurs aux prérogatives distinctes.

### Décision
Le modèle métier cible consacre 5 rôles distincts :
1. `TOURISTE` : Consultation publique, parcours des circuits et événements, réservation et paiement simulé.
2. `GUIDE` : Encadrement des groupes de touristes sur le terrain, consultation des circuits assignés, validation des présences.
3. `CONSERVATEUR` : Responsable scientifique, validation historique et culturelle des biens patrimoniaux, enrichissement des notices documentaires.
4. `GESTIONNAIRE_SITE` : Exploitation opérationnelle d'un site touristique, gestion des jauges d'accueil, organisation des événements locaux.
5. `ADMINISTRATEUR` : Gestion technique des utilisateurs, attribution des privilèges et supervision générale de la plateforme.

### Conséquences
- Cadrage strict documenté en P01.
- Aucune implémentation partielle de sécurité n'est déployée dans P01 (respect de la règle d'arrêt de mission avant P02).

---

## ADR-04 : Migration vers PostgreSQL et Database-per-Service avec Flyway

### Statut
Accepté et Exécuté (Validation humaine P00 - Décision 4).

### Contexte
Les microservices utilisaient exclusivement des bases H2 en mémoire (`jdbc:h2:mem:...`) avec génération automatique de schéma (`hibernate.ddl-auto: update`), causant une perte totale des données à l'extinction des conteneurs et interdisant toute traçabilité des évolutions de schémas.

### Décision
- Passage à PostgreSQL 16 sous Docker avec un conteneur unique initialisant 7 bases de données logiques distinctes (`patrimoine_db`, `circuit_db`, `evenement_db`, `reservation_db`, `utilisateur_db`, `paiement_db`, `notification_db`).
- Interdiction formelle de clés étrangères SQL inter-microservices.
- Intégration de Flyway (`flyway-core` + `flyway-database-postgresql`) dans les 7 microservices.
- En profil `prod` : exécution automatique des scripts de migration versionnés (`V1__...`, `V2__...`) et validation stricte du schéma par Hibernate (`hibernate.ddl-auto: validate`).

### Conséquences
- **Positives** : Persistance réelle des données, découplage complet des bases, idempotence et reproductibilité des déploiements.
- **Négatives** : Nécessité de maintenir des scripts SQL versionnés rigoureux.

---

## ADR-05 : Isolation Réseau Docker et Harmonisation de l'API Gateway sur le Port 8090

### Statut
Accepté et Exécuté.

### Contexte
Auparavant, les 7 microservices métier exposaient directement leurs ports (3001 à 3007) sur l'hôte, permettant de contourner l'API Gateway. De plus, une incohérence persistait sur l'API Gateway entre `application.yml` (port 8090), `docker-compose.yml` (port 8080) et le reverse proxy Nginx.

### Décision
- Création d'un réseau interne Docker privé (`internal-net`) sur lequel tournent les 7 microservices métier et la base PostgreSQL, sans aucun port mappé vers l'hôte.
- Seuls les points d'entrée clients sont exposés sur l'hôte : Nginx (`:80`) et API Gateway (`:8090`), ainsi qu'Eureka (`:8761`) pour la console de supervision.
- Harmonisation stricte du port `8090` sur tous les fichiers : `api-gateway/src/main/resources/application.yml`, `docker-compose.yml`, `frontend-angular/proxy.conf.json`, `frontend-angular/nginx.conf`, et `requests-architecture-complete.http`.

### Conséquences
- **Positives** : Élimination des risques de contournement de l'API Gateway (bypass d'authentification identifié dans P00), cohérence totale de configuration.
