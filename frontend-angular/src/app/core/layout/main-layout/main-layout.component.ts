import { ChangeDetectionStrategy, Component, effect, HostListener, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideBell,
  LucideCompass,
  LucideLogOut,
  LucideMenu,
  LucideSearch,
  LucideShieldCheck,
  LucideTicket,
  LucideUser,
  LucideX,
} from '@lucide/angular';
import { toast } from 'ngx-sonner';
import { AuthStore } from '../../auth/auth.store';
import { APP_SITE_CONFIG } from '../../config/site.config';
import { NotificationStore } from '../../../features/notifications/data-access/notification.store';

interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly exact: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    LucideCompass,
    LucideMenu,
    LucideSearch,
    LucideTicket,
    LucideUser,
    LucideShieldCheck,
    LucideLogOut,
    LucideX,
    LucideBell,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
  protected readonly config = inject(APP_SITE_CONFIG);
  protected readonly authStore = inject(AuthStore);
  protected readonly notificationStore = inject(NotificationStore);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);
  protected searchQuery = '';

  protected readonly navItems: readonly NavItem[] = [
    { to: '/', label: 'Accueil', exact: true },
    { to: '/patrimoines', label: 'Patrimoines', exact: false },
    { to: '/circuits', label: 'Circuits', exact: false },
    { to: '/evenements', label: 'Événements', exact: false },
    { to: '/guides', label: 'Guides', exact: false },
  ];

  constructor() {
    effect(() => {
      const user = this.authStore.user();
      untracked(() => {
        if (user) {
          void this.notificationStore.refreshUnreadCount();
        } else {
          this.notificationStore.clear();
        }
      });
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscapeKey(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
    }
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected submitSearch(): void {
    const q = this.searchQuery.trim();
    this.closeMenu();
    if (q) {
      void this.router.navigate(['/patrimoines'], { queryParams: { q } });
      this.searchQuery = '';
    } else {
      void this.router.navigate(['/patrimoines']);
    }
  }

  protected async logout(): Promise<void> {
    this.closeMenu();
    await this.authStore.logout();
    toast.success('Déconnexion effectuée.');
    await this.router.navigate(['/connexion']);
  }
}
