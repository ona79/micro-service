# MISSION P07.8 — LOT 3 : AUDIT PRÉALABLE, CARTOGRAPHIE DES ESPACES MÉTIERS ET RAPPORT DE CONTRÔLE GIT

**Projet :** Plateforme de valorisation et gestion du patrimoine touristique de la Casamance  
**Institution :** Université Assane Seck de Ziguinchor (UASZ) — Licence 3 Informatique  
**Direction artistique :** CASAMANCE — PATRIMOINE VIVANT  
**Date :** 18 novembre 2026  
**Auteur :** Senior Frontend Architect & Senior QA Specialist

---

## 1. CONTRÔLE PRÉALABLE GIT ET RAPPORT DE BLOCAGE (SECTION 2.1)

Conformément à la directive formelle de la section 2.1 du mandat Lot 3 :
> *« Si les dépendances ne sont pas intégrées, arrêter l'implémentation et produire un rapport de blocage avec les opérations Git préalables nécessaires. »*

### 1.1 Examen de la branche active et de l'arbre de travail

| Paramètre Git | Valeur constatée | Statut |
| :--- | :--- | :--- |
| **Branche active** | `feature/p07-8-public-tourist-experience` | Conforme à la fin du Lot 2.1 |
| **HEAD commit** | `5264bbe` (*fix(p07.8): lot 2.1 - stabilize tourist flows, fix agenda layout and circuit resilience*) | Conforme |
| **État working tree** | Propre (`nothing to commit, working tree clean`) | Aucun fichier non sauvegardé |
| **Branche distante tracking** | Synchronisée avec `origin/feature/p07-8-public-tourist-experience` | Conforme |

### 1.2 Vérification des dépendances dans `origin/develop`

Une inspection rigoureuse des références distantes et de l'historique d'`origin/develop` a été réalisée :

```bash
git fetch origin
git log -n 5 --oneline origin/develop
git merge-base --is-ancestor da909c5 origin/develop
git merge-base --is-ancestor 4db73ee origin/develop
git merge-base --is-ancestor 5264bbe origin/develop
```

**Résultats factuels constatés :**
1. **Commit Lot 1 `da909c5`** (*feat(p07.8): lot 1 - design system foundations...*) :
   - **PRÉSENT** dans `origin/develop` via le commit de fusion `3c2ac9c` (*Merge branch 'feature/p07-8-design-system' into develop*).
2. **Commit Lot 2 `4db73ee`** (*feat(p07.8): lot 2 - complete public and tourist experience UX/UI overhaul*) :
   - **ABSENT** de `origin/develop`.
3. **Commit Lot 2.1 `5264bbe`** (*fix(p07.8): lot 2.1 - stabilize tourist flows, fix agenda layout and circuit resilience*) :
   - **ABSENT** de `origin/develop`.

### 1.3 Cause de l'absence dans `origin/develop`

Cette absence est le résultat direct du respect strict des consignes de livraison des missions Lot 2 et Lot 2.1 :
- Lot 2 spécifiait : *« Ne pas fusionner la branche. Ne pas modifier main ou develop. La livraison sera proposée par Pull Request vers develop, sans fusion automatique. »*
- Lot 2.1 spécifiait : *« Ne pas fusionner. La décision finale de fusion appartient au responsable du projet. »*

Les commits `9bd1a5e`, `4db73ee` et `5264bbe` résident donc sur `origin/feature/p07-8-public-tourist-experience`.

### 1.4 Décision et Arrêt d'implémentation

En application stricte de la règle de gouvernance :
- **L'implémentation du Lot 3 est immédiatement arrêtée** dans l'attente de l'intégration des dépendances dans `origin/develop`.
- Aucun commit d'implémentation du Lot 3 ne sera produit sur `develop` ni sur une branche orpheline.
- Seul le présent rapport d'audit en lecture seule est formalisé.

### 1.5 Procédure recommandée pour débloquer l'intégration Git

Pour permettre le démarrage de l'implémentation sur la branche dédiée `feature/p07-8-professional-admin-experience`, l'arbitrage suivant est requis par le responsable du projet :

