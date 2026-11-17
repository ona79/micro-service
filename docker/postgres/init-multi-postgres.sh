#!/usr/bin/env bash
set -e
set -u

# Script d'initialisation multi-bases pour PostgreSQL (Database-per-Service)
# UASZ - Patrimoine Touristique de la Casamance

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

echo "=================================================================="
echo " Initialisation des 7 bases de données PostgreSQL"
echo "=================================================================="

for db in "${DATABASES[@]}"; do
    create_database "$db"
done

echo "=================================================================="
echo " Initialisation terminée : 7 bases prêtes pour les microservices"
echo "=================================================================="
