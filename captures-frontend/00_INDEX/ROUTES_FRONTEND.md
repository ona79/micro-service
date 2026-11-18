# INVENTAIRE COMPLET DES ROUTES FRONTEND — CASAMANCE PATRIMOINE (P07.7)

**Projet** : Plateforme de Gestion et de Valorisation du Patrimoine Touristique de la Casamance  
**Date d'audit** : 18 Novembre 2026  
**Branche Git** : `feature/p07-7-frontend-capture`  
**Commit de référence** : `af08df2`  
**Fichier analysé** : `frontend-angular/src/app/app.routes.ts`  
**Architecture** : Angular 22 (Standalone Components, Signals, Router, Guards fonctionnels)

---

## 1. Vue d'Ensemble des Layouts Applicatifs

L'application Angular 22 s'organise autour de deux layouts principaux :

1. **`MainLayoutComponent`** (`src/app/core/layout/main-layout/`) :
   - En-tête public avec marque « Casamance Patrimoine — Découverte & Itinéraires Culturels », navigation principale (Accueil, Patrimoines, Circuits, Événements, Guides), bouton CTA *Réserver* et bouton *Connexion / Mon Espace*.
   - Pied de page institutionnel de l'Université Assane Seck de Ziguinchor (UASZ).
   - Utilisé pour le portail public, l'authentification, l'espace personnel visiteur et l'administration monolithique historique (`/administration`).

2. **`ProLayoutComponent`** (`src/app/core/layout/pro-layout/`) :
   - Barre latérale professionnelle (Sidebar) avec hiérarchie des modules adaptée dynamiquement au rôle connecté (`ADMINISTRATEUR`, `CONSERVATEUR`, `GESTIONNAIRE_SITE`, `GUIDE`).
   - Barre supérieure utilitaire (TopBar) avec profil utilisateur, badge de rôle typé, fil d'Ariane, raccourci d'inbox notifications et bouton de déconnexion.
   - Utilisé pour l'ensemble des modules du back-office professionnel sous le préfixe `/pro/**`.

---

## 2. Table d'Inventaire Exhaustif des Routes Déclarées

