#!/usr/bin/env bash
set -e
set -u

# =============================================================================
# UASZ - Plateforme Patrimoine Touristique de la Casamance
# VÉRIFICATION FLYWAY & HIBERNATE VALIDATE SUR POSTGRESQL 16 (7/7)
# =============================================================================

echo "=================================================================="
echo " VÉRIFICATION FLYWAY & HIBERNATE VALIDATE SUR POSTGRESQL 16 (7/7)"
echo "=================================================================="

# 1. Chargement optionnel d'un fichier d'environnement de test dédié si spécifié
if [ -n "${POSTGRES_TEST_ENV_FILE:-}" ] && [ -f "$POSTGRES_TEST_ENV_FILE" ]; then
  echo ">>> Chargement de l'environnement de test depuis : $POSTGRES_TEST_ENV_FILE"
  # shellcheck disable=SC1090
  set -a && source "$POSTGRES_TEST_ENV_FILE" && set +a
elif [ -f ".env.test" ]; then
  echo ">>> Chargement de l'environnement de test depuis .env.test"
  # shellcheck disable=SC1091
  set -a && source .env.test && set +a
fi

# 2. Validation stricte et fail-fast des variables de mot de passe (AUCUNE valeur de secours autorisée)
: "${PATRIMOINE_DB_PASSWORD:?Variable PATRIMOINE_DB_PASSWORD obligatoire pour le test}"
: "${CIRCUIT_DB_PASSWORD:?Variable CIRCUIT_DB_PASSWORD obligatoire pour le test}"
: "${EVENEMENT_DB_PASSWORD:?Variable EVENEMENT_DB_PASSWORD obligatoire pour le test}"
: "${RESERVATION_DB_PASSWORD:?Variable RESERVATION_DB_PASSWORD obligatoire pour le test}"
: "${UTILISATEUR_DB_PASSWORD:?Variable UTILISATEUR_DB_PASSWORD obligatoire pour le test}"
: "${PAIEMENT_DB_PASSWORD:?Variable PAIEMENT_DB_PASSWORD obligatoire pour le test}"
: "${NOTIFICATION_DB_PASSWORD:?Variable NOTIFICATION_DB_PASSWORD obligatoire pour le test}"

export SECURITY_SESSION_SECRET="${SECURITY_SESSION_SECRET:-$(openssl rand -base64 48 | tr -d '\n')}"
export SECURITY_INTERSERVICE_SECRET="${SECURITY_INTERSERVICE_SECRET:-$(openssl rand -base64 48 | tr -d '\n')}"

# 3. Rejet impératif des marqueurs d'exemples
for var in PATRIMOINE_DB_PASSWORD CIRCUIT_DB_PASSWORD EVENEMENT_DB_PASSWORD RESERVATION_DB_PASSWORD UTILISATEUR_DB_PASSWORD PAIEMENT_DB_PASSWORD NOTIFICATION_DB_PASSWORD SECURITY_SESSION_SECRET SECURITY_INTERSERVICE_SECRET; do
  if [[ "${!var}" == *"CHANGE_ME"* ]]; then
    echo "[ERREUR DE SÉCURITÉ] La variable $var contient un marqueur d'exemple 'CHANGE_ME'. Utilisez de vrais identifiants de test." >&2
    exit 1
  fi
done

if [ -z "${JAVA_HOME:-}" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  if [ -d "/usr/lib/jvm/java-21-temurin-jdk" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-21-temurin-jdk"
  fi
fi

export POSTGRES_INTEGRATION_TEST=true

# Découverte dynamique de l'IP du conteneur PostgreSQL (aucun IP codé en dur)
PG_CONTAINER=$(docker ps --filter "name=^/postgres$" --filter "status=running" --format "{{.ID}}" | head -n 1)
if [ -z "$PG_CONTAINER" ]; then
  PG_CONTAINER=$(docker ps --filter "name=postgres" --filter "status=running" --format "{{.ID}}" | head -n 1)
fi
if [ -n "$PG_CONTAINER" ]; then
  DYNAMIC_IP=$(docker inspect "$PG_CONTAINER" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' | tr -d ' ' | head -n 1)
  export TEST_DB_HOST="${TEST_DB_HOST:-$DYNAMIC_IP}"
fi
export TEST_DB_HOST="${TEST_DB_HOST:-localhost}"
export TEST_DB_PORT="${TEST_DB_PORT:-5432}"

echo ">>> Cible PostgreSQL : ${TEST_DB_HOST}:${TEST_DB_PORT}"

SERVICES=(
  "ms-patrimoine:PatrimoinePostgresIntegrationTest"
  "ms-circuit:CircuitPostgresIntegrationTest"
  "ms-evenement:EvenementPostgresIntegrationTest"
  "ms-reservation:ReservationPostgresIntegrationTest"
  "ms-utilisateur:UtilisateurPostgresIntegrationTest"
  "ms-paiement:PaiementPostgresIntegrationTest"
  "ms-notification:NotificationPostgresIntegrationTest"
)

for entry in "${SERVICES[@]}"; do
  SVC="${entry%%:*}"
  TEST_CLASS="${entry##*:}"
  echo ">>> [TEST POSTGRES 16] $SVC ($TEST_CLASS) ..."
  (cd "$SVC" && ./mvnw -Dmaven.repo.local="${MAVEN_REPO_LOCAL:-/home/mahou-dev/.m2_local}" -B test -Dtest="$TEST_CLASS")
done

echo "=================================================================="
echo " SUCCÈS : Les 7 microservices valident Flyway et Hibernate sur PG 16 !"
echo "=================================================================="
