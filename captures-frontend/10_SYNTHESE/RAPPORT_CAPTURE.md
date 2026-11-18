# RAPPORT D'AUDIT VISUEL ET DE CAPTURE EXHAUSTIVE DU FRONTEND (MISSION P07.7)

**Projet** : Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance  
**Contexte académique** : Université Assane Seck de Ziguinchor (UASZ) — Licence 3 Ingénierie Informatique  
**Rôle** : Senior Frontend Engineer, Senior UI/UX Designer & Design System Architect  
**Branche Git analysée** : `feature/p07-7-frontend-capture`  
**Commit de référence** : `af08df2` (Intégrant P07.5, les lots 1, 2, 3 et la validation Flyway v9)  
**Date d'exécution** : 18 Novembre 2026  
**Environnement d'exécution réel** : Stack Docker Compose (PostgreSQL 16 multi-bases, 7 microservices Spring Boot, API Gateway MVC, Eureka, Angular 22 / Nginx port 80).

---

## 1. Synthèse Exécutive et Métrique

| Indicateur | Valeur Constatée | Observations |
| :--- | :--- | :--- |
| **Répertoire Frontend examiné** | `frontend-angular/` | Angular 22.2.0, 100 % Standalone, Signals, OnPush |
| **Routes déclarées dans `app.routes.ts`** | **36 définitions** | 33 écrans uniques + 3 redirections (`/espace-guide`, `/pro`, `/**`) |
| **Pages accessibles réelles** | **33 pages** | 100 % des routes métier déclarées sont joignables |
| **Pages non accessibles (crash/injoignable)** | **0** | Aucune route n'a échoué une fois la stack démarrée |
| **Pages nécessitant une authentification** | **20 pages** | Couvrant les 5 rôles (`TOURISTE`, `GUIDE`, `CONSERVATEUR`, `GESTIONNAIRE_SITE`, `ADMINISTRATEUR`) |
| **Volume total de captures réelles réalisées** | **116 captures PNG** | Format standardisé, aucune maquette fictive |
| **Captures en résolution Desktop (1440×900)** | **65 captures** | Découpage par espace (`01_PUBLIC` à `07_ADMIN`) |
| **Captures de la matrice Responsive** | **44 captures** | 11 écrans clés × 4 résolutions (1440px, 1024px, 768px, 390px) |
| **Captures d'Interactions & États dynamiques** | **7 captures** | Modales, formulaires ouverts, filtres GPS, QR Zoom, menus |
| **Modifications apportées au code applicatif** | **0 (Stricte conformité)** | Seuls les livrables de capture et d'index ont été produits |

---

## 2. Inventaire par Espace Utilisateur

### 2.1 Espace Public (`01_PUBLIC/` — 16 captures)
- **Accueil (`/`)** : Hero avec photographie des bolongs, barre de recherche textuelle, indicateurs chiffrés dynamiques connectés aux microservices (8 sites, 2 circuits, 3 événements, 1 guide agréé).
- **Catalogue Patrimoine (`/patrimoines`)** : Grille des cartes des 8 sites avec filtres par zone (Basse, Moyenne, Haute-Casamance) et catégorie, bascule vers la carte Leaflet interactive, et bouton **« Autour de moi (GPS) »**.
- **Fiches Détail (`/patrimoines/:id`, `/circuits/:id`, `/evenements/:id`, `/guides/:id`)** : Présentations détaillées avec galeries, avis vérifiés et réponse officielle du guide.
- **Pages Système (`/acces-refuse`, `/**`)** : Écrans 403 Forbidden et 404 Not Found avec guidage utilisateur.

### 2.2 Espace Authentification (`02_AUTH/` — 4 captures)
- **Connexion (`/connexion`)** : Formulaire avec contrôles de validation réactifs, gestion de session HttpOnly signée HMAC-SHA256, pastilles de démonstration par rôle et bannières d'erreur explicites.
- **Inscription (`/inscription`)** : Formulaire complet avec attribution automatique du rôle `TOURISTE`.

