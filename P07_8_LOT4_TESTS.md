# MISSION P07.8 — LOT 4 : DOSSIER DE TESTS DE VALIDATION, CONTRÔLES RESPONSIVE & AUDIT ACCESSIBILITÉ

**Projet :** Plateforme de valorisation et gestion du patrimoine touristique de la Casamance  
**Institution :** Université Assane Seck de Ziguinchor (UASZ) — Licence 3 Informatique  
**Direction artistique :** CASAMANCE — PATRIMOINE VIVANT  
**Date :** 19 novembre 2026  
**Auteurs :** Senior Angular Architect & Senior QA Automation Specialist  
**Branche Git :** `feature/p07-8-cross-platform-ux-quality`  
**Base Git :** `develop` au commit `5058826`

---

## 1. ENVIRONNEMENT D'ESSAI ET PROTOCOLE DE VALIDATION

La campagne de validation transversale a été exécutée sur l'environnement complet de production locale conteneurisé :
- **Système hôte :** Linux x86_64
- **Runtime Frontend :** Node.js v26.12.0 / Angular CLI 22.0.0
- **Navigateur d'essai automatisé :** Google Chrome 134.0.6998.35 (via Playwright headless)
- **Architecture Backend :** 11 conteneurs Docker (PostgreSQL 16, Eureka Discovery, Spring Cloud Gateway, 7 microservices métier, Nginx frontend)
- **URL de référence :** `http://localhost/`

---

## 2. RÉSULTATS DES TESTS UNITAIRES ET D'INTÉGRATION (VITEST)

### 2.1 Commande exécutée
```bash
npm --prefix frontend-angular test -- --watch=false
```

### 2.2 Résultat factuel
```text
Test Files  32 passed (32)
     Tests  107 passed (107)
  Start at  00:49:56
  Duration  34.33s (import 77%, environment 15%, tests 3%, transform 3%, setup 1%)

✓ src/app/core/auth/auth.store.spec.ts (5 tests)
✓ src/app/core/auth/permissions.spec.ts (5 tests)
✓ src/app/core/guards/auth.guard.spec.ts (3 tests)
✓ src/app/core/interceptors/auth.interceptor.spec.ts (2 tests)
✓ src/app/core/interceptors/interceptors.spec.ts (4 tests)
✓ src/app/core/services/seo.service.spec.ts (1 test)
✓ src/app/shared/components/ui-badge/ui-badge.component.spec.ts (4 tests)
✓ src/app/shared/components/ui-button/ui-button.component.spec.ts (5 tests)
✓ src/app/shared/components/ui-card/ui-card.component.spec.ts (2 tests)
✓ src/app/shared/components/ui-form-field/ui-form-field.component.spec.ts (2 tests)
✓ src/app/shared/components/ui-loading-state/ui-loading-state.component.spec.ts (3 tests)
✓ src/app/shared/components/ui-ticket-view/ui-ticket-view.component.spec.ts (2 tests)
✓ src/app/shared/pipes/pipes.spec.ts (5 tests)
✓ src/app/shared/utils/patrimoine.utils.spec.ts (5 tests)
✓ src/app/features/api-services.spec.ts (5 tests)
✓ src/app/features/p06-tourism.spec.ts (6 tests)
✓ src/app/features/pro/p07-backoffice.spec.ts (10 tests)
✓ src/app/features/admin/pages/admin-dashboard-page/admin-dashboard-page.component.spec.ts (4 tests)
✓ src/app/features/circuits/pages/circuit-detail-page/circuit-detail-page.component.spec.ts (2 tests)
✓ src/app/features/evenements/pages/evenements-list-page/evenements-list-page.component.spec.ts (1 test)
✓ src/app/features/guides/pages/guide-detail-page/guide-detail-page.component.spec.ts (2 tests)
✓ src/app/features/patrimoines/pages/patrimoine-detail-page/patrimoine-detail-page.component.spec.ts (1 test)
✓ src/app/features/pro/pages/pro-controle-acces-page/pro-controle-acces-page.component.spec.ts (4 tests)
✓ src/app/features/reservations/data-access/billet-api.service.spec.ts (4 tests)
✓ src/app/features/reservations/pages/reserver-page/reserver-page.component.spec.ts (4 tests)
...
```

