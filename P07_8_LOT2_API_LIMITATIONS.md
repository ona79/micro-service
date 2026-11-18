# MISSION P07.8 — LOT 2 : EXPÉRIENCE PUBLIQUE ET TOURISTIQUE
## RAPPORT DES LIMITATIONS D'API ET COMPENSATIONS FRONTEND

**Projet :** Plateforme de gestion et valorisation du patrimoine touristique de la Casamance  
**Date d'audit & implémentation :** Novembre 2026  
**Branche Git :** `feature/p07-8-public-tourist-experience`  
**Statut Backend :** Intact (Zéro modification Java Spring Boot, zéro modification schéma Flyway)

---

## 1. Contexte et Principes Directeurs

Dans le cadre du Lot 2 (Expérience Publique et Touristique), une règle cardinale a été rigoureusement respectée :
> **Aucune modification du code source backend Java, des entités JPA, des migrations Flyway, des contrôleurs ou des configurations de sécurité Spring Security / API Gateway n'est autorisée.**

Toutes les subtilités, écarts de contrat historiques ou contraintes de données distribuées entre les 7 microservices métier ont été résolus via des architectures de résilience et de compensation au sein de la couche Angular 22.

---

## 2. Inventaire Détaillé des Limitations et Solutions Front-End

### 2.1. Anomalie de résolution d'identifiant Guide (`PUB-009`)

- **Problématique observée :**  
  Dans le microservice `ms-circuit`, les circuits touristiques référencent le guide sous la clé `guideResponsableId` correspondant à l'`utilisateurId` du compte utilisateur (`ms-utilisateur`). Dans le microservice `ms-utilisateur`, l'entité Guide possède à la fois son propre identifiant technique `guide.id` et la clé étrangère `utilisateurId`.
  Lorsque les utilisateurs naviguaient depuis certains liens vers `/guides/:id`, un code HTTP 404 survenait si l'ID passé était l'`utilisateurId` au lieu de `guide.id`.
- **Compensation Frontend :**  
  Dans `GuideDetailPageComponent`, une stratégie de repli en cascade a été déployée :
  ```typescript
  try {
    let g: GuideProfil;
    try {
      g = await firstValueFrom(this.guideApi.getById(id));
    } catch {
      // Tolérance d'identifiant : repli transparent vers getByUtilisateurId
      g = await firstValueFrom(this.guideApi.getByUtilisateurId(id));
    }
    // Affichage fluide et sécurisé du profil validé
  } catch (err) {
    this.error.set(extractErrorMessage(err));
  }
  ```
- **Validation :**  
  Couvert par test unitaire automatique (`guide-detail-page.component.spec.ts`) vérifiant avec succès le repli 404 vers `/api/guides/utilisateur/:id`.

---

### 2.2. Mode Simulation Pédagogique Wave & Orange Money (`TOUR-003`)

- **Problématique observée :**  
  La plateforme fonctionne dans un cadre académique et de valorisation territoriale sans passerelle bancaire marchand réelle active. Tout paiement réel est exclu.
- **Prise en charge Frontend :**  
  - Bannières d'avertissement claires et visibles : avertissement réglementaire sur la nature purement simulée de l'opération (P04).
  - Fourniture d'un numéro de téléphone pré-rempli (`+221 77 123 45 67`) avec masquage sécurisé.
  - Boutons de simulation de scénarios métier complets (Validation / Acceptation, Refus, Expiration, Annulation) permettant une démonstration interactive immédiate.
  - Journal complet des transitions d'états (`INITIE` -> `EN_COURS` -> `ACCEPTE` / `REFUSE`) affiché en direct.

---

### 2.3. Gestion des Prestations Gratuites (0 FCFA)

- **Problématique observée :**  
  Certains sites patrimoniaux et commémorations mémorielles (ex: recueillement, journées du patrimoine) sont à accès libre ou tarif nul (0 FCFA). Rediriger l'utilisateur vers un écran de paiement monétique pour un montant nul dégrade l'expérience utilisateur.
- **Compensation Frontend :**  
  Dans `reserver-page.component.ts` et `account-page.component.ts` :
  - Détection automatique du montant nul (`montantTotal === 0`).
  - Passage direct de la réservation au statut `CONFIRMEE` lors de la validation du brouillon sans déclenchement d'un tunnel de paiement superflu.
  - Génération immédiate des billets électroniques et QR codes d'accès.

---

### 2.4. Affichage Direct des Billets Électroniques (`TOUR-001` & `TOUR-004`)

- **Problématique observée :**  
  Dans l'espace personnel touriste (`/mon-espace`), le voyageur devait précédemment ouvrir chaque réservation individuellement pour inspecter ses billets, causant des allers-retours fastidieux sur mobile ou tablette à l'entrée des sites.
