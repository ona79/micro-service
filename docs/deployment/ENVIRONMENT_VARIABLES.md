# RÉFÉRENTIEL DES VARIABLES D'ENVIRONNEMENT
**Projet : Gestion du Patrimoine Touristique de la Casamance**  
**Référence Technique : Configuration P01**

---

## 1. VARIABLES D'ENVIRONNEMENT COMMUNES AUX 7 MICROSERVICES

Chaque microservice Spring Boot (`ms-patrimoine`, `ms-circuit`, `ms-evenement`, `ms-reservation`, `ms-utilisateur`, `ms-paiement`, `ms-notification`) exploite les variables suivantes :

| Variable | Description | Valeur par défaut | Exemple en Production / Docker |
|---|---|---|---|
| `SPRING_PROFILES_ACTIVE` | Profil Spring Boot activé | `dev` | `prod` |
| `DB_HOST` | Hôte du serveur PostgreSQL | `postgres` | `postgres` ou adresse IP du cluster RDS |
| `DB_PORT` | Port d'écoute PostgreSQL | `5432` | `5432` |
| `DB_NAME` | Nom de la base dédiée au service | *(dépendant du service)* | ex : `patrimoine_db` |
| `DB_USER` | Utilisateur d'accès à la base | `postgres` | `postgres` (à surcharger en prod) |
| `DB_PASSWORD` | Mot de passe d'accès | `postgres` | `postgres` (via secret / vault en prod) |
| `EUREKA_URI` | Endpoint d'enregistrement Eureka | `http://localhost:8761/eureka` | `http://discovery-server:8761/eureka` |
| `DISCOVERY_ENABLED` | Activation de la découverte Eureka | `true` | `true` (désactivable en tests isolés) |

---

## 2. VARIABLES SPÉCIFIQUES PAR SERVICE

### 2.1 `api-gateway`
| Variable | Description | Valeur par défaut |
|---|---|---|
| `PORT` | Port d'écoute HTTP du Gateway | `8090` |
| `PATRIMOINE_URL` | Endpoint direct de `ms-patrimoine` | `http://localhost:3001` (Docker: `http://ms-patrimoine:3001`) |
| `CIRCUIT_URL` | Endpoint direct de `ms-circuit` | `http://localhost:3002` (Docker: `http://ms-circuit:3002`) |
| `EVENEMENT_URL` | Endpoint direct de `ms-evenement` | `http://localhost:3003` (Docker: `http://ms-evenement:3003`) |
| `RESERVATION_URL` | Endpoint direct de `ms-reservation` | `http://localhost:3004` (Docker: `http://ms-reservation:3004`) |
| `UTILISATEUR_URL` | Endpoint direct de `ms-utilisateur` | `http://localhost:3005` (Docker: `http://ms-utilisateur:3005`) |
| `PAIEMENT_URL` | Endpoint direct de `ms-paiement` | `http://localhost:3006` (Docker: `http://ms-paiement:3006`) |
| `NOTIFICATION_URL` | Endpoint direct de `ms-notification` | `http://localhost:3007` (Docker: `http://ms-notification:3007`) |

### 2.2 `ms-circuit`
| Variable | Description | Valeur par défaut |
|---|---|---|
| `PATRIMOINE_URL` | URL de `ms-patrimoine` pour OpenFeign | `http://localhost:3001` (Docker: `http://ms-patrimoine:3001`) |

### 2.3 `ms-evenement`
| Variable | Description | Valeur par défaut |
|---|---|---|
| `PATRIMOINE_URL` | URL de `ms-patrimoine` pour OpenFeign | `http://localhost:3001` (Docker: `http://ms-patrimoine:3001`) |

### 2.4 `ms-reservation`
| Variable | Description | Valeur par défaut |
|---|---|---|
| `CIRCUIT_URL` | URL de `ms-circuit` pour OpenFeign | `http://localhost:3002` (Docker: `http://ms-circuit:3002`) |
| `EVENEMENT_URL` | URL de `ms-evenement` pour OpenFeign | `http://localhost:3003` (Docker: `http://ms-evenement:3003`) |

### 2.5 `ms-paiement`
| Variable | Description | Valeur par défaut |
|---|---|---|
| `RESERVATION_URL` | URL de `ms-reservation` pour OpenFeign | `http://localhost:3004` (Docker: `http://ms-reservation:3004`) |
| `NOTIFICATION_URL` | URL de `ms-notification` pour OpenFeign | `http://localhost:3007` (Docker: `http://ms-notification:3007`) |

### 2.6 `postgres`
| Variable | Description | Valeur par défaut |
|---|---|---|
| `POSTGRES_DB` | Base racine d'administration | `postgres` |
| `POSTGRES_USER` | Super-administrateur PostgreSQL | `postgres` |
| `POSTGRES_PASSWORD` | Mot de passe administrateur | `postgres` |

---

## 3. BONNES PRATIQUES DE SÉCURITÉ POUR LA PRODUCTION

1. **Aucun secret dans le code source versionné** : Ne jamais commiter de mots de passe ou clés privées dans Git.
2. **Utilisation d'un fichier `.env` non versionné** ou d'un gestionnaire de secrets (Docker Secrets, Kubernetes Secrets, HashiCorp Vault).
3. **Moindre privilège** : Créer un utilisateur PostgreSQL dédié pour chaque microservice avec des privilèges restreints à sa seule base de données (étape recommandée pour les déploiements de pré-production/production).
