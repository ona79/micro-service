# AUDIT GÉNÉRAL DU PROJET — GESTION DU PATRIMOINE TOURISTIQUE

**Date de l'audit** : 17 novembre 2026  
**Périmètre analysé** : Dépôt complet `/home/mahou-dev/micro-service` (Backend microservices Spring Boot/Cloud + Frontend React/Vite)  
**Branche Git inspectée** : `main` (commit `8138b1a` — *feat(frontend): ajout du front-end React + Vite et mise a jour du guide de lancement README*)  
**Statut** : Lecture et analyse non destructives uniquement (aucun fichier source modifié).

---

## 1. Synthèse exécutive

Le projet est une plateforme académique de gestion et de valorisation du patrimoine touristique sénégalais (*Patrimoine du Sénégal*), développée dans le cadre du cours *Développement d'Applications Orientées Services* à l'Université Assane Seck de Ziguinchor (UASZ).

Il combine :
1. **Un écosystème backend distribué de 10 services Java 21 / Spring Boot `4.1.0` / Spring Cloud `2025.1.4`** :
   - 3 services d'infrastructure (`config-server`, `discovery-server`, `api-gateway`).
   - 7 microservices métier (`ms-patrimoine`, `ms-circuit`, `ms-evenement`, `ms-reservation`, `ms-utilisateur`, `ms-paiement`, `ms-notification`) utilisant chacun une base **H2 en mémoire**.
2. **Un frontend web SPA léger dans `frontend/`** construit avec **React 19** (`19.3.1` verrouillé), **React Router DOM 7** (`7.18.5` verrouillé), **Vite 6** (`6.4.5` verrouillé) et du **CSS natif par variables** (`tokens.css`).