#### Option A (Recommandée : Intégration dans `develop`)
1. Basculer sur `develop` et intégrer le Lot 2 / Lot 2.1 :
   ```bash
   git checkout develop
   git merge --ff-only feature/p07-8-public-tourist-experience
   git push origin develop
   ```
2. Créer la branche de travail Lot 3 depuis `origin/develop` mis à jour :
   ```bash
   git checkout -b feature/p07-8-professional-admin-experience origin/develop
   git push -u origin feature/p07-8-professional-admin-experience
   ```

#### Option B (Alternative sans push direct sur develop distant)
Créer la branche `feature/p07-8-professional-admin-experience` directement depuis `feature/p07-8-public-tourist-experience` (qui contient déjà la chaîne complète `develop + Lot 1 + Lot 2 + Lot 2.1`) pour préparer une Pull Request globale.

---

## 2. AUDIT EN LECTURE SEULE DU FRONTEND PROFESSIONNEL

### 2.1 Architecture de routage : `/pro/**` vs Legacy `/administration`

L'application Angular 22 dispose de deux points d'accès aux fonctions professionnelles :
1. **La route legacy `/administration`** :
   - Fichier : `AdminDashboardPageComponent` (`admin-dashboard-page.component.ts`).
   - Poids : composant monolithique de **3 012 lignes** regroupant tous les rôles dans une seule vue avec onglets.
   - Problème : composant surchargé, difficilement maintenable, dette technique historique.
2. **Le layout modulaire `/pro` (`ProLayoutComponent`)** :
   - Fichier : `src/app/core/layout/pro-layout/pro-layout.component.ts`.
   - Structure : menu latéral escamotable avec sections (« Pilotage », « Catalogue & Opérations », « Guides & Voyageurs », « Transactions & Alertes », « Sécurité & Gouvernance »).
   - Filtrage : chaque entrée de navigation (`PRO_NAV_ITEMS`) est strictement restreinte par le rôle utilisateur actif.
   - Pages dédiées modulaires sous `src/app/features/pro/pages/` (totalisant 7 419 lignes).

### 2.2 Cartographie des pages modulaires sous `/pro`

