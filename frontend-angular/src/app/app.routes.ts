import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        title: 'Accueil',
        loadComponent: () =>
          import('./features/home/pages/home-page/home-page.component').then(
            (m) => m.HomePageComponent
          ),
      },
      {
        path: 'patrimoines',
        title: 'Sites & Monuments Patrimoniaux',
        loadComponent: () =>
          import(
            './features/patrimoines/pages/patrimoines-list-page/patrimoines-list-page.component'
          ).then((m) => m.PatrimoinesListPageComponent),
      },
      {
        path: 'patrimoines/:id',
        title: 'Fiche Patrimoine',
        loadComponent: () =>
          import(
            './features/patrimoines/pages/patrimoine-detail-page/patrimoine-detail-page.component'
          ).then((m) => m.PatrimoineDetailPageComponent),
      },
      {
        path: 'circuits',
        title: 'Circuits Touristiques',
        loadComponent: () =>
          import(
            './features/circuits/pages/circuits-list-page/circuits-list-page.component'
          ).then((m) => m.CircuitsListPageComponent),
      },
      {
        path: 'circuits/:id',
        title: 'Détail du Circuit',
        loadComponent: () =>
          import(
            './features/circuits/pages/circuit-detail-page/circuit-detail-page.component'
          ).then((m) => m.CircuitDetailPageComponent),
      },
      {
        path: 'evenements',
        title: 'Agenda Culturel',
        loadComponent: () =>
          import(
            './features/evenements/pages/evenements-list-page/evenements-list-page.component'
          ).then((m) => m.EvenementsListPageComponent),
      },
      {
        path: 'evenements/:id',
        title: 'Détail de l’Événement',
        loadComponent: () =>
          import(
            './features/evenements/pages/evenement-detail-page/evenement-detail-page.component'
          ).then((m) => m.EvenementDetailPageComponent),
      },
      {
        path: 'reserver',
        title: 'Réserver une Visite',
        canActivate: [authGuard],
        loadComponent: () =>
          import(
            './features/reservations/pages/reserver-page/reserver-page.component'
          ).then((m) => m.ReserverPageComponent),
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
          roleGuard(['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR', 'GUIDE']),
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
