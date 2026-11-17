# AUDIT DÉTAILLÉ DU FRONTEND REACT

**Périmètre** : `frontend/` (51 fichiers inspectés intégralement)  
**Framework** : React `19.3.1` + React Router DOM `7.18.5` + Vite `6.4.5`

---

## 1. Inventaire et organisation des fichiers (`frontend/src/`)

| Dossier / Fichier | Rôle | Lignes | Observations |
|---|---|---|---|
| `main.jsx` | Point d'entrée (`createRoot`, `StrictMode`, `global.css`) | 12 | Standard Vite |
| `App.jsx` | Enveloppe `<BrowserRouter><AppRoutes /></BrowserRouter>` | 13 | Aucun Provider/Context global |
| `routes.jsx` | Déclaration centralisée des 8 routes + wildcard 404 | 48 | Aucun lazy loading (`React.lazy`) |
| `config.js` | `SITE_CONFIG` (nom, slogan, `/api`, infos UASZ, `memorialKeywords`) | 24 | Config statique non liée à `import.meta.env` |
| `api/client.js` | Wrapper `apiRequest(endpoint, options)` sur `fetch` | 60 | Extrait `data?.erreur`, pas de timeout ni `AbortController` |
| `api/patrimoines.js` | `getAllPatrimoines()`, `getPatrimoineById(id)` | 13 | Lecture seule |
| `api/circuits.js` | `getAllCircuits()`, `getCircuitById(id)` | 13 | Lecture seule |
| `api/evenements.js` | `getAllEvenements()`, `getEvenementById(id)` | 13 | Lecture seule |
| `api/reservations.js` | `getAllReservations()`, `getReservationById(id)`, `createReservation()`, `cancelReservation()` | 28 | Pas d'appel DELETE ni paiement |
| `utils/formatters.js` | `isLieuDeMemoire`, `formatPrixFCFA`, `formatDureeMinutes`, `formatDateHeure`, `formatDifficulte`, `formatTypeEvenement` | 77 | Fonctions pures facilement portables en Pipes/utils TS |
| `styles/tokens.css` | Design tokens CSS (`:root`) | 107 | Source unique de vérité visuelle |
| `styles/global.css` | Reset, `.container`, `.cards-grid`, `.badge`, `.detail-layout`, `.memorial-notice` | 257 | Styles globaux + responsive |
| `components/*` | 12 composants JSX + 9 CSS | ~780 JSX | UI réutilisable bien découpée |
| `pages/*` | 8 pages JSX + 3 CSS | ~1770 JSX | Logique métier, fetch et présentation couplés |

**Total code source JS/JSX** : environ **2 830 lignes** (hors CSS). C'est une application frontend de taille **petite à modeste**, très lisible, sans sur-abstraction.

---

## 2. Analyse architecturale React

### 2.1 Points d'entrée et routage (`routes.jsx`)
- Utilisation classique de `BrowserRouter` + `<Routes>` avec un `<Route element={<Layout />}>` parent qui rend `<Outlet />`.
- **Routes déclarées** :
  - `/` → `HomePage`
  - `/patrimoines` → `PatrimoinesPage`
  - `/patrimoines/:id` → `PatrimoineDetailPage`
  - `/circuits` → `CircuitsPage`
  - `/circuits/:id` → `CircuitDetailPage`
  - `/evenements` → `EvenementsPage`
  - `/evenements/:id` → `EvenementDetailPage`
  - `/reserver` → `ReserverPage`
  - `*` → `EmptyState` (404)
- **Absence de code-splitting** : toutes les pages sont importées de manière synchrone.
- **Absence de gestion de scroll** : aucun `ScrollRestoration` ou retour en haut de page lors du changement de route.
- **Absence de titre de page dynamique** : `<title>` reste statiquement *"Patrimoine du Sénégal — Plateforme Touristique"* sur toutes les routes.

### 2.2 Composants et layouts
- **Composant Layout** (`Layout.jsx`) : gère le header sticky, la barre de recherche globale (qui redirige vers `/patrimoines?q=...`), le menu burger mobile (`menuOpen`) et le footer.
- **Composants UI partagés** :
  - `Button.jsx` : composant polymorphe rendant `<Link>` (si `to`), `<a>` (si `href`) ou `<button>` selon les props.
  - `Card.jsx` : carte générique (image `PatrimoineImage`, badges, titre, description tronquée à 3 lignes, métadonnées clé/valeur, CTA).
  - `FilterBar.jsx` : barre de filtres pilotée par une configuration déclarative (`filters[]` avec types `search`, `select`, `number`, `date`).
  - `FormField.jsx` : champ générique (`text`, `email`, `tel`, `number`, `select`, `textarea`).
  - `InfoBox.jsx` : encadré latéral "Informations pratiques" avec génération du lien OpenStreetMap si `latitude`/`longitude` sont non nuls.
  - `Breadcrumb.jsx`, `Hero.jsx`, `PatrimoineImage.jsx`, `Loader.jsx`, `ErrorMessage.jsx`, `EmptyState.jsx`.
- **Bonne pratique observée** : les composants dans `src/components/` sont majoritairement présentationnels et découplés des appels API.

### 2.3 Gestion d'état, hooks et contextes
- **Aucun Context React**, aucun store global (Redux, Zustand, TanStack Query).
- Chaque page gère indépendamment ses états locaux via `useState`, `useCallback`, `useEffect` et `useMemo`.
- **Aucun hook personnalisé (`src/hooks/` inexistant)** : le pattern `[data, loading, error]` + `chargerX = useCallback(...)` + `useEffect(...)` est **dupliqué à l'identique 8 fois** dans les 8 pages.

