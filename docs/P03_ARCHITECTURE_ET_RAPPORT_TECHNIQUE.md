# RAPPORT TECHNIQUE ET FONCTIONNEL — PHASE P03 (CŒUR MÉTIER TOURISTIQUE DE CASAMANCE)
## Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance — UASZ

---

## 1. PÉRIMÈTRE ET ARCHITECTURE IMPLÉMENTÉE

La phase **P03** enrichit les trois microservices du cœur métier touristique de la Casamance ainsi que l'interface **Angular 22**, en s'appuyant intégralement sur les fondations **P01** (Eureka, Spring Cloud Gateway, PostgreSQL 16 isolé par service, Flyway) et le système de sécurité **P02** (JWT HS256, cookies HttpOnly, CSRF HMAC, RBAC à 5 rôles, enveloppe Gateway 10 champs, signatures interservices 11 champs et matrice ACL).

| Microservice | Port | Base PostgreSQL 16 | Migrations Flyway | Périmètre Métier P03 |
| :--- | :---: | :--- | :--- | :--- |
| **`ms-patrimoine`** | `:3001` | `patrimoine_db` | `V1`, `V2`, `V3__enrich_patrimoine_p03.sql` | 5 catégories (`NATUREL`, `CULTUREL`, `HISTORIQUE`, `ARCHITECTURAL`, `IMMATERIEL`), 3 zones de Casamance (`BASSE_CASAMANCE`, `MOYENNE_CASAMANCE`, `HAUTE_CASAMANCE`), validation GPS, informations culturelles et pratiques, workflow `BROUILLON -> SOUMIS -> PUBLIE -> ARCHIVE`, recherche paginée. |
| **`ms-circuit`** | `:3002` | `circuit_db` | `V1`, `V2`, `V3__enrich_circuit_p03.sql` | Étapes ordonnées, vérification interservice (`OpenFeign`, `RestTemplate`, `WebClient`), moyens de déplacement (`PIED`, `PIROGUE`, `VELO`, `VEHICULE_4X4`, `MINIBUS`, `MIXTE`), durée estimée, distance orthodromique indicative (`ESTIMATION_ORTHODROMIQUE_INDICATIVE`), workflow `BROUILLON -> SOUMIS -> PUBLIE -> ARCHIVE`, contrôle BOLA périmétrique des guides. |
| **`ms-evenement`** | `:3003` | `evenement_db` | `V1`, `V2`, `V3__enrich_evenement_p03.sql` | 7 types d'événements, fuseau horaire `Africa/Dakar` (UTC+0), organisateur, conditions d'accès, association optionnelle à un patrimoine, événements à venir confirmés (`/api/evenements/a-venir`), gestion des statuts `BROUILLON`, `SOUMIS`, `PUBLIE`, `TERMINE`, `ANNULE`, `ARCHIVE`. |

---

## 2. MODÈLE DE DONNÉES ET MIGRATIONS FLYWAY V3

### 2.1 `ms-patrimoine` (`V3__enrich_patrimoine_p03.sql`)
- Colonnes ajoutées : `categorie_patrimoine`, `type_patrimoine`, `zone_geographique`, `localite`, `informations_culturelles`, `horaires_ouverture`, `tarif_entree`, `informations_pratiques`, `image_url`, `galerie_medias`, `statut_publication`, `donnee_demonstration`, `cree_par_id`, `modifie_par_id`, `valide_par_id`, `motif_statut`, `date_creation`, `date_modification`, `date_publication`, `date_archivage`.
- Index : `idx_patrimoine_statut`, `idx_patrimoine_categorie`, `idx_patrimoine_zone`, `idx_patrimoine_localite`.
- Données de démonstration (clairement identifiées avec `donnee_demonstration = TRUE`) : 8 fiches couvrant l'ensemble de la Casamance (`PAT-ZIG-001` à `PAT-KOL-008`).

### 2.2 `ms-circuit` (`V3__enrich_circuit_p03.sql`)
- Colonnes ajoutées sur `circuit` : `presentation_touristique`, `moyen_transport`, `zone_geographique`, `point_depart`, `point_arrivee`, `informations_pratiques`, `image_url`, `mode_calcul_distance`, `statut_circuit`, `donnee_demonstration`, `cree_par_id`, `modifie_par_id`, `valide_par_id`, `guide_responsable_id`, `motif_statut`, `date_creation`, `date_modification`, `date_publication`, `date_archivage`.
- Colonnes ajoutées sur `etape` : `description_etape`, `moyen_transport`.
- Index : `idx_circuit_statut`, `idx_circuit_difficulte`, `idx_circuit_zone`.

