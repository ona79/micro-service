# STRATÉGIE DE MIGRATIONS DE SCHÉMAS AVEC FLYWAY
**Projet : Gestion du Patrimoine Touristique de la Casamance**  
**Référence Technique : Migrations Versionnées P01**

---

## 1. OBJECTIFS DE LA GESTION VERSIONNÉE

L'utilisation de `hibernate.ddl-auto: update` en production présentait des risques critiques :
- Absence d'historique auditable des altérations de schéma.
- Incapacité à exécuter des scripts de données (`seed data`) reproductibles.
- Risques de corruptions silencieuses lors des renommages de colonnes ou de tables.

L'intégration de **Flyway 10** dans les 7 microservices garantit :
1. Une traçabilité complète de chaque version de schéma stockée dans la table interne `flyway_schema_history`.
2. Une séparation stricte entre création des structures DDL (`V1`) et injection des données de référence (`V2`).
3. L'idempotence des déploiements et la validation stricte d'intégrité avant le démarrage de Spring Boot.

---

## 2. CONVENTION DE NOMMAGE ET ORGANISATION DES SCRIPTS

Tous les scripts de migration sont situés dans `src/main/resources/db/migration/` de chaque microservice :

```text
ms-<nom-du-service>/src/main/resources/db/migration/
├── V1__create_<nom>_schema.sql  (DDL : CREATE TABLE, CREATE INDEX, CONTRAINTES)
└── V2__seed_<nom>.sql           (DML : INSERT INTO données initiales de référence)
```

### Règles de rédaction des migrations SQL :
1. **Idempotence DDL** : Utiliser systématiquement `CREATE TABLE IF NOT EXISTS` et `CREATE INDEX IF NOT EXISTS`.
2. **Types SQL standards PostgreSQL** :
   - Clés primaires auto-incrémentées : `BIGSERIAL PRIMARY KEY` ou `BIGINT GENERATED ALWAYS AS IDENTITY`.
   - Textes longs : `VARCHAR(2000)` ou `TEXT` pour correspondre aux annotations JPA `@Column(length = 2000)`.
   - Nombres flottants : `DOUBLE PRECISION` pour `double`, `REAL` pour `float`.
   - Horodatages : `TIMESTAMP` pour `LocalDateTime`.
   - Énumérations : `VARCHAR(50)` pour correspondre à `@Enumerated(EnumType.STRING)`.
3. **Réinitialisation des séquences** : Après un `INSERT` explicite avec IDs numériques fixes dans un script de seed, exécuter systématiquement :
   ```sql
   SELECT setval('<table_name>_id_seq', (SELECT MAX(id) FROM <table_name>));
   ```

---

## 3. INVENTAIRE DES MIGRATIONS INITIALES (PHASE P01)

| Microservice | Script V1 (Schéma) | Script V2 (Données) | Tables créées |
|---|---|---|---|
| `ms-patrimoine` | `V1__create_patrimoine_schema.sql` | `V2__seed_patrimoines.sql` | `patrimoine` (6 sites dont Gorée, Renaissance, Enampore, Ziguinchor) |
| `ms-circuit` | `V1__create_circuit_schema.sql` | `V2__seed_circuits.sql` | `circuit`, `etape` (2 circuits culturels) |
| `ms-evenement` | `V1__create_evenement_schema.sql` | `V2__seed_evenements.sql` | `evenement` (3 événements culturels programmés) |
| `ms-reservation` | `V1__create_reservation_schema.sql` | *(À la demande)* | `reservation` |
| `ms-utilisateur` | `V1__create_utilisateur_schema.sql` | `V2__seed_utilisateurs.sql` | `utilisateur` (3 comptes démo avec hashs BCrypt) |
| `ms-paiement` | `V1__create_paiement_schema.sql` | *(À la demande)* | `paiement` |
| `ms-notification` | `V1__create_notification_schema.sql` | *(À la demande)* | `notification` |

---

## 4. ACTIVATION ET COMPORTEMENT PAR PROFIL

- **Profil `prod` (Docker & Production)** :
  ```yaml
  spring:
    flyway:
      enabled: true
      baseline-on-migrate: true
      locations: classpath:db/migration
    jpa:
      hibernate:
        ddl-auto: validate
  ```
  Flyway exécute les scripts de migration dans l'ordre de version avant l'initialisation du `EntityManagerFactory`. Ensuite, Hibernate valide que les entités Java correspondent exactement aux colonnes réelles de PostgreSQL.

- **Profil `dev` & `test` (H2 en mémoire)** :
  Flyway est désactivé (`enabled: false`) et Hibernate gère automatiquement la création éphémère du schéma (`ddl-auto: update` en dev, `create-drop` en test) pour assurer une vitesse d'exécution optimale et une indépendance totale sans conteneur PostgreSQL actif.