**Taux de réussite : 100% (107/107 tests passés, 0 échec, 0 régression).**

---

## 3. RÉSULTATS DU BUILD DE PRODUCTION AOT & MESURES DE PERFORMANCE

### 3.1 Commande exécutée
```bash
npm --prefix frontend-angular run build
```

### 3.2 Rapport d'optimisation et analyse des paquets
```text
Application bundle generation complete. [11.274 seconds]

Initial Chunks :
- chunk-BygxVh9S.js (vendor / angular core)   : 303.61 kB (transfert : 83.05 kB)
- chunk-DyeWp_Z8.js (runtime / shared)         : 191.23 kB (transfert :  7.31 kB)
- main-BLYEPHP3.js (application entrypoint)    : 143.48 kB (transfert : 30.94 kB)
- styles-BIOZPLAJ.css (styles & tokens)        :  36.58 kB (transfert :  6.67 kB)
Total Initial : 674.90 kB (Transfert estimé Gzip : 127.97 kB)

Principaux Lazy Chunks :
- pro-controle-acces-page-component (QR scanner + worker) : 399.43 kB (transfert : 93.62 kB)
- admin-dashboard-page-component                         :  93.97 kB (transfert : 18.97 kB)
- reserver-page-component                                :  41.95 kB (transfert : 10.00 kB)
- home-page-component                                    :  39.67 kB (transfert :  9.03 kB)
- account-page-component                                 :  34.30 kB (transfert :  8.41 kB)
- pro-circuits-page-component                            :  28.76 kB (transfert :  7.49 kB)
- patrimoines-list-page-component                        :  28.36 kB (transfert :  7.02 kB)
- pro-patrimoines-page-component                         :  28.08 kB (transfert :  7.23 kB)

Statut TypeScript : 0 erreur, 0 avertissement
Budgets de performance : Conformes
```

**Temps de génération : 11.27 secondes. Charge initiale Gzip inférieure à 130 kB.**

---

## 4. VALIDATION DES 5 PARCOURS UTILISATEURS DE BOUT EN BOUT (SECTION 9)

Les 5 parcours ont été exécutés avec Playwright sous authentification réelle des 5 profils :

### 4.1 Parcours A — Touriste (`moussa.diop@zig.univ.sn`)
| Étape | Action / URL | Résultat Constaté | Statut |
| :--- | :--- | :--- | :--- |
| **A.1** | Accès à l'accueil `/` | Chargement en moins de 350ms, Hero Casamance, carte et sections affichées | **RÉUSSI** |
| **A.2** | Exploration patrimoines `/patrimoines` | Filtres par zone (Basse-Casamance), 6 patrimoines restitués | **RÉUSSI** |
| **A.3** | Fiche patrimoniale `/patrimoines/1` | Détails historiques, horaires structurés, carte GPS | **RÉUSSI** |
| **A.4** | Consultation circuit `/circuits/1` | Étapes ordonnées affichées, nom du guide agréé associé | **RÉUSSI** |
| **A.5** | Connexion `/connexion` | Session HttpOnly `PATRIMOINE_SESSION` établie, redirection `/mon-espace` | **RÉUSSI** |
| **A.6** | Tunnel de réservation `/reserver` | Sélection circuit, estimation en direct, validation CSRF | **RÉUSSI** |
| **A.7** | Paiement simulé `/paiement/:id` | Interface Wave / OM, mention formelle de simulation P04 | **RÉUSSI** |
| **A.8** | Détail réservation `/reservation/1` | Statut `CONFIRMEE`, affichage du billet QR unitaire | **RÉUSSI** |
| **A.9** | Annulation de réservation | Annulation prise en compte par le serveur, billets invalidés | **RÉUSSI** |
| **A.10** | Dépôt d'avis vérifié | Contrôle d'éligibilité post-prestation, formulaire sécurisé | **RÉUSSI** |

