# RAPPORT DE VALIDATION DES CONTRATS API REST & COMMUNICATIONS INTER-SERVICES

**Date d'exécution** : 17 Novembre 2026  
**Point d'entrée testé** : `http://localhost:8090` (`api-gateway`) et `http://localhost:4200/api` (Proxy Angular)  
**Script de vérification reproductible** : `test-fullstack-api.sh`

---

## 1. Vérification des Contrats API REST via `api-gateway` (Phase 5)

| # | Méthode & Endpoint | Service cible | Scénario testé | Code HTTP attendu | Code HTTP obtenu | Statut |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `GET /api/patrimoines` | `ms-patrimoine:3001` | Récupération de la liste des sites patrimoniaux | `200 OK` | `200 OK` | **PASS** |
| 2 | `GET /api/patrimoines/1` | `ms-patrimoine:3001` | Récupération d'un site existant (*Maison des Esclaves de Gorée*) | `200 OK` | `200 OK` | **PASS** |
| 3 | `GET /api/patrimoines/999` | `ms-patrimoine:3001` | Site inexistant -> JSON `{"erreur":"Patrimoine introuvable avec l'id : 999"}` | `404 Not Found` | `404 Not Found` | **PASS** |
| 4 | `POST /api/circuits` | `ms-circuit:3002` | Création du circuit *« De Gorée à la Casamance : Mémoire et Teranga »* (3 étapes) | `201 Created` | `201 Created` | **PASS** |
| 5 | `GET /api/circuits/1` | `ms-circuit:3002` | Lecture d'un circuit enrichi avec les objets `Patrimoine` de chaque étape | `200 OK` | `200 OK` | **PASS** |
| 6 | `POST /api/evenements` | `ms-evenement:3003` | Création de l'événement *« Journées du Patrimoine de la Casamance »* (80 places sur site de capacité 300) | `201 Created` | `201 Created` | **PASS** |
| 7 | `POST /api/evenements` (capacité `9999`) | `ms-evenement:3003` | Règle métier : rejet si `capaciteMax` événement > `capacitePatrimoine` (300) | `400 Bad Request` | `400 Bad Request` | **PASS** |
| 8 | `POST /api/reservations` | `ms-reservation:3004` | Réservation de 2 places sur le circuit `#1` (`15 000 FCFA` $\times 2 = 30\,000\text{ FCFA}$) | `201 Created` | `201 Created` | **PASS** |
| 9 | `POST /api/reservations` (`50` places) | `ms-reservation:3004` | Règle métier : rejet pour capacité insuffisante (`23 place(s) disponible(s), 50 demandée(s)`) | `400 Bad Request` | `400 Bad Request` | **PASS** |
| 10 | `PUT /api/reservations/{id}/annuler` | `ms-reservation:3004` | Annulation d'une réservation et libération des places réservées | `200 OK` | `200 OK` | **PASS** |
| 11 | `POST /api/utilisateurs/connexion` | `ms-utilisateur:3005` | Authentification de `moussa.diop@zig.univ.sn` / `Passer123!` | `200 OK` | `200 OK` | **PASS** |
| 12 | `POST /api/paiements` | `ms-paiement:3006` | Paiement `WAVE` sur la réservation `#1` (`30 000 FCFA`) | `201 Created` | `201 Created` | **PASS** |
| 13 | `GET /api/notifications` | `ms-notification:3007` | Vérification de la notification générée automatiquement après paiement | `200 OK` | `200 OK` | **PASS** |

---

## 2. Validation des Communications Inter-Services (Phase 6)

### 2.1 Comparateur des 3 clients HTTP synchrones (`ms-circuit` -> `ms-patrimoine`)
- **`OpenFeign`** (`GET /api/circuits/communication/feign/patrimoines/1`) :
  - Réponse : `{"modeCommunication":"FEIGN", "serviceSource":"ms-circuit", "serviceCible":"ms-patrimoine", "patrimoine":{"id":1, "nomPatrimoine":"Maison des Esclaves de Gorée", ...}}` -> **PASS**
- **`RestTemplate`** (`GET /api/circuits/communication/resttemplate/patrimoines/2`) :
  - Réponse : `{"modeCommunication":"RESTTEMPLATE", "serviceSource":"ms-circuit", "serviceCible":"ms-patrimoine", "patrimoine":{"id":2, "nomPatrimoine":"Monument de la Renaissance Africaine", ...}}` -> **PASS**
- **`WebClient`** (`GET /api/circuits/communication/webclient/patrimoines/3`) :
  - Réponse : `{"modeCommunication":"WEBCLIENT", "serviceSource":"ms-circuit", "serviceCible":"ms-patrimoine", "patrimoine":{"id":3, "nomPatrimoine":"Cathédrale Saint-Antoine de Padoue", ...}}` -> **PASS**

### 2.2 Calcul de distance géodésique Haversine inter-services (`ms-circuit` -> `ms-patrimoine`)
Lors du `POST /api/circuits` avec les étapes Gorée (`14.6672, -17.399`) -> Renaissance Africaine (`14.7222, -17.495`) -> Cathédrale de Ziguinchor (`12.5833, -16.2719`), `ms-circuit` interroge `ms-patrimoine` pour chaque étape et calcule automatiquement :
- `dureeEstimee` = $90 + 60 + 75 = \mathbf{225\text{ minutes}}$
- `distanceTotale` = $\mathbf{284.08\text{ km}}$ (formule de Haversine vérifiée) -> **PASS**

### 2.3 Chaîne transactionnelle distribuée (`ms-paiement` -> `ms-reservation` + `ms-notification`)
Lors du `POST /api/paiements` (`{"reservationId": 1, "modePaiement": "WAVE"}`) :
1. `ms-paiement` récupère les détails de la réservation `#1` auprès de `ms-reservation` (`montantTotal: 30000.0`, `emailClient: moussa.diop@zig.univ.sn`).
2. `ms-paiement` enregistre la transaction `PAY-A6233A20` au statut `REUSSI`.
3. `ms-paiement` déclenche un appel OpenFeign vers `ms-notification` (`POST /api/notifications`), qui persiste la notification `ENVOYEE` pour `moussa.diop@zig.univ.sn`. -> **PASS**
