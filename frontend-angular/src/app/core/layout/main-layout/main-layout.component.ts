import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideCompass,
  LucideMenu,
  LucideSearch,
  LucideTicket,
  LucideX,
} from '@lucide/angular';
import { APP_SITE_CONFIG } from '../../config/site.config';

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
    LucideX,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css',
})
export class MainLayoutComponent {
  protected readonly config = inject(APP_SITE_CONFIG);
  private readonly router = inject(Router);

  protected readonly menuOpen = signal(false);
  protected searchQuery = '';

  protected readonly navItems: readonly NavItem[] = [
    { to: '/', label: 'Accueil', exact: true },
    { to: '/patrimoines', label: 'Patrimoines', exact: false },
    { to: '/circuits', label: 'Circuits', exact: false },
    { to: '/evenements', label: 'Événements', exact: false },
  ];

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
}