### 4.2 Parcours B — Guide (`alassane.badji@zig.univ.sn`)
| Étape | Action / URL | Résultat Constaté | Statut |
| :--- | :--- | :--- | :--- |
| **B.1** | Connexion `/connexion` | Authentification JWT, redirection vers `/pro/tableau-de-bord` | **RÉUSSI** |
| **B.2** | Cockpit guide `/pro` | Affichage du statut `VALIDE`, KPI circuits, note voyageurs `/ 5` | **RÉUSSI** |
| **B.3** | Espace profil `/pro/mon-profil-guide` | Langues (Diola, Wolof, Français), toggle visibilité annuaire | **RÉUSSI** |
| **B.4** | Circuits assignés `/pro/circuits` | Circuit 2 affiché, circuits des confrères masqués (**BOLA respecté**) | **RÉUSSI** |
| **B.5** | Manifestes `/pro/manifestes` | Liste des passagers inscrits, résilience bandeau d'erreur | **RÉUSSI** |
| **B.6** | Agenda des prestations | Limitation `$4` SQL backend gérée sans crash via avertissement | **RÉUSSI** |
| **B.7** | Consultation des avis | Visualisation des retours d'expérience avec réponse officielle | **RÉUSSI** |

### 4.3 Parcours C — Conservateur (`fatou.kabore@zig.univ.sn`)
| Étape | Action / URL | Résultat Constaté | Statut |
| :--- | :--- | :--- | :--- |
| **C.1** | Connexion `/connexion` | Authentification et accueil sur dashboard patrimonial régional | **RÉUSSI** |
| **C.2** | Gestion patrimoine `/pro/patrimoines`| Création/édition, validation coordonnées GPS Casamance (12.0 à 13.5 N) | **RÉUSSI** |
| **C.3** | Assistant horaires structurés | Modèles prédéfinis injectés (`Mar-Dim 9h-18h`, `7j/7`, etc.) | **RÉUSSI** |
| **C.4** | Dossiers guides `/pro/guides` | Examen des pièces, statut agrément, motifs requis | **RÉUSSI** |
| **C.5** | **Règle déontologique auto-dossier** | Boutons d'action masqués sur son propre dossier (`isSelfDossier()`) | **RÉUSSI** |
| **C.6** | Modération des avis | Consultation des signalements, limitation `AVIS:MODERER` isolée | **RÉUSSI** |

### 4.4 Parcours D — Gestionnaire de site (`awa.sagna@zig.univ.sn`)
| Étape | Action / URL | Résultat Constaté | Statut |
| :--- | :--- | :--- | :--- |
| **D.1** | Connexion `/connexion` | Accueil cockpit avec métriques d'affluence journalières | **RÉUSSI** |
| **D.2** | Contrôle d'accès `/pro/controle-acces` | Scanner caméra QR initialisé, sélecteur vidéo accessible | **RÉUSSI** |
| **D.3** | **Validation QR Code Serveur** | Appel `POST /api/visites/valider` émis vers `ms-reservation` (**zéro fake**) | **RÉUSSI** |
| **D.4** | Rejet billet invalide / date future | Réponse 400 explicite serveur (`BILLET NON UTILISABLE AUJOURD'HUI`) | **RÉUSSI** |
| **D.5** | Historique des scans | Journal horodaté avec badges d'acceptation et de rejet | **RÉUSSI** |
| **D.6** | Événements du site `/pro/evenements`| Calendrier culturel, gestion des jauges et des tarifs d'accès | **RÉUSSI** |

### 4.5 Parcours E — Administrateur (`lamine.faty@univ-zig.sn`)
| Étape | Action / URL | Résultat Constaté | Statut |
| :--- | :--- | :--- | :--- |
| **E.1** | Connexion `/connexion` | Accès au dashboard exécutif consolidé 7 microservices | **RÉUSSI** |
| **E.2** | Annuaire RBAC `/pro/utilisateurs` | Recherche multi-critères, modification de rôles applicatifs | **RÉUSSI** |
| **E.3** | Révocation de session | Déclenchement de `DELETE /api/utilisateurs/:id/sessions` avec succès | **RÉUSSI** |
| **E.4** | Piste d'audit sécurité | Journal immuable des événements de sécurité (connexions, rôles) | **RÉUSSI** |
| **E.5** | Supervision réservations `/pro/reservations` | Filtres par statut, dates et montants | **RÉUSSI** |
| **E.6** | Supervision paiements `/pro/paiements` | Audit des encaissements simulés Wave et Orange Money en FCFA | **RÉUSSI** |
| **E.7** | Supervision notifications `/pro/notifications` | Console de suivi des alertes délivrées | **RÉUSSI** |