### 2.3 `ms-evenement` (`V3__enrich_evenement_p03.sql`)
- `patrimoine_id` rendu nullable (`ALTER COLUMN patrimoine_id DROP NOT NULL`) pour permettre aussi les événements communaux ou itinérants en Casamance.
- Colonnes ajoutées : `horaires`, `zone_geographique`, `localite`, `organisateur`, `contact_organisateur`, `conditions_acces`, `image_url`, `support_communication`, `statut_evenement`, `motif_annulation`, `fuseau_horaire` (`Africa/Dakar`), `donnee_demonstration`, `cree_par_id`, `modifie_par_id`, `valide_par_id`, `date_creation`, `date_modification`, `date_publication`.
- Index : `idx_evenement_statut`, `idx_evenement_type`, `idx_evenement_zone`, `idx_evenement_date_fin`.

---

## 3. CONTRÔLE DES PERMISSIONS RBAC ET ANTI-BOLA/IDOR

| Rôle | `ms-patrimoine` | `ms-circuit` | `ms-evenement` |
| :--- | :--- | :--- | :--- |
| **`PUBLIC` / `TOURISTE`** | Lecture uniquement des fiches `PUBLIE` (`403` sur brouillon/archivé). | Lecture uniquement des circuits `PUBLIE` (`403` sur brouillon/archivé). | Lecture des événements `PUBLIE`/`TERMINE` et `/a-venir` (excluant `ANNULE`, `ARCHIVE`, `BROUILLON`). |
| **`GUIDE`** | Lecture des fiches `PUBLIE`. | Lecture, modification (`CIRCUIT:MODIFIER`) et soumission des circuits de son périmètre (`403` si `guideResponsableId` appartient à un autre guide ; `403` sur création, publication ou archivage). | Lecture des événements publiés. |
| **`CONSERVATEUR`** | Création, modification, soumission, publication (`PATRIMOINE:PUBLIER`), archivage (`PATRIMOINE:ARCHIVER`) et suppression. | Lecture uniquement (`403` sur toute mutation de circuit). | Lecture uniquement (`403` sur toute mutation d'événement). |
| **`GESTIONNAIRE_SITE`** | Lecture uniquement (`403` sur toute mutation de patrimoine). | Création, modification, soumission, publication (`CIRCUIT:PUBLIER`), archivage (`CIRCUIT:ARCHIVER`) et suppression. | Création, modification, soumission, publication (`EVENEMENT:PUBLIER`), annulation (`EVENEMENT:ANNULER`), clôture (`terminer`), archivage (`EVENEMENT:ARCHIVER`) et suppression. |
| **`ADMINISTRATEUR`** | Toutes les opérations d'administration et de gouvernance. | Toutes les opérations d'administration et de gouvernance. | Toutes les opérations d'administration et de gouvernance. |

---

## 4. RÉSULTATS EXACTS DES TESTS AUTOMATISÉS

| Service / Module | Total Déclarés | Exécutés & Réussis (`verify-integration.sh` H2/MockMvc) | Exécutés & Réussis (`verify-postgres.sh` PG 16.15) | Échecs | Sautés après exécution PG 16 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `discovery-server` | 1 | 1 | — | 0 | 0 |
| `ms-patrimoine` | 28 | 27 | 1 (`PatrimoinePostgresIntegrationTest` — 8 sites, 5 catégories, 3 zones) | 0 | 0 |
| `ms-circuit` | 21 | 19 | 1 (`CircuitPostgresIntegrationTest`) | 0 | **1** (`EurekaRealDiscoveryIntegrationTest`) |
| `ms-evenement` | 16 | 15 | 1 (`EvenementPostgresIntegrationTest`) | 0 | 0 |
| `ms-reservation` | 13 | 12 | 1 (`ReservationPostgresIntegrationTest`) | 0 | 0 |
| `ms-utilisateur` | 29 | 27 | 2 (`UtilisateurPostgresIntegrationTest`) | 0 | 0 |
| `ms-notification` | 7 | 6 | 1 (`NotificationPostgresIntegrationTest`) | 0 | 0 |
| `ms-paiement` | 11 | 10 | 1 (`PaiementPostgresIntegrationTest`) | 0 | 0 |
| `api-gateway` | 23 | 23 | — | 0 | 0 |
| `frontend-angular` | 34 | 34 | — | 0 | 0 |
| **TOTAL** | **183** | **174** (H2 + Angular) | **+8** (PG 16.15) = **182 exécutés & réussis** | **0** | **1 sauté / 0 non exécuté** |
