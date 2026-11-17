# PLAN DE MIGRATION PROGRESSIF (REACT → ANGULAR v22)

Ce document définit la stratégie de migration (Phase 4) avec comparaison des approches, découpage en étapes indépendantes et vérifiables, et procédure de retour arrière.

---

## 1. Comparaison des approches de migration

| Critère | Approche 1 : Big Bang (remplacement direct dans `frontend/`) | Approche 2 : Coexistence hybride in-app (Micro-frontends / Web Components React+Angular) | Approche 3 : **Reconstruction parallèle isolée (`frontend-angular/`) + bascule par validation** *(Recommandée)* |
|---|---|---|---|
| **Complexité technique** | Faible | Très élevée (Module Federation / Angular Elements, double runtime React+Angular, conflits routeur) | Modérée et maîtrisée |
| **Risque sur le projet existant** | Élevé (supprime/casse l'app React qui fonctionne) | Élevé (dette technique de pontage pour seulement 8 pages) | **Minimal** (le dossier `frontend/` React reste intact jusqu'à validation finale) |
| **Pertinence au vu de la taille (~2 800 lignes / 8 pages)** | Risque inutile sans rollback propre | Sur-ingénierie disproportionnée | **Optimale** : permet une livraison incrémentale vérifiable lot par lot |
| **Rollback** | Difficile (git revert massif) | Complexe | **Instantané** (relancer `frontend/` React ou pointer le port/Nginx vers React) |

### Recommandation retenue
Développer le nouveau frontend dans un **dossier parallèle dédié `frontend-angular/`** (sans toucher à `frontend/` ni au backend), en branchant les deux applications sur la même `api-gateway` (`:8080`). Une fois tous les critères de la matrice de non-régression validés, basculer le point d'entrée Docker/CI/README vers Angular, puis archiver ou retirer `frontend/` uniquement après validation utilisateur explicite.

---

## 2. Découpage en lots indépendants et vérifiables

### Lot 0 — Initialisation du socle Angular v22 & Design System
- **Éléments concernés** : création du workspace Angular v22 (`frontend-angular/`), `tsconfig.json` strict, `proxy.conf.json` (`/api` → `localhost:8080`), `tokens.css`, `global.css`, `index.html` (police `Nunito`), `environments/`.
- **Dépendances** : Node.js `>= 22.22.3` (vérifié : `v26.12.0` présent).
- **Risques** : divergence de CSS ou perte de tokens ; décalage de version TypeScript/CLI.
- **Fichiers créés (dans `frontend-angular/`)** : `package.json`, `angular.json`, `tsconfig*.json`, `proxy.conf.json`, `src/styles/{tokens.css,global.css}`, `src/environments/*`.
- **Tests nécessaires** : `ng build` + `ng test` à vide (smoke test).
- **Critères d'acceptation** : compilation stricte sans warning, variables `tokens.css` chargées, proxy `/api/patrimoines` fonctionnel en `ng serve`.

### Lot 1 — Core technique, Modèles, Intercepteurs, Shared UI & Shell Layout
- **Éléments concernés** : modèles TS (`Patrimoine`, `Circuit`, `Etape`, `Evenement`, `Reservation`, enums), `apiPrefixInterceptor`, `httpErrorInterceptor`, `PageTitleStrategy`, `MainLayoutComponent` (header, recherche, nav, burger avec `Escape` + skip-link, footer), composants `shared/components/*`, pipes `shared/pipes/*`.
- **Dépendances** : Lot 0.
- **Risques** : mauvaise gestion des erreurs `{"erreur": "..."}` ou perte de fidélité responsive du header/burger (< 860px).
- **Tests nécessaires** : tests unitaires de tous les pipes (`fcfa-price`, `duration-minutes`, `difficulte-label`, `evenement-type`), `isLieuDeMemoire()`, `httpErrorInterceptor` (statuts 0, 400, 404, 503), `MainLayoutComponent` (ouverture/fermeture burger, recherche header).
- **Critères d'acceptation** : rendu visuel du shell identique à React sur desktop (`1280px`) et mobile (`375px`), navigation routes squelettes sans erreur console.

### Lot 2 — Domaine Patrimoines & Page d'Accueil
- **Éléments concernés** : `PatrimoineApiService`, `PatrimoineStore`, `HomePageComponent` (`Hero` + 3 piliers + 3 cartes vedettes), `PatrimoinesListPageComponent` (filtres + tri + correction du bug `?q=`), `PatrimoineDetailPageComponent` (mode sobre lieu de mémoire, GPS OpenStreetMap, « À voir aussi »).
- **Dépendances** : Lot 1 + `ms-patrimoine` actif via Gateway.
- **Risques** : désynchronisation `?q=` si mal gérée, régression mode sobre (`memorialKeywords`).
- **Tests nécessaires** : `PatrimoineApiService` (`HttpTestingController`), `PatrimoineStore`, filtrage/tri `PatrimoinesListPageComponent`, synchronisation bidirectionnelle `?q=`, affichage `memorial-notice`.
- **Critères d'acceptation** : les 3 patrimoines initiaux (`PAT-DKR-001`, `PAT-DKR-002`, `PAT-ZIG-003`) s'affichent correctement ; `PAT-DKR-001` ("Maison des Esclaves") active bien le style sobre et le bandeau de recueillement ; `NR-001` à `NR-012` validés.

