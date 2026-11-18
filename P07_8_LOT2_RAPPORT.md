# MISSION P07.8 — LOT 2 : RAPPORT DE LIVRAISON ET DE SYNTHÈSE
## REFONTE UX/UI DE L'EXPÉRIENCE PUBLIQUE ET TOURISTIQUE

**Projet :** Plateforme de gestion et de valorisation du patrimoine touristique de la Casamance  
**Institution :** Université Assane Seck de Ziguinchor (UASZ) — Licence 3 Informatique  
**Direction Artistique :** CASAMANCE — PATRIMOINE VIVANT  
**Date de livraison :** Novembre 2026  
**Branche Git :** `feature/p07-8-public-tourist-experience`  
**Commit de base :** `9bd1a5e` (faisant suite à la fusion de `feature/p07-8-design-system` `da909c5` dans `develop`)

---

## 1. Contexte, Rôle et Périmètre d'Intervention

Dans le cadre de la mission **P07.8 (Lot 2)**, l'équipe d'ingénierie et de design a pris en charge la refonte intégrale de l'expérience publique et du parcours voyageur / touriste de la plateforme Casamance.

### Contraintes absolues respectées :
1. **Zéro modification backend Java :** les 7 microservices métier (`ms-patrimoine`, `ms-circuit`, `ms-evenement`, `ms-reservation`, `ms-utilisateur`, `ms-paiement`, `ms-notification`), l'API Gateway, Discovery Eureka et PostgreSQL restent strictement inchangés.
2. **Paiements formellement simulés :** affichage permanent et explicite du mode démonstration P04 sans fausse promesse monétique.
3. **Périmètre ciblé :** 15 écrans et parcours publics/touristiques (PUB-001 à PUB-009, AUTH-001/002, TOUR-001 à TOUR-004).
4. **Non-régression :** 100% des tests unitaires et d'intégration validés, zéro avertissement de compilation Angular AOT.

---

## 2. Direction Artistique « CASAMANCE — PATRIMOINE VIVANT »

La charte issue du Lot 1 a été déployée avec rigueur à travers les variables CSS standardisées (`tokens.css`) :
- **Mangrove & Forêt sacrée (`#153D30` & `#28634B`) :** piliers de navigation, en-têtes et cartes héroïques.
- **Latérite & Ocre (`#C36B45` & `#D6A85D`) :** accents identitaires, badges de catégorie, points d'intérêt patrimoniaux et boutons d'appel à l'action.
- **Lin & Sable (`#F5F0E5` & `#EFECE6`) :** fonds texturés et zones d'information apaisantes.
- **Typographies :** Playfair Display pour les titres éditoriaux, Plus Jakarta Sans pour le contenu informatif et les métadonnées.

---

## 3. Détail des Réalisations par Écran et Cas d'Usage

### 3.1. Expérience de Découverte et Catalogues

#### PUB-001 — Page d'Accueil Éditoriale (`/` et `/accueil`)
- Hero Casamance immersif avec baseline territoriale et puces de recherche rapide thématiques (Bolongs, Cases à impluvium, Rituels Diola...).
- Section réassurance 4 piliers : *Guides locaux agréés*, *Patrimoine préservé*, *Circuits en direct*, *Billetterie QR & Paiement simulé*.
- Grilles de valorisation alimentées par `UiCardComponent` avec slots `header`, slots `footer` et gestion fluide des médias.
- État de chargement élégant via `UiLoadingStateComponent`.

#### PUB-002 — Catalogue Patrimonial & Carte Interactive (`/patrimoines`)
- Sélecteur de rayon GPS configurable : **5 km, 10 km, 20 km, 50 km** pour s'adapter à la fois aux visites pédestres villageoises et aux excursions régionales.
- Amélioration de `UiHeritageMapComponent` : bascule plein écran responsive (`allowFullscreen`), contrôle `scrollWheelZoom: false` anti-blocage de défilement tactile sur smartphone.
- Filtrage réactif par zone (Basse, Moyenne, Haute-Casamance) et pagination intégrée avec `UiPaginationComponent`.

#### PUB-003 — Fiche Détaillée d'un Patrimoine (`/patrimoines/:id`)
- Mode recueillement et sobriété mémorielle pour les lieux de mémoire (ex: Île de Carabane).
- Coordonnées GPS vérifiées avec lien direct vers OpenStreetMap.
- Recommandations associées « À voir aussi » enrichies par `UiCardComponent`.
- Suppression définitive des skeletons bruts au profit de `UiLoadingStateComponent`.

#### PUB-004 & PUB-005 — Circuits Touristiques (`/circuits` et `/circuits/:id`)
- Fiches de synthèse des circuits avec tags de difficulté, durée estimée et distance en kilomètres.
- Ordonnancement chronologique strict des étapes du parcours (étape 1 avant étape 2).
- Section avis vérifiés intégrée via `UiAvisSectionComponent` avec note moyenne sur 5.

#### PUB-006 & PUB-007 — Agenda Culturel (`/evenements` et `/evenements/:id`)
- Calendrier culturel dynamique avec filtrage temporel et thématique (Festivals, Rites, Célébrations).
- Vérification de disponibilité des places en direct via appel `getDisponibilite` sur `ReservationApiService`.
- Gestion claire des événements complets ou annulés avec bannières contextuelles.

