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
