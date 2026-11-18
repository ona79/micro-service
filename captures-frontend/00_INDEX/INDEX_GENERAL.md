# INDEX GÉNÉRAL DES CAPTURES VISUELLES — CASAMANCE PATRIMOINE (P07.7)

**Projet** : Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance  
**Institution** : Université Assane Seck de Ziguinchor (UASZ) — Licence 3 Ingénierie Informatique  
**Branche Git** : `feature/p07-7-frontend-capture`  
**Commit de référence** : `af08df2`  
**Volume global de captures** : **116 captures d'écran réelles au format PNG**  
**Résolution de référence Desktop** : 1440 × 900 px  
**Résolutions Responsive** : 1440 × 900 px, 1024 × 768 px, 768 × 1024 px, 390 × 844 px  

---

## 1. Arborescence du Dossier de Captures

```
captures-frontend/
├── 00_INDEX/
│   ├── INDEX_GENERAL.md
│   ├── MATRICE_PAGES.csv
│   └── ROUTES_FRONTEND.md
├── 01_PUBLIC/             (16 captures desktop & pleine page)
├── 02_AUTH/               (4 captures authentification & formulaires)
├── 03_TOURISTE/           (9 captures espace voyageur & billetterie)
├── 04_GUIDE/              (7 captures espace guide & agenda)
├── 05_CONSERVATEUR/       (6 captures espace scientifique & patrimoine)
├── 06_GESTIONNAIRE/       (7 captures espace exploitation locale & jauges)
├── 07_ADMIN/              (16 captures cockpit global & supervision)
├── 08_RESPONSIVE/         (44 captures multi-résolutions)
│   ├── DESKTOP/           (11 captures 1440px)
│   ├── TABLET/            (22 captures 1024px & 768px)
│   └── MOBILE/            (11 captures 390px)
├── 09_INTERACTIONS/       (7 captures modales, menus, états dynamiques)
│   ├── ETATS/
│   ├── FORMULAIRES/
│   ├── MENUS/
│   ├── MODALES/
│   └── TABLEAUX/
└── 10_SYNTHESE/
    ├── RAPPORT_CAPTURE.md
    └── LIMITATIONS.md
```

---

## 2. Répertoire Détaillé des Fichiers de Capture

### A. Espace Public (`01_PUBLIC/` — 16 fichiers)

