# AUDIT SÉCURITÉ (FRONTEND & SURFACE D'EXPOSITION API)

**Règle d'audit** : aucune vulnérabilité n'a été corrigée pendant l'audit ; toutes les anomalies ci-dessous ont été vérifiées directement dans le code source.

---

## 1. Synthèse de la posture sécurité

La plateforme est actuellement **dépourvue de mécanismes d'authentification, d'autorisation et de contrôle d'accès**. Elle fonctionne en mode démonstration ouverte. Cela constitue le principal point d'attention avant toute mise en production ou extension fonctionnelle (notamment si l'on souhaite exposer `ms-utilisateur`, `ms-paiement` ou l'administration dans Angular).

---

## 2. Analyse détaillée par domaine

### 2.1 Authentification et gestion des sessions
- **Côté Frontend (`frontend/`)** :
  - Aucune page de connexion, aucun formulaire d'inscription, aucun stockage de session (`localStorage`, `sessionStorage`, cookie) et aucun header `Authorization`.
- **Côté Backend (`ms-utilisateur`)** :
  - **Absence de `spring-boot-starter-security`** dans tous les `pom.xml` (vérifié par recherche globale sur `api-gateway`, `config-server`, `discovery-server`, `ms-*`).
  - L'endpoint `POST /api/utilisateurs/connexion` (`UtilisateurController.java`) vérifie email/mot de passe et retourne simplement `UtilisateurDto`, **sans émettre de JWT ni de cookie de session**.
  - **Stockage et comparaison des mots de passe en clair** : `UtilisateurService.java` (ligne 46) compare `!utilisateur.getMotDePasse().equals(request.getMotDePasse())` sans hachage BCrypt/Argon2.
  - Des mots de passe par défaut en clair sont présents dans `UtilisateurDataInitializer.java` (`"Admin2026!"`, `"Passer123!"`).
  - Point positif partiel : `UtilisateurDto` annote `motDePasse` avec `@JsonProperty(access = JsonProperty.Access.WRITE_ONLY)` et `UtilisateurMapper` ignore `motDePasse` lors de `toDto`, empêchant son renvoi dans les réponses JSON.

