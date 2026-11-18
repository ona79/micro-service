# CARTOGRAPHIE DES DÉPENDANCES

Ce document cartographie les dépendances **NPM du frontend**, les **dépendances externes runtime**, les **dépendances internes entre modules React** et les **dépendances inter-microservices côté backend**.

---

## 1. Dépendances NPM du Frontend (`frontend/package.json` & `package-lock.json`)

Le frontend est volontairement minimaliste : **3 dépendances de production** et **2 dépendances de développement**, pour un total de **119 paquets** résolus dans `package-lock.json` (`lockfileVersion: 3`).

### 1.1 Dépendances directes
| Paquet | SemVer (`package.json`) | Version verrouillée | Type | Utilisation | Statut |
|---|---|---|---|---|---|
| `react` | `^19.0.0` | `19.3.1` | Production | Noyau composants, hooks (`useState`, `useEffect`, `useCallback`, `useMemo`) | Utilisée partout |
| `react-dom` | `^19.0.0` | `19.3.1` | Production | `ReactDOM.createRoot` dans `main.jsx` | Utilisée |
| `react-router-dom` | `^7.5.0` | `7.18.5` | Production | `BrowserRouter`, `Routes`, `Route`, `Link`, `NavLink`, `Outlet`, `useNavigate`, `useParams`, `useSearchParams` | Utilisée |
| `@vitejs/plugin-react` | `^4.3.4` | `4.7.0` | Dev | Compilation JSX + Fast Refresh | Utilisée (`vite.config.js`) |
| `vite` | `^6.2.0` | `6.4.5` | Dev | Serveur dev + proxy `/api` + bundler | Utilisée |

### 1.2 Analyse des dépendances inutilisées et lacunes
- **Aucune dépendance inutilisée** dans `package.json`.
- **Aucune bibliothèque tierce UI, HTTP, formulaire, validation, icônes ou test** :
  - Pas d'Axios (utilise `fetch` natif).
  - Pas de Tailwind / Material UI / Bootstrap (CSS pur + `tokens.css`).
  - Pas de bibliothèque d'icônes (utilise des caractères texte `→`, `↗`, `/` et barres CSS pour le burger).
  - Pas de TypeScript, ESLint, Prettier, Vitest ou Playwright.

---

## 2. Dépendances externes runtime (hors dépôt)

| Service externe | Lieu d'utilisation | Criticité | Comportement si hors-ligne |
|---|---|---|---|
| **Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`)** | `frontend/index.html` (police `Nunito` graisses 400, 600, 700, 800) | Faible | Repli sur `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` (`tokens.css`) |
| **OpenStreetMap (`openstreetmap.org`)** | `frontend/src/components/InfoBox.jsx` (`https://www.openstreetmap.org/?mlat=...&mlon=...`) | Faible | Lien externe `<a target="_blank">` ; pas d'appel API ni carte embarquée |

---

## 3. Graphe des dépendances internes du Frontend