### 2.4 Services API et appels HTTP (`src/api/`)
- Centralisation propre dans `apiRequest()` (`src/api/client.js`) autour de `fetch`.
- Gestion explicite du statut HTTP `204` (`return null`), parsing défensif du JSON via `response.text()` puis `JSON.parse`, et extraction de `data?.erreur || data?.message || data?.error`.
- **Faiblesses identifiées** :
  1. **Pas d'`AbortController`** : si l'utilisateur change rapidement de fiche (`/patrimoines/1` → `/patrimoines/2`) ou quitte la page pendant un appel lent, la réponse précédente peut écraser l'état courant (race condition) ou provoquer un comportement incohérent.
  2. **Pas de timeout réseau** côté `fetch` (contrairement au back-end qui configure `connect-timeout: 2000` et `read-timeout: 5000` sur Feign).
  3. **Pas de cache** : chaque navigation vers une page recharge intégralement `GET /api/patrimoines`, `GET /api/circuits`, etc.
  4. **Appels réseau redondants** :
     - `CircuitsPage` appelle `getAllCircuits()` + `getAllPatrimoines()` (car `GET /api/circuits` n'enrichit pas `etape.patrimoine`).
     - `CircuitDetailPage` appelle `getCircuitById(id)` + `getAllCircuits()` + `getAllPatrimoines()`, alors que `getCircuitById` enrichit déjà `etape.patrimoine` côté serveur et que `getAllCircuits()` n'est utilisé que pour extraire 3 fiches "À voir aussi".
     - Même schéma sur `EvenementsPage`, `EvenementDetailPage` et `PatrimoineDetailPage`.

### 2.5 Formulaires et validation
- **Un seul formulaire métier** : `ReserverPage.jsx` (`POST /api/reservations`), plus deux formulaires de recherche (`Layout.jsx` et `Hero.jsx`).
- `ReserverPage.jsx` utilise un état objet unique `formData` sans bibliothèque (ni React Hook Form, ni Zod/Yup).
- La validation repose quasi uniquement sur les attributs HTML5 (`required`, `type="email"`, `min={1}`) et sur le retour `400 Bad Request` du backend (`@Valid` et règles métier de `ReservationService`).
- **Anomalie de conception dans `ReserverPage.jsx`** :
  - L'état `submitError` est partagé entre la création (`handleSubmit`, colonne gauche) et l'annulation (`handleAnnuler`, colonne droite). Si `cancelReservation(id)` échoue, le message s'affiche dans le panneau gauche sous le titre **"Réservation refusée"** !
  - `initialType`, `initialCircuitId` et `initialEvenementId` sont lus une seule fois dans `useState` ; si l'URL `/reserver?...` change sans démontage du composant, le formulaire ne se met pas à jour.
  - Les champs `nombrePlaces` acceptent potentiellement les décimaux (absence de `step={1}`) et ne sont pas bornés côté front par le nombre de places restantes.

### 2.6 Bugs et problèmes de couplage identifiés
1. **Désynchronisation URL / filtre sur `PatrimoinesPage.jsx` (lignes 57–62)** :
   - Le `useEffect` ne met à jour `filters.search` que lorsque `searchParams.get('q') !== null`.
   - Conséquence 1 : si l'utilisateur est sur `/patrimoines?q=Gorée` puis clique dans la barre de navigation sur « Patrimoines » (`/patrimoines`, où `q === null`), `filters.search` conserve `'Gorée'` au lieu de se vider.
   - Conséquence 2 : si l'utilisateur modifie ou efface le champ recherche dans `FilterBar`, le paramètre `?q=Gorée` reste figé dans la barre d'adresse jusqu'au clic sur « Réinitialiser les filtres ».
2. **Duplication du dictionnaire `patrimoinesMap`** : reconstruit manuellement avec le même `forEach` dans `CircuitsPage.jsx`, `CircuitDetailPage.jsx`, `EvenementsPage.jsx`, `EvenementDetailPage.jsx`.
3. **Couplage fort aux DTO backend** : les composants accèdent directement aux noms de propriétés Java (`nomPatrimoine`, `capacitePatrimoine`, `dureeEstimee`, `montantTotal`) sans couche d'adaptation/mapping ni contrat TypeScript.
4. **Absence totale de tests, lint et typage** : aucune suite de tests unitaires/composants/E2E, pas de ESLint, pas de TypeScript.

---

## 3. Synthèse qualité & performance frontend

| Critère | État vérifié | Risque pour la migration |
|---|---|---|
| Erreurs de compilation / TS | N/A (JS pur sans `tsconfig.json`, sans ESLint) | Moyen : absence de contrats typés vérifiables automatiquement |
| `node_modules` & build | `node_modules/` absent sur disque ; `vite build` non exécuté (règle de non-modification) | Faible : code JS syntaxiquement sain à la lecture |
| Dépendances inutilisées | Aucune dans `package.json` (3 prod, 2 dev toutes utilisées) | Faible |
| Tests existants | **0 test frontend** (contrairement aux 10 services Java testés en CI) | Élevé : aucune filets de sécurité fonctionnelle automatisée |
| Performance runtime | Appels réseau redondants (`getAllPatrimoines`/`getAllCircuits`), pas de cache, pas de lazy loading | Faible à moyen sur petit jeu de données, problématique si le catalogue grandit |
| Risque de fuite / race condition | `useEffect` asynchrone sans `AbortController` ni flag d'annulation | Moyen sur connexions lentes |
