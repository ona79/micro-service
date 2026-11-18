#!/usr/bin/env bash
set -e

# =============================================================================
# UASZ - Plateforme de Valorisation du Patrimoine Touristique de la Casamance
# Script de Preuve Formelle EUREKA-01 (Découverte Dynamique Réelle & OpenFeign)
#
# Démontre la communication interservices réelle :
# 1. discovery-server (vrai serveur Eureka démarré sur port 8761)
# 2. ms-patrimoine (vrai microservice démarré et enregistré dans Eureka)
# 3. ms-circuit (client OpenFeign via Spring Cloud LoadBalancer, SANS URL statique)
# =============================================================================

echo "=================================================================="
echo " PREUVE EUREKA-01 RÉELLE : DÉCOUVERTE & COMMUNICATION INTERSERVICES"
echo " (discovery-server <-> ms-patrimoine <-> ms-circuit OpenFeign)"
echo "=================================================================="

# Résolution de JAVA_HOME Java 21
if [ -z "$JAVA_HOME" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
  if [ -x "/usr/lib/jvm/java-21-temurin-jdk/bin/java" ]; then
    export JAVA_HOME="/usr/lib/jvm/java-21-temurin-jdk"
  elif [ -x "/opt/homebrew/opt/openjdk@21/bin/java" ]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
  fi
fi

EUREKA_PORT=8761
PATRIMOINE_PORT=3001

EUREKA_PID=""
PATRIMOINE_PID=""

cleanup() {
  echo ""
  echo ">>> [NETTOYAGE] Arrêt des processus de test..."
  if [ -n "$PATRIMOINE_PID" ] && kill -0 "$PATRIMOINE_PID" 2>/dev/null; then
    kill -9 "$PATRIMOINE_PID" 2>/dev/null || true
  fi
  if [ -n "$EUREKA_PID" ] && kill -0 "$EUREKA_PID" 2>/dev/null; then
    kill -9 "$EUREKA_PID" 2>/dev/null || true
  fi
  echo ">>> [NETTOYAGE] Processus arrêtés."
}
trap cleanup EXIT INT TERM

# Vérification des classpaths
for mod in discovery-server ms-patrimoine ms-circuit; do
  if [ ! -f "$mod/target/classpath.txt" ]; then
    echo ">>> Génération du classpath pour $mod..."
    (cd "$mod" && ./mvnw -o -B test-compile)
    python3 -c "
import xml.etree.ElementTree as ET, glob
reports = glob.glob('$mod/target/surefire-reports/*.xml')
if reports:
    tree = ET.parse(reports[0])
    for prop in tree.iter('property'):
        if prop.get('name') == 'java.class.path':
            with open('$mod/target/classpath.txt', 'w') as f:
                f.write(prop.get('value'))
            break
"
  fi
done

# 1. Démarrage de discovery-server (Eureka réel)
echo ">>> [1/4] Démarrage du vrai serveur Eureka (discovery-server sur port $EUREKA_PORT)..."
$JAVA_HOME/bin/java -cp @"discovery-server/target/classpath.txt" \
    -Deureka.client.register-with-eureka=false \
    -Deureka.client.fetch-registry=false \
    -Deureka.server.enable-self-preservation=false \
    com.uasz.discovery_server.DiscoveryServerApplication --server.port=$EUREKA_PORT > /tmp/eureka_test_real.log 2>&1 &
EUREKA_PID=$!

for i in {1..30}; do
  if curl -s "http://localhost:${EUREKA_PORT}/actuator/health" | grep -q "UP"; then
    echo "    [OK] Serveur Eureka opérationnel (PID: $EUREKA_PID)."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "    [ERREUR] Échec du démarrage de discovery-server."
    cat /tmp/eureka_test_real.log | tail -n 25
    exit 1
  fi
  sleep 1
done

# 2. Démarrage de ms-patrimoine (vrai microservice)
echo ">>> [2/4] Démarrage de ms-patrimoine réel (port $PATRIMOINE_PORT, profil dev)..."
$JAVA_HOME/bin/java -cp @"ms-patrimoine/target/classpath.txt" \
    -Dspring.profiles.active=dev \
    -Dserver.port=$PATRIMOINE_PORT \
    -Deureka.client.service-url.defaultZone="http://localhost:${EUREKA_PORT}/eureka/" \
    -Deureka.instance.lease-renewal-interval-in-seconds=1 \
    -Deureka.instance.prefer-ip-address=true \
    com.uasz.ms_patrimoine.MsPatrimoineApplication > /tmp/patrimoine_test_real.log 2>&1 &
PATRIMOINE_PID=$!

for i in {1..30}; do
  if curl -s "http://localhost:${PATRIMOINE_PORT}/actuator/health" | grep -q "UP"; then
    echo "    [OK] ms-patrimoine opérationnel (PID: $PATRIMOINE_PID)."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "    [ERREUR] Échec du démarrage de ms-patrimoine."
    cat /tmp/patrimoine_test_real.log | tail -n 25
    exit 1
  fi
  sleep 1
done

# 3. Validation de l'enregistrement dans Eureka
echo ">>> [3/4] Attente de l'enregistrement de MS-PATRIMOINE dans le registre Eureka..."
REGISTERED=false
for i in {1..30}; do
  if curl -s -H "Accept: application/json" "http://localhost:${EUREKA_PORT}/eureka/apps/MS-PATRIMOINE" | grep -q "MS-PATRIMOINE"; then
    echo "    [OK] MS-PATRIMOINE est enregistré dans Eureka avec statut UP !"
    REGISTERED=true
    break
  fi
  sleep 1
done

if [ "$REGISTERED" != "true" ]; then
  echo "    [ERREUR] MS-PATRIMOINE ne s'est pas enregistré dans Eureka."
  exit 1
fi

# 4. Exécution du test d'intégration OpenFeign & LoadBalancer dans ms-circuit
echo ">>> [4/4] Exécution du test de découverte Eureka et appel OpenFeign depuis ms-circuit..."
(cd ms-circuit && ./mvnw -o -B test -Dtest=EurekaRealDiscoveryIntegrationTest -Deureka.real.test=true)

echo ""
echo "=================================================================="
echo " SUCCÈS : Preuve formelle EUREKA-01 validée à 100 % !"
echo " La découverte dynamique Eureka et l'appel OpenFeign sont réels."
echo "=================================================================="
