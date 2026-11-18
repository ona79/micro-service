# RAPPORT DES TESTS END-TO-END (PLAYWRIGHT — DESKTOP, MOBILE & FULL-STACK)

**Date d'exécution** : 17 Novembre 2026  
**Outil** : `@playwright/test` `1.59.1` (Chromium `1248` Headless)  
**Fichier de test** : `frontend-angular/e2e/patrimoine.spec.ts`  
**Serveur testé** : `http://localhost:4200` (connecté par proxy à `api-gateway` `:8090` et aux microservices `:3001`–`:3007`)

---

## 1. Synthèse des Scénarios End-to-End Exécutés

| # | Profil Navigateur | Scénario E2E | Vérifications réalisées | Durée | Statut |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `desktop-chromium` (`1280×800`) | Parcours complet multi-pages & Mode Mémoire | Skip-link, landmark `<main>`, `<h1>` unique, compteur de sites, recherche Hero `?q=Gorée`, ouverture de la fiche *Maison des Esclaves de Gorée* (bandeau mémoriel `.memorial-notice` + fil d'Ariane), navigation vers `/circuits` -> détail circuit (`.timeline-item` $\times 3$), navigation vers `/evenements`, gestion de la route inconnue `404`, `0` erreur console/runtime | `~7.8 s` | **PASS** |
| 2 | `desktop-chromium` (`1280×800`) | Tunnel de réservation & Annulation avec modale CDK | Pré-sélection via `/reserver?type=CIRCUIT&circuitId=1`, saisie Reactive Forms, calcul temps réel du devis (`30 000 FCFA`), soumission `POST /api/reservations`, affichage de la confirmation `.booking-success`, clic sur « Annuler », ouverture de la modale `@angular/cdk/dialog` (`role="dialog"`), confirmation de l'annulation (`statut = ANNULEE`) | `~2.0 s` | **PASS** |
| 3 | `desktop-chromium` (`1280×800`) | **Flux Full-Stack Réel sans mock** (`Angular` -> `API Gateway :8090` -> `ms-* :3001..3004` -> `H2`) | Chargement réel des 3 sites depuis `ms-patrimoine`, ouverture du circuit réel *« De Gorée à la Casamance : Mémoire et Teranga »*, vérification des 3 étapes résolues et de la distance Haversine réelle (`284.08 km`), création d'une réservation réelle (`Fatou Ndiaye E2E`) persistée dans la base H2 de `ms-reservation` | `~3.5 s` | **PASS** |
| 4 | `mobile-chromium` (`375×812` Pixel 5) | Parcours complet sur viewport mobile | Identique au scénario #1 sur écran tactile `375×812` | `~6.1 s` | **PASS** |
| 5 | `mobile-chromium` (`375×812` Pixel 5) | Tunnel de réservation & Modale CDK sur mobile | Identique au scénario #2 sur écran tactile `375×812` | `~2.7 s` | **PASS** |
| 6 | `mobile-chromium` (`375×812` Pixel 5) | Menu burger mobile, absence d'overflow horizontal & touche `Escape` | Vérification `document.documentElement.scrollWidth <= window.innerWidth` (`false` overflow), ouverture du tiroir `#mobile-navigation` via `.burger-btn`, fermeture clavier par touche `Escape` | `~1.5 s` | **PASS** |

---

## 2. Résultat Global Playwright

- **Tests actifs exécutés** : **6 / 6 PASS** (`0` échec)
- **Erreurs JavaScript non gérées (`pageerror`)** : **`0`**
- **Commande de reproduction** :
  ```bash
  cd /home/mahou-dev/micro-service/frontend-angular
  npx playwright test
  ```
