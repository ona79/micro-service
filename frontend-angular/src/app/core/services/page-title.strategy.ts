import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { APP_SITE_CONFIG } from '../config/site.config';

@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly config = inject(APP_SITE_CONFIG);

  override updateTitle(routerState: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(routerState);
    if (routeTitle) {
      this.title.setTitle(`${routeTitle} — ${this.config.siteName}`);
    } else {
      this.title.setTitle(`${this.config.siteName} — ${this.config.siteSubtitle}`);
    }
  }
}
