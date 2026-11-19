# MISSION P07.8 — LOT 3 : RAPPORT DE REFONTE UX/UI DES ESPACES PROFESSIONNELS ET D'ADMINISTRATION

**Projet :** Plateforme de valorisation et gestion du patrimoine touristique de la Casamance  
**Institution :** Université Assane Seck de Ziguinchor (UASZ) — Licence 3 Informatique  
**Direction artistique :** CASAMANCE — PATRIMOINE VIVANT  
**Date :** 18 novembre 2026  
**Auteurs :** Senior Angular Architect, Senior UI/UX Designer, Senior QA Specialist  
**Branche Git de travail :** `feature/p07-8-professional-admin-experience`  
**Branche cible de livraison :** `develop` (via Pull Request sans fusion automatique)

---

## 1. SYNTHÈSE EXÉCUTIVE DU LOT 3

Le Lot 3 de la mission P07.8 concrétise la refonte intégrale des quatre espaces professionnels et administratifs de la plateforme touristique de la Casamance :
1. **Espace GUIDE** : cockpit opérationnel, profil public paramétrable, circuits assignés avec respect strict du cloisonnement BOLA, manifestes des départs et indicateurs d'avis vérifiés.
2. **Espace CONSERVATEUR** : dashboard patrimonial, cartographie et gestion éditoriale des biens culturels avec coordonnées GPS validées et assistant d'horaires structurés, instruction des dossiers guides avec séparation déontologique interdisant l'auto-validation, modération des avis.
3. **Espace GESTIONNAIRE DE SITE** : supervision de l'affluence en temps réel, terminal de contrôle d'accès sur site avec **scan caméra QR réel certifié exclusivement par le serveur backend** (`POST /api/visites/valider`), gestion des événements patrimoniaux.
4. **Espace ADMINISTRATEUR** : dashboard exécutif consolidé agrégeant les données des 7 microservices, annuaire et gouvernance RBAC des comptes et rôles, révocation immédiate des sessions, journal d'audit de sécurité immuable, supervision globale des réservations et des transactions de paiement simulées Wave et Orange Money (P04), supervision des notifications.

### 1.1 Respect absolu des règles d'or
- **Zéro modification backend Java :** Aucun microservice (`ms-*`), aucun contrôleur, entité, migration Flyway ou règle de sécurité Spring n'a été altéré.
- **Zéro simulation locale de contrôle QR :** La validation des billets QR à l'entrée des sites est effectuée exclusivement par appel direct à l'API Gateway et à `ms-reservation` (`/api/visites/valider`). Le serveur vérifie rigoureusement la date de prestation (refus si prématuré ou périmé), l'état de la réservation (refus si annulé) et l'usage unique (refus si déjà scanné).
- **Zéro fausse donnée transactionnelle :** Aucune statistique n'est inventée côté client. Les données proviennent directement des microservices métier. En cas de défaillance réseau ou limitation API backend, des bandeaux d'erreur explicites sont affichés sans plantage applicatif.
- **Harmonie Design System :** Déploiement rigoureux de la direction artistique « CASAMANCE — PATRIMOINE VIVANT » (vert Mangrove, rouge Latérite, ocre Terre cuite, beige Lin) avec une ergonomie dense et professionnelle adaptée aux usages métier quotidiens.

---

## 2. ARCHITECTURE TECHNIQUE FRONTEND DES ESPACES PRO

### 2.1 Découpage modulaire et structure des composants

L'ensemble des fonctionnalités professionnelles est centralisé sous le préfixe `/pro` au sein du module Angular standalone `frontend-angular/src/app/features/pro/` :

