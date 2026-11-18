import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideAward,
  LucideBarChart3,
  LucideBell,
  LucideCalendar,
  LucideClipboardList,
  LucideCompass,
  LucideCreditCard,
  LucideExternalLink,
  LucideLandmark,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideMenu,
  LucideMessageSquareWarning,
  LucidePanelLeftClose,
  LucidePanelLeftOpen,
  LucideRoute,
  LucideShieldCheck,
  LucideTicket,
  LucideUser,
  LucideUsers,
  LucideX,
} from '@lucide/angular';
import { filter } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AuthStore } from '../../auth/auth.store';
import { PermissionService } from '../../auth/permissions';
import { APP_SITE_CONFIG } from '../../config/site.config';
import { RoleUtilisateur } from '../../models/utilisateur.model';
import { NotificationStore } from '../../../features/notifications/data-access/notification.store';

export type ProNavIcon =
  | 'dashboard'
  | 'stats'
  | 'patrimoines'
  | 'circuits'
  | 'evenements'
  | 'guide-profil'
  | 'manifestes'
  | 'guides'
  | 'moderation'
  | 'reservations'
  | 'paiements'
  | 'notifications'
  | 'utilisateurs';

export interface ProNavItem {
  readonly id: string;
  readonly label: string;
  readonly to: string;
  readonly icon: ProNavIcon;
  readonly roles: readonly RoleUtilisateur[];
  readonly section: string;
  readonly badgeText?: string;
}

export const PRO_NAV_ITEMS: readonly ProNavItem[] = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    to: '/pro/tableau-de-bord',
    icon: 'dashboard',
    roles: ['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR', 'GUIDE'],
    section: 'Pilotage',
  },
  {
    id: 'statistiques',
    label: 'Statistiques',
    to: '/pro/statistiques',
    icon: 'stats',
    roles: ['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR', 'GUIDE'],
    section: 'Pilotage',
  },
  {
    id: 'patrimoines',
    label: 'Patrimoines',
    to: '/pro/patrimoines',
    icon: 'patrimoines',
    roles: ['ADMINISTRATEUR', 'CONSERVATEUR', 'GESTIONNAIRE_SITE'],
    section: 'Catalogue & Opérations',
  },
  {
    id: 'circuits',
    label: 'Circuits',
    to: '/pro/circuits',
    icon: 'circuits',
    roles: ['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'GUIDE'],
    section: 'Catalogue & Opérations',
  },
  {
    id: 'evenements',
    label: 'Événements',
    to: '/pro/evenements',
    icon: 'evenements',
    roles: ['ADMINISTRATEUR', 'GESTIONNAIRE_SITE'],
    section: 'Catalogue & Opérations',
  },
  {
    id: 'mon-profil-guide',
    label: 'Mon profil guide',
    to: '/pro/mon-profil-guide',
    icon: 'guide-profil',
    roles: ['GUIDE'],
    section: 'Guides & Voyageurs',
  },
  {
    id: 'manifestes',
    label: 'Manifestes circuits',
    to: '/pro/manifestes',
    icon: 'manifestes',
    roles: ['GUIDE', 'GESTIONNAIRE_SITE', 'ADMINISTRATEUR'],
    section: 'Guides & Voyageurs',
  },
  {
    id: 'guides',
    label: 'Guides touristiques',
    to: '/pro/guides',
    icon: 'guides',
    roles: ['ADMINISTRATEUR', 'GESTIONNAIRE_SITE'],
    section: 'Guides & Voyageurs',
  },
  {
    id: 'moderation',
    label: 'Modération & Avis',
    to: '/pro/moderation',
    icon: 'moderation',
    roles: ['ADMINISTRATEUR', 'GESTIONNAIRE_SITE'],
    section: 'Guides & Voyageurs',
  },
  {
    id: 'reservations',
    label: 'Réservations',
    to: '/pro/reservations',
    icon: 'reservations',
    roles: ['ADMINISTRATEUR', 'GESTIONNAIRE_SITE'],
    section: 'Transactions & Alertes',
  },
  {
    id: 'paiements',
    label: 'Paiements simulés',
    to: '/pro/paiements',
    icon: 'paiements',
    roles: ['ADMINISTRATEUR'],
    section: 'Transactions & Alertes',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    to: '/pro/notifications',
    icon: 'notifications',
    roles: ['ADMINISTRATEUR', 'GESTIONNAIRE_SITE', 'CONSERVATEUR', 'GUIDE'],
    section: 'Transactions & Alertes',
  },
  {
    id: 'utilisateurs',
    label: 'Utilisateurs & Audit',
    to: '/pro/utilisateurs',
    icon: 'utilisateurs',
    roles: ['ADMINISTRATEUR'],
    section: 'Sécurité & Gouvernance',
  },
];