### 2.3 Espace Touriste (`03_TOURISTE/` — 9 captures)
- **Espace Personnel (`/mon-espace`)** : Gestion des réservations passées et à venir, profil utilisateur et notifications in-app.
- **Tunnel de Réservation (`/reserver`)** : Stepper interactif de sélection de prestation (circuit ou événement), date, créneau horaire et nombre de participants.
- **Détail Réservation & Billetterie (`/reservations/:id`)** : Composant de **billet électronique sécurisé avec QR Code SVG standalone** et options d'annulation/paiement.
- **Paiement Simulé (`/paiements/:reservationId`)** : Choix du portefeuille (Wave, Orange Money) avec badge d'environnement simulé.

### 2.4 Espace Guide (`04_GUIDE/` — 7 captures)
- **Cockpit Guide (`/pro/tableau-de-bord`)** : Synthèse d'activité du guide validé *Alassane Badji*.
- **Espace Professionnel & Agenda (`/pro/mon-profil-guide`)** : Édition des spécialités, langues parlées, zones d'intervention, bascule de disponibilité et calendrier des prestations avec détection de conflit de créneaux.
- **Circuits & Manifestes (`/pro/circuits`, `/pro/manifestes`)** : Feuilles d'émargement et liste des visiteurs par excursion.

### 2.5 Espace Conservateur (`05_CONSERVATEUR/` — 6 captures)
- **Cockpit Scientifique (`/pro/tableau-de-bord`)** : Indicateurs de gestion patrimoniale et dossiers d'agrément en attente.
- **Gestion des Patrimoines (`/pro/patrimoines`)** : Droits de création, mise à jour, publication et archivage des sites culturels.
- **Validation des Guides (`/pro/guides`)** : Instruction des candidatures de guides touristiques et validation administrative.
- **Contrôle d'Accès & Scanner (`/pro/controle-acces`)** : Outil de validation de billets d'accès avec compostage pessimiste.

### 2.6 Espace Gestionnaire de Site (`06_GESTIONNAIRE/` — 7 captures)
- **Cockpit d'Exploitation (`/pro/tableau-de-bord`)** : Suivi des jauges d'accueil et des réservations du jour.
- **Patrimoines en Consultation Seule (`/pro/patrimoines`)** : Restriction RBAC (boutons de modification masqués).
- **Gestion des Événements & Modération (`/pro/evenements`, `/pro/moderation`)** : Planification locale et modération des avis.

### 2.7 Espace Administrateur (`07_ADMIN/` — 16 captures)
- **Cockpit Global (`/pro/tableau-de-bord`)** : Supervision intégrale des 7 microservices.
- **Statistiques & Analytique (`/pro/statistiques`)** : Graphiques CSS/SVG des flux de visiteurs et volumes de réservations.
- **Gouvernance & Sécurité (`/pro/utilisateurs`)** : Gestion des comptes, rôles et journal d'audit de sécurité.
- **Modules Métier Dédiés** : Paiements, modération, outbox notifications, circuits, événements, réservations, contrôle d'accès.

---

## 3. Matrice de Vérification Responsive

Les 11 écrans stratégiques ont été vérifiés et capturés sur 4 résolutions normalisées :
1. **Desktop Large (1440 × 900 px)** : Rendu optimal des grilles à 3/4 colonnes et de la barre latérale du back-office pro.
2. **Laptop / Tablette Paysage (1024 × 768 px)** : Repliement des grilles à 2 colonnes, conservation de la sidebar pro.
3. **Tablette Portrait (768 × 1024 px)** : Passage en vue condensée, adaptation des formulaires et tableaux.
4. **Mobile Smartphone (390 × 844 px)** : Déploiement du menu burger, disposition verticale empilée.

---

## 4. Parcours Utilisateurs Explorés

### Parcours A — Touriste :
1. Consultation de l'accueil public (`PUB-001`).
2. Recherche par géolocalisation GPS (`ETAT-001`).
3. Consultation de la fiche du site *Mémorial du Joola* (`PUB-003`).
4. Connexion au compte voyageur (`AUTH-001`).
5. Réservation du circuit sur les bolongs (`TOUR-002`).
6. Simulation du règlement par Wave (`TOUR-004`).
7. Affichage et zoom sur le billet d'accès électronique avec QR Code (`TOUR-003`, `ETAT-002`).