| Route Angular | Layout | Guards & Permissions | Composant Associé | Espace Métier | Accessibilité | Statut Capture |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `MainLayout` | *Aucun (Public)* | `HomePageComponent` | Public | **Accessible** | ✅ Capturé (Desktop, Tablet, Mobile) |
| `/patrimoines` | `MainLayout` | *Aucun (Public)* | `PatrimoinesListPageComponent` | Public | **Accessible** | ✅ Capturé (Desktop, Tablet, Mobile, GPS, Carte) |
| `/patrimoines/:id` | `MainLayout` | *Aucun (Public)* | `PatrimoineDetailPageComponent` | Public | **Accessible** | ✅ Capturé (Desktop, Tablet, Mobile) |
| `/circuits` | `MainLayout` | *Aucun (Public)* | `CircuitsListPageComponent` | Public | **Accessible** | ✅ Capturé (Desktop) |
| `/circuits/:id` | `MainLayout` | *Aucun (Public)* | `CircuitDetailPageComponent` | Public | **Accessible** | ✅ Capturé (Desktop) |
| `/evenements` | `MainLayout` | *Aucun (Public)* | `EvenementsListPageComponent` | Public | **Accessible** | ✅ Capturé (Desktop) |
| `/evenements/:id` | `MainLayout` | *Aucun (Public)* | `EvenementDetailPageComponent` | Public | **Accessible** | ✅ Capturé (Desktop) |
| `/guides` | `MainLayout` | *Aucun (Public)* | `GuidesListPageComponent` | Public | **Accessible** | ✅ Capturé (Desktop) |
| `/guides/:id` | `MainLayout` | *Aucun (Public)* | `GuideDetailPageComponent` | Public | **Accessible** | ✅ Capturé (Desktop) |
| `/espace-guide` | — | *Redirection 301* -> `/pro/mon-profil-guide` | — | Guide | **Redirection** | ✅ Traité via cible |
| `/notifications` | `MainLayout` | `authGuard` | `NotificationsCenterPageComponent` | Touriste | **Accessible** (auth requise) | ✅ Capturé (Desktop) |
| `/reserver` | `MainLayout` | `authGuard` | `ReserverPageComponent` | Touriste | **Accessible** (auth requise) | ✅ Capturé (Desktop, Tablet, Mobile) |
| `/reservations/:id` | `MainLayout` | `authGuard` | `ReservationDetailPageComponent` | Touriste | **Accessible** (auth requise) | ✅ Capturé (Desktop, Billet QR) |
| `/paiements` | `MainLayout` | `authGuard` | `PaiementCheckoutPageComponent` | Touriste | **Accessible** (auth requise) | ✅ Capturé (Desktop) |
| `/paiements/:reservationId` | `MainLayout` | `authGuard` | `PaiementCheckoutPageComponent` | Touriste | **Accessible** (auth requise) | ✅ Capturé (Desktop) |
| `/connexion` | `MainLayout` | `guestGuard` | `LoginPageComponent` | Auth | **Accessible** (anonyme) | ✅ Capturé (Desktop, Tablet, Mobile, Erreur) |
| `/inscription` | `MainLayout` | `guestGuard` | `RegisterPageComponent` | Auth | **Accessible** (anonyme) | ✅ Capturé (Desktop, Formulaire rempli) |
| `/mon-espace` | `MainLayout` | `authGuard` | `AccountPageComponent` | Touriste | **Accessible** (auth requise) | ✅ Capturé (Desktop, Tablet, Mobile, Onglets) |
| `/administration` | `MainLayout` | `authGuard`, `roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR'])` | `AdminDashboardPageComponent` | Admin Historique | **Accessible** (staff requis) | ✅ Capturé (Desktop) |
| `/acces-refuse` | `MainLayout` | *Aucun (Public)* | `ForbiddenPageComponent` | Système | **Accessible** | ✅ Capturé (Desktop) |
| `/pro` | — | `authGuard`, `roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR', 'GUIDE'])` | *Redirection* -> `tableau-de-bord` | Pro | **Redirection** | ✅ Traité via cible |
| `/pro/tableau-de-bord` | `ProLayout` | `authGuard`, `roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR', 'GUIDE'])` | `ProDashboardPageComponent` | Multi-rôles Pro | **Accessible** (staff/guide) | ✅ Capturé (ADMIN, CONS, GEST, GUIDE) |
| `/pro/statistiques` | `ProLayout` | `authGuard`, `roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR', 'GUIDE'])` | `ProStatistiquesPageComponent` | Multi-rôles Pro | **Accessible** (staff/guide) | ✅ Capturé (ADMIN, CONS) |
| `/pro/patrimoines` | `ProLayout` | `authGuard`, `roleGuard(['ADMINISTRATEUR', 'CONSERVATEUR', 'GESTIONNAIRE_SITE'])` | `ProPatrimoinesPageComponent` | Pro Patrimoine | **Accessible** (staff) | ✅ Capturé (CONS, GEST, ADMIN, Form) |
| `/pro/circuits` | `ProLayout` | `authGuard`, `roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'GUIDE'])`, `permissionGuard(['CIRCUIT:CREER', ...])` | `ProCircuitsPageComponent` | Pro Circuits | **Accessible** (guide/staff) | ✅ Capturé (GUIDE, ADMIN) |
| `/pro/evenements` | `ProLayout` | `authGuard`, `roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE'])` | `ProEvenementsPageComponent` | Pro Événements | **Accessible** (staff) | ✅ Capturé (GEST, ADMIN) |
| `/pro/guides` | `ProLayout` | `authGuard`, `roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR'])`, `permissionGuard(['GUIDE:VALIDER'])` | `ProGuidesAdminPageComponent` | Pro Guides | **Accessible** (staff habilité) | ✅ Capturé (CONS, ADMIN) |
| `/pro/mon-profil-guide` | `ProLayout` | `authGuard`, `roleGuard(['GUIDE'])`, `permissionGuard(['GUIDE:GERER_PROPRE_PROFIL'])` | `ProGuideWorkspacePageComponent` | Guide Pro | **Accessible** (guide) | ✅ Capturé (GUIDE, Agenda) |
| `/pro/manifestes` | `ProLayout` | `authGuard`, `roleGuard(['GUIDE', 'GESTIONNAIRE_SITE', 'ADMINISTRATEUR'])` | `ProManifestesPageComponent` | Guide & Exploitation | **Accessible** (guide/staff) | ✅ Capturé (GUIDE, GEST) |
| `/pro/reservations` | `ProLayout` | `authGuard`, `roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE'])`, `permissionGuard(['RESERVATION:LIRE_TOUT', ...])` | `ProReservationsPageComponent` | Supervision | **Accessible** (gestionnaire/admin) | ✅ Capturé (GEST, ADMIN) |
| `/pro/controle-acces` | `ProLayout` | `authGuard`, `roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR'])`, `permissionGuard(['VISITE:VALIDER'])` | `ProControleAccesPageComponent` | Contrôle & Scan | **Accessible** (agents habilités) | ✅ Capturé (CONS, GEST, ADMIN, Tablet, Mobile) |
| `/pro/paiements` | `ProLayout` | `authGuard`, `roleGuard(['ADMINISTRATEUR'])`, `permissionGuard(['PAIEMENT:LIRE_TOUT'])` | `ProPaiementsPageComponent` | Finance Pro | **Accessible** (admin) | ✅ Capturé (ADMIN) |
| `/pro/moderation` | `ProLayout` | `authGuard`, `roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE'])`, `permissionGuard(['AVIS:MODERER'])` | `ProModerationPageComponent` | Modération Pro | **Accessible** (modérateurs) | ✅ Capturé (GEST, ADMIN) |
| `/pro/notifications` | `ProLayout` | `authGuard`, `roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR', 'GUIDE'])` | `ProNotificationsPageComponent` | Notifications Pro | **Accessible** (staff/guide) | ✅ Capturé (GUIDE, ADMIN) |
| `/pro/utilisateurs` | `ProLayout` | `authGuard`, `roleGuard(['ADMINISTRATEUR'])`, `permissionGuard(['UTILISATEUR:LIRE_TOUT'])` | `ProUtilisateursPageComponent` | Gouvernance & Sécurité | **Accessible** (admin) | ✅ Capturé (ADMIN, Audit Sécurité) |
| `/**` | `MainLayout` | *Aucun (Public)* | `NotFoundPageComponent` | Erreur 404 | **Accessible** | ✅ Capturé (Desktop) |

---

## 3. Synthèse Métrique des Routes

- **Total des définitions de routes dans `app.routes.ts`** : 36 routes
- **Routes de redirection** : 3 (`/espace-guide` -> `/pro/mon-profil-guide`, `/pro` -> `/pro/tableau-de-bord`, `/pro/**` -> `/pro/tableau-de-bord`)
- **Pages réelles distinctes** : 33 écrans
- **Pages accessibles publiquement** : 13
- **Pages nécessitant une authentification** : 20
- **Taux de couverture de capture visuelle réelle** : **100 % des pages accessibles capturées**