@Component({
  selector: 'app-pro-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LucideCompass,
    LucideLayoutDashboard,
    LucideBarChart3,
    LucideLandmark,
    LucideRoute,
    LucideCalendar,
    LucideAward,
    LucideClipboardList,
    LucideUsers,
    LucideMessageSquareWarning,
    LucideTicket,
    LucideCreditCard,
    LucideBell,
    LucideShieldCheck,
    LucidePanelLeftClose,
    LucidePanelLeftOpen,
    LucideMenu,
    LucideX,
    LucideExternalLink,
    LucideUser,
    LucideLogOut,
  ],
  templateUrl: './pro-layout.component.html',
  styleUrl: './pro-layout.component.css',
})
export class ProLayoutComponent {
  protected readonly config = inject(APP_SITE_CONFIG);
  protected readonly authStore = inject(AuthStore);
  protected readonly permissions = inject(PermissionService);
  protected readonly notificationStore = inject(NotificationStore);
  private readonly router = inject(Router);

  protected readonly sidebarCollapsed = signal(false);
  protected readonly mobileDrawerOpen = signal(false);
  protected readonly currentPath = signal(this.router.url);

  protected readonly visibleSections = computed(() => {
    const userRole = this.authStore.user()?.role;
    if (!userRole) return [];
    const allowed = PRO_NAV_ITEMS.filter((item) => item.roles.includes(userRole));
    const grouped: Array<{ section: string; items: ProNavItem[] }> = [];
    for (const item of allowed) {
      let bucket = grouped.find((g) => g.section === item.section);
      if (!bucket) {
        bucket = { section: item.section, items: [] };
        grouped.push(bucket);
      }
      if (item.id === 'patrimoines' && userRole === 'GESTIONNAIRE_SITE') {
        bucket.items.push({ ...item, badgeText: 'Lecture' });
      } else if (item.id === 'circuits' && userRole === 'GUIDE') {
        bucket.items.push({ ...item, label: 'Mes circuits' });
      } else {
        bucket.items.push(item);
      }
    }
    return grouped;
  });

  protected readonly activeNavLabel = computed(() => {
    const path = this.currentPath().split('?')[0];
    const match = PRO_NAV_ITEMS.find((i) => path.startsWith(i.to));
    return match ? match.label : 'Espace Professionnel';
  });

  constructor() {
    this.router.events
      .pipe(
        filter((evt): evt is NavigationEnd => evt instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe((evt) => {
        this.currentPath.set(evt.urlAfterRedirects);
        this.mobileDrawerOpen.set(false);
      });

    effect(() => {
      const u = this.authStore.user();
      untracked(() => {
        if (u) {
          void this.notificationStore.refreshUnreadCount();
        }
      });
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.mobileDrawerOpen()) {
      this.mobileDrawerOpen.set(false);
    }
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  protected toggleMobileDrawer(): void {
    this.mobileDrawerOpen.update((v) => !v);
  }

  protected closeMobileDrawer(): void {
    this.mobileDrawerOpen.set(false);
  }

  protected async logout(): Promise<void> {
    await this.authStore.logout();
    toast.info('Session back-office fermée avec succès.');
    await this.router.navigate(['/connexion']);
  }
}
