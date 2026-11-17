#!/usr/bin/env bash
set -e

if [ -z "$JAVA_HOME" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  if [ -x "/usr/lib/jvm/java-21-temurin-jdk/bin/java" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-21-temurin-jdk"
  elif [ -x "/opt/homebrew/opt/openjdk@21/bin/java" ]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
  fi
fi

SERVICES=(
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
echo " VÉRIFICATION D'INTÉGRATION CONTINUE (9 SERVICES - JAVA 21)"
echo " Architecture Cible P01 : Sans Config Server, Multi-profils"
echo "=================================================================="

for s in "${SERVICES[@]}"; do
  echo ">>> [BUILD & TEST] $s ..."
  (cd "$s" && ./mvnw -o -B test)
done

echo "=================================================================="
echo " SUCCÈS : Les 9 services compilent et passent tous les tests"
echo "=================================================================="