- **Compensation Frontend :**  
  - Ajout d'un onglet dédié « Mes billets QR » dans `AccountPageComponent`.
  - Chargement agrégé asynchrone des billets confirmés via `BilletApiService.getBillets(res.id)`.
  - Intégration directe du composant `UiTicketViewComponent` avec génération automatique de QR Codes SVG/DataURL haute résolution pour chaque participant.
  - Bouton d'impression / export PDF direct (`window.print()`).
  - Ajout de la carte héroïque « Prochaine visite confirmée » en tête de tableau de bord voyageur.

---

### 2.5. Recherche Géographique Configurable (`PUB-002`)

- **Problématique observée :**  
  Le calcul de proximité géographique doit permettre aux visiteurs sur le terrain de sonder leur environnement immédiat sans saturer le réseau mobile à faible débit en Casamance.
- **Compensation Frontend :**  
  - Implémentation d'un sélecteur de rayon dynamique (5 km, 10 km, 20 km, 50 km) dans `PatrimoinesListPageComponent`.
  - Filtrage cartographique Leaflet réactif avec boutons plein écran et zoom doux (`scrollWheelZoom: false`) pour préserver le confort de défilement tactile sur smartphone.

---

### 2.6. Anomalie Feign Inter-Services & Anti-Rejeu Gateway (`PUB-005`)

- **Problématique observée :**  
  L'appel direct `GET /api/circuits/:id` déclenchait une erreur HTTP 403 : `Attaque par rejeu détectée sur l'enveloppe Gateway.`  
  *Cause racine backend :* `ms-circuit` appelle `PatrimoineClient` configuré par défaut sur `${patrimoine.url:http://localhost:3001}`. En conteneur Docker, `localhost:3001` échoue (`Connection refused`), provoquant une exception 503. Le client Apache HttpClient de l'API Gateway réémet automatiquement la requête après 1 seconde avec le même nonce/jeton d'enveloppe interne. Le filtre de sécurité de `ms-circuit` détecte légitimement le rejeu du nonce et renvoie HTTP 403.  
- **Compensation Frontend résiliente :**  
  Dans `CircuitStore.loadById(id)`, le frontend tente d'abord l'appel direct `GET /api/circuits/:id`. En cas d'échec (403 ou 503), il se replie automatiquement et de manière transparente sur `ensureLoaded()` (`GET /api/circuits`), qui renvoie la liste complète des circuits et leurs étapes associées. La fiche détaillée s'affiche ainsi immédiatement avec son itinéraire et ses étapes ordonnées, sans dégrader l'expérience utilisateur et sans toucher au backend Java.

---

### 2.7. Limitation Typage PostgreSQL JDBC sur `sumPlacesByCircuitIdAndDateAndStatutIn`

- **Problématique observée :**  
  Lors de l'annulation d'une réservation de circuit créée sans date de prestation (`date_prestation IS NULL`), la méthode JPA `ReservationRepository.sumPlacesByCircuitIdAndDateAndStatutIn` génère la requête SQL :  
  `WHERE (:datePrestation IS NULL OR r.date_prestation = :datePrestation)`  
  PostgreSQL échoue avec : `org.postgresql.util.PSQLException: ERROR: could not determine data type of parameter $4`.  
- **Prise en charge Frontend & Ticket :**  
  - Le frontend valide systématiquement la présence d'une date de prestation pour les réservations de circuit.
  - L'annulation des réservations d'événements et des circuits avec date valide s'exécute avec succès (HTTP 200).
  - Un ticket correctif backend officiel est émis dans `P07_8_LOT2_1_STABILISATION.md`.

---

## 3. Synthèse

| Composant | Limitation / Spécificité | Compensation Frontend Lot 2 |
|---|---|---|
| `GuideDetailPageComponent` | Discordance ID Guide vs Utilisateur | Repli transparent `getById()` -> `getByUtilisateurId()` |
| `CircuitStore` (`PUB-005`) | Feign `localhost:3001` + Retry Gateway rejouant le nonce (403) | Repli résilient automatique sur `ensureLoaded()` (`GET /api/circuits`) |
| `EvenementsListPageComponent` (`PUB-006`) | Imbrication `UiCard` rompant la grille 3 colonnes CSS | Structure native 3 colonnes pleine largeur (96px, 240px, 1fr) |
| `PaiementCheckoutPageComponent` | Pas de banque marchande réelle | Simulation monétique pédagogique Wave / Orange Money P04 |
| `ReserverPageComponent` | Offres commémoratives à 0 FCFA | Confirmation directe & génération des e-billets |
| `AccountPageComponent` | Billets dispersés | Onglet centralisé « Mes Billets QR » & héro Prochaine Visite |
| `PatrimoinesListPageComponent` | Couverture réseau mobile variable | Rayons GPS étagés (5 à 50 km) & Leaflet tactile fluide |