| Route | Composant | Rôles autorisés (Routeur) | Rôles autorisés (Menu Nav) | Lignes TS | Statut actuel |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/pro/tableau-de-bord` | `ProDashboardPageComponent` | `ADMIN`, `GESTIONNAIRE`, `CONSERVATEUR`, `GUIDE` | Tous les 4 rôles | 412 | Fonctionnel, KPIs conditionnés par rôle |
| `/pro/statistiques` | `ProStatistiquesPageComponent` | `ADMIN`, `GESTIONNAIRE`, `CONSERVATEUR`, `GUIDE` | Tous les 4 rôles | 294 | Fonctionnel, graphiques par périmètre |
| `/pro/patrimoines` | `ProPatrimoinesPageComponent` | `ADMIN`, `CONSERVATEUR`, `GESTIONNAIRE` | `ADMIN`, `CONSERVATEUR`, `GESTIONNAIRE` | 697 | CRUD, carte Leaflet, filtres, statuts |
| `/pro/circuits` | `ProCircuitsPageComponent` | `ADMIN`, `GESTIONNAIRE`, `GUIDE` | `ADMIN`, `GESTIONNAIRE`, `GUIDE` | 806 | CRUD, gestion des étapes, assignation guide |
| `/pro/evenements` | `ProEvenementsPageComponent` | `ADMIN`, `GESTIONNAIRE` | `ADMIN`, `GESTIONNAIRE` | 644 | CRUD, dates Africa/Dakar, publication |
| `/pro/guides` | `ProGuidesAdminPageComponent` | `ADMIN`, `GESTIONNAIRE`, `CONSERVATEUR` | `ADMIN`, `GESTIONNAIRE`, `CONSERVATEUR` | 392 | Instruction, validation, motif obligatoire |
| `/pro/mon-profil-guide` | `ProGuideWorkspacePageComponent` | `GUIDE` | `GUIDE` | 495 | Fiche guide, disponibilité, visibilité, avis |
| `/pro/manifestes` | `ProManifestesPageComponent` | `GUIDE`, `GESTIONNAIRE`, `ADMIN` | `GUIDE`, `GESTIONNAIRE`, `ADMIN` | 214 | Manifeste participants par circuit (non financier) |
| `/pro/reservations` | `ProReservationsPageComponent` | `ADMIN`, `GESTIONNAIRE` | `ADMIN`, `GESTIONNAIRE` | 382 | Supervision réservations, annulation, synchro |
| `/pro/controle-acces` | `ProControleAccesPageComponent` | `ADMIN`, `GESTIONNAIRE`, `CONSERVATEUR` | `ADMIN`, `GESTIONNAIRE`, `CONSERVATEUR` | 1 081 | Scan QR caméra réelle, saisie manuelle, validation serveur |
| `/pro/paiements` | `ProPaiementsPageComponent` | `ADMIN` | `ADMIN` | 371 | Supervision Wave/OM, remboursement simulé, Outbox |
| `/pro/moderation` | `ProModerationPageComponent` | `ADMIN`, `GESTIONNAIRE` | `ADMIN`, `GESTIONNAIRE` | 448 | Traitement signalements et modération avis |
| `/pro/notifications` | `ProNotificationsPageComponent` | `ADMIN`, `GESTIONNAIRE`, `CONSERVATEUR`, `GUIDE` | Tous les 4 rôles | 461 | Alertes perso + supervision globale admin |
| `/pro/utilisateurs` | `ProUtilisateursPageComponent` | `ADMIN` | `ADMIN` | 597 | Gestion comptes staff, rôles RBAC, audit sécurité |

---

## 3. INVENTAIRE DES ENDPOINTS BACKEND RÉELLEMENT EXPOSÉS

L'examen statique des 7 microservices confirme la présence des contrôleurs et points d'entrée suivants :

### 3.1 `ms-utilisateur` (Port 8081 / Gateway `/api/utilisateurs`, `/api/guides`)
- `GET /api/guides/mon-profil` : Profil guide de l'utilisateur connecté (`GUIDE`).
- `PUT /api/guides/mon-profil` : Mise à jour du profil (bio, langues, spécialités, zones).
- `POST /api/guides/mon-profil/soumettre` : Soumission du dossier pour validation.
- `PATCH /api/guides/mon-profil/disponibilite` : Bascule disponible / indisponible.
- `POST /api/guides/mon-profil/desactiver` : Désactivation volontaire.
- `GET /api/guides/admin/tous` : Tous les dossiers guides pour instruction (`ADMIN`, `CONSERVATEUR`, `GESTIONNAIRE`).
- `GET /api/guides/statistiques` : KPIs globaux des guides (validés, attente, rejetés, suspendus).
- `GET /api/guides/{id}/historique` : Historique des décisions d'instruction.
- `POST /api/guides/{id}/valider` : Approbation du guide (`ADMIN`, `CONSERVATEUR`).
- `POST /api/guides/{id}/rejeter` : Rejet avec motif obligatoire (`ADMIN`, `CONSERVATEUR`).
- `POST /api/guides/{id}/suspendre` : Suspension motivée (`ADMIN`, `CONSERVATEUR`).
- `POST /api/guides/{id}/reactiver` : Réactivation (`ADMIN`, `CONSERVATEUR`).
- `GET /api/utilisateurs/recherche` : Recherche paginée d'utilisateurs (`ADMIN`).
- `GET /api/utilisateurs/statistiques` : KPIs comptes actifs, par rôle, alertes 24h (`ADMIN`).
- `GET /api/utilisateurs/audit` : Journal immuable d'audit de sécurité (`ADMIN`).
- `POST /api/utilisateurs/admin` : Création de compte staff / guide (`ADMIN`).
- `PUT /api/utilisateurs/{id}` : Mise à jour de rôle ou statut avec révocation immédiate (`ADMIN`).
- `DELETE /api/utilisateurs/{id}` : Suppression logique de compte (`ADMIN`).

### 3.2 `ms-reservation` (Port 8084 / Gateway `/api/reservations`, `/api/visites`, `/api/avis`, `/api/moderation`)
- `POST /api/visites/valider` : **Validation serveur exclusive du billet QR scanné**. Enregistre l'horodatage, l'agent validateur et décrémente l'usage unique.
- `GET /api/visites/verifier` : Vérification de l'état du billet sans consommation.
- `GET /api/reservations/guide/agenda` : Agenda des visites assignées au guide connecté (`GUIDE`).
- `GET /api/reservations/guide/circuits/{circuitId}` : Manifeste opérationnel des passagers d'un circuit (`GUIDE`, `GESTIONNAIRE`, `ADMIN`).
- `GET /api/reservations/statistiques` : KPIs réservations (confirmées, attente, annulées, montants).
- `GET /api/reservations/recherche` : Recherche filtrée de réservations (`ADMIN`, `GESTIONNAIRE`).
- `PUT /api/reservations/{id}/annuler` : Annulation avec motif et libération des places.
- `POST /api/reservations/{id}/synchroniser` : Rapprochement asynchrone avec `ms-paiement`.
- `GET /api/moderation/avis` : File des avis à modérer (`ADMIN`, `GESTIONNAIRE`).
- `GET /api/moderation/signalements` : Signalements ouverts pour abus (`ADMIN`, `GESTIONNAIRE`).
- `GET /api/moderation/statistiques` : KPIs signalements et avis modérés.
- `POST /api/moderation/avis/{avisId}/decision` : Approbation ou masquage motivé d'avis.
- `POST /api/moderation/signalements/{sigId}/decision` : Décision sur signalement.
- `POST /api/avis/{id}/reponse` : Droit de réponse du guide ou gestionnaire sur un avis vérifié.

### 3.3 `ms-patrimoine` (Port 8082 / Gateway `/api/patrimoines`)
- `GET /api/patrimoines/statistiques` : Total, publiés, brouillons, capacité publiée, tarif moyen.
- `GET /api/patrimoines/recherche` : Recherche filtrée par zone, statut, mot-clé.
- `POST /api/patrimoines` : Création de site patrimonial (`ADMIN`, `CONSERVATEUR`).
- `PUT /api/patrimoines/{id}` : Modification (nom, description, coordonnées GPS, horaires structurés, tarifs).
- `PUT /api/patrimoines/{id}/soumettre` : Passage à l'état `SOUMIS`.
- `PUT /api/patrimoines/{id}/publier` : Publication effective sur le catalogue (`ADMIN`, `CONSERVATEUR`).
- `PUT /api/patrimoines/{id}/archiver` : Retrait du catalogue vers `ARCHIVE`.
- `DELETE /api/patrimoines/{id}` : Suppression logique.

### 3.4 `ms-circuit` (Port 8083 / Gateway `/api/circuits`)
- `GET /api/circuits/guide/mes-circuits` : Circuits rattachés au guide connecté (**protection BOLA stricte**).
- `GET /api/circuits/statistiques` : Total, publiés, avec/sans guide, prix et durée moyens.
- `PATCH /api/circuits/{id}/guide` : Affectation d'un guide agréé à un circuit (`ADMIN`, `GESTIONNAIRE`).
- `POST /api/circuits` : Création de circuit touristique.
- `PUT /api/circuits/{id}` : Modification des étapes et métadonnées.
- `PUT /api/circuits/{id}/soumettre` / `publier` / `archiver` : Transitions de statut.

### 3.5 `ms-evenement` (Port 8085 / Gateway `/api/evenements`)
- `GET /api/evenements/statistiques` : Événements à venir, publiés, ouverts aux réservations.
- `POST /api/evenements` : Création d'événement culturel lié à un site patrimonial.
- `PUT /api/evenements/{id}` : Mise à jour horaire (Africa/Dakar) et quota places.
- `PUT /api/evenements/{id}/publier` : Mise en ligne sur l'agenda public.
- `PUT /api/evenements/{id}/annuler` : Annulation officielle avec notification des inscrits.
- `PUT /api/evenements/{id}/archiver` : Archivage après déroulement.

### 3.6 `ms-paiement` (Port 8086 / Gateway `/api/paiements`)
- `GET /api/paiements/statistiques` : Volume accepté simulé, répartition Wave / OM, Outbox.
- `GET /api/paiements/recherche` : Recherche par référence `PAY-SIM...` ou transaction de corrélation.
- `POST /api/paiements/{id}/rembourser` : Remboursement simulé de réservation annulée.
- `POST /api/paiements/outbox/rejouer` : Relance manuelle des événements outbox en échec.

### 3.7 `ms-notification` (Port 8087 / Gateway `/api/notifications`)
- `GET /api/notifications/mes-notifications` : Alertes personnelles de l'utilisateur connecté.
- `GET /api/notifications/mes-notifications/compteur` : Compteur temps réel d'alertes non lues.
- `PATCH /api/notifications/{id}/lire` & `tout-lire` : Acquittement de lecture.
- `GET /api/notifications/statistiques` : KPIs livraisons SMS, EMAIL, IN_APP, échecs.
- `GET /api/notifications/toutes` : Supervision globale des livraisons (`ADMIN`).
- `POST /api/notifications/{id}/relancer` & `/relancer-echecs` : Rejeu des envois en échec.

---

## 4. ANALYSE DES LACUNES PAR ESPACE MÉTIER (GAP ANALYSIS)

### 4.1 Espace GUIDE
- **Forces existantes** :
  - `ProGuideWorkspacePageComponent` permet la modification de bio, langues, zones, bascule de disponibilité et visibilité annuaire.
  - `ProManifestesPageComponent` permet la consultation des passagers par circuit rattaché sans exposer de données financières.
  - `ProCircuitsPageComponent` restreint la vue aux circuits rattachés via `/api/circuits/guide/mes-circuits`.
- **Lacunes à combler pour le Lot 3** :
  1. *Dashboard Guide* : Le tableau de bord affiche des KPIs circuits génériques mais n'expose pas :
     - la prochaine visite assignée avec date, heure et circuit/site ;
     - le nombre de visites à venir et passées ;
     - la note moyenne issue des avis réels vérifiés (`GET /api/avis/resume`).
  2. *Agenda des visites* : L'agenda doit être présenté sous forme claire et filtrable (calendrier / liste chronologique) à partir de `GET /api/reservations/guide/agenda`.
  3. *Avis & Droit de réponse* : Permettre au guide de répondre directement aux avis reçus via `POST /api/avis/{id}/reponse` ou de signaler un commentaire abusif.

### 4.2 Espace CONSERVATEUR
- **Forces existantes** :
  - `ProPatrimoinesPageComponent` propose la création, modification, coordonnées GPS et carte interactive.
  - `ProGuidesAdminPageComponent` permet l'instruction et la validation/rejet des guides.
- **Lacunes à combler pour le Lot 3** :
  1. *Accès à la Modération* : Dans `app.routes.ts`, `/pro/moderation` est restreint à `['ADMINISTRATEUR', 'GESTIONNAIRE_SITE']` et n'inclut pas `CONSERVATEUR` ! Conformément à la section 4.6 du mandat, le Conservateur doit avoir accès à la modération des avis et signalements patrimoniaux.
  2. *Horaires d'ouverture structurés* : L'édition des horaires dans le patrimoine est actuellement un champ texte ou JSON brut. Il doit être présenté sous forme structurée (jours, plages horaires, fermetures exceptionnelles).
  3. *Cloisonnement de validation* : L'interface doit empêcher formellement un Conservateur de s'auto-valider s'il possède également un rôle guide.

### 4.3 Espace GESTIONNAIRE_SITE
- **Forces existantes** :
  - `ProControleAccesPageComponent` est extrêmement robuste : scan caméra temps réel via `Html5Qrcode`, saisie manuelle de secours, journal local des scans et **validation serveur exclusive** via `POST /api/visites/valider` (zéro validation locale factice).
- **Lacunes à combler pour le Lot 3** :
  1. *Cloisonnement au site assigné* : Le tableau de bord du gestionnaire doit filtrer les données du site qui lui est attribué.
  2. *Billetterie au guichet (Section 5.3)* : L'audit montre que `ms-reservation` exige `RESERVATION:CREER` pour créer une réservation. Or, le rôle `GESTIONNAIRE_SITE` ne possède pas cette permission dans `ROLE_PERMISSIONS` de `ms-utilisateur`. Cette fonctionnalité ne peut être implémentée sans modification backend (interdite) ou sans utiliser un compte autorisé. Elle doit être documentée comme **limitation backend P07.8-LOT3-API-LIMITATION**.

### 4.4 Espace ADMINISTRATEUR
- **Forces existantes** :
  - Supervision globale opérationnelle sur tous les domaines (`reservations`, `paiements`, `utilisateurs`, `notifications`, `statistiques`).
  - Cloisonnement RBAC strict avec gestion des sessions actives.
  - Traçabilité immuable via le journal d'audit de sécurité `GET /api/utilisateurs/audit`.
- **Lacunes à combler pour le Lot 3** :
  1. *Remplacement définitif de la page monolithique `/administration`* : Rediriger proprement `/administration` vers `/pro/tableau-de-bord` pour éliminer la dette technique du composant de 3 012 lignes tout en préservant la compatibilité des bookmarks.
  2. *Affichage pédagogique des paiements* : Renforcer la signalétique visuelle rappelant que Wave et Orange Money sont des simulations académiques (P04).

---

## 5. ALIGNEMENT DESIGN SYSTEM ET COMPOSANTS PARTAGÉS

L'ensemble des pages sous `/pro` devra exploiter systématiquement :
- **Typographie officielle** : `Fraunces` pour les titres éditoriaux de section (`.bo-header__title`), `Plus Jakarta Sans` pour le contenu tabulaire et fonctionnel.
- **Palette Casamance** :
  - Mangrove (`#153D30`) pour les fonds primaires, barres de navigation et accents majeurs.
  - Latérite (`#C36B45`) pour les alertes chaudes, boutons d'action tertiaire et éléments culturels.
  - Ocre (`#D6A85D`) pour les avertissements et dossiers en attente.
  - Forêt (`#28634B`) pour les indicateurs de succès et statuts validés.
  - Lin (`#F5F0E5`) et Sand (`#FDFBF7`) pour les fonds de cartes et panneaux.
