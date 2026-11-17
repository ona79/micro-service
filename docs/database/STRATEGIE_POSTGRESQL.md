# STRATÉGIE POSTGRESQL & DATABASE-PER-SERVICE
**Projet : Gestion du Patrimoine Touristique de la Casamance**  
**Document Technique de Référence : Base de Données P01**

---

## 1. PRINCIPE DU DATABASE-PER-SERVICE

Dans une architecture distribuée, l'indépendance de déploiement et l'étanchéité des données sont fondamentales. L'architecture P01 abandonne définitivement les bases H2 éphémères au profit d'un serveur PostgreSQL 16 hébergeant 7 bases de données logiques strictement indépendantes :

1. `patrimoine_db` : Données de `ms-patrimoine`.
2. `circuit_db` : Données de `ms-circuit`.
3. `evenement_db` : Données de `ms-evenement`.
4. `reservation_db` : Données de `ms-reservation`.
5. `utilisateur_db` : Données de `ms-utilisateur`.
6. `paiement_db` : Données de `ms-paiement`.
7. `notification_db` : Données de `ms-notification`.

Chaque microservice possède ses propres identifiants d'accès et ne dispose d'aucune visibilité sur les tables des autres microservices.

---

## 2. DÉPLOIEMENT ET INITIALISATION MULTI-BASES

### 2.1 Conteneur PostgreSQL
Dans `docker-compose.yml`, le service `postgres` est configuré avec un volume persistant `postgres-data` et un script d'initialisation monté dans `/docker-entrypoint-initdb.d/` :
```yaml
  postgres:
    image: postgres:16-alpine
    container_name: postgres
    environment:
      - POSTGRES_DB=postgres
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./docker/postgres/init-multi-postgres.sh:/docker-entrypoint-initdb.d/init-multi-postgres.sh:ro
    networks:
      - internal-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
```

### 2.2 Script d'initialisation (`docker/postgres/init-multi-postgres.sh`)
Ce script s'exécute automatiquement lors de la création initiale du conteneur PostgreSQL :
```bash
#!/usr/bin/env bash
set -e
set -u

function create_database() {
    local database=$1
    echo ">>> [PostgreSQL Init] Vérification / Création de la base '$database'..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        SELECT 'CREATE DATABASE $database'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$database')\gexec
        GRANT ALL PRIVILEGES ON DATABASE $database TO $POSTGRES_USER;
EOSQL
}

DATABASES=(
    patrimoine_db
    circuit_db
    evenement_db
    reservation_db
    utilisateur_db
    paiement_db
    notification_db
)

for db in "${DATABASES[@]}"; do
    create_database "$db"
done
```

---

## 3. GESTION DU POOL DE CONNEXION (HIKARICP)

Chaque microservice initialise un pool de connexions HikariCP optimisé pour son profil d'exécution :
- En profil `prod` : connexion vers `jdbc:postgresql://${DB_HOST:postgres}:${DB_PORT:5432}/${DB_NAME}`.
- En profil `dev` / `test` : fallback vers H2 en mémoire avec démarrage instantané sans conteneur requis.
- Paramètres de validation : `hibernate.ddl-auto: validate` en production pour garantir qu'aucune modification de schéma ne soit effectuée à la volée par Hibernate, confiant l'intégralité du contrôle DDL à Flyway.
