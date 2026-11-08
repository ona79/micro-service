#!/usr/bin/env bash
set -e

export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}"

SERVICES=(
  config-server
  discovery-server
  ms-patrimoine
  ms-circuit
  ms-evenement
  ms-reservation
  ms-utilisateur
  ms-notification
  ms-paiement
  api-gateway
)

echo "=================================================================="
echo " VÉRIFICATION D'INTÉGRATION CONTINUE (10 MICROSERVICES - JAVA 21)"
echo "=================================================================="

for s in "${SERVICES[@]}"; do
  echo ">>> [BUILD & TEST] $s ..."
  (cd "$s" && ./mvnw -B test package)
done

echo "=================================================================="
echo " SUCCÈS : Les 10 microservices compilent et passent tous les tests"
echo "=================================================================="
