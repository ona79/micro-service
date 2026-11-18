# MATRICE DE NON-RÉGRESSION (REACT → ANGULAR)

Cette matrice liste tous les comportements fonctionnels, règles métier d'affichage, contrats API et exigences UI/UX observés dans le frontend React qui doivent être **impérativement préservés et testés** dans l'application Angular cible.

---

## 1. Navigation, Layout et Comportements transverses

| ID | Catégorie | Source React | Comportement attendu à préserver | Vérification / Test | Priorité |
|---|---|---|---|---|---|
| NR-001 | Layout / Nav | `Layout.jsx` | Header sticky avec nom `Patrimoine du Sénégal`, slogan, barre recherche et 5 liens (`Accueil`, `Patrimoines`, `Circuits`, `Événements`, `Réserver`) avec état actif | Test composant + E2E | Critique |
| NR-002 | Recherche globale | `Layout.jsx`, `Hero.jsx` | Soumettre un terme redirige vers `/patrimoines?q=<terme>` ; soumettre à vide redirige vers `/patrimoines` | Test composant + E2E | Élevée |
| NR-003 | Responsive mobile | `Layout.css` (`<= 860px`) | Menu burger bascule l'affichage de `.site-nav` (`aria-expanded`), clic sur lien ou soumission recherche referme le menu | Test viewport `375px` | Élevée |
| NR-004 | Fil d'Ariane | `Breadcrumb.jsx` | Affiche les segments cliquables et le dernier segment non cliquable avec `aria-current="page"` | Test unitaire | Moyenne |
| NR-005 | Route 404 | `routes.jsx` | Toute URL inconnue affiche l'`EmptyState` « Page introuvable (404) » et un bouton de retour vers `/` | Test router | Moyenne |
| NR-006 | Gestion erreurs HTTP | `client.js`, `ErrorMessage.jsx` | Toute réponse `!ok` extrait `{"erreur": "..."}` du backend et l'affiche ; perte réseau affiche un message explicite ; bouton « Réessayer » relance la requête | Test `HttpTestingController` | Critique |

---

## 2. Règles de formatage et logique d'affichage

| ID | Catégorie | Source React | Règle exacte à préserver | Jeu de test minimum | Priorité |
|---|---|---|---|---|---|
| NR-007 | Formatage prix | `formatters.js` (`formatPrixFCFA`) | `null`/`undefined` → `'Non renseigné'`, `0` → `'Gratuit'`, `15000` → `'15 000 FCFA'` (`fr-FR`) | Test unitaire Pipe | Élevée |
| NR-008 | Formatage durée | `formatters.js` (`formatDureeMinutes`) | `null`/`undefined` → `'Non renseignée'`, `< 60` → `'45 min'`, `120` → `'2 h'`, `150` → `'2 h 30 min'`, `0` → `'0 min'` | Test unitaire Pipe | Élevée |
| NR-009 | Formatage date | `formatters.js` (`formatDateHeure`) | Vide → `'Date non renseignée'`, invalide → chaîne brute, ISO valide → format `fr-FR` jour mois année hh:mm | Test unitaire Pipe | Élevée |
| NR-010 | Enums métier | `formatters.js` | `FACILE`→`Facile`, `MOYEN`→`Modéré`, `DIFFICILE`→`Sportif` ; `EXPOSITION`→`Exposition`, `ATELIER`→`Atelier culturel`, `VISITE_GUIDEE`→`Visite guidée`, `CONFERENCE`→`Conférence`, `FESTIVAL`→`Festival` | Test unitaire Pipes | Élevée |
| NR-011 | Lieux de mémoire | `config.js`, `formatters.js` (`isLieuDeMemoire`) | Si `nomPatrimoine`, `codePatrimoine` ou `descriptionPatrimoine` contient `joola`, `esclaves`, `memorial` ou `mémorial` (insensible à la casse), activer les classes `--sobre` / `--memorial` et le bandeau `.memorial-notice` | Test unitaire + visuel sur `PAT-DKR-001` | Critique |
| NR-012 | Images & Fallback | `PatrimoineImage.jsx`, `Hero.jsx` | Charge `/images/patrimoines/<codePatrimoine>.jpg` (`loading="lazy"`) ; si absent ou erreur `onError`, affiche le bloc fallback (vert doux ou sobre) avec code + nom | Test composant | Élevée |
| NR-013 | GPS OpenStreetMap | `InfoBox.jsx` | Affiche coordonnées à 4 décimales + lien `openstreetmap.org/?mlat=...&mlon=...` (`target="_blank" rel="noopener noreferrer"`) uniquement si lat/lon non null et non tous deux à `0` | Test composant | Moyenne |

