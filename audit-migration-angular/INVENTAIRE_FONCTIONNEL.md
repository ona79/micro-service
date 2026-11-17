# INVENTAIRE FONCTIONNEL COMPLET

Ce document recense **toutes les fonctionnalités** identifiées dans le frontend React et dans le backend microservices, avec leur statut réel prouvé par le code source.

Légende des statuts (conformément à la grille d'audit) :
1. **Opérationnelle** : implémentée de bout en bout entre le frontend et le backend, logique vérifiée.
2. **Partiellement opérationnelle** : fonctionne dans le cas nominal mais comporte des limites, contournements ou manques d'intégration.
3. **Simulée** : implémentation factice ou bouchonnée (logs, pas de vrai fournisseur externe).
4. **Non implémentée** : existante côté backend (ou attendue métier) mais absente du frontend React.
5. **Défectueuse** : comportement buggé ou incohérent constaté dans le code source.

---

## 1. Pages et routes existantes dans React

| Route | Page | Appels API réels | Rôle |
|---|---|---|---|
| `/` | `HomePage` | `GET /api/patrimoines` | Hero, recherche rapide, 3 piliers, 3 patrimoines en vedette |
| `/patrimoines` | `PatrimoinesPage` | `GET /api/patrimoines` | Catalogue avec recherche texte, capacité min, tri |
| `/patrimoines/:id` | `PatrimoineDetailPage` | `GET /api/patrimoines/{id}`, `GET /api/patrimoines` | Fiche complète, mode sobre lieu de mémoire, GPS OSM, « À voir aussi » |
| `/circuits` | `CircuitsPage` | `GET /api/circuits`, `GET /api/patrimoines` | Liste des circuits avec filtres difficulté, durée max, distance max |
| `/circuits/:id` | `CircuitDetailPage` | `GET /api/circuits/{id}`, `GET /api/circuits`, `GET /api/patrimoines` | Itinéraire ordonné par étape, liens patrimoines, infos pratiques, CTA réserver |
| `/evenements` | `EvenementsPage` | `GET /api/evenements`, `GET /api/patrimoines` | Agenda avec recherche, filtre par type et date minimale |
| `/evenements/:id` | `EvenementDetailPage` | `GET /api/evenements/{id}`, `GET /api/evenements`, `GET /api/patrimoines` | Détail événement, site associé, infos pratiques, CTA réserver |
| `/reserver` | `ReserverPage` | `GET /api/reservations`, `GET /api/circuits`, `GET /api/evenements`, `POST /api/reservations`, `PUT /api/reservations/{id}/annuler` | Création, consultation et annulation de réservations |
| `*` | Inline (`routes.jsx`) | — | Page 404 avec bouton retour accueil |

---

## 2. Classification détaillée des fonctionnalités

### 2.1 Fonctionnalités Opérationnelles
| ID | Fonctionnalité | Preuve dans le code |
|---|---|---|
| F-01 | Consultation des patrimoines (liste + détail) | `PatrimoinesPage.jsx`, `PatrimoineDetailPage.jsx`, `PatrimoineController.java` (`3` sites pré-chargés via `PatrimoineDataInitializer`) |
| F-02 | Filtrage et tri des patrimoines (capacité min, tri nom/capacité) | `PatrimoinesPage.jsx` (`useMemo` sur `capaciteMin` et `tri`) |
| F-03 | Traitement éditorial sobre pour les "lieux de mémoire" | `config.js` (`memorialKeywords`), `formatters.js` (`isLieuDeMemoire`), `Card.jsx`, `InfoBox.jsx`, `PatrimoineImage.jsx`, `PatrimoineDetailPage.jsx`, `EvenementDetailPage.jsx` |
| F-04 | Affichage géolocalisation & lien OpenStreetMap | `InfoBox.jsx` (lignes 18–27 et 41–58) |
| F-05 | Consultation des circuits (liste, filtres difficulté/durée/distance, détail étapes ordonnées) | `CircuitsPage.jsx`, `CircuitDetailPage.jsx`, `CircuitController.java` |
| F-06 | Consultation des événements (liste, filtres type/date, détail) | `EvenementsPage.jsx`, `EvenementDetailPage.jsx`, `EvenementController.java` |
| F-07 | Création d'une réservation (`CIRCUIT` ou `EVENEMENT`) avec contrôle places & calcul montant backend | `ReserverPage.jsx` (`handleSubmit`), `ReservationService.saveReservation()` |
| F-08 | Consultation de la liste des réservations et annulation (`statut = ANNULEE`) | `ReserverPage.jsx` (`getAllReservations`, `cancelReservation`), `ReservationController.annulerReservation()` |
| F-09 | Navigation SPA responsive (header sticky, menu burger mobile, fil d'Ariane, 404) | `Layout.jsx`, `Breadcrumb.jsx`, `routes.jsx` |
| F-10 | Affichage des messages d'erreur métier structurés `{"erreur": "..."}` | `client.js` (ligne 51) + `GlobalExceptionHandler.java` des 7 MS |

### 2.2 Fonctionnalités Partiellement Opérationnelles
| ID | Fonctionnalité | Limite observée |
|---|---|---|
| F-11 | **Affichage des photographies de sites** (`Hero` + `PatrimoineImage`) | Le mécanisme de chargement `/images/hero.jpg` et `/images/patrimoines/<codePatrimoine>.jpg` avec fallback vert clair fonctionne, mais **aucun fichier `.jpg` n'existe** dans `frontend/public/images/` (uniquement `README.md`). Les images affichent donc systématiquement le fallback. |
| F-12 | **Pré-remplissage du formulaire de réservation via URL** (`/reserver?type=...&circuitId=...`) | Fonctionne au premier accès depuis `CircuitDetailPage` ou `EvenementDetailPage`, mais `ReserverPage.jsx` ne réagit pas à un changement ultérieur de `searchParams` après montage, et force la sélection du premier élément si aucun ID n'est passé. |
| F-13 | **Recherche rapide depuis le Hero** (`Hero.jsx`) | Redirige correctement vers `/patrimoines?q=...`, mais souffre en aval de la désynchronisation URL/état sur `PatrimoinesPage` (cf. F-23). |
| F-14 | **Bouton « Réserver un circuit ou événement » sur `PatrimoineDetailPage`** | Redirige vers `/reserver` sans contexte du patrimoine consulté (car les réservations portent sur un circuit ou un événement, non directement sur un patrimoine). |

### 2.3 Fonctionnalités Simulées (côté backend)
| ID | Fonctionnalité | Preuve dans le code |
|---|---|---|
| F-15 | **Envoi de notifications EMAIL / SMS** (`ms-notification`) | `NotificationService.envoyerNotification()` enregistre en base H2 avec `statut = ENVOYEE` et écrit un `log.info(...)` sans serveur SMTP ni passerelle SMS. |
| F-16 | **Traitement financier des paiements** (`ms-paiement`) | `PaiementService.effectuerPaiement()` génère une référence `PAY-XXXXXXXX` et force `StatutPaiement.REUSSI` sans intégration Wave / Orange Money / Stripe réelle. |
| F-17 | **Persistance des données** | Tous les 7 microservices utilisent **H2 en mémoire** (`jdbc:h2:mem:*`), toutes les données créées sont perdues à l'arrêt des conteneurs (seuls 3 patrimoines et 2 utilisateurs sont réinitialisés au boot). |

### 2.4 Fonctionnalités Non Implémentées dans le Frontend (existantes côté Backend)
| ID | Fonctionnalité backend existante | Endpoints non consommés par React |
|---|---|---|
| F-18 | **Authentification & gestion des utilisateurs** (`ms-utilisateur`) | `POST /api/utilisateurs` (inscription), `POST /api/utilisateurs/connexion` (login), `GET/PUT/DELETE /api/utilisateurs/**`. Rôles `TOURISTE`, `ADMINISTRATEUR`, `GESTIONNAIRE_SITE` non exploités dans le front. |
| F-19 | **Paiement des réservations** (`ms-paiement`) | `POST /api/paiements`, `GET /api/paiements`, `GET /api/paiements/{id}`. Aucun écran de paiement après réservation dans React. |
| F-20 | **Consultation / gestion des notifications** (`ms-notification`) | `GET /api/notifications`, `GET/POST/DELETE /api/notifications/**`. |
| F-21 | **Administration CRUD (Back-office)** | `POST/PUT/DELETE /api/patrimoines/**`, `POST/PUT/DELETE /api/circuits/**`, `POST/PUT/DELETE /api/evenements/**`, `DELETE /api/reservations/{id}`. Actuellement, l'ajout de circuits/événements nécessite `curl` (cf. `README.md` Étape 5). |
| F-22 | **Démonstration TP2 communication inter-MS** | `GET /api/circuits/communication/{mode}/patrimoines/{id}` (`feign`, `resttemplate`, `webclient`). |

### 2.5 Fonctionnalités Défectueuses
| ID | Anomalie | Preuve exacte | Impact |
|---|---|---|---|
| F-23 | **Désynchronisation du filtre `?q=` sur `PatrimoinesPage`** | `PatrimoinesPage.jsx` lignes 57–62 (`if (q !== null)`) et `handleResetFilters` : taper dans le champ ne met pas à jour `?q=`, et cliquer sur le lien menu « Patrimoines » (`/patrimoines`) n'efface pas la recherche précédente. | Expérience utilisateur confuse lors de la navigation. |
| F-24 | **Erreur d'annulation affichée au mauvais endroit et sous un faux titre** | `ReserverPage.jsx` lignes 134–146 & 184–189 : `handleAnnuler` écrit dans `submitError`, qui s'affiche dans la carte formulaire de gauche avec le titre `"Réservation refusée"`. De plus, aucune confirmation n'est demandée avant annulation. | Risque d'annulation accidentelle et erreur peu visible sur mobile/desktop. |

---

## 3. Parcours utilisateurs actuels

1. **Parcours Découverte Patrimoine** : `Accueil (/)` → Pilier ou Carte vedette (ou recherche Hero/Header) → `Patrimoines (/patrimoines)` → Filtrage client → `Fiche Patrimoine (/patrimoines/:id)` → Lien carte OpenStreetMap ou « À voir aussi ».
2. **Parcours Itinéraire Circuit** : `Circuits (/circuits)` → Filtrage (difficulté, durée, distance) → `Détail Circuit (/circuits/:id)` → Consultation des étapes → Clic vers fiche patrimoine d'une étape OU clic « Réserver ce circuit » (`/reserver?type=CIRCUIT&circuitId=...`).
3. **Parcours Événement Culturel** : `Événements (/evenements)` → Filtrage (type, date) → `Détail Événement (/evenements/:id)` → Lien vers site d'accueil OU clic « Réserver cet événement » (`/reserver?type=EVENEMENT&evenementId=...`).
4. **Parcours Réservation & Annulation** : `Réserver (/reserver)` → Remplissage formulaire → `POST /api/reservations` → Affichage confirmation avec montant calculé → Rafraîchissement de la liste globale → Clic « Annuler la réservation » → `PUT /api/reservations/{id}/annuler`.
   *(Rupture de parcours : aucune authentification préalable et aucune étape de paiement après confirmation.)*