### 2.2 Autorisation et protection des routes
- **API Gateway & Microservices** : toutes les routes `GET`, `POST`, `PUT`, `DELETE` sont publiquement accessibles sans authentification ni vérification de rôle (`TOURISTE`, `ADMINISTRATEUR`, `GESTIONNAIRE_SITE`).
- **Frontend React (`routes.jsx`)** : aucun Route Guard ; toutes les routes sont publiques (aucune route admin n'existe encore).

### 2.3 Exposition de données personnelles (PII) et surfaces sensibles
- **Fuite de PII sur `/reserver` (`ReserverPage.jsx`)** :
  - Au chargement de la page `/reserver`, le frontend appelle `GET /api/reservations` et affiche publiquement la liste complète de **toutes les réservations de tous les clients**, incluant **nom complet, email, téléphone, montant et statut**, permettant également à n'importe quel visiteur d'annuler la réservation d'un tiers (`PUT /api/reservations/{id}/annuler`).
- **Exposition d'endpoints d'infrastructure** :
  - `management.endpoints.web.exposure.include: '*'` dans tous les `application.yml` (y compris `config-server`, `discovery-server`, `api-gateway` et les 7 MS).
  - `spring.h2.console.enabled: true` activé dans les 7 microservices métier.
- **Inscription ouverte avec élévation de privilèges possible (côté backend)** :
  - `POST /api/utilisateurs` accepte le champ `role` dans `UtilisateurDto` (`RoleUtilisateur`) sans restriction ; si `role` est fourni à `ADMINISTRATEUR`, `UtilisateurService.inscrireUtilisateur()` le conserve tel quel (il ne force `TOURISTE` que si `role == null`).

### 2.4 Risques XSS (Cross-Site Scripting)
- **État actuel React** : **Faible risque** — React échappe automatiquement toutes les expressions JSX `{...}`, et aucune utilisation de `dangerouslySetInnerHTML`, `innerHTML` ou `eval` n'est présente dans `frontend/src/`.
- **Points de vigilance** :
  - `InfoBox.jsx` (ligne 26) construit l'URL `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=15/${latitude}/${longitude}` avec `rel="noopener noreferrer"` (bien), mais sans valider `Number.isFinite(Number(latitude))` au préalable.
  - Dans le futur projet Angular, il conviendra de **ne jamais contourner `DomSanitizer`** (`bypassSecurityTrustHtml`) et de conserver l'échappement natif des templates `{{ ... }}`.

### 2.5 CORS et configuration réseau
- **Aucune configuration CORS** détectée dans `api-gateway` ni dans les microservices (`@CrossOrigin`, `CorsConfigurationSource` absents).
- En développement, `vite.config.js` masque l'absence de CORS via `server.proxy` (same-origin sur `localhost:5173`).
- Si le futur frontend Angular est servi sur un autre domaine/port en production sans reverse proxy same-origin, toutes les requêtes API seront bloquées par le navigateur.

### 2.6 Validation des données et gestion des erreurs
- **Validation côté front** : minimale (attributs HTML5 `required`, `type="email"`, `min={1}`). Un utilisateur peut saisir un `nombrePlaces` décimal (`1.5`), des espaces blancs ou des valeurs hors plage avant soumission (rattrapé côté serveur par `@Valid` et `BadRequestException`).
- **Gestion des erreurs HTTP** : `client.js` propage directement `data?.erreur` à l'UI. Sur des erreurs métier contrôlées (`400`/`404`/`503`), c'est souhaitable ; sur des erreurs inattendues, le backend renvoie heureusement un message générique `"Erreur interne du serveur"` sans stacktrace dans le JSON (`GlobalExceptionHandler.handleOther`).

---

## 3. Classification des vulnérabilités et risques

| Niveau | ID | Anomalie vérifiée | Périmètre | Recommandation (cible) |
|---|---|---|---|---|
| **Critique** | SEC-01 | Absence totale d'authentification/autorisation sur l'API Gateway et les 7 MS | Backend / Gateway | Introduire Spring Security + JWT (OAuth2 Resource Server) sur Gateway/MS avant toute exposition admin/compte |
| **Critique** | SEC-02 | Mots de passe stockés et comparés en clair dans `ms-utilisateur` | Backend (`ms-utilisateur`) | Utiliser `BCryptPasswordEncoder` (hors périmètre migration pure si contrat figé, à planifier côté backend) |
| **Critique** | SEC-03 | Exposition publique des PII clients (`nomClient`, `emailClient`, `telephoneClient`) et annulation sans autorisation sur `/reserver` | Frontend + `ms-reservation` | Restreindre côté API aux réservations de l'utilisateur authentifié (ou par jeton de réservation) ; côté Angular, préparer les `RouteGuard` |
| **Élevé** | SEC-04 | Élévation de rôle possible à l'inscription (`POST /api/utilisateurs` avec `role: ADMINISTRATEUR`) | Backend (`ms-utilisateur`) | Forcer `TOURISTE` à l'inscription publique côté backend |
| **Élevé** | SEC-05 | Consoles H2 (`h2.console.enabled: true`) et Actuator `*` exposés sur tous les services | Backend / Infra | Désactiver H2 console et restreindre Actuator (`/health`, `/info`) hors dev |
| **Moyen** | SEC-06 | Absence de configuration CORS sur `api-gateway` | Backend / Infra | Définir une politique CORS stricte sur Gateway ou déployer Angular derrière un reverse proxy Nginx same-origin |
| **Moyen** | SEC-07 | Validation client sommaire sur `ReserverPage` (pas de `step="1"`, pas de validation longueur/format téléphone) | Frontend | Implémenter des validateurs Angular stricts (Signal Forms / Reactive Forms) alignés sur `@Valid` |
| **Faible** | SEC-08 | Interpolation de `latitude`/`longitude` dans URL OpenStreetMap sans `Number.isFinite` | Frontend (`InfoBox.jsx`) | Valider `Number.isFinite` avant de générer l'URL |
