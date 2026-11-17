#!/usr/bin/env bash
set -e

echo "=================================================================="
echo " VÉRIFICATION FLYWAY & HIBERNATE VALIDATE SUR POSTGRESQL 16 (7/7)"
echo "=================================================================="

if [ -z "$JAVA_HOME" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  if [ -d "/usr/lib/jvm/java-21-temurin-jdk" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-21-temurin-jdk"
  fi
fi

export POSTGRES_INTEGRATION_TEST=true

# Découverte dynamique de l'IP du conteneur PostgreSQL (aucun IP codé en dur)
PG_CONTAINER=$(docker ps --filter "name=postgres" --filter "status=running" --format "{{.ID}}" | head -n 1)
if [ -n "$PG_CONTAINER" ]; then
  DYNAMIC_IP=$(docker inspect "$PG_CONTAINER" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' | tr -d ' ' | head -n 1)
  export TEST_DB_HOST="${TEST_DB_HOST:-$DYNAMIC_IP}"
fi
export TEST_DB_HOST="${TEST_DB_HOST:-localhost}"
export TEST_DB_PORT="${TEST_DB_PORT:-5432}"

# Mots de passe d'intégration transmis par variables d'environnement (ségrégation moindre privilège)
export PATRIMOINE_DB_PASSWORD="${PATRIMOINE_DB_PASSWORD:-patrimoine_pass_2026!}"
export CIRCUIT_DB_PASSWORD="${CIRCUIT_DB_PASSWORD:-circuit_pass_2026!}"
export EVENEMENT_DB_PASSWORD="${EVENEMENT_DB_PASSWORD:-evenement_pass_2026!}"
export RESERVATION_DB_PASSWORD="${RESERVATION_DB_PASSWORD:-reservation_pass_2026!}"
export UTILISATEUR_DB_PASSWORD="${UTILISATEUR_DB_PASSWORD:-utilisateur_pass_2026!}"
export PAIEMENT_DB_PASSWORD="${PAIEMENT_DB_PASSWORD:-paiement_pass_2026!}"
export NOTIFICATION_DB_PASSWORD="${NOTIFICATION_DB_PASSWORD:-notification_pass_2026!}"

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
  (cd "$SVC" && ./mvnw -o -B test -Dtest="$TEST_CLASS")
done

echo "=================================================================="
echo " SUCCÈS : Les 7 microservices valident Flyway et Hibernate sur PG 16 !"
echo "=================================================================="