### Lot 3 — Domaine Circuits Touristiques
- **Éléments concernés** : `CircuitApiService`, `CircuitStore`, `CircuitsListPageComponent` (filtres recherche, difficulté, durée max, distance max), `CircuitDetailPageComponent` (étapes triées par `ordre`, liens vers fiches patrimoines, CTA `/reserver?type=CIRCUIT&circuitId=...`, « À voir aussi »).
- **Dépendances** : Lot 2 (`PatrimoineStore` utilisé pour résoudre les images et GPS).
- **Risques** : `GET /api/circuits` ne retournant pas `etapes[].patrimoine`, le composant doit s'appuyer sur `PatrimoineStore` avec fallback tolérant si `ms-patrimoine` est indisponible.
- **Tests nécessaires** : tri des étapes, filtres numériques `dureeMax`/`distanceMax`, enrichissement depuis `PatrimoineStore`, cas circuit sans étapes ou patrimoine manquant.
- **Critères d'acceptation** : parité fonctionnelle et visuelle complète avec `CircuitsPage.jsx` et `CircuitDetailPage.jsx`.

### Lot 4 — Domaine Événements Culturels
- **Éléments concernés** : `EvenementApiService`, `EvenementStore`, `EvenementsListPageComponent` (filtres recherche, `typeEvenement`, `dateMin`), `EvenementDetailPageComponent` (mode sobre hérité du patrimoine lié, lien patrimoine d'accueil, CTA `/reserver?type=EVENEMENT&evenementId=...`, « À voir aussi »).
- **Dépendances** : Lot 2 (`PatrimoineStore`).
- **Risques** : comparaison de dates ISO `LocalDateTime` sans fuseau horaire (attention aux décalages UTC vs heure locale sur le filtre `dateMin`).
- **Tests nécessaires** : filtre `dateMin` (cas `dateFin` absent vs présent), affichage des 5 valeurs `TypeEvenement`, héritage du mode sobre.
- **Critères d'acceptation** : parité complète avec `EvenementsPage.jsx` et `EvenementDetailPage.jsx`.

### Lot 5 — Domaine Réservations & Formulaires
- **Éléments concernés** : `ReservationApiService`, `ReservationStore`, `ReserverPageComponent` (création `POST /api/reservations`, liste `GET /api/reservations`, annulation `PUT /api/reservations/{id}/annuler` avec modale de confirmation `UiConfirmDialogComponent`), page 404.
- **Dépendances** : Lots 3 & 4 (`CircuitStore` & `EvenementStore`).
- **Risques** : erreur d'annulation mélangée au formulaire (corrigé via signaux séparés `createError` / `cancelError`), pré-remplissage `?type=...` lors de navigations successives, validation `nombrePlaces` entier `>= 1`.
- **Tests nécessaires** : validation formulaire, soumission `CIRCUIT` et `EVENEMENT`, gestion erreur 400 capacité insuffisante (`{"erreur": "..."}`), confirmation/annulation d'une réservation, mise à jour dynamique via query params.
- **Critères d'acceptation** : scénario complet création → affichage montant calculé → annulation → statut `ANNULEE` validé contre le backend réel.

### Lot 6 — Conteneurisation, CI/CD, Qualité & Bascule
- **Éléments concernés** : `frontend-angular/Dockerfile` + `nginx.conf`, ajout optionnel du service `frontend` dans `docker-compose.yml` et du job build/test frontend dans `.github/workflows/ci-cd.yml` (après accord utilisateur), audit Lighthouse/accessibilité, exécution intégrale de `MATRICE_NON_REGRESSION.md`.
- **Dépendances** : Lots 0 à 5 validés.
- **Conditions de validation** : 100 % des tests unitaires passants, `ng build` production sans erreur, 100 % des cas `NR-*` validés en environnement intégré avec les 10 microservices Docker.

### Lot 7 *(Évolutif — Hors parité stricte React, sur décision produit)*
- Intégration ultérieure des microservices aujourd'hui non exploités par React (`ms-utilisateur`, `ms-paiement`, `ms-notification`, back-office CRUD), **uniquement après sécurisation backend (JWT + BCrypt + RBAC)**.

---

## 3. Stratégie de retour arrière (Rollback)

À tout moment avant la suppression de `frontend/` (qui ne doit intervenir qu'après validation en production/recette) :
1. **En développement** : arrêter `ng serve` et relancer `cd frontend && npm run dev` sur le port `5173`.
2. **En déploiement Docker / Nginx** : conserver l'image/service `frontend-react` en tag de secours et basculer la route upstream ou le service `docker-compose.yml` vers React en moins d'une minute.
3. **Intégrité backend** : comme aucun contrat backend ni base de données n'est modifié pendant la migration frontend, le retour arrière est **100 % sans perte de données ni migration inverse**.