```
frontend-angular/src/app/features/pro/
├── pages/
│   ├── pro-dashboard-page/          # Cockpit adaptatif selon rôle connecté
│   ├── pro-guide-workspace-page/    # Espace profil, statut, visibilité & agenda guide
│   ├── pro-manifestes-page/         # Manifestes départs circuits assignés
│   ├── pro-patrimoines-page/        # Catalogue patrimonial, GPS & horaires structurés
│   ├── pro-circuits-admin-page/     # Éditeur & supervision des circuits
│   ├── pro-evenements-admin-page/   # Calendrier & gestion événements de sites
│   ├── pro-guides-admin-page/       # Dossiers guides, instruction, validation/rejet
│   ├── pro-controle-acces-page/     # Scanner QR caméra temps réel certifié serveur
│   ├── pro-users-admin-page/        # Annuaire RBAC, attribution rôles & révocation
│   ├── pro-stats-page/              # Statistiques décisionnelles multi-services
│   ├── pro-reservations-admin-page/ # Supervision globale des réservations
│   ├── pro-paiements-admin-page/    # Audit des paiements simulés Wave / Orange Money
│   └── pro-notifications-page/      # Console de supervision des notifications
├── components/                      # Tiroirs (drawers), filtres et formulaires métier
└── services/                        # Services de support et adapters pro
```

### 2.2 Routage, sécurisation et gardiens d'accès (Guards)

Toutes les routes professionnelles sont protégées par `AuthGuard` et `RoleGuard` afin de garantir qu'aucun utilisateur non habilité ne puisse accéder à une interface non couverte par ses droits réels :

| Route | Composant | Rôles Autorisés | Permissions Requises |
| :--- | :--- | :--- | :--- |
| `/pro` | `ProDashboardPageComponent` | GUIDE, CONSERVATEUR, GESTIONNAIRE_SITE, ADMINISTRATEUR | Authentification active |
| `/pro/mon-profil-guide` | `ProGuideWorkspacePageComponent` | GUIDE | Authentification GUIDE |
| `/pro/manifestes` | `ProManifestesPageComponent` | GUIDE | Cloisonnement BOLA (assignation requise) |
| `/pro/patrimoines` | `ProPatrimoinesPageComponent` | CONSERVATEUR, GESTIONNAIRE_SITE, ADMINISTRATEUR | `PATRIMOINE:CREER` ou `PATRIMOINE:MODIFIER` |
| `/pro/circuits` | `ProCircuitsAdminPageComponent` | CONSERVATEUR, ADMINISTRATEUR | `CIRCUIT:CREER` ou `CIRCUIT:MODIFIER` |
| `/pro/evenements` | `ProEvenementsAdminPageComponent` | CONSERVATEUR, GESTIONNAIRE_SITE, ADMINISTRATEUR | `EVENEMENT:CREER` ou `EVENEMENT:MODIFIER` |
| `/pro/guides` | `ProGuidesAdminPageComponent` | CONSERVATEUR, ADMINISTRATEUR | `GUIDE:VALIDER`, `GUIDE:SUSPENDRE` |
| `/pro/controle-acces` | `ProControleAccesPageComponent` | GESTIONNAIRE_SITE, CONSERVATEUR, ADMINISTRATEUR | `VISITE:VALIDER` |
| `/pro/utilisateurs` | `ProUsersAdminPageComponent` | ADMINISTRATEUR | `UTILISATEUR:GERER_ROLES`, `UTILISATEUR:BLOQUER` |
| `/pro/statistiques` | `ProStatsPageComponent` | ADMINISTRATEUR, CONSERVATEUR | Authentification PRO |
| `/pro/reservations` | `ProReservationsAdminPageComponent` | ADMINISTRATEUR, GESTIONNAIRE_SITE | `RESERVATION:LIRE_TOUT`, `RESERVATION:GERER` |
| `/pro/paiements` | `ProPaiementsAdminPageComponent` | ADMINISTRATEUR | `PAIEMENT:LIRE_TOUT` |
| `/pro/notifications` | `ProNotificationsPageComponent` | ADMINISTRATEUR, CONSERVATEUR, GESTIONNAIRE_SITE | Authentification PRO |

---

## 3. RÉALISATIONS DÉTAILLÉES PAR RÔLE MÉTIER

### 3.1 Rôle GUIDE : Cockpit opérationnel et gestion d'activité

1. **Cockpit d'accueil contextualisé :**
   - KPI dynamiques calculés depuis les données réelles du backend : statut administratif du guide (`VALIDE`, `EN_ATTENTE_VALIDATION`, `SUSPENDU`), circuits assignés, alertes d'assignation.
   - Intégration de l'indicateur de note moyenne des voyageurs (`AvisResume`) depuis `AvisApiService.getResume('GUIDE', id)`, affichant la moyenne sur 5 et le nombre d'avis vérifiés déposés post-prestation.