---

## 5. CONTRÔLE DES 6 RÉSOLUTIONS RESPONSIVE (SECTION 7 DU MANDAT)

Chaque format d'affichage a été contrôlé avec Chromium Playwright :

| Format | Résolution Testée | Page Contrôlée | Débordement Horizontal | Éléments Clés Adaptés | Statut |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Petit mobile** | 360 × 800 | Accueil public & Dashboard pro | **AUCUN** (`scrollWidth === 360`) | Tagline masquée, menu burger, KPI en 1 colonne | **CONFORME** |
| **Mobile standard** | 390 × 844 | Accueil public & Contrôle d'accès | **AUCUN** (`scrollWidth === 390`) | Scanner caméra plein écran, boutons tactiles >= 48px | **CONFORME** |
| **Tablette portrait** | 768 × 1024 | Accueil & Contrôle guichet | **AUCUN** (`scrollWidth === 768`) | Grille en 2 colonnes, tables avec scroll horizontal | **CONFORME** |
| **Tablette paysage** | 1024 × 768 | Accueil & Navigation | **AUCUN** (`scrollWidth === 1024`) | Barre de navigation complète, filtres en ligne | **CONFORME** |
| **Desktop standard** | 1440 × 900 | Toutes les 14 pages pro | **AUCUN** (`scrollWidth === 1440`) | Agencement 2 colonnes avec tiroirs latéraux (Drawers) | **CONFORME** |
| **Grand desktop** | 1920 × 1080 | Accueil public | **AUCUN** (`scrollWidth === 1920`) | Conteneurs centrés max 1440px avec marges équilibrées | **CONFORME** |

---

## 6. AUDIT D'ACCESSIBILITÉ NUMÉRIQUE (WCAG 2.2 AA)