### Constats majeurs (faits vérifiés)
- **Couverture fonctionnelle asymétrique** : le frontend n'expose que **4 domaines en lecture/réservation publique** (Patrimoines, Circuits, Événements, Réservations), alors que le backend implémente également les **Utilisateurs/Connexion** (`ms-utilisateur`), les **Paiements** (`ms-paiement`), les **Notifications** (`ms-notification`) et l'**administration CRUD complète** de toutes les entités.
- **Absence totale de sécurité applicative** : aucune authentification JWT/session, aucun contrôle d'accès (RBAC) sur `api-gateway` ni sur les 7 microservices, aucune configuration CORS côté serveur, consoles H2 et endpoints Actuator `*` exposés.
- **Qualité frontend artisanale mais propre visuellement** : design system cohérent via `tokens.css`, code lisible, mais **zéro TypeScript**, **zéro test automatisé**, **zéro linter/formateur**, duplication de logique de chargement dans les pages et absence de `Dockerfile` ou de configuration de reverse-proxy de production pour `frontend/`.
- **Environnement local observé** : `Node.js v26.12.0`, `npm 11.20.0`, `OpenJDK 25.0.4.1` installés sur le poste ; `frontend/node_modules/` absent (les dépendances n'ont pas été installées sur disque).

---

## 2. Arborescence globale du dépôt

```text
micro-service/
├── .github/workflows/ci-cd.yml          # Pipeline CI/CD GitHub Actions (10 services Java uniquement)
├── README.md                            # Documentation générale et guide de démarrage
├── docker-compose.yml                   # Orchestration des 10 conteneurs Java (pas de service frontend)
├── requests-architecture-complete.http  # Scénarios REST manuels couvrant les 7 MS
├── verify-integration.sh                # Script local ./mvnw test package sur les 10 services Java
│
├── config-server/                       # Port 8888 — Spring Cloud Config (profil native)
├── discovery-server/                    # Port 8761 — Netflix Eureka Server
├── api-gateway/                         # Port 8080 — Spring Cloud Gateway Server WebMVC
│
├── ms-patrimoine/                       # Port 3001 — Sites patrimoniaux (3 sites pré-chargés)
├── ms-circuit/                          # Port 3002 — Circuits & étapes + calcul Haversine
├── ms-evenement/                        # Port 3003 — Événements culturels
├── ms-reservation/                      # Port 3004 — Réservations (CIRCUIT / EVENEMENT)
├── ms-utilisateur/                      # Port 3005 — Utilisateurs & connexion (2 comptes pré-chargés)
├── ms-paiement/                         # Port 3006 — Paiements (WAVE, ORANGE_MONEY, CARTE_BANCAIRE, ESPECES)
├── ms-notification/                     # Port 3007 — Journal des notifications (EMAIL, SMS)
│
└── frontend/                            # Port 5173 (dev Vite) — Application React SPA
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    ├── .gitignore
    ├── public/images/patrimoines/README.md
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── routes.jsx
        ├── config.js
        ├── api/                         # client.js, patrimoines.js, circuits.js, evenements.js, reservations.js
        ├── components/                  # 12 composants JSX + 9 feuilles CSS
        ├── pages/                       # 8 pages JSX + 3 feuilles CSS
        ├── styles/                      # tokens.css, global.css
        └── utils/                       # formatters.js
```

---

## 3. Stack technique et versions vérifiées

### 3.1 Frontend (`frontend/`)
| Élément | Déclaration (`package.json`) | Version verrouillée (`package-lock.json`) | Rôle |
|---|---|---|---|
| Runtime JS cible | Node.js v18+/v20+ (README) | `v26.12.0` sur la machine | Exécution outillage Vite/npm |
| Bibliothèque UI | `react: ^19.0.0` | `19.3.1` | Rendu composants fonctionnels |
| DOM Renderer | `react-dom: ^19.0.0` | `19.3.1` | Montage `#root` |
| Routage | `react-router-dom: ^7.5.0` | `7.18.5` | `BrowserRouter`, `Routes`, `Route`, `Outlet` |
| Bundler / Dev Server | `vite: ^6.2.0` | `6.4.5` | Build ES modules + proxy `/api` |
| Plugin React Vite | `@vitejs/plugin-react: ^4.3.4` | `4.7.0` | JSX transform & Fast Refresh |
| Langage | JavaScript ES Modules (`.js`/`.jsx`) | — | Aucun TypeScript (`tsconfig.json` absent) |
| Styles | CSS natif + CSS Custom Properties | — | `tokens.css` + CSS importé par composant |
| Typographie | Google Fonts `Nunito` | — | Chargée via `<link>` dans `index.html` |

### 3.2 Backend (contexte d'intégration)
| Élément | Version vérifiée (`pom.xml` / `README.md`) | Notes |
|---|---|---|
| Java | `21` (`eclipse-temurin:21-jdk`) | Compilé via Maven Wrapper (`./mvnw`) |
| Spring Boot | `4.1.0` | `spring-boot-starter-webmvc`, `data-jpa`, `validation`, `actuator` |
| Spring Cloud | `2025.1.4` | Gateway WebMVC, Eureka, Config, OpenFeign |
| Base de données | H2 in-memory (`jdbc:h2:mem:*`) | Données éphémères à chaque redémarrage de conteneur |
| Mapping | MapStruct `1.6.3` + Lombok | Conversion Entités ↔ DTO |

---

## 4. Scripts, build, CI/CD et déploiement

### 4.1 Scripts frontend (`frontend/package.json`)
- `npm run dev` (`vite`) : démarre le serveur de développement sur le port `5173` avec proxy `/api` → `http://localhost:8080`.
- `npm run build` (`vite build`) : génère le bundle statique dans `dist/`.
- `npm run preview` (`vite preview`) : prévisualisation locale du build. **Attention** : `vite.config.js` configure `server.proxy`, pas `preview.proxy` ; en mode `preview`, les appels `/api` échoueront sauf configuration inverse.
- **Scripts absents** : aucun script `lint`, `format`, `typecheck`, `test` ou `test:e2e`.

### 4.2 CI/CD et Docker
- **Pipeline `.github/workflows/ci-cd.yml`** : couvre exclusivement les **10 microservices Java** (compilation Maven, tests unitaires, test d'intégration E2E inter-microservices sur les ports `3001`–`3004`, construction des images Docker sur `deploy`/`main`). **Le dossier `frontend/` n'est ni compilé, ni linté, ni testé, ni conteneurisé dans la CI/CD.**
- **`docker-compose.yml`** : définit 10 services Java et leurs réseaux/dépendances, mais **ne déclare aucun service pour le frontend**. Le frontend est actuellement lancé manuellement hors Docker via `npm run dev`.

---

## 5. Relations entre le frontend et le backend

- **Point d'entrée unique** : le frontend appelle exclusivement le préfixe relatif `/api` (`SITE_CONFIG.apiBaseUrl` dans `frontend/src/config.js`).
- **Résolution réseau** : en développement, Vite (`frontend/vite.config.js`) proxyfie `/api/*` vers `http://localhost:8080` (`api-gateway`).
- **Routage Gateway (`api-gateway/src/main/resources/application.yml`)** :
  - `/api/patrimoines/**` → `ms-patrimoine:3001` (consommé par le front)
  - `/api/circuits/**` → `ms-circuit:3002` (consommé par le front)
  - `/api/evenements/**` → `ms-evenement:3003` (consommé par le front)
  - `/api/reservations/**` → `ms-reservation:3004` (consommé par le front)
  - `/api/utilisateurs/**` → `ms-utilisateur:3005` (**non consommé** par le front)
  - `/api/paiements/**` → `ms-paiement:3006` (**non consommé** par le front)
  - `/api/notifications/**` → `ms-notification:3007` (**non consommé** par le front)
- **Contrat d'erreur commun** : tous les microservices possèdent un `GlobalExceptionHandler` retournant `{"erreur": "<message>"}`. Le client HTTP frontend (`frontend/src/api/client.js`) s'appuie directement sur cette structure (`data?.erreur`).

---

## 6. Conventions de développement observées

- **Langue du domaine** : français dans le code métier, les DTO, les routes (`/patrimoines`, `/evenements`, `/reserver`), les commentaires et les messages d'erreur.
- **Convention CSS** : méthodologie BEM (`block__element--modifier`) et utilisation stricte des variables CSS définies dans `tokens.css` (aucune couleur hexadécimale codée en dur en dehors de `tokens.css`).
- **Composants React** : composants fonctionnels `export default function`, sans PropTypes ni TypeScript, fichiers `.jsx` appairés à un fichier `.css` homonyme importé directement.
- **État actuel de vérification locale** : `frontend/node_modules/` n'étant pas présent sur disque et les règles de protection interdisant toute installation de dépendances, aucun `vite build` n'a été exécuté durant cet audit. L'inspection statique complète des 51 fichiers du frontend a été réalisée ligne par ligne.
