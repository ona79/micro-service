# RAPPORT DES LIMITATIONS TECHNIQUES ET VISUELLES DU FRONTEND (P07.7)

**Projet** : Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance  
**Date d'audit** : 18 Novembre 2026  
**Branche Git** : `feature/p07-7-frontend-capture`  
**Commit analysé** : `af08df2`  
**Contexte** : Analyse de l'application réelle exécutée (Docker Compose, PostgreSQL 16, Spring Boot, Angular 22)

---

## 1. Synthèse de l'Accessibilité et des Pages Capturées

Toutes les **33 pages et routes réelles** de l'application déclarées dans `app.routes.ts` ont été atteintes et capturées (116 fichiers PNG au total).  
Aucune route n'a été bloquée par un crash applicatif ou une indisponibilité système une fois les conteneurs initialisés.

Néanmoins, l'exploration visuelle réelle a mis en lumière plusieurs **limitations d'ergonomie, dépendances de données et particularités de flux**, détaillées ci-après.

---

## 2. Inventaire des Limitations Identifiées

### LIM-001 : Dépendance aux Données de Démonstration pour les Fiches Détails
- **Identifiants concernés** : `PUB-003` (`/patrimoines/:id`), `PUB-005` (`/circuits/:id`), `PUB-007` (`/evenements/:id`), `PUB-009` (`/guides/:id`).
- **Comportement observé** : Si un identifiant inexistant est passé dans l'URL (ex. `/patrimoines/999`), l'application affiche une bannière d'erreur HTTP 404 standard avec le composant `app-ui-error-banner`.
- **Preuve** : Les captures nominales ont été effectuées sur les entités réellement présentes en base de données (`patrimoineId=1`, `circuitId=1`, `evenementId=1`, `guideId=5`).
- **Impact pour la refonte** : Prévoir des pages d'état vide enrichies (« Site non trouvé ou en cours de révision culturelle ») avec des suggestions alternatives de sites voisins, plutôt qu'une simple bannière d'erreur technique.

---

### LIM-002 : Autorisation du Contrôle d'Accès et Simulation de Caméra
- **Identifiants concernés** : `PRO-010` (`/pro/controle-acces`), `CONS-004`, `GEST-006`, `ADMIN-012`.
- **Comportement observé** : L'interface de scan de billets QR propose la saisie manuelle du code ou l'activation d'un lecteur de caméra. Dans un environnement de conteneur ou serveur headless sans flux vidéo physique (webcam matérielle), le composant bascule sur le mode saisie manuelle de jeton/numéro de billet (`NUM-RES-...` ou `UUID-TOKEN-QR`).
- **Preuve** : Capture [`captures-frontend/06_GESTIONNAIRE/GEST-006_controle-acces-scanner.png`](file:///home/mahou-dev/micro-service/captures-frontend/06_GESTIONNAIRE/GEST-006_controle-acces-scanner.png) montrant le champ de saisie rapide et l'historique de validation en direct.
- **Recommandation pour la refonte** : Prévoir une interface claire de feedback tactile (vibration/bip sonore simulé) et un sélecteur de caméra avant/arrière pour les agents équipés de terminaux mobiles sur le terrain (embarcadères de Carabane, musées d'Oussouye).

---

### LIM-003 : Permissions Requises pour la Géolocalisation Réelle
- **Identifiants concernés** : `PUB-002` (`/patrimoines`), `ETAT-001`.
- **Comportement observé** : Le bouton **« Autour de moi (GPS) »** utilise l'API standard `navigator.geolocation.getCurrentPosition`. Si l'utilisateur refuse la géolocalisation dans son navigateur ou si le protocole n'est pas sécurisé (hors HTTPS ou localhost), le navigateur bloque la requête et l'interface affiche une notification discrète sans réordonner la liste.
- **Preuve** : Capture [`captures-frontend/09_INTERACTIONS/ETATS/ETAT-001_gps-proximite-actif.png`](file:///home/mahou-dev/micro-service/captures-frontend/09_INTERACTIONS/ETATS/ETAT-001_gps-proximite-actif.png) réalisée avec permission accordée et coordonnées simulées de Ziguinchor (`12.5833, -16.2719`), affichant les distances réelles `📍 à ~X km`.
- **Recommandation pour la refonte** : Ajouter un sélecteur manuel de « Point de départ » (ex: *« Je suis à Cap Skirring »*, *« Je suis à Ziguinchor »*, *« Je suis à Kolda »*) lorsque l'utilisateur ne souhaite pas ou ne peut pas activer son GPS.

---

### LIM-004 : Coexistence de l'Administration Monolithique Historique et du Back-Office Pro
- **Identifiants concernés** : `ADMIN-013` (`/administration`) vs `ADMIN-001..012` (`/pro/**`).
- **Comportement observé** : La plateforme contient deux univers d'administration distincts :
  1. `/administration` : Interface monolithique basée sur `MainLayout` avec onglets horizontaux (`Patrimoines`, `Circuits`, `Événements`, `Utilisateurs`), issue des premières phases du projet.
  2. `/pro/**` : Back-office modulaire complet basé sur `ProLayout` avec barre latérale dédiée, fil d'Ariane, TopBar et contrôle d'accès strict par rôle.
- **Preuve** : Capture [`captures-frontend/07_ADMIN/ADMIN-013_administration-monolithique.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-013_administration-monolithique.png).
- **Recommandation pour la refonte** : Déprécier définitivement `/administration` et rediriger l'ensemble des acteurs vers `/pro/tableau-de-bord` pour unifier l'expérience professionnelle.

---

### LIM-005 : Densité d'Information des Tableaux sur Écrans Mobiles
- **Identifiants concernés** : `08_RESPONSIVE/MOBILE/ADMIN-001_dashboard_390px.png`, `PRO-010_controle-acces_390px.png`.
- **Comportement observé** : Sur un écran de 390 px de large, certains tableaux contenant de multiples colonnes (références, dates, montants, actions, statuts) nécessitent un scroll horizontal ou compressent les textes, ce qui peut réduire la lisibilité sans mise en forme sous forme de « cartes empilées » (card-view).
- **Recommandation pour la refonte** : Transformer automatiquement les tableaux en cartes verticales empilées (`flex-col`) dès que la largeur d'écran passe sous le point de rupture de 768 px.