2. **Profil professionnel et visibilité publique :**
   - Consultation et mise à jour de la biographie, des langues parlées (Français, Wolof, Diola, Anglais, Mandingue), de la tarification journalière et de la zone d'intervention géographique (Basse-Casamance, Moyenne-Casamance, Îles du Saloum/Karone).
   - Bascule de visibilité publique : activation ou suspension de l'apparition dans l'annuaire public des guides touristiques via `PATCH /api/guides/mon-profil/disponibilite`.
3. **Circuits assignés et respect strict du cloisonnement BOLA :**
   - Consultation exclusive des circuits dont l'identifiant guide correspond rigoureusement à l'utilisateur connecté via `GET /api/circuits/guide/:guideId`.
   - Interdiction totale d'accéder aux circuits des confrères.
4. **Manifestes des départs et passagers :**
   - Consultation de la liste des réservations associées à chaque circuit assigné (`ProManifestesPageComponent`).
   - Résilience réseau intégrée face aux défaillances Feign du backend (`TKT-BACK-001`) via bandeaux d'erreur explicites.
5. **Gestion de l'agenda et limitation SQL :**
   - Requête d'agenda calendaire sur `GET /api/reservations/guide/agenda`.
   - En raison d'une exception PostgreSQL Hibernate backend (`TKT-BACK-004` : paramètre `$4` indéterminé sur les dates nulles), l'interface intercepte l'erreur sans planter et affiche un avertissement clair informant le guide que ses prestations planifiées restent consultables via le listing des réservations de ses circuits.

### 3.2 Rôle CONSERVATEUR : Sauvegarde, valorisation et gouvernance

1. **Dashboard patrimonial territorial :**
   - Vue consolidée de l'état du patrimoine culturel, architectural et naturel de la région (sites classés UNESCO, cases à impluvium, forêts sacrées, musées).
   - Indicateurs de fréquentation et de répartition par département (Oussouye, Ziguinchor, Bignona, Sédhiou, Kolda).
2. **Gestion complète du patrimoine et validation GPS :**
   - Formulaire d'édition et de création enrichi intégrant : nom, commune, département, description historique, tarification d'entrée en FCFA, règles de visite.
   - Validation stricte des coordonnées GPS dans le périmètre géographique de la Casamance (Latitude 12.0 à 13.5 N, Longitude -17.0 à -15.5 W).
   - **Assistant d'horaires structurés :** Ajout de boutons de modèles prédéfinis adaptés aux réalités locales :
     - `Mardi au Dimanche : 09h00 - 18h00 (Fermé Lundi)` (Sites et musées régionaux) ;
     - `Tous les jours : 08h30 - 19h00` (Parcs et réserves naturelles) ;
     - `Lundi au Samedi : 09h00 - 17h30 (Fermé Dimanche)` (Monuments et centres artisanaux) ;
     - `Sur réservation uniquement (09h00 - 16h00)` (Forêts sacrées et concessions coutumières).
3. **Instruction des dossiers guides et stricte séparation déontologique :**
   - Interface d'examen des pièces et des demandes d'agrément des guides locaux (`ProGuidesAdminPageComponent`).
   - **Règle déontologique implémentée :** Détection formelle d'auto-dossier (`isSelfDossier()`). Il est strictement impossible pour un Conservateur d'instruire, valider, suspendre ou rejeter son propre dossier s'il est lui-même guide : les boutons d'action sont masqués et toute tentative déclenche un message d'interdiction déontologique.
   - Exigence d'un motif d'au moins 5 caractères pour tout rejet ou suspension de dossier d'un tiers.
4. **Modération des avis et signalements :**
   - Interface de consultation des signalements d'avis voyageurs.
   - Documentation du besoin de mise en conformité de l'autorité `AVIS:MODERER` dans l'API Gateway (`TKT-BACK-003`).

### 3.3 Rôle GESTIONNAIRE DE SITE : Contrôle d'accès certifié et régulation