### Parcours B — Guide :
1. Connexion au compte *Alassane Badji* (`AUTH-001`).
2. Arrivée sur le cockpit pro guide (`GUIDE-001`).
3. Consultation du profil et mise à jour de la disponibilité (`GUIDE-002`).
4. Examen de l'agenda et vérification des créneaux (`GUIDE-003`).
5. Consultation du manifeste des passagers (`GUIDE-005`).

### Parcours C — Conservateur :
1. Connexion au compte *Fatou Kaboré* (`AUTH-001`).
2. Arrivée sur le tableau de bord conservateur (`CONS-001`).
3. Accès à la console de gestion patrimoniale et ouverture du formulaire d'édition (`CONS-002`, `FORM-001`).
4. Examen de la console de validation des guides (`CONS-003`).
5. Test de l'outil de contrôle d'accès (`CONS-004`).

### Parcours D — Gestionnaire de Site :
1. Connexion au compte *Awa Sagna* (`AUTH-001`).
2. Tableau de bord gestionnaire (`GEST-001`).
3. Vérification de la lecture seule sur les patrimoines (`GEST-002`).
4. Planification des événements (`GEST-003`).
5. Supervision des réservations et compostage de billet (`GEST-004`, `GEST-006`).

### Parcours E — Administrateur :
1. Connexion au compte *Lamine Faty* (`AUTH-001`).
2. Cockpit synoptique global (`ADMIN-001`).
3. Analytique et statistiques multi-services (`ADMIN-002`).
4. Gestion des habilitations et inspection du journal d'audit de sécurité (`ADMIN-003`, `TAB-001`).
5. Supervision financière et remboursements (`ADMIN-004`).

---

## 5. Relevé des Observations Visuelles & Ergonomiques

En tant qu'expert en design d'interfaces et ergonomie web, voici les observations factuelles relevées sur l'interface actuelle en vue de la future refonte UX/UI :

1. **Hiérarchie Visuelle et Contrastes** :
   - Le vert mangrove (`#1b4332`) et le terracotta (`#c84b31`) sont bien ancrés dans l'identité casamançaise, mais certaines typographies secondaires utilisent des gris trop clairs (`#8d99ae`) sur fond sable, ce qui pénalise le ratio de contraste WCAG AA sur certains écrans.
2. **Densité des Tableaux du Back-Office Pro** :
   - Les tableaux de supervision (`/pro/reservations`, `/pro/utilisateurs`, `/pro/manifestes`) comportent jusqu'à 8 colonnes. Sur écrans de moyenne résolution (1024px et 768px), les boutons d'action sont serrés et provoquent parfois un léger écrasement des libellés de dates.
3. **Composants de Cartographie et Données GPS** :
   - La carte Leaflet sur `/patrimoines` occupe une hauteur fixe (420px) satisfaisante en desktop, mais mériterait un mode plein écran tactile plus immersif sur smartphone.
4. **Transition entre l'Espace Public et le Back-Office Pro** :
   - Le passage de `MainLayout` à `ProLayout` est net et bien séparé, mais il serait pertinent d'ajouter un bouton « Retour au portail public » plus visible et standardisé dans la TopBar du back-office pro.
5. **Composant de Billetterie Électronique (Billet QR)** :
   - Le billet généré avec QR Code SVG standalone est extrêmement net, lisible et adapté à l'impression (`window.print()`). Pour la future refonte, un bouton de téléchargement direct en image PNG ou PDF mobile enrichirait encore l'expérience touristique hors-ligne dans les zones à faible connectivité.

---

## 6. Conclusion et Clôture de la Mission P07.7

L'ensemble des objectifs de la mission **P07.7** a été atteint :
- **100 % des pages et routes réelles** de l'application ont été explorées et capturées.
- **116 captures PNG réelles** sont organisées méthodiquement selon l'arborescence requise.
- La matrice complète `MATRICE_PAGES.csv`, l'inventaire `ROUTES_FRONTEND.md` et le rapport des `LIMITATIONS.md` sont générés.
- **Aucune ligne de code applicatif n'a été modifiée**, préservant scrupuleusement l'intégrité de la plateforme.