#### PUB-008 & PUB-009 — Annuaire et Fiche Guide Certifié (`/guides` et `/guides/:id`)
- Annuaire valorisant l'expertise locale : zones d'intervention, langues parlées, années d'expérience et tarif indicatif.
- **Résolution de l'anomalie 404 :** Tolérance d'identifiant dans `GuideDetailPageComponent` grâce au repli transparent `getByUtilisateurId(id)` lorsque `getById(id)` renvoie 404. Couvert par test unitaire.
- Présentation des circuits encadrés par le guide et des évaluations déposées par les voyageurs.

---

### 3.2. Authentification et Session Sécurisée

#### AUTH-001 & AUTH-002 — Connexion et Inscription (`/connexion`, `/inscription`)
- Raccordement aux tokens du Design System (`--surface-elevated`, `--radius-xl`, `--shadow-lg`).
- Puces d'accès rapide de démonstration permettant de se connecter en un clic sous les rôles Touriste, Gestionnaire ou Administrateur.
- Formulaires réactifs conformes aux règles d'accessibilité (contraste WCAG AA, labels explicites, gestion des erreurs en direct).

---

### 3.3. Espace Voyageur et Entonnoir Transactionnel

#### TOUR-001 — Mon Espace Personnel Voyageur (`/mon-espace`)
- **Carte Héroïque « Prochaine Visite Confirmée » :** affiche immédiatement au voyageur sa prochaine excursion avec date, créneau et bouton d'accès rapide aux billets d'accès.
- **Nouvel Onglet « Mes Billets QR » :** agrégation directe de tous les billets électroniques d'accès issus des réservations confirmées.
- Intégration de `UiTicketViewComponent` : génération instantanée des QR codes SVG/DataURL pour le contrôle des entrées, avec bouton d'impression/export PDF.

#### TOUR-002 — Entonnoir de Réservation Guidé (`/reserver`)
- Parcours en 4 étapes claires : Prestation, Coordonnées & participants, Confirmation serveur, Paiement simulé.
- **Prise en charge transparente des offres gratuites (0 FCFA) :** transition directe de la réservation au statut `CONFIRMEE` sans redirection superflue vers le module de paiement.

#### TOUR-003 — Caisse Mobile Money Simulée (`/paiement/:id`)
- Bannières d'information P04 mettant en valeur le cadre pédagogique et simulé (aucun prélèvement réel).
- Prise en charge des portefeuilles Wave Sénégal et Orange Money Sénégal.
- Console de pilotage permettant de simuler l'ensemble des scénarios métier : Acceptation, Refus, Expiration, Annulation.
- Reçu et justificatif de paiement simulé horodaté avec identifiant de corrélation.

#### TOUR-004 — Détail de Réservation & Billetterie (`/reservations/:id`)
- Synchronisation manuelle en temps réel du statut auprès du microservice `ms-reservation`.
- Présentation unitaire des billets par participant nominatif avec QR Code de scan haute fidélité.

---

## 4. Composants Partagés Mobilisés et Améliorations

| Composant | Rôle dans le Lot 2 |
|---|---|
| `UiHeritageMapComponent` | Ajout du mode plein écran responsive, maintien du scroll doux anti-blocage mobile |
| `UiCardComponent` | Harmonisation des grilles d'accueil, patrimoines, circuits, événements et guides |
| `UiLoadingStateComponent` | Remplacement systématique des skeletons sur l'ensemble des 15 écrans |
| `UiTicketViewComponent` | Déploiement centralisé sur `account-page` et `reservation-detail-page` avec QR codes dynamiques |
| `UiPaginationComponent` | Standardisation de la navigation paginée sur les catalogues patrimoines et événements |
| `UiBreadcrumbComponent` | Fil d'Ariane responsive sur l'ensemble des fiches détaillées |
| `UiErrorBannerComponent` | Affichage accessible des erreurs API avec déclencheur de réessai |

---

## 5. Bilan Qualité et Validation des Tests

- **Tests unitaires et d'intégration :**  
  32 fichiers de test exécutés, **106 tests unitaires passés avec succès**.
- **Compilation Angular 22 :**  
  Exécution de `npm --prefix frontend-angular run build` : bundle généré en 8.0s, **0 erreur, 0 avertissement**.
- **Rapports complémentaires livrés :**
  - `P07_8_LOT2_AUDIT.md` (Cartographie initiale et gouvernance de branche)
  - `P07_8_LOT2_TESTS.md` (Détail de la couverture de tests et résultats Vitest)
  - `P07_8_LOT2_API_LIMITATIONS.md` (Inventaire des compensations d'API sans modification backend)

---

## 6. Conclusion et Préparation du Lot 3

Le **Lot 2** établit une expérience publique et touristique de haut niveau, parfaitement adaptée au territoire de la Casamance, ergonomique sur mobile, tablette et desktop, et totalement alignée sur le Design System du Lot 1.

Le socle est désormais prêt pour aborder sereinement le **Lot 3**, qui portera sur la refonte des espaces professionnels et de l'administration :
- GUIDE : espace manifestes, circuits assignés, gestion de profil ;
- CONSERVATEUR : gestion du catalogue patrimonial, validation et modération ;
- GESTIONNAIRE_SITE : contrôle des entrées par scan QR code en direct, billetterie guichet ;
- ADMINISTRATEUR : tableau de bord KPI, supervision des utilisateurs, paiements simulés et logs.