1. **Supervision des flux sur site :**
   - Visualisation de la fréquentation journalière, du nombre de visiteurs attendus et des billets déjà compostés.
2. **Terminal de contrôle d'accès avec scan caméra QR certifié serveur :**
   - **Absence totale de simulation locale :** Le flux vidéo de la caméra scanne le QR code (ou permet la saisie manuelle de la référence billet) et émet immédiatement une requête `POST /api/visites/valider` au microservice `ms-reservation`.
   - **Contrôles stricts appliqués par le backend :**
     - Vérification de la date de prestation (refus immédiat avec message explicite si la prestation est prévue pour une date future, ex. `BILLET NON UTILISABLE AUJOURD'HUI : La prestation est prévue pour le 01/12/2026`) ;
     - Vérification de l'état de la réservation (refus si annulée ou en attente de paiement) ;
     - Contrôle d'usage unique (refus si le billet a déjà été validé à l'entrée avec horodatage du scan antérieur).
   - Historique immédiat des scans horodatés affiché sous le scanner avec badges de statut (`VALIDE`, `REFUSE`).
   - Interface responsive ergonomique utilisable sur smartphone de terrain ou tablette de guichet.
3. **Audit de la billetterie guichet :**
   - Analyse de faisabilité de l'émission directe de billets au guichet physique (`TKT-BACK-005`). En l'absence de permission `RESERVATION:CREER` pour ce profil dans la matrice backend, aucun faux formulaire trompeur n'a été créé : l'interface se concentre avec rigueur sur la validation certifiée des entrées.
4. **Gestion des événements patrimoniaux :**
   - Publication et calendrier des manifestations culturelles (festivals, cérémonies traditionnelles, expositions artisanales) avec gestion des jauges et des dates d'ouverture.

### 3.4 Rôle ADMINISTRATEUR : Gouvernance globale et audit de la plateforme

1. **Dashboard exécutif consolidé :**
   - Agrégation en temps réel des métriques issues des 7 microservices : comptes utilisateurs actifs, patrimoines répertoriés, circuits publiés, réservations confirmées, volume de paiements FCFA et notifications délivrées.
2. **Annuaire et gouvernance RBAC des comptes utilisateurs :**
   - Listing paginé avec recherche multi-critères (nom, email, rôle).
   - Modification des rôles applicatifs (`TOURISTE`, `GUIDE`, `CONSERVATEUR`, `GESTIONNAIRE_SITE`, `ADMINISTRATEUR`).
   - Verrouillage administratif de compte suspect (`bloque: true`) et réactivation.
   - **Révocation immédiate des sessions actives :** Déclenchement de la déconnexion forcée via `DELETE /api/utilisateurs/:id/sessions`.
3. **Piste d'audit de sécurité immuable :**
   - Consultation des logs d'événements de sécurité enregistrés dans `ms-utilisateur` : tentatives de connexion échouées, modifications de rôles, révocations de sessions, accès refusés.
4. **Supervision des réservations :**
   - Vue centralisée de l'ensemble des dossiers de réservation avec filtres par statut (`EN_ATTENTE_PAIEMENT`, `CONFIRMEE`, `ANNULEE`, `UTILISEE`).
5. **Supervision des paiements simulés Wave et Orange Money (P04) :**
   - Visualisation consolidée des transactions de paiement simulées du microservice `ms-paiement`.
   - Indicateurs financiers en Francs CFA (XOF) : montant total encaissé, répartition par opérateur mobile (Wave vs Orange Money), ventilation des statuts (`SUCCES`, `ECHEC`, `REMBOURSE`).
6. **Supervision des notifications :**
   - Console d'audit des messages transactionnels délivrés (confirmations de réservation, alertes de modération, convocations de visites).

---

## 4. DESIGN SYSTEM « CASAMANCE — PATRIMOINE VIVANT » DANS LES ESPACES PRO

### 4.1 Harmonisation des tokens graphiques et des couleurs