| ID Page | Chemin du Fichier de Capture | Description de l'Interface Capturée |
| :--- | :--- | :--- |
| `PUB-001` | [`captures-frontend/01_PUBLIC/PUB-001_accueil.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-001_accueil.png) | Page d'accueil vue Desktop 1440×900 (Bandeau hero, recherche, KPIs réels) |
| `PUB-001` | [`captures-frontend/01_PUBLIC/PUB-001_accueil_pleine-page.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-001_accueil_pleine-page.png) | Page d'accueil scrollée complète (Terroirs, sites phares, circuits, agenda, footer) |
| `PUB-002` | [`captures-frontend/01_PUBLIC/PUB-002_patrimoines-liste.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-002_patrimoines-liste.png) | Grille du catalogue des 8 sites patrimoniaux avec barre de filtres |
| `PUB-002` | [`captures-frontend/01_PUBLIC/PUB-002_patrimoines-liste_pleine-page.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-002_patrimoines-liste_pleine-page.png) | Catalogue des sites en pleine page avec cartes descriptives et badges |
| `PUB-002` | [`captures-frontend/01_PUBLIC/PUB-002_patrimoines-carte.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-002_patrimoines-carte.png) | Vue cartographique interactive Leaflet des sites de Casamance |
| `PUB-003` | [`captures-frontend/01_PUBLIC/PUB-003_patrimoine-detail.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-003_patrimoine-detail.png) | Fiche détaillée d'un site patrimonial (Mémorial de Gorée / Casamance) |
| `PUB-003` | [`captures-frontend/01_PUBLIC/PUB-003_patrimoine-detail_pleine-page.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-003_patrimoine-detail_pleine-page.png) | Fiche détail complète (Galerie, horaires, carte GPS, avis et réponse du guide) |
| `PUB-004` | [`captures-frontend/01_PUBLIC/PUB-004_circuits-liste.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-004_circuits-liste.png) | Liste des circuits touristiques (Boucle Mémorielle, Trésors de Basse-Casamance) |
| `PUB-005` | [`captures-frontend/01_PUBLIC/PUB-005_circuit-detail.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-005_circuit-detail.png) | Fiche détaillée d'un circuit avec guide affecté et durée estimée |
| `PUB-005` | [`captures-frontend/01_PUBLIC/PUB-005_circuit-detail_pleine-page.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-005_circuit-detail_pleine-page.png) | Parcours complet étape par étape, avis voyageurs et CTA réserver |
| `PUB-006` | [`captures-frontend/01_PUBLIC/PUB-006_evenements-liste.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-006_evenements-liste.png) | Agenda culturel officiel des manifestations de Casamance |
| `PUB-007` | [`captures-frontend/01_PUBLIC/PUB-007_evenement-detail.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-007_evenement-detail.png) | Détail d'une manifestation culturelle (site hôte, dates, places) |
| `PUB-008` | [`captures-frontend/01_PUBLIC/PUB-008_guides-liste.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-008_guides-liste.png) | Annuaire des guides agréés (Profil validé d'Alassane Badji) |
| `PUB-009` | [`captures-frontend/01_PUBLIC/PUB-009_guide-detail.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-009_guide-detail.png) | Profil public du guide (présentation, langues, compétences, avis reçus) |
| `PUB-010` | [`captures-frontend/01_PUBLIC/PUB-010_acces-refuse.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-010_acces-refuse.png) | Page d'accès refusé (HTTP 403 Forbidden) lors d'un défaut de droits |
| `PUB-011` | [`captures-frontend/01_PUBLIC/PUB-011_page-introuvable.png`](file:///home/mahou-dev/micro-service/captures-frontend/01_PUBLIC/PUB-011_page-introuvable.png) | Page 404 introuvable lors d'une route inexistante |

---

### B. Espace Authentification (`02_AUTH/` — 4 fichiers)

| ID Page | Chemin du Fichier de Capture | Description de l'Interface Capturée |
| :--- | :--- | :--- |
| `AUTH-001` | [`captures-frontend/02_AUTH/AUTH-001_connexion.png`](file:///home/mahou-dev/micro-service/captures-frontend/02_AUTH/AUTH-001_connexion.png) | Formulaire de connexion sécurisé avec pastilles de démonstration par rôle |
| `AUTH-001` | [`captures-frontend/02_AUTH/AUTH-001_connexion_erreur.png`](file:///home/mahou-dev/micro-service/captures-frontend/02_AUTH/AUTH-001_connexion_erreur.png) | Bannière d'erreur lors d'identifiants incorrects |
| `AUTH-002` | [`captures-frontend/02_AUTH/AUTH-002_inscription.png`](file:///home/mahou-dev/micro-service/captures-frontend/02_AUTH/AUTH-002_inscription.png) | Formulaire de création de compte visiteur / touriste |
| `AUTH-002` | [`captures-frontend/02_AUTH/AUTH-002_inscription_formulaire-rempli.png`](file:///home/mahou-dev/micro-service/captures-frontend/02_AUTH/AUTH-002_inscription_formulaire-rempli.png) | Formulaire d'inscription renseigné avec contrôle de validité des champs |

---

### C. Espace Touriste (`03_TOURISTE/` — 9 fichiers)

| ID Page | Chemin du Fichier de Capture | Description de l'Interface Capturée |
| :--- | :--- | :--- |
| `TOUR-001` | [`captures-frontend/03_TOURISTE/TOUR-001_mon-espace-reservations.png`](file:///home/mahou-dev/micro-service/captures-frontend/03_TOURISTE/TOUR-001_mon-espace-reservations.png) | Tableau de bord voyageur avec historique des réservations confirmées |
| `TOUR-001` | [`captures-frontend/03_TOURISTE/TOUR-001_mon-espace_pleine-page.png`](file:///home/mahou-dev/micro-service/captures-frontend/03_TOURISTE/TOUR-001_mon-espace_pleine-page.png) | Vue complète de l'espace personnel du touriste connecté |
| `TOUR-001` | [`captures-frontend/03_TOURISTE/TOUR-001_mon-espace-notifications.png`](file:///home/mahou-dev/micro-service/captures-frontend/03_TOURISTE/TOUR-001_mon-espace-notifications.png) | Onglet des notifications reçues dans l'espace personnel |
| `TOUR-002` | [`captures-frontend/03_TOURISTE/TOUR-002_reserver-circuit.png`](file:///home/mahou-dev/micro-service/captures-frontend/03_TOURISTE/TOUR-002_reserver-circuit.png) | Écran de réservation pour un circuit (date, créneau horaire, places) |
| `TOUR-002` | [`captures-frontend/03_TOURISTE/TOUR-002_reserver-evenement.png`](file:///home/mahou-dev/micro-service/captures-frontend/03_TOURISTE/TOUR-002_reserver-evenement.png) | Écran de réservation pour un événement culturel avec calcul de prix |
| `TOUR-003` | [`captures-frontend/03_TOURISTE/TOUR-003_reservation-detail-qr.png`](file:///home/mahou-dev/micro-service/captures-frontend/03_TOURISTE/TOUR-003_reservation-detail-qr.png) | Fiche réservation avec billet électronique et QR Code SVG standalone |
| `TOUR-003` | [`captures-frontend/03_TOURISTE/TOUR-003_reservation-detail_pleine-page.png`](file:///home/mahou-dev/micro-service/captures-frontend/03_TOURISTE/TOUR-003_reservation-detail_pleine-page.png) | Détail réservation pleine page (statut paiement, coordonnées, participants) |
| `TOUR-004` | [`captures-frontend/03_TOURISTE/TOUR-004_paiement-checkout-simule.png`](file:///home/mahou-dev/micro-service/captures-frontend/03_TOURISTE/TOUR-004_paiement-checkout-simule.png) | Passerelle de paiement simulé Wave & Orange Money (badge explicite) |
| `TOUR-005` | [`captures-frontend/03_TOURISTE/TOUR-005_notifications-centre.png`](file:///home/mahou-dev/micro-service/captures-frontend/03_TOURISTE/TOUR-005_notifications-centre.png) | Centre de notifications in-app avec filtrage et marquage comme lu |

---

### D. Espace Guide (`04_GUIDE/` — 7 fichiers)

| ID Page | Chemin du Fichier de Capture | Description de l'Interface Capturée |
| :--- | :--- | :--- |
| `GUIDE-001` | [`captures-frontend/04_GUIDE/GUIDE-001_tableau-de-bord.png`](file:///home/mahou-dev/micro-service/captures-frontend/04_GUIDE/GUIDE-001_tableau-de-bord.png) | Cockpit professionnel du guide (missions assignées, statut agrément) |
| `GUIDE-001` | [`captures-frontend/04_GUIDE/GUIDE-001_tableau-de-bord_pleine-page.png`](file:///home/mahou-dev/micro-service/captures-frontend/04_GUIDE/GUIDE-001_tableau-de-bord_pleine-page.png) | Cockpit guide pleine page avec alertes de sécurité et raccourcis |
| `GUIDE-002` | [`captures-frontend/04_GUIDE/GUIDE-002_mon-profil-guide.png`](file:///home/mahou-dev/micro-service/captures-frontend/04_GUIDE/GUIDE-002_mon-profil-guide.png) | Espace professionnel (spécialités, langues, zones de Casamance, statut) |
| `GUIDE-002` | [`captures-frontend/04_GUIDE/GUIDE-002_mon-profil-guide_pleine-page.png`](file:///home/mahou-dev/micro-service/captures-frontend/04_GUIDE/GUIDE-002_mon-profil-guide_pleine-page.png) | Fiche complète du profil professionnel guide et historique |
| `GUIDE-004` | [`captures-frontend/04_GUIDE/GUIDE-004_circuits-guide.png`](file:///home/mahou-dev/micro-service/captures-frontend/04_GUIDE/GUIDE-004_circuits-guide.png) | Gestion et consultation des circuits affectés au guide connecté |
| `GUIDE-005` | [`captures-frontend/04_GUIDE/GUIDE-005_manifestes-passagers.png`](file:///home/mahou-dev/micro-service/captures-frontend/04_GUIDE/GUIDE-005_manifestes-passagers.png) | Feuille d'émargement et manifeste des passagers par circuit |
| `GUIDE-006` | [`captures-frontend/04_GUIDE/GUIDE-006_notifications-guide.png`](file:///home/mahou-dev/micro-service/captures-frontend/04_GUIDE/GUIDE-006_notifications-guide.png) | Centre de notifications professionnelles du guide |

---

### E. Espace Conservateur (`05_CONSERVATEUR/` — 6 fichiers)

| ID Page | Chemin du Fichier de Capture | Description de l'Interface Capturée |
| :--- | :--- | :--- |
| `CONS-001` | [`captures-frontend/05_CONSERVATEUR/CONS-001_tableau-de-bord.png`](file:///home/mahou-dev/micro-service/captures-frontend/05_CONSERVATEUR/CONS-001_tableau-de-bord.png) | Cockpit du conservateur (inventaire patrimonial, dossiers guides en attente) |
| `CONS-002` | [`captures-frontend/05_CONSERVATEUR/CONS-002_patrimoines-gestion.png`](file:///home/mahou-dev/micro-service/captures-frontend/05_CONSERVATEUR/CONS-002_patrimoines-gestion.png) | Console de gestion des patrimoines (actions de publication, archivage) |
| `CONS-002` | [`captures-frontend/05_CONSERVATEUR/CONS-002_patrimoines-gestion_pleine-page.png`](file:///home/mahou-dev/micro-service/captures-frontend/05_CONSERVATEUR/CONS-002_patrimoines-gestion_pleine-page.png) | Tableau complet des sites culturels avec capacités et statuts |
| `CONS-003` | [`captures-frontend/05_CONSERVATEUR/CONS-003_guides-validation.png`](file:///home/mahou-dev/micro-service/captures-frontend/05_CONSERVATEUR/CONS-003_guides-validation.png) | Console d'instruction et validation administrative des profils de guides |
| `CONS-004` | [`captures-frontend/05_CONSERVATEUR/CONS-004_controle-acces-scanner.png`](file:///home/mahou-dev/micro-service/captures-frontend/05_CONSERVATEUR/CONS-004_controle-acces-scanner.png) | Interface de contrôle d'accès et compostage des billets QR sur site |
| `CONS-005` | [`captures-frontend/05_CONSERVATEUR/CONS-005_statistiques-conservateur.png`](file:///home/mahou-dev/micro-service/captures-frontend/05_CONSERVATEUR/CONS-005_statistiques-conservateur.png) | Statistiques patrimoniales, répartition par terroir et état de conservation |

---

### F. Espace Gestionnaire de Site (`06_GESTIONNAIRE/` — 7 fichiers)

| ID Page | Chemin du Fichier de Capture | Description de l'Interface Capturée |
| :--- | :--- | :--- |
| `GEST-001` | [`captures-frontend/06_GESTIONNAIRE/GEST-001_tableau-de-bord.png`](file:///home/mahou-dev/micro-service/captures-frontend/06_GESTIONNAIRE/GEST-001_tableau-de-bord.png) | Cockpit d'exploitation locale (réservations du jour, jauges de capacité) |
| `GEST-002` | [`captures-frontend/06_GESTIONNAIRE/GEST-002_patrimoines-lecture-seule.png`](file:///home/mahou-dev/micro-service/captures-frontend/06_GESTIONNAIRE/GEST-002_patrimoines-lecture-seule.png) | Patrimoines en consultation seule (boutons d'édition masqués par RBAC) |
| `GEST-003` | [`captures-frontend/06_GESTIONNAIRE/GEST-003_evenements-gestion.png`](file:///home/mahou-dev/micro-service/captures-frontend/06_GESTIONNAIRE/GEST-003_evenements-gestion.png) | Planification et gestion des événements et manifestations culturelles |
| `GEST-004` | [`captures-frontend/06_GESTIONNAIRE/GEST-004_reservations-supervision.png`](file:///home/mahou-dev/micro-service/captures-frontend/06_GESTIONNAIRE/GEST-004_reservations-supervision.png) | Supervision en direct des réservations et participants enregistrés |
| `GEST-005` | [`captures-frontend/06_GESTIONNAIRE/GEST-005_manifestes-passagers.png`](file:///home/mahou-dev/micro-service/captures-frontend/06_GESTIONNAIRE/GEST-005_manifestes-passagers.png) | Manifestes passagers pour embarquement et gestion des flux |
| `GEST-006` | [`captures-frontend/06_GESTIONNAIRE/GEST-006_controle-acces-scanner.png`](file:///home/mahou-dev/micro-service/captures-frontend/06_GESTIONNAIRE/GEST-006_controle-acces-scanner.png) | Scanner de compostage et vérification de validité des billets QR |
| `GEST-007` | [`captures-frontend/06_GESTIONNAIRE/GEST-007_moderation-avis.png`](file:///home/mahou-dev/micro-service/captures-frontend/06_GESTIONNAIRE/GEST-007_moderation-avis.png) | Modération des avis et traitement des signalements pour son site |

---

### G. Espace Administrateur (`07_ADMIN/` — 16 fichiers)

| ID Page | Chemin du Fichier de Capture | Description de l'Interface Capturée |
| :--- | :--- | :--- |
| `ADMIN-001` | [`captures-frontend/07_ADMIN/ADMIN-001_cockpit-global.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-001_cockpit-global.png) | Cockpit global administrateur avec synthèse des 7 microservices |
| `ADMIN-001` | [`captures-frontend/07_ADMIN/ADMIN-001_cockpit-global_pleine-page.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-001_cockpit-global_pleine-page.png) | Cockpit admin pleine page avec indicateurs consolidés |
| `ADMIN-002` | [`captures-frontend/07_ADMIN/ADMIN-002_statistiques-globales.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-002_statistiques-globales.png) | Analytique générale et KPIs multi-domaines (patrimoine, réservations) |
| `ADMIN-002` | [`captures-frontend/07_ADMIN/ADMIN-002_statistiques-globales_pleine-page.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-002_statistiques-globales_pleine-page.png) | Page complète des graphiques et synthèses de volumes |
| `ADMIN-003` | [`captures-frontend/07_ADMIN/ADMIN-003_utilisateurs-rbac.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-003_utilisateurs-rbac.png) | Console de gestion des utilisateurs, rôles et attributions RBAC |
| `ADMIN-003` | [`captures-frontend/07_ADMIN/ADMIN-003_audit-securite.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-003_audit-securite.png) | Journal d'audit de sécurité des connexions, échecs et révocations |
| `ADMIN-004` | [`captures-frontend/07_ADMIN/ADMIN-004_paiements-remboursements.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-004_paiements-remboursements.png) | Supervision des transactions financières Wave/Orange Money et remboursements |
| `ADMIN-005` | [`captures-frontend/07_ADMIN/ADMIN-005_moderation-signalements.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-005_moderation-signalements.png) | Modération globale des avis, signalements et historique de décisions |
| `ADMIN-006` | [`captures-frontend/07_ADMIN/ADMIN-006_notifications-reprises.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-006_notifications-reprises.png) | Supervision de la distribution des notifications et relance des échecs |
| `ADMIN-007` | [`captures-frontend/07_ADMIN/ADMIN-007_patrimoines-admin.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-007_patrimoines-admin.png) | Administration des fiches patrimoniales et contrôles de publication |
| `ADMIN-008` | [`captures-frontend/07_ADMIN/ADMIN-008_circuits-admin.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-008_circuits-admin.png) | Administration des circuits touristiques, étapes et assignation de guides |
| `ADMIN-009` | [`captures-frontend/07_ADMIN/ADMIN-009_evenements-admin.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-009_evenements-admin.png) | Administration globale des événements et cérémonies culturelles |
| `ADMIN-010` | [`captures-frontend/07_ADMIN/ADMIN-010_guides-admin.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-010_guides-admin.png) | Gestion des agréments des guides et contrôle des habilitations |
| `ADMIN-011` | [`captures-frontend/07_ADMIN/ADMIN-011_reservations-admin.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-011_reservations-admin.png) | Supervision de l'ensemble des réservations de la plateforme |
| `ADMIN-012` | [`captures-frontend/07_ADMIN/ADMIN-012_controle-acces-admin.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-012_controle-acces-admin.png) | Terminal d'accès centralisé et journal de compostage des billets |
| `ADMIN-013` | [`captures-frontend/07_ADMIN/ADMIN-013_administration-monolithique.png`](file:///home/mahou-dev/micro-service/captures-frontend/07_ADMIN/ADMIN-013_administration-monolithique.png) | Interface historique `/administration` conservée pour rétrocompatibilité |

---

### H. Matrice Responsive Multi-Résolutions (`08_RESPONSIVE/` — 44 fichiers)

Les 11 écrans clés ont été capturés à 4 résolutions :
- **Desktop (1440×900 px)** sous `08_RESPONSIVE/DESKTOP/` (11 fichiers)
- **Tablette Paysage (1024×768 px)** sous `08_RESPONSIVE/TABLET/*_1024px.png` (11 fichiers)
- **Tablette Portrait (768×1024 px)** sous `08_RESPONSIVE/TABLET/*_768px.png` (11 fichiers)
- **Mobile (390×844 px)** sous `08_RESPONSIVE/MOBILE/*_390px.png` (11 fichiers)

| Écran Clé Identifié | Capture 1440px (Desktop) | Capture 1024px (Tablette) | Capture 768px (Tablette) | Capture 390px (Mobile) |
| :--- | :--- | :--- | :--- | :--- |
| **Accueil Public** (`PUB-001`) | `PUB-001_accueil_1440px.png` | `PUB-001_accueil_1024px.png` | `PUB-001_accueil_768px.png` | `PUB-001_accueil_390px.png` |
| **Recherche Sites** (`PUB-002`) | `PUB-002_recherche-sites_1440px.png` | `PUB-002_recherche-sites_1024px.png` | `PUB-002_recherche-sites_768px.png` | `PUB-002_recherche-sites_390px.png` |
| **Détail Site** (`PUB-003`) | `PUB-003_patrimoine-detail_1440px.png` | `PUB-003_patrimoine-detail_1024px.png` | `PUB-003_patrimoine-detail_768px.png` | `PUB-003_patrimoine-detail_390px.png` |
| **Authentification** (`AUTH-001`) | `AUTH-001_connexion_1440px.png` | `AUTH-001_connexion_1024px.png` | `AUTH-001_connexion_768px.png` | `AUTH-001_connexion_390px.png` |
| **Réservation Visite** (`TOUR-002`) | `TOUR-002_reserver_1440px.png` | `TOUR-002_reserver_1024px.png` | `TOUR-002_reserver_768px.png` | `TOUR-002_reserver_390px.png` |
| **Espace Touriste** (`TOUR-001`) | `TOUR-001_mon-espace_1440px.png` | `TOUR-001_mon-espace_1024px.png` | `TOUR-001_mon-espace_768px.png` | `TOUR-001_mon-espace_390px.png` |
| **Espace Guide** (`GUIDE-001`) | `GUIDE-001_dashboard_1440px.png` | `GUIDE-001_dashboard_1024px.png` | `GUIDE-001_dashboard_768px.png` | `GUIDE-001_dashboard_390px.png` |
| **Espace Conservateur** (`CONS-001`) | `CONS-001_dashboard_1440px.png` | `CONS-001_dashboard_1024px.png` | `CONS-001_dashboard_768px.png` | `CONS-001_dashboard_390px.png` |
| **Espace Gestionnaire** (`GEST-001`) | `GEST-001_dashboard_1440px.png` | `GEST-001_dashboard_1024px.png` | `GEST-001_dashboard_768px.png` | `GEST-001_dashboard_390px.png` |
| **Espace Administrateur** (`ADMIN-001`) | `ADMIN-001_dashboard_1440px.png` | `ADMIN-001_dashboard_1024px.png` | `ADMIN-001_dashboard_768px.png` | `ADMIN-001_dashboard_390px.png` |
| **Contrôle d'Accès QR** (`PRO-010`) | `PRO-010_controle-acces_1440px.png` | `PRO-010_controle-acces_1024px.png` | `PRO-010_controle-acces_768px.png` | `PRO-010_controle-acces_390px.png` |

---

### I. Interactions & États Dynamiques (`09_INTERACTIONS/` — 7 fichiers)

| Sous-dossier | Chemin du Fichier de Capture | Type d'Interaction Capturée |
| :--- | :--- | :--- |
| `MENUS` | [`captures-frontend/09_INTERACTIONS/MENUS/MENU-001_burger-mobile-ouvert.png`](file:///home/mahou-dev/micro-service/captures-frontend/09_INTERACTIONS/MENUS/MENU-001_burger-mobile-ouvert.png) | Menu burger mobile déployé sur smartphone avec liens et boutons CTA |
| `MENUS` | [`captures-frontend/09_INTERACTIONS/MENUS/MENU-002_nav-pro-laterale.png`](file:///home/mahou-dev/micro-service/captures-frontend/09_INTERACTIONS/MENUS/MENU-002_nav-pro-laterale.png) | Sidebar du Back-Office Pro avec mise en surbrillance de l'onglet actif |
| `TABLEAUX` | [`captures-frontend/09_INTERACTIONS/TABLEAUX/TAB-001_tableau-utilisateurs-complet.png`](file:///home/mahou-dev/micro-service/captures-frontend/09_INTERACTIONS/TABLEAUX/TAB-001_tableau-utilisateurs-complet.png) | Tableau de gestion des utilisateurs avec badges de rôles et actions |
| `TABLEAUX` | [`captures-frontend/09_INTERACTIONS/TABLEAUX/TAB-002_tableau-supervision-reservations.png`](file:///home/mahou-dev/micro-service/captures-frontend/09_INTERACTIONS/TABLEAUX/TAB-002_tableau-supervision-reservations.png) | Tableau de supervision des réservations avec statuts colorés |
| `TABLEAUX` | [`captures-frontend/09_INTERACTIONS/TABLEAUX/TAB-003_tableau-manifeste-passagers.png`](file:///home/mahou-dev/micro-service/captures-frontend/09_INTERACTIONS/TABLEAUX/TAB-003_tableau-manifeste-passagers.png) | Grille d'émargement des passagers sur circuit touristique |
| `ETATS` | [`captures-frontend/09_INTERACTIONS/ETATS/ETAT-001_gps-proximite-actif.png`](file:///home/mahou-dev/micro-service/captures-frontend/09_INTERACTIONS/ETATS/ETAT-001_gps-proximite-actif.png) | Résultat du calcul de proximité Haversine avec badge kilométrique `📍 à ~X km` |
| `ETATS` | [`captures-frontend/09_INTERACTIONS/ETATS/ETAT-002_billet-qr-zoom.png`](file:///home/mahou-dev/micro-service/captures-frontend/09_INTERACTIONS/ETATS/ETAT-002_billet-qr-zoom.png) | Gros plan sur le composant de billetterie électronique avec QR Code sécurisé |
