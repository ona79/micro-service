# RAPPORT TECHNIQUE ET FONCTIONNEL — PHASE P03 & P03-CORRECTION (CŒUR MÉTIER TOURISTIQUE DE CASAMANCE)
## Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance — UASZ

---

## 1. PÉRIMÈTRE ET ARCHITECTURE IMPLÉMENTÉE

La phase **P03** (complétée par les remédiations **P03-CORRECTION**) enrichit les trois microservices du cœur métier touristique de la Casamance ainsi que l'interface **Angular 22**, en s'appuyant intégralement sur les fondations **P01** (Eureka, Spring Cloud Gateway, PostgreSQL 16 isolé par service, Flyway) et le système de sécurité **P02** (JWT HS256, cookies HttpOnly, CSRF HMAC, RBAC à 5 rôles, enveloppe Gateway 10 champs, signatures interservices 11 champs et matrice ACL).

| Microservice | Port | Base PostgreSQL 16 | Migrations Flyway | Périmètre Métier P03 & P03-CORRECTION |
| :--- | :---: | :--- | :--- | :--- |
| **`ms-patrimoine`** | `:3001` | `patrimoine_db` | `V1`, `V2`, `V3__enrich_patrimoine_p03.sql` | 5 catégories (`NATUREL`, `CULTUREL`, `HISTORIQUE`, `ARCHITECTURAL`, `IMMATERIEL`), 3 zones de Casamance (`BASSE_CASAMANCE`, `MOYENNE_CASAMANCE`, `HAUTE_CASAMANCE`), validation GPS, workflow `BROUILLON -> SOUMIS -> PUBLIE -> ARCHIVE`, protection contre la suppression physique des ressources publiées/soumises, requêtes paginées PostgreSQL (`Specification` + `Pageable`). |
| **`ms-circuit`** | `:3002` | `circuit_db` | `V1`, `V2`, `V3__enrich_circuit_p03.sql` | Étapes ordonnées, vérification interservice (`OpenFeign`, `RestTemplate`, `WebClient`) exigeant que tout circuit publié ou soumis ne référence que des patrimoines `PUBLIE`, moyens de déplacement (`PIED`, `PIROGUE`, `VELO`, `VEHICULE_4X4`, `MINIBUS`, `MIXTE`), durée estimée, distance orthodromique indicative (`ESTIMATION_ORTHODROMIQUE_INDICATIVE`), contrôle BOLA fail-closed des guides sur les données persistées, requêtes paginées PostgreSQL. |
| **`ms-evenement`** | `:3003` | `evenement_db` | `V1`, `V2`, `V3__enrich_evenement_p03.sql` | 7 types d'événements, fuseau horaire `Africa/Dakar` (UTC+0), organisateur, conditions d'accès, association optionnelle à un patrimoine (strictement `PUBLIE` pour tout événement publié ou soumis), événements à venir confirmés (`/api/evenements/a-venir`), statuts `BROUILLON`, `SOUMIS`, `PUBLIE`, `TERMINE`, `ANNULE`, `ARCHIVE`, requêtes paginées PostgreSQL. |
| **`ms-utilisateur`** | `:3005` | `utilisateur_db` | `V1..V4`, `V5__add_p03_publication_permissions.sql` | Séparation stricte des permissions `*:CREER`, `*:MODIFIER`, `*:PUBLIER`, `*:ARCHIVER`, `EVENEMENT:ANNULER`, `*:SUPPRIMER` (33 permissions normalisées en base). |

---

## 2. REMÉDIATIONS CRITIQUES P03-CORRECTION

1. **Visibilité du patrimoine et intégrité des références interservices (Section 2)** :
   - Un circuit ou un événement en statut `PUBLIE` ou `SOUMIS` ne peut référencer **que** des patrimoines en statut `PUBLIE` (vérifié à la création, à la modification, à la soumission et à la publication).
   - Un patrimoine en statut `ARCHIVE` est toujours refusé (`400 Bad Request`). Un patrimoine en `BROUILLON` ou `SOUMIS` n'est toléré que pendant la préparation d'un circuit/événement lui-même en `BROUILLON`, et bloque toute soumission ou publication tant que le patrimoine n'est pas `PUBLIE`.
   - Lors des lectures publiques (`getByIdCircuit`, `getByIdEvenement`, `getByIdPatrimoine`), aucun patrimoine non publié (`BROUILLON`, `SOUMIS`, `ARCHIVE`) n'est jamais exposé indirectement.
   - Toute indisponibilité de `ms-patrimoine` lors de la vérification ou de l'enrichissement lève une erreur contrôlée `ServiceIndisponibleException` (`503 Service Unavailable`).

2. **Protection BOLA Fail-Closed des Guides sur `ms-circuit` (Section 3)** :
   - Dans `CircuitService.updateCircuit()` et `soumettreCircuit()`, la vérification s'exécute sur l'entité persistée **avant** toute modification :
     - Si `circuit.getGuideResponsableId() == null`, l'opération est refusée (`403 Forbidden`) pour tout `GUIDE`.
     - Si `!circuit.getGuideResponsableId().equals(caller.userId())`, l'opération est refusée (`403 Forbidden`).
     - Si le `GUIDE` tente de modifier ou réaffecter `guideResponsableId` dans le DTO entrant, l'opération est refusée (`403 Forbidden`), et la valeur persistée `guideResponsableId` est verrouillée.

3. **Protection contre la suppression physique des ressources publiées ou soumises (Section 4)** :
   - Les méthodes `deletePatrimoine`, `deleteCircuit` et `deleteEvenement` inspectent l'état persisté de la ressource avant toute suppression : toute ressource en statut `PUBLIE` ou `SOUMIS` (ainsi que `TERMINE` pour un événement ayant eu lieu) ne peut **pas** être supprimée physiquement (`400 Bad Request` exigeant l'archivage préalable via `/archiver`). Seuls les brouillons non publiés ou ressources préalablement archivées peuvent faire l'objet d'un `DELETE`.

4. **Séparation stricte des permissions de création/modification et de publication/archivage (Section 5)** :
   - Les méthodes `publierPatrimoine`, `publierCircuit` et `publierEvenement` exigent respectivement et exclusivement `PATRIMOINE:PUBLIER`, `CIRCUIT:PUBLIER` et `EVENEMENT:PUBLIER` (sans repli sur `*:CREER` ou `*:MODIFIER`).
   - De même, la création ou la mise à jour directe en statut `PUBLIE` vérifie que l'appelant détient explicitement `<DOMAINE>:PUBLIER`.
   - Les méthodes d'archivage et d'annulation exigent respectivement `PATRIMOINE:ARCHIVER`, `CIRCUIT:ARCHIVER`, `EVENEMENT:ARCHIVER` et `EVENEMENT:ANNULER`.
   - La migration Flyway `V5__add_p03_publication_permissions.sql` dans `ms-utilisateur`, `AuthSessionManager`, `UtilisateurDataInitializer` et `GatewayAuthorizationFilter` alignent l'ensemble de ces permissions sur les 5 rôles métier.

5. **Performance des recherches via `JpaSpecificationExecutor` et `Pageable` PostgreSQL (Section 6)** :
   - Les recherches `rechercherPatrimoines`, `rechercherCircuits` et `rechercherEvenements` exécutent des requêtes paginées au niveau de PostgreSQL 16 via `Specification<T>` + `PageRequest.of(safePage, safeSize, sort)`.
   - La taille de page est strictement plafonnée (`MAX_PAGE_SIZE = 50`) et les colonnes de tri sont validées par liste blanche (`buildSafeSort`).