Les espaces professionnels adoptent une déclinaison sobre et institutionnelle du Design System établi au Lot 1 :
- **Mangrove (`#1C4A38`) :** Barre de navigation supérieure professionnelle, boutons d'action principale (`bo-btn--primary`), bordures actives.
- **Latérite (`#8B3A22`) :** Actions sensibles et alertes d'invalidation (`bo-btn--danger`, `bo-btn--terracotta`), badges d'état critique.
- **Terre Cuite / Ocre (`#D9822B`) :** États en attente d'instruction, avertissements réseau, badges de statuts intermédiaires.
- **Forêt (`#2D5A27`) :** Validations réussies, billets acceptés au scanneur, badges de conformité.
- **Lin (`#F6F3ED`) et Sable (`#FAF8F5`) :** Arrière-plans de travail, cartes d'informations (`bo-panel`, `bo-card`), garantissant un confort de lecture prolongé sans fatigue oculaire.

### 4.2 Typographie et hiérarchie visuelle

- **Fraunces :** Réservé aux titres de niveau 1 des espaces professionnels (`bo-header__title`), apportant l'ancrage culturel et patrimonial de la Casamance.
- **Plus Jakarta Sans :** Typographie de corps pour l'ensemble des tableaux denses, formulaires, tiroirs latéraux et boutons de contrôle, offrant une lisibilité optimale à toutes les résolutions.
- **JetBrains Mono :** Typographie à chasse fixe pour les références de billets, identifiants techniques, coordonnées GPS, montants FCFA et jetons de sécurité.

### 4.3 Composants partagés du Lot 1 réutilisés

| Composant Partagé | Usage dans le Lot 3 |
| :--- | :--- |
| `app-ui-kpi-card` | Indicateurs clés en en-tête des dashboards Guide, Conservateur, Gestionnaire et Admin |
| `app-ui-badge` | Statuts des guides, statuts des réservations, modes de paiement Wave/OM, statuts des comptes |
| `app-ui-button` | Actions d'instruction, bascule de disponibilité, soumission de formulaires |
| `app-ui-card` | Conteneurs des sections thématiques, panneaux d'audit et consoles de contrôle |
| `app-ui-error-banner` | Remontée contextualisée des erreurs réseau et limitations serveur |
| `app-ui-empty-state` | Écrans vides guidés (aucun circuit assigné, aucun dossier en attente) |
| `app-ui-loading-state` | Indicateurs de chargement non bloquants lors des appels microservices |
| `app-ui-confirm-dialog` | Modale de confirmation sécurisée avant révocation de session ou rejet de dossier |

---

## 5. RESPONSIVE DESIGN ET ACCESSIBILITÉ (WCAG 2.1 AA)

### 5.1 Adaptabilité multi-écrans vérifiée

Les espaces professionnels ont été conçus pour répondre aux contextes d'usage réels des agents sur le terrain et des administrateurs au bureau :
1. **Desktop (1440px) :** Tableaux denses multi-colonnes, tiroirs d'inspection latérale (Drawers) ouverts à droite sans masquer la liste de données, consoles multi-métriques.
2. **Tablette (768px) :** Dispositions en grille adaptative (`repeat(auto-fit, minmax(280px, 1fr))`), terminal de contrôle d'accès optimisé en orientation portrait et paysage.
3. **Mobile (390px) :** Transformation des tableaux volumineux en cartes individuelles empilées, scanner QR plein écran avec visée caméra responsive, boutons d'action de taille tactile minimale 48x48px.

### 5.2 Accessibilité numérique (RGAA / WCAG 2.1 AA)

- **Contraste des textes :** Ratios de contraste systématiquement supérieurs à 4.5:1 pour le texte courant et 3:1 pour les composants d'interface.
- **Navigation au clavier :** Ordre de tabulation logique dans tous les formulaires d'édition, gestion du focus lors de l'ouverture et de la fermeture des modales de confirmation.
- **Formulaires accessibles :** Tous les champs possèdent un attribut `id` relié explicitement à un élément `<label for="...">`. Les messages d'erreur sont reliés via `aria-describedby`.
- **Lecteurs d'écran :** Utilisation des rôles ARIA natifs (`role="status"`, `aria-live="polite"` pour les retours de scan QR, `aria-expanded` pour les tiroirs).

---