---

## 3. Domaine Accueil & Patrimoines

| ID | Page | Endpoint | Scénario et critères d'acceptation | Priorité |
|---|---|---|---|---|
| NR-014 | `/` (`HomePage`) | `GET /api/patrimoines` | Affiche Hero + 3 piliers + max 3 cartes vedettes + compteur total sur bouton « Tout le catalogue (N) » ; gère états Loader, Error, Empty | Critique |
| NR-015 | `/patrimoines` | `GET /api/patrimoines` | Filtrage texte sur `nom`, `code`, `adresse`, `description` ; filtre `capaciteMin` ; tri `nom_asc` (`fr`), `capacite_desc`, `capacite_asc` ; compteur `X résultats sur Y` ; bouton Réinitialiser | Critique |
| NR-016 | `/patrimoines` *(Correctif inclus)* | — | Synchro URL `?q=` : naviguer vers `/patrimoines` sans `?q=` vide la recherche ; taper dans le champ reste cohérent avec l'URL | Élevée |
| NR-017 | `/patrimoines/:id` | `GET /api/patrimoines/{id}`, `GET /api/patrimoines` | Fiche complète + encadré `InfoBox` (CTA `/reserver`) + max 3 autres patrimoines dans « À voir aussi » (excluant l'ID courant) | Critique |

---

## 4. Domaine Circuits & Événements

| ID | Page | Endpoints | Scénario et critères d'acceptation | Priorité |
|---|---|---|---|---|
| NR-018 | `/circuits` | `GET /api/circuits`, `GET /api/patrimoines` | Filtres `search`, `difficulte`, `dureeMax`, `distanceMax` ; image résolue depuis la 1re étape triée par `ordre` | Critique |
| NR-019 | `/circuits/:id` | `GET /api/circuits/{id}`, `GET /api/circuits` | Étapes triées par `ordre` croissant, lien vers `/patrimoines/:patrimoineId`, durée sur place, `InfoBox` avec GPS du 1er patrimoine et CTA `/reserver?type=CIRCUIT&circuitId=:id`, section « À voir aussi » | Critique |
| NR-020 | `/evenements` | `GET /api/evenements`, `GET /api/patrimoines` | Filtres `search`, `typeEvenement`, `dateMin` (basé sur `dateFin || dateDebut >= dateMin`) ; image & mode sobre hérités du patrimoine lié | Critique |
| NR-021 | `/evenements/:id` | `GET /api/evenements/{id}`, `GET /api/evenements` | Lien vers patrimoine d'accueil, `InfoBox` (catégorie, dates début/fin, lieu avec fallback adresse patrimoine, capacité, tarif), CTA `/reserver?type=EVENEMENT&evenementId=:id`, « À voir aussi » | Critique |

---

## 5. Domaine Réservations

| ID | Page | Endpoints | Scénario et critères d'acceptation | Priorité |
|---|---|---|---|---|
| NR-022 | `/reserver` | `GET /api/circuits`, `GET /api/evenements`, `GET /api/reservations` | Chargement initial des listes ; si `?type=EVENEMENT&evenementId=X` ou `?type=CIRCUIT&circuitId=Y` est présent, sélectionne le bon type et l'ID correspondant | Critique |
| NR-023 | `/reserver` | `POST /api/reservations` | Création valide → `201`, affiche bannière succès avec `#id`, `nomClient`, `nombrePlaces`, `montantTotal` formaté FCFA, réinitialise les champs client, rafraîchit la liste | Critique |
| NR-024 | `/reserver` | `POST /api/reservations` | Capacité dépassée ou champs invalides → affiche le message `{"erreur": "..."}` du backend sans effacer les saisies utilisateur | Critique |
| NR-025 | `/reserver` *(Amélioration UX)* | `PUT /api/reservations/{id}/annuler` | Clic « Annuler la réservation » (avec confirmation UX) → statut passe à `ANNULEE`, le bouton disparaît pour la ligne annulée, style `.reservation-item--annulee` appliqué ; erreur éventuelle affichée dans la section liste (et non dans le formulaire) | Critique |
| NR-026 | `/reserver` | — | Bouton « Actualiser » recharge les réservations et listes | Moyenne |
