# RAPPORT D'AUDIT DE SÉCURITÉ APPLICATIVE (FRONTEND & BACKEND)

**Date d'exécution** : 17 Novembre 2026  
**Périmètre** : `frontend-angular` + `api-gateway` + 7 microservices métier (`ms-patrimoine` à `ms-notification`)

---

## 1. Synthèse des Contrôles de Sécurité

| Domaine de contrôle | Mécanisme vérifié | Résultat observé | Statut |
| :--- | :--- | :--- | :--- |
| **Protection XSS (Frontend Angular)** | Échappement natif des templates Angular (`{{ ... }}`), absence totale de `[innerHTML]` non assaini et de `bypassSecurityTrust*` | Injection `<script>alert(1)</script>` dans les formulaires neutralisée (rendue en texte brut) | **PASS** |
| **Protection SQL Injection (Backend JPA)** | Requêtes paramétrées Spring Data JPA / Hibernate (`JpaRepository`, `@Query` avec paramètres nommés) | Aucune concaténation SQL dynamique dans les 7 microservices | **PASS** |
| **Validation des entrées (Backend)** | `@Valid` + Jakarta Bean Validation (`@NotBlank`, `@NotNull`, `@Positive`, `@Email`) + `@RestControllerAdvice` (`GlobalExceptionHandler`) | Rejet HTTP `400 Bad Request` structuré sur payloads invalides | **PASS** |
| **Exposition de secrets (Frontend)** | Inspection du code source `frontend-angular/src/**` et des bundles `dist/` | Aucun secret, clé privée ou mot de passe en dur dans le frontend | **PASS** |
| **Politique CORS (`api-gateway`)** | `CorsWebFilter` dans `api-gateway/src/main/resources/application.properties` | Origines restreintes à `http://localhost:4200` et `http://localhost:5173` (pas de wildcard `*` permissif en écriture) | **PASS** |
| **Hachage des mots de passe (`ms-utilisateur`)** | `BCryptPasswordEncoder` (`spring-security-crypto`) dans `UtilisateurService` | Mots de passe hachés en BCrypt (`$2a$10$...`), champ `motDePasse` annoté `@JsonProperty(access = WRITE_ONLY)` (jamais retourné dans les réponses JSON) | **PASS** |
| **Authentification & Autorisation API (JWT / Spring Security)** | Inspection de `api-gateway` et des contrôleurs REST (`POST`, `PUT`, `DELETE`) | Absence de filtre JWT sur `api-gateway` ; `ms-utilisateur` retourne un token d'exemple statique (`sample-jwt-token-...`) non vérifié par les autres microservices ; routes d'administration non protégées par guard | **WARNING (Limitation connue du backend d'origine)** |
| **Console H2 de développement** | `spring.h2.console.enabled=true` dans les profils locaux | Utile en développement, à désactiver (`false`) en profil de production | **WARNING** |

---

## 2. Tests d'Intrusion et de Robustesse Exécutés

### 2.1 Test d'injection XSS dans les champs métier
- **Vecteur testé** : Soumission de `<img src=x onerror=alert(1)>` dans `nom` (`POST /api/patrimoines`) et `nomClient` (`POST /api/reservations`).
- **Résultat** : Le backend stocke la chaîne telle quelle ou la valide, et Angular encode systématiquement les chevrons (`&lt;img ...&gt;`) dans le DOM. Aucune exécution JavaScript. (**PASS**)

### 2.2 Test de fuite du hash de mot de passe (`ms-utilisateur`)
- **Vecteur testé** : `POST /api/utilisateurs` suivi de `GET /api/utilisateurs` et `POST /api/utilisateurs/connexion`.
- **Résultat** : Grâce à `@JsonProperty(access = JsonProperty.Access.WRITE_ONLY)` sur `Utilisateur.motDePasse`, le hash BCrypt n'est jamais exposé dans le payload JSON renvoyé au client. (**PASS**)

### 2.3 Test de manipulation des règles métier (Capacité & Montant)
- **Vecteur testé** : Tentative de forcer un `montantTotal: 0` dans `POST /api/reservations` ou de dépasser la capacité maximale (`nombrePlaces: 50` pour un circuit de `25` places).
- **Résultat** :
  - `ms-reservation` recalcule systématiquement `montantTotal = nombrePlaces * prixUnitaire` côté serveur à partir du tarif officiel de `ms-circuit` / `ms-evenement`, ignorant toute valeur falsifiée côté client. (**PASS**)
  - Toute demande dépassant la capacité restante est rejetée avec `HTTP 400 Bad Request` (`Capacité insuffisante`). (**PASS**)

---

## 3. Recommandations de Durcissement avant Mise en Production Publique

1. **Activer la validation JWT sur `api-gateway`** : Remplacer le jeton simulé `sample-jwt-token-<id>` de `ms-utilisateur` par un jeton signé (`JWS` HMAC-SHA256 / RSA) et ajouter un `GlobalFilter` sur `api-gateway` exigeant le rôle `ADMIN` ou `GESTIONNAIRE` sur les verbes mutatifs (`POST /api/patrimoines`, `PUT`, `DELETE`).
2. **Ajouter un `CanActivateFn` côté Angular** : Lorsque l'écran de connexion sera raccordé à `ms-utilisateur`, protéger les boutons et modales d'administration par rôle utilisateur.
3. **Désactiver la console H2 en production** : Forcer `spring.h2.console.enabled=false` et `spring.jpa.show-sql=false` dans le profil `prod`.