## 6. STATUT FACTUEL PAR EXIGENCE FONCTIONNELLE

Conformément aux directives de rigueur du mandat, voici le tableau de conformité exhaustif :

| Domaine Fonctionnel | Fonctionnalité | Rôle | Statut Formel | Commentaire / Justification |
| :--- | :--- | :--- | :--- | :--- |
| **Authentification** | Sélecteur de comptes démo pro | Tous | **TERMINÉ ET TESTÉ** | 5 rôles accessibles d'un clic sur `/connexion` |
| **Guide** | Cockpit & KPI réels | GUIDE | **TERMINÉ ET TESTÉ** | Note moyenne avis intégrée, KPI serveur |
| **Guide** | Profil & langues parlées | GUIDE | **TERMINÉ ET TESTÉ** | Mise à jour profil et visibilité publique |
| **Guide** | Circuits assignés (BOLA) | GUIDE | **TERMINÉ ET TESTÉ** | Cloisonnement strict au guide connecté |
| **Guide** | Manifestes des départs | GUIDE | **TERMINÉ ET TESTÉ** | Vue passagers avec gestion de repli |
| **Guide** | Agenda des prestations | GUIDE | **PARTIELLEMENT RÉALISÉ** | Limitation `$4` SQL backend (`TKT-BACK-004`) gérée gracieusement |
| **Conservateur** | Dashboard patrimoine | CONSERVATEUR | **TERMINÉ ET TESTÉ** | Statistiques territoriales consolidées |
| **Conservateur** | Gestion patrimoine & GPS | CONSERVATEUR | **TERMINÉ ET TESTÉ** | Coordonnées Casamance & assistant horaires structurés |
| **Conservateur** | Instruction dossiers guides | CONSERVATEUR | **TERMINÉ ET TESTÉ** | Interdiction déontologique d'auto-validation (`isSelfDossier()`) |
| **Conservateur** | Modération des avis | CONSERVATEUR | **TERMINÉ ET TESTÉ** | Consultation signalements (permission `TKT-BACK-003`) |
| **Gestionnaire** | Dashboard fréquentation | GESTIONNAIRE | **TERMINÉ ET TESTÉ** | Indicateurs temps réel du site |
| **Gestionnaire** | Contrôle d'accès scan QR | GESTIONNAIRE | **TERMINÉ ET TESTÉ** | **100% validé par `POST /api/visites/valider` sans fake** |
| **Gestionnaire** | Billetterie guichet | GESTIONNAIRE | **BLOQUÉ BACKEND** | Limitation `RESERVATION:CREER` (`TKT-BACK-005`), documentée |
| **Gestionnaire** | Gestion événements | GESTIONNAIRE | **TERMINÉ ET TESTÉ** | Création, jauge, publication d'événements |
| **Administration** | Dashboard exécutif | ADMINISTRATEUR | **TERMINÉ ET TESTÉ** | Données consolidées des 7 microservices |
| **Administration** | Gestion utilisateurs RBAC | ADMINISTRATEUR | **TERMINÉ ET TESTÉ** | Modification rôles, blocage et réactivation |
| **Administration** | Révocation des sessions | ADMINISTRATEUR | **TERMINÉ ET TESTÉ** | `DELETE /api/utilisateurs/:id/sessions` opérationnel |
| **Administration** | Piste d'audit sécurité | ADMINISTRATEUR | **TERMINÉ ET TESTÉ** | Journal immuable des événements de sécurité |
| **Administration** | Supervision réservations | ADMINISTRATEUR | **TERMINÉ ET TESTÉ** | Vue globale des dossiers de réservation |
| **Administration** | Supervision paiements P04 | ADMINISTRATEUR | **TERMINÉ ET TESTÉ** | Totaux FCFA, répartition Wave / Orange Money |
| **Administration** | Supervision notifications | ADMINISTRATEUR | **TERMINÉ ET TESTÉ** | Suivi des alertes et notifications délivrées |

---

## 7. GALERIE DES PREUVES VISUELLES RÉELLES (20 CAPTURES)

Toutes les captures d'écran ci-dessous ont été réalisées sous session authentifiée réelle avec Chromium Playwright dans `docs/evidence/p07-8-lot3/` :

