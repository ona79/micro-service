#!/usr/bin/env bash
set -e
set -u

# =============================================================================
# UASZ - Plateforme Patrimoine Touristique de la Casamance
# Initialisation durcie de PostgreSQL 16 (Multi-Bases & Utilisateurs Dédiés)
# Principe : Moindre privilège & Database-per-Service
# =============================================================================

echo "=================================================================="
echo " [PostgreSQL Init] Initialisation sécurisée des 7 bases & utilisateurs"
echo "=================================================================="

# 1. Validation stricte et fail-fast des variables obligatoires (AUCUNE valeur de secours autorisée)
: "${POSTGRES_USER:=postgres}"
: "${POSTGRES_DB:=postgres}"
: "${POSTGRES_PASSWORD:=${POSTGRES_ROOT_PASSWORD:?Variable POSTGRES_ROOT_PASSWORD ou POSTGRES_PASSWORD obligatoire}}"
: "${PATRIMOINE_DB_PASSWORD:?Variable PATRIMOINE_DB_PASSWORD obligatoire}"
: "${CIRCUIT_DB_PASSWORD:?Variable CIRCUIT_DB_PASSWORD obligatoire}"
: "${EVENEMENT_DB_PASSWORD:?Variable EVENEMENT_DB_PASSWORD obligatoire}"
: "${RESERVATION_DB_PASSWORD:?Variable RESERVATION_DB_PASSWORD obligatoire}"
: "${UTILISATEUR_DB_PASSWORD:?Variable UTILISATEUR_DB_PASSWORD obligatoire}"
: "${PAIEMENT_DB_PASSWORD:?Variable PAIEMENT_DB_PASSWORD obligatoire}"
: "${NOTIFICATION_DB_PASSWORD:?Variable NOTIFICATION_DB_PASSWORD obligatoire}"

# 2. Rejet impératif des marqueurs d'exemples (CHANGE_ME)
for var in PATRIMOINE_DB_PASSWORD CIRCUIT_DB_PASSWORD EVENEMENT_DB_PASSWORD RESERVATION_DB_PASSWORD UTILISATEUR_DB_PASSWORD PAIEMENT_DB_PASSWORD NOTIFICATION_DB_PASSWORD POSTGRES_PASSWORD; do
    if [[ "${!var}" == *"CHANGE_ME"* ]]; then
        echo "[ERREUR CRITIQUE DE SÉCURITÉ] La variable $var contient un marqueur d'exemple 'CHANGE_ME'. Définissez un secret cryptographique réel." >&2
        exit 1
    fi
done

# 3. Définition des 7 couples (Base de données, Utilisateur, Mot de passe) sans AUCUNE valeur par défaut
SERVICES=(
    "patrimoine_db:patrimoine_user:${PATRIMOINE_DB_PASSWORD}"
    "circuit_db:circuit_user:${CIRCUIT_DB_PASSWORD}"
    "evenement_db:evenement_user:${EVENEMENT_DB_PASSWORD}"
    "reservation_db:reservation_user:${RESERVATION_DB_PASSWORD}"
    "utilisateur_db:utilisateur_user:${UTILISATEUR_DB_PASSWORD}"
    "paiement_db:paiement_user:${PAIEMENT_DB_PASSWORD}"
    "notification_db:notification_user:${NOTIFICATION_DB_PASSWORD}"
)

for entry in "${SERVICES[@]}"; do
    IFS=':' read -r db_name user_name user_pass <<< "$entry"

    echo ">>> Configuration pour le service : $user_name -> $db_name"

    # 1. Création de l'utilisateur dédié s'il n'existe pas
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        DO \$\$
        BEGIN
            IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$user_name') THEN
                CREATE ROLE $user_name WITH LOGIN PASSWORD '$user_pass';
            ELSE
                ALTER ROLE $user_name WITH PASSWORD '$user_pass';
            END IF;
        END
        \$\$;
EOSQL

    # 2. Création de la base dédiée appartenant à cet utilisateur
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        SELECT 'CREATE DATABASE $db_name OWNER $user_name'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db_name')\gexec
EOSQL

    # 3. Durcissement des privilèges : Révocation de PUBLIC et isolation stricte
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        REVOKE ALL ON DATABASE $db_name FROM PUBLIC;
        GRANT CONNECT, TEMPORARY ON DATABASE $db_name TO $user_name;
        ALTER DATABASE $db_name OWNER TO $user_name;
EOSQL

    # 4. Privilèges sur le schéma public dans la base concernée
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db_name" <<-EOSQL
        REVOKE ALL ON SCHEMA public FROM PUBLIC;
        GRANT ALL ON SCHEMA public TO $user_name;
        ALTER SCHEMA public OWNER TO $user_name;
        ALTER DEFAULT PRIVILEGES FOR ROLE $user_name IN SCHEMA public GRANT ALL ON TABLES TO $user_name;
        ALTER DEFAULT PRIVILEGES FOR ROLE $user_name IN SCHEMA public GRANT ALL ON SEQUENCES TO $user_name;
EOSQL

    echo "    [OK] Base '$db_name' isolée pour l'utilisateur '$user_name'."
done

echo "=================================================================="
echo " [PostgreSQL Init] Initialisation terminée : 7 bases prêtes et isolées"
echo "=================================================================="