```text
main.jsx
 ├── styles/global.css ──> styles/tokens.css
 └── App.jsx
      └── routes.jsx
           ├── components/Layout.jsx (+ Layout.css, config.js)
           │    └── <Outlet />
           ├── pages/HomePage.jsx (+ HomePage.css)
           │    ├── api/patrimoines.js ──> api/client.js ──> config.js
           │    ├── utils/formatters.js ──> config.js
           │    └── components/{Hero, Card, Button, Loader, ErrorMessage, EmptyState}
           ├── pages/PatrimoinesPage.jsx
           │    ├── api/patrimoines.js
           │    ├── utils/formatters.js
           │    └── components/{FilterBar, Card, Loader, ErrorMessage, EmptyState}
           ├── pages/PatrimoineDetailPage.jsx
           │    ├── api/patrimoines.js
           │    ├── utils/formatters.js
           │    └── components/{Breadcrumb, PatrimoineImage, InfoBox, Card, Loader, ErrorMessage}
           ├── pages/CircuitsPage.jsx
           │    ├── api/{circuits.js, patrimoines.js}
           │    ├── utils/formatters.js
           │    └── components/{FilterBar, Card, Loader, ErrorMessage, EmptyState}
           ├── pages/CircuitDetailPage.jsx (+ CircuitDetailPage.css)
           │    ├── api/{circuits.js, patrimoines.js}
           │    ├── utils/formatters.js
           │    └── components/{Breadcrumb, PatrimoineImage, InfoBox, Card, Button, Loader, ErrorMessage}
           ├── pages/EvenementsPage.jsx
           │    ├── api/{evenements.js, patrimoines.js}
           │    ├── utils/formatters.js
           │    └── components/{FilterBar, Card, Loader, ErrorMessage, EmptyState}
           ├── pages/EvenementDetailPage.jsx
           │    ├── api/{evenements.js, patrimoines.js}
           │    ├── utils/formatters.js
           │    └── components/{Breadcrumb, PatrimoineImage, InfoBox, Card, Button, Loader, ErrorMessage}
           └── pages/ReserverPage.jsx (+ ReserverPage.css)
                ├── api/{reservations.js, circuits.js, evenements.js}
                ├── utils/formatters.js
                └── components/{FormField, Button, Loader, ErrorMessage, EmptyState}
```

### Couplages notables
- `Card.jsx` dépend de `PatrimoineImage.jsx` et `Button.jsx`.
- `Hero.jsx`, `FilterBar.jsx`, `InfoBox.jsx`, `EmptyState.jsx`, `ErrorMessage.jsx` dépendent tous de `Button.jsx`.
- `CircuitsPage`, `CircuitDetailPage`, `EvenementsPage`, `EvenementDetailPage` dépendent toutes de `api/patrimoines.js` en plus de leur propre domaine pour résoudre l'image (`codePatrimoine`) et les coordonnées GPS.

---

## 4. Cartographie des dépendances Backend & Réseau

```text
[Frontend :5173 (Vite Proxy /api)]
        │
        ▼
[api-gateway :8080] ──(Eureka :8761)── [discovery-server :8761]
        │                               [config-server :8888]
        ├── /api/patrimoines/**  ──► [ms-patrimoine :3001] (H2: patrimoinedb)
        │                                 ▲          ▲
        ├── /api/circuits/**     ──► [ms-circuit :3002] (Feign/RestTemplate/WebClient)
        │                                 ▲          │
        ├── /api/evenements/**   ──► [ms-evenement :3003] (Feign)
        │                                 ▲          ▲
        ├── /api/reservations/** ──► [ms-reservation :3004] (Feign)
        │                                 ▲
        ├── /api/paiements/**    ──► [ms-paiement :3006] (Feign) ──► [ms-notification :3007]
        │
        └── /api/utilisateurs/** ──► [ms-utilisateur :3005] (Autonome)
```

### Impact pour la migration Angular
1. **Dépendance critique à `api-gateway` (`:8080`)** : toutes les routes passent par un unique préfixe `/api`. Aucun appel direct aux ports `3001`–`3007` n'est effectué par le front.
2. **Contraintes de routage en Docker vs Local** :
   - En local (`npm run dev` / `ng serve`), un proxy dev (`/api` → `http://localhost:8080`) est indispensable pour éviter les blocages CORS (aucun header CORS configuré sur `api-gateway`).
   - En production Docker, le futur conteneur Angular (Nginx) devra obligatoirement proxyfier `/api/` vers `http://api-gateway:8080/api/` ou configurer CORS sur `api-gateway`.
3. **Compatibilité environnement machine pour Angular v22** :
   - Version Node locale détectée : **`v26.12.0`**, npm **`11.20.0`**.
   - Angular v22 (dernière version majeure stable en 2026) requiert **Node.js `>= 22.22.3`** (support jusqu'à Node 24 et 26) et **TypeScript `>= 6.0`**. L'environnement Node local (`v26.12.0`) est donc **compatible** avec Angular v22.