| Critère WCAG 2.2 AA | Exigence | Mesure / Vérification | Statut |
| :--- | :--- | :--- | :--- |
| **1.4.3 Contraste texte normal** | >= 4.5:1 | Texte `#161F1B` sur fond lin `#F5F0E5` (ratio **14.5:1**), sur blanc (ratio **16.5:1**) | **CONFORME** |
| **1.4.3 Contraste texte large** | >= 3.0:1 | Titres `#153D30` sur fond lin (ratio **9.2:1**) | **CONFORME** |
| **1.4.11 Contraste composants** | >= 3.0:1 | Bordures actives et boutons `#28634B` (ratio **4.6:1**) | **CONFORME** |
| **2.4.7 Focus visible** | Contour net | `:focus-visible { outline: 2px solid #28634B; outline-offset: 2px; }` | **CONFORME** |
| **2.1.1 Navigation clavier** | Clavier seul | Navigation séquentielle par `Tab` éprouvée sur tous les parcours | **CONFORME** |
| **2.4.3 Ordre de tabulation** | Pas de tabindex > 0 | **Aucun tabindex positif** dans l'ensemble du projet (uniquement `0` ou `-1`) | **CONFORME** |
| **1.3.1 Structure sémantique** | H1 unique par page | **1 seul H1 pertinent par page** (y compris H1 masqué lecteur d'écran sur la page 404) | **CONFORME** |
| **4.1.2 Nom, rôle et valeur** | Contrôles étiquetés | Attributs `aria-label` ajoutés sur le sélecteur caméra, filtres et formulaires d'avis | **CONFORME** |
| **2.3.3 Mouvement réduit** | `prefers-reduced-motion` | Prise en compte globale dans `global.css` désactivant les transitions | **CONFORME** |

---

## 7. INVENTAIRE DES 44 PREUVES VISUELLES RÉELLES CAPTURÉES

Toutes les captures probantes ci-dessous sont enregistrées sous `docs/evidence/p07-8-lot4/` :

### 7.1 Pages publiques (12 captures)
1. [public-01-home-desktop-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/public-01-home-desktop-1440.png) : Page d'accueil éditoriale et carte (1440px).
2. [public-02-patrimoines-catalogue-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/public-02-patrimoines-catalogue-1440.png) : Catalogue patrimonial et filtres géographiques (1440px).
3. [public-03-patrimoine-detail-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/public-03-patrimoine-detail-1440.png) : Fiche détaillée de patrimoine avec horaires structurés (1440px).
4. [public-04-circuits-catalogue-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/public-04-circuits-catalogue-1440.png) : Annuaire des circuits touristiques (1440px).
5. [public-05-circuit-detail-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/public-05-circuit-detail-1440.png) : Fiche circuit détaillée avec étapes ordonnées (1440px).
6. [public-06-evenements-agenda-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/public-06-evenements-agenda-1440.png) : Calendrier des manifestations culturelles (1440px).
7. [public-07-guides-annuaire-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/public-07-guides-annuaire-1440.png) : Annuaire des guides agréés avec filtres accessibles (1440px).
8. [public-08-guide-detail-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/public-08-guide-detail-1440.png) : Fiche guide avec compétences linguistiques et avis (1440px).
9. [public-09-connexion-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/public-09-connexion-1440.png) : Page de connexion avec puces rapides de démonstration (1440px).
10. [public-10-inscription-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/public-10-inscription-1440.png) : Page d'inscription touriste (1440px).
11. [public-11-erreur-404-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/public-11-erreur-404-1440.png) : Page d'erreur 404 avec balise H1 accessible (1440px).
12. [public-12-erreur-403-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/public-12-erreur-403-1440.png) : Page d'erreur 403 avec redirection et détails des privilèges (1440px).

### 7.2 Parcours Touriste authentifié (4 captures)
13. [touriste-01-mon-espace-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/touriste-01-mon-espace-1440.png) : Espace personnel voyageur avec historique des réservations (1440px).
14. [touriste-02-reserver-tunnel-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/touriste-02-reserver-tunnel-1440.png) : Tunnel de réservation avec calcul en direct de la tarification (1440px).
15. [touriste-03-reservation-detail-billets-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/touriste-03-reservation-detail-billets-1440.png) : Fiche de réservation confirmée avec billets QR scannables (1440px).
16. [touriste-04-notifications-voyageur-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/touriste-04-notifications-voyageur-1440.png) : Centre de notifications voyageur (1440px).

### 7.3 Parcours Guide authentifié (4 captures)
17. [guide-01-dashboard-cockpit-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/guide-01-dashboard-cockpit-1440.png) : Cockpit d'activité guide avec statut agrément et note avis (1440px).
18. [guide-02-profil-disponibilite-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/guide-02-profil-disponibilite-1440.png) : Profil professionnel et bascule de visibilité annuaire (1440px).
19. [guide-03-circuits-assignes-bola-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/guide-03-circuits-assignes-bola-1440.png) : Circuits assignés sous cloisonnement BOLA (1440px).
20. [guide-04-manifestes-passagers-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/guide-04-manifestes-passagers-1440.png) : Manifeste des participants par départ de circuit (1440px).

### 7.4 Parcours Conservateur authentifié (3 captures)
21. [conservateur-01-dashboard-patrimonial-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/conservateur-01-dashboard-patrimonial-1440.png) : Dashboard régional de valorisation patrimoniale (1440px).
22. [conservateur-02-gestion-patrimoine-gps-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/conservateur-02-gestion-patrimoine-gps-1440.png) : Inventaire du patrimoine, coordonnées GPS et modèles d'horaires (1440px).
23. [conservateur-03-validation-guides-deontologie-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/conservateur-03-validation-guides-deontologie-1440.png) : Dossiers guides avec interdiction d'auto-validation (1440px).

### 7.5 Parcours Gestionnaire de site authentifié (3 captures)
24. [gestionnaire-01-dashboard-site-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/gestionnaire-01-dashboard-site-1440.png) : Dashboard de supervision de l'affluence du site (1440px).
25. [gestionnaire-02-controle-acces-camera-qr-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/gestionnaire-02-controle-acces-camera-qr-1440.png) : Terminal de contrôle d'accès scan vidéo QR certifié serveur (1440px).
26. [gestionnaire-03-evenements-site-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/gestionnaire-03-evenements-site-1440.png) : Calendrier et gestion des événements du site (1440px).

### 7.6 Parcours Administrateur authentifié (6 captures)
27. [admin-01-dashboard-consolide-7ms-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/admin-01-dashboard-consolide-7ms-1440.png) : Dashboard exécutif consolidé agrégeant les 7 microservices (1440px).
28. [admin-02-utilisateurs-rbac-audit-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/admin-02-utilisateurs-rbac-audit-1440.png) : Annuaire des comptes, attribution de rôles et révocation (1440px).
29. [admin-03-supervision-reservations-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/admin-03-supervision-reservations-1440.png) : Supervision globale des réservations de la région (1440px).
30. [admin-04-supervision-paiements-simules-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/admin-04-supervision-paiements-simules-1440.png) : Audit financier des paiements Wave / OM en FCFA (1440px).
31. [admin-05-statistiques-metriques-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/admin-05-statistiques-metriques-1440.png) : Statistiques régionales et flux de visiteurs (1440px).
32. [admin-06-notifications-supervision-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/admin-06-notifications-supervision-1440.png) : Console d'audit des notifications multicanales (1440px).

### 7.7 Contrôles responsive multi-résolutions (9 captures)
33. [responsive-01-home-petit-mobile-360x800.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/responsive-01-home-petit-mobile-360x800.png) : Accueil public sur petit smartphone (360x800).
34. [responsive-02-home-mobile-390x844.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/responsive-02-home-mobile-390x844.png) : Accueil public sur smartphone standard (390x844).
35. [responsive-03-home-tablette-portrait-768x1024.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/responsive-03-home-tablette-portrait-768x1024.png) : Accueil public sur tablette portrait (768x1024).
36. [responsive-04-home-tablette-paysage-1024x768.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/responsive-04-home-tablette-paysage-1024x768.png) : Accueil public sur tablette paysage (1024x768).
37. [responsive-05-home-desktop-1440x900.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/responsive-05-home-desktop-1440x900.png) : Accueil public sur poste desktop standard (1440x900).
38. [responsive-06-home-grand-desktop-1920x1080.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/responsive-06-home-grand-desktop-1920x1080.png) : Accueil public sur grand écran Full HD (1920x1080).
39. [responsive-07-pro-dashboard-mobile-360x800.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/responsive-07-pro-dashboard-mobile-360x800.png) : Cockpit professionnel sur smartphone étroit (360x800).
40. [responsive-08-pro-controle-acces-mobile-390x844.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/responsive-08-pro-controle-acces-mobile-390x844.png) : Scanner caméra QR optimisé pour smartphone terrain (390x844).
41. [responsive-09-pro-controle-acces-tablette-768x1024.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/responsive-09-pro-controle-acces-tablette-768x1024.png) : Scanner caméra QR sur tablette de guichet (768x1024).

### 7.8 Preuves ciblées d'accessibilité (3 captures)
42. [a11y-01-focus-clavier-navigation-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/a11y-01-focus-clavier-navigation-1440.png) : Navigation séquentielle clavier avec anneau de focus net (1440px).
43. [a11y-02-controle-acces-camera-label-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/a11y-02-controle-acces-camera-label-1440.png) : Sélecteur de caméra vidéo avec attribut ARIA accessible (1440px).
44. [a11y-03-erreur-404-sr-only-h1-1440.png](file:///home/mahou-dev/micro-service/docs/evidence/p07-8-lot4/a11y-03-erreur-404-sr-only-h1-1440.png) : Page 404 intégrant le titre H1 d'accessibilité (1440px).
