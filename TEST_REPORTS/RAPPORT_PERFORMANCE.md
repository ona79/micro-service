# RAPPORT DE PERFORMANCE (FRONTEND & BACKEND)

**Date d'exécution** : 17 Novembre 2026  
**Environnement** : Linux x86_64 (Java 21 Temurin, Node.js 22, Angular 22.2, Spring Boot 4.1.0)

---

## 1. Performance de Chargement et Découpage Frontend (`frontend-angular`)

| Indicateur | Valeur mesurée | Seuil cible | Statut |
| :--- | :--- | :--- | :--- |
| **Bundle JS + CSS initial (brut)** | `483.23 kB` | $< 750\text{ kB}$ | **PASS** |
| **Bundle JS + CSS initial (transféré gzip)** | `107.83 kB` | $< 200\text{ kB}$ | **PASS** |
| **Nombre de routes en Lazy Loading (`loadComponent`)** | `9 / 9` routes (`100 %`) | $100\text{ \%}$ | **PASS** |
| **Chargement différé de la carte Leaflet (`@defer (on viewport)`)** | Carte instanciée uniquement à l'entrée dans le viewport ou au clic sur l'onglet « Carte » | Pas de blocage du thread principal au premier rendu | **PASS** |
| **Stratégie de détection de changements** | `ChangeDetectionStrategy.OnPush` + Angular Signals (`signal`, `computed`) sur `100 %` des composants | Zéro recalcul inutile de l'arbre DOM | **PASS** |
| **Attributs images (`loading="lazy"`, `decoding="async"`)** | Présents sur toutes les vignettes de cartes (`PatrimoineCard`, `CircuitCard`, `EvenementCard`) | Optimisation bande passante et LCP | **PASS** |
| **Cache mémoire applicatif (`ensureLoaded()`)** | Stores Signals (`PatrimoineStore`, `CircuitStore`, `EvenementStore`, `ReservationStore`) évitant les rechargements redondants lors de la navigation inter-pages | Navigation instantanée (`< 16 ms`) entre les vues déjà chargées | **PASS** |

---

## 2. Temps de Réponse API et Communication Inter-Services (via `api-gateway:8090`)

Mesures effectuées à chaud sur la pile locale (`frontend-angular` -> `api-gateway:8090` -> `ms-*:3001..3007`) :

| Endpoint / Flux | Services traversés | Temps de réponse moyen | Statut |
| :--- | :--- | :--- | :--- |
| `GET /api/patrimoines` | `api-gateway` -> `ms-patrimoine` (H2) | `~18 ms` | **PASS** |
| `GET /api/patrimoines/{id}` | `api-gateway` -> `ms-patrimoine` (H2 + `@Cacheable`) | `~8 ms` | **PASS** |
| `GET /api/circuits/communication/feign/patrimoines/{id}` | `api-gateway` -> `ms-circuit` --(OpenFeign)--> `ms-patrimoine` | `~22 ms` | **PASS** |
| `GET /api/circuits/communication/resttemplate/patrimoines/{id}` | `api-gateway` -> `ms-circuit` --(RestTemplate)--> `ms-patrimoine` | `~19 ms` | **PASS** |
| `GET /api/circuits/communication/webclient/patrimoines/{id}` | `api-gateway` -> `ms-circuit` --(WebClient)--> `ms-patrimoine` | `~21 ms` | **PASS** |
| `POST /api/circuits` (3 étapes + calcul Haversine) | `api-gateway` -> `ms-circuit` --(3x Feign)--> `ms-patrimoine` | `~45 ms` | **PASS** |
| `POST /api/reservations` (vérification capacité + persistance) | `api-gateway` -> `ms-reservation` --(Feign)--> `ms-circuit` | `~35 ms` | **PASS** |
| `POST /api/paiements` (paiement + confirmation + notification) | `api-gateway` -> `ms-paiement` --(Feign)--> `ms-reservation` + `ms-notification` | `~48 ms` | **PASS** |

---

## 3. Empreinte Mémoire Backend Optimisée

Grâce au profil JVM calibré (`-Xms48m -Xmx128m -XX:TieredStopAtLevel=1`), chaque microservice Spring Boot 4.1.0 démarre en **3 à 5 secondes** et consomme **~95 Mo à 135 Mo RSS**, permettant de faire tourner simultanément les **8 processus Java (`3001`–`3007` + `8090`) + le serveur Angular (`4200`)** avec moins de **1,2 Go de RAM totale** sur la machine hôte.
