import { Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard, roleGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        title: 'Accueil',
        data: {
          description:
            'Explorez la Casamance : sites patrimoniaux de Basse, Moyenne et Haute-Casamance, circuits sur les bolongs, agenda culturel et guides agréés.',
        },
        loadComponent: () =>
          import('./features/home/pages/home-page/home-page.component').then(
            (m) => m.HomePageComponent
          ),
      },
      {
        path: 'patrimoines',
        title: 'Sites & Monuments Patrimoniaux',
        data: {
          description:
            'Catalogue des sites culturels, mémoriels et naturels publiés de Casamance : filtres par zone géographique, catégorie et capacité d’accueil.',
        },
        loadComponent: () =>
          import(
            './features/patrimoines/pages/patrimoines-list-page/patrimoines-list-page.component'
          ).then((m) => m.PatrimoinesListPageComponent),
      },
      {
        path: 'patrimoines/:id',
        title: 'Fiche Patrimoine',
        data: {
          description:
            'Fiche détaillée d’un site patrimonial de Casamance : histoire, localisation GPS, tarifs, avis vérifiés et réservations.',
        },
        loadComponent: () =>
          import(
            './features/patrimoines/pages/patrimoine-detail-page/patrimoine-detail-page.component'
          ).then((m) => m.PatrimoineDetailPageComponent),
      },
      {
        path: 'circuits',
        title: 'Circuits Touristiques',
        data: {
          description:
            'Itinéraires culturels et immersions fluviales ou pédestres en Casamance : étapes détaillées, guides locaux et estimation orthodromique.',
        },
        loadComponent: () =>
          import(
            './features/circuits/pages/circuits-list-page/circuits-list-page.component'
          ).then((m) => m.CircuitsListPageComponent),
      },
      {
        path: 'circuits/:id',
        title: 'Détail du Circuit',
        data: {
          description:
            'Parcours étape par étape, durée estimée, carte interactive et avis de voyageurs pour ce circuit touristique en Casamance.',
        },
        loadComponent: () =>
          import(
            './features/circuits/pages/circuit-detail-page/circuit-detail-page.component'
          ).then((m) => m.CircuitDetailPageComponent),
      },
      {
        path: 'evenements',
        title: 'Agenda Culturel',
        data: {
          description:
            'Agenda culturel et festivals de Casamance en heure officielle Africa/Dakar : cérémonies, foires artisanales, visites et ateliers.',
        },
        loadComponent: () =>
          import(
            './features/evenements/pages/evenements-list-page/evenements-list-page.component'
          ).then((m) => m.EvenementsListPageComponent),
      },
      {
        path: 'evenements/:id',
        title: 'Détail de l’Événement',
        data: {
          description:
            'Horaires, site hôte, places disponibles et modalités de réservation pour cet événement culturel en Casamance.',
        },
        loadComponent: () =>
          import(
            './features/evenements/pages/evenement-detail-page/evenement-detail-page.component'
          ).then((m) => m.EvenementDetailPageComponent),
      },
      {
        path: 'guides',
        title: 'Guides Touristiques Agréés',
        data: {
          description:
            'Annuaire officiel des guides touristiques validés en Casamance : zones couvertes, spécialités culturelles et langues parlées.',
        },
        loadComponent: () =>
          import(
            './features/guides/pages/guides-list-page/guides-list-page.component'
          ).then((m) => m.GuidesListPageComponent),
      },
      {
        path: 'guides/:id',
        title: 'Profil du Guide Touristique',
        data: {
          description:
            'Présentation publique, langues, spécialités et notes des voyageurs vérifiés pour ce guide touristique agréé en Casamance.',
        },
        loadComponent: () =>
          import(
            './features/guides/pages/guide-detail-page/guide-detail-page.component'
          ).then((m) => m.GuideDetailPageComponent),
      },
      {
        path: 'espace-guide',
        redirectTo: '/pro/mon-profil-guide',
        pathMatch: 'full',
      },
      {
        path: 'notifications',
        title: 'Centre de Notifications',
        canActivate: [authGuard],
        loadComponent: () =>
          import(
            './features/notifications/pages/notifications-center-page/notifications-center-page.component'
          ).then((m) => m.NotificationsCenterPageComponent),
      },
      {
        path: 'reserver',
        title: 'Réserver une Visite',
        data: {
          description:
            'Réservez en ligne vos places sur les circuits touristiques et événements culturels publiés de Casamance.',
        },
        canActivate: [authGuard],
        loadComponent: () =>
          import(
            './features/reservations/pages/reserver-page/reserver-page.component'
          ).then((m) => m.ReserverPageComponent),
      },
      {
        path: 'reservations/:id',
        title: 'Détail de la Réservation',
        data: {
          description:
            'Suivi détaillé d’une réservation, participants, paiements simulés et historique d’état.',
        },
        canActivate: [authGuard],
        loadComponent: () =>
          import(
            './features/reservations/pages/reservation-detail-page/reservation-detail-page.component'
          ).then((m) => m.ReservationDetailPageComponent),
      },
      {
        path: 'paiements',
        title: 'Paiement simulé Wave / Orange Money',
        canActivate: [authGuard],
        loadComponent: () =>
          import(
            './features/paiements/pages/paiement-checkout-page/paiement-checkout-page.component'
          ).then((m) => m.PaiementCheckoutPageComponent),
      },
      {
        path: 'paiements/:reservationId',
        title: 'Paiement simulé Wave / Orange Money',
        canActivate: [authGuard],
        loadComponent: () =>
          import(
            './features/paiements/pages/paiement-checkout-page/paiement-checkout-page.component'
          ).then((m) => m.PaiementCheckoutPageComponent),
      },
      {
        path: 'connexion',
        title: 'Connexion',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/pages/login-page/login-page.component').then(
            (m) => m.LoginPageComponent
          ),
      },
      {
        path: 'inscription',
        title: 'Inscription',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/pages/register-page/register-page.component').then(
            (m) => m.RegisterPageComponent
          ),
      },
      {
        path: 'mon-espace',
        title: 'Mon Espace Personnel',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/auth/pages/account-page/account-page.component').then(
            (m) => m.AccountPageComponent
          ),
      },
      {
        path: 'administration',
        title: 'Administration & Gestion',
        canActivate: [
          authGuard,
          roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR']),
        ],
        loadComponent: () =>
          import(
            './features/admin/pages/admin-dashboard-page/admin-dashboard-page.component'
          ).then((m) => m.AdminDashboardPageComponent),
      },
      {
        path: 'acces-refuse',
        title: 'Accès Refusé (403)',
        loadComponent: () =>
          import('./core/layout/forbidden-page/forbidden-page.component').then(
            (m) => m.ForbiddenPageComponent
          ),
      },
    ],
  },
  {
    path: 'pro',
    loadComponent: () =>
      import('./core/layout/pro-layout/pro-layout.component').then((m) => m.ProLayoutComponent),
    canActivate: [
      authGuard,
      roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR', 'GUIDE']),
    ],
    children: [
      {
        path: '',
        redirectTo: 'tableau-de-bord',
        pathMatch: 'full',
      },
      {
        path: 'tableau-de-bord',
        title: 'Tableau de bord Pro',
        canActivate: [roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR', 'GUIDE'])],
        loadComponent: () =>
          import('./features/pro/pages/pro-dashboard-page/pro-dashboard-page.component').then(
            (m) => m.ProDashboardPageComponent
          ),
      },
      {
        path: 'statistiques',
        title: 'Statistiques Pro',
        canActivate: [roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR', 'GUIDE'])],
        loadComponent: () =>
          import('./features/pro/pages/pro-statistiques-page/pro-statistiques-page.component').then(
            (m) => m.ProStatistiquesPageComponent
          ),
      },
      {
        path: 'patrimoines',
        title: 'Gestion Patrimoine',
        canActivate: [roleGuard(['ADMINISTRATEUR', 'CONSERVATEUR', 'GESTIONNAIRE_SITE'])],
        loadComponent: () =>
          import('./features/pro/pages/pro-patrimoines-page/pro-patrimoines-page.component').then(
            (m) => m.ProPatrimoinesPageComponent
          ),
      },
      {
        path: 'circuits',
        title: 'Gestion Circuits',
        canActivate: [
          roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'GUIDE']),
          permissionGuard(['CIRCUIT:CREER', 'CIRCUIT:MODIFIER', 'CIRCUIT:PUBLIER']),
        ],
        loadComponent: () =>
          import('./features/pro/pages/pro-circuits-page/pro-circuits-page.component').then(
            (m) => m.ProCircuitsPageComponent
          ),
      },
      {
        path: 'evenements',
        title: 'Gestion Événements',
        canActivate: [roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE'])],
        loadComponent: () =>
          import('./features/pro/pages/pro-evenements-page/pro-evenements-page.component').then(
            (m) => m.ProEvenementsPageComponent
          ),
      },
      {
        path: 'guides',
        title: 'Validation des Guides',
        canActivate: [roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE']), permissionGuard(['GUIDE:VALIDER'])],
        loadComponent: () =>
          import('./features/pro/pages/pro-guides-admin-page/pro-guides-admin-page.component').then(
            (m) => m.ProGuidesAdminPageComponent
          ),
      },
      {
        path: 'mon-profil-guide',
        title: 'Mon Espace Guide',
        canActivate: [roleGuard(['GUIDE']), permissionGuard(['GUIDE:GERER_PROPRE_PROFIL'])],
        loadComponent: () =>
          import(
            './features/pro/pages/pro-guide-workspace-page/pro-guide-workspace-page.component'
          ).then((m) => m.ProGuideWorkspacePageComponent),
      },
      {
        path: 'manifestes',
        title: 'Manifestes Circuits',
        canActivate: [roleGuard(['GUIDE', 'GESTIONNAIRE_SITE', 'ADMINISTRATEUR'])],
        loadComponent: () =>
          import('./features/pro/pages/pro-manifestes-page/pro-manifestes-page.component').then(
            (m) => m.ProManifestesPageComponent
          ),
      },
      {
        path: 'reservations',
        title: 'Supervision Réservations',
        canActivate: [
          roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE']),
          permissionGuard(['RESERVATION:LIRE_TOUT', 'RESERVATION:GERER']),
        ],
        loadComponent: () =>
          import('./features/pro/pages/pro-reservations-page/pro-reservations-page.component').then(
            (m) => m.ProReservationsPageComponent
          ),
      },
      {
        path: 'paiements',
        title: 'Paiements Simulés & Remboursements',
        canActivate: [roleGuard(['ADMINISTRATEUR']), permissionGuard(['PAIEMENT:LIRE_TOUT'])],
        loadComponent: () =>
          import('./features/pro/pages/pro-paiements-page/pro-paiements-page.component').then(
            (m) => m.ProPaiementsPageComponent
          ),
      },
      {
        path: 'moderation',
        title: 'Modération Avis & Signalements',
        canActivate: [roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE']), permissionGuard(['AVIS:MODERER'])],
        loadComponent: () =>
          import('./features/pro/pages/pro-moderation-page/pro-moderation-page.component').then(
            (m) => m.ProModerationPageComponent
          ),
      },
      {
        path: 'notifications',
        title: 'Notifications Pro',
        canActivate: [roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR', 'GUIDE'])],
        loadComponent: () =>
          import(
            './features/pro/pages/pro-notifications-page/pro-notifications-page.component'
          ).then((m) => m.ProNotificationsPageComponent),
      },
      {
        path: 'utilisateurs',
        title: 'Utilisateurs & Audit Sécurité',
        canActivate: [roleGuard(['ADMINISTRATEUR']), permissionGuard(['UTILISATEUR:LIRE_TOUT'])],
        loadComponent: () =>
          import('./features/pro/pages/pro-utilisateurs-page/pro-utilisateurs-page.component').then(
            (m) => m.ProUtilisateursPageComponent
          ),
      },
      {
        path: '**',
        redirectTo: 'tableau-de-bord',
      },
    ],
  },
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '**',
        title: 'Page introuvable',
        loadComponent: () =>
          import('./core/layout/not-found-page/not-found-page.component').then(
            (m) => m.NotFoundPageComponent
          ),
      },
    ],
  },
];