- **Composants partagés du Lot 1 réutilisés sans duplication** :
  - `UiButtonComponent` (`app-ui-button`)
  - `UiBadgeComponent` (`app-ui-badge`)
  - `UiCardComponent` (`app-ui-card`)
  - `UiFormFieldComponent` (`app-ui-form-field`)
  - `UiLoadingStateComponent` (`app-ui-loading-state`)
  - `UiEmptyStateComponent` (`app-ui-empty-state`)
  - `UiErrorBannerComponent` (`app-ui-error-banner`)
  - `UiKpiCardComponent` (`app-ui-kpi-card`)
  - `UiPaginationComponent` (`app-ui-pagination`)
  - `UiConfirmDialogComponent` (`app-ui-confirm-dialog`)
  - `UiDetailDrawerComponent` (`app-ui-detail-drawer`)

---

## 6. SYNTHÈSE DES VÉRIFICATIONS TECHNIQUES DU FRONTEND

Avant le constat de blocage Git, les contrôles automatisés sur l'état courant ont produit les résultats suivants :
- **Tests unitaires et d'intégration** : **32 suites exécutées, 107 tests passés avec succès (100 %)**.
- **Compilation de production AOT** : `ng build` achevé avec succès en **8.84 secondes**, 0 erreur.
- **Stack conteneurisée** : Les 9 conteneurs Docker (`frontend-angular`, `postgres`, `discovery-server`, `api-gateway`, et les 7 microservices) sont actifs, sains et joignables.

---

## 7. CONCLUSION ET PROCHAINES ÉTAPES

1. **Rapport de dépendances Git** : Les commits Lot 2 (`4db73ee`) et Lot 2.1 (`5264bbe`) ne sont pas intégrés dans `origin/develop`. Conformément à la section 2.1, **l'implémentation est arrêtée**.
2. **Décision attendue** : L'utilisateur doit valider la fusion de `feature/p07-8-public-tourist-experience` dans `develop` pour permettre la création conforme de la branche `feature/p07-8-professional-admin-experience`.
3. **Dès déblocage Git** : Réalisation atomique par rôle (`GUIDE`, `CONSERVATEUR`, `GESTIONNAIRE_SITE`, `ADMINISTRATEUR`), passage des tests et production des captures probantes sous session réelle.
