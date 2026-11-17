# DÉPLOIEMENT DOCKER & ISOLATION RÉSEAU
**Projet : Gestion du Patrimoine Touristique de la Casamance**  
**Document Technique : Déploiement Conteneurisé P01**

---

## 1. PRINCIPES D'ISOLATION ET DE SÉCURITÉ RÉSEAU

Dans les versions antérieures, les 7 microservices métier exposaient directement leurs ports (3001 à 3007) sur l'hôte, ce qui permettait de contourner l'API Gateway et violait le principe de sécurité en profondeur (Defense in Depth).

L'architecture P01 applique une segmentation stricte :
- **Réseau Public (`public-net`)** : Seuls les points d'entrée clients sont exposés sur la machine hôte :
  - Port `80` : Serveur Nginx hébergeant le frontend Angular 22.
  - Port `8090` : API Gateway Spring Cloud (point de passage unique des requêtes `/api/**`).
  - Port `8761` : Console Eureka Discovery Server (supervision et état des instances).
- **Réseau Privé Interne (`internal-net`)** : Les 7 microservices métier (`ms-patrimoine`, `ms-circuit`, `ms-evenement`, `ms-reservation`, `ms-utilisateur`, `ms-paiement`, `ms-notification`) ainsi que le serveur PostgreSQL ne publient **aucun port sur l'hôte**. Ils communiquent exclusivement à l'intérieur du réseau Docker.

---

## 2. ORDONNANCEMENT ET HEALTHCHECKS

Afin d'éviter les erreurs de connexion au démarrage (race conditions) :
1. **PostgreSQL** démarre en premier avec un healthcheck actif :
   ```yaml
   healthcheck:
     test: ["CMD-SHELL", "pg_isready -U postgres"]
     interval: 5s
     timeout: 5s
     retries: 5
   ```
2. **Les 7 microservices métier** déclarent :
   ```yaml
   depends_on:
     postgres:
       condition: service_healthy
   ```
   Ce qui garantit que Spring Boot ne tentera d'exécuter Flyway que lorsque PostgreSQL sera prêt à accepter des connexions.
3. **L'API Gateway** démarre après la déclaration des microservices métier.
4. **Le Frontend Nginx** démarre après l'API Gateway.

---

## 3. COMMANDES D'EXPLOITATION

### 3.1 Démarrage complet de la plateforme
```bash
# Compilation préalable des JARs si nécessaire
./verify-integration.sh

# Lancement des conteneurs en arrière-plan
docker compose up -d --build
```

### 3.2 Vérification de l'état des conteneurs
```bash
docker compose ps
```

### 3.3 Consultation des journaux d'un service
```bash
docker compose logs -f api-gateway
docker compose logs -f ms-patrimoine
docker compose logs -f postgres
```

### 3.4 Arrêt propre
```bash
docker compose down
```

### 3.5 Réinitialisation complète des bases de données
```bash
# Arrêter les conteneurs et supprimer le volume persistant
docker compose down -v
# Relancer pour reconstruire les schémas à blanc
docker compose up -d
```