### 7.1 Espace Administrateur
- [01-admin-dashboard-desktop-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/01-admin-dashboard-desktop-1440.png) : Dashboard exécutif consolidé 7 microservices (1440px).
- [02-admin-dashboard-mobile-390.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/02-admin-dashboard-mobile-390.png) : Dashboard administrateur responsive mobile (390px).
- [03-admin-statistiques-desktop-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/03-admin-statistiques-desktop-1440.png) : Métriques décisionnelles et flux touristiques régionaux (1440px).
- [04-admin-utilisateurs-audit-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/04-admin-utilisateurs-audit-1440.png) : Annuaire des comptes, gestion RBAC et piste d'audit de sécurité (1440px).
- [05-admin-supervision-reservations-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/05-admin-supervision-reservations-1440.png) : Supervision globale des dossiers de réservation territoriaux (1440px).
- [06-admin-supervision-paiements-simules-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/06-admin-supervision-paiements-simules-1440.png) : Audit financier des paiements simulés Wave et Orange Money (1440px).
- [07-admin-notifications-supervision-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/07-admin-notifications-supervision-1440.png) : Console de supervision des notifications multicanales (1440px).

### 7.2 Espace Conservateur
- [08-conservateur-dashboard-desktop-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/08-conservateur-dashboard-desktop-1440.png) : Dashboard de conservation et valorisation patrimoniale (1440px).
- [09-conservateur-patrimoines-gps-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/09-conservateur-patrimoines-gps-1440.png) : Catalogue du patrimoine, validation GPS Casamance et assistant horaires (1440px).
- [10-conservateur-validation-guides-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/10-conservateur-validation-guides-1440.png) : Instruction des dossiers guides avec séparation déontologique (1440px).

### 7.3 Espace Gestionnaire de Site
- [11-gestionnaire-dashboard-desktop-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/11-gestionnaire-dashboard-desktop-1440.png) : Dashboard de supervision des flux et affluence sur site (1440px).
- [12-gestionnaire-controle-acces-desktop-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/12-gestionnaire-controle-acces-desktop-1440.png) : Terminal de contrôle d'accès scan caméra QR certifié serveur (1440px).
- [13-gestionnaire-controle-acces-tablette-768.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/13-gestionnaire-controle-acces-tablette-768.png) : Terminal de contrôle d'accès sur tablette de guichet (768px).
- [14-gestionnaire-controle-acces-mobile-390.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/14-gestionnaire-controle-acces-mobile-390.png) : Terminal de contrôle d'accès sur smartphone agent de terrain (390px).
- [15-gestionnaire-evenements-desktop-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/15-gestionnaire-evenements-desktop-1440.png) : Gestion et calendrier des événements culturels du site (1440px).

### 7.4 Espace Guide
- [16-guide-dashboard-desktop-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/16-guide-dashboard-desktop-1440.png) : Cockpit guide avec note voyageurs et indicateurs d'activité (1440px).
- [17-guide-mon-profil-workspace-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/17-guide-mon-profil-workspace-1440.png) : Profil professionnel, langues parlées et bascule de visibilité (1440px).
- [18-guide-circuits-assignes-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/18-guide-circuits-assignes-1440.png) : Circuits assignés sous cloisonnement BOLA (1440px).
- [19-guide-manifestes-circuits-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/19-guide-manifestes-circuits-1440.png) : Manifeste des départs et passagers (1440px).
- [20-guide-workspace-mobile-390.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot3/20-guide-workspace-mobile-390.png) : Espace guide adapté sur smartphone de terrain (390px).

---

## 8. CONCLUSION ET PROCHAINES ÉTAPES

Le Lot 3 dote la plateforme touristique de la Casamance d'espaces professionnels rigoureux, ergonomiques, parfaitement cloisonnés sur le plan de la sécurité RBAC et BOLA, et conformes aux réalités d'exploitation du territoire.

Tous les livrables sont disponibles sur la branche de travail :
`feature/p07-8-professional-admin-experience`

La livraison est soumise à la validation humaine du responsable de projet avant toute fusion dans `develop`.
