import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { SeoService } from './seo.service';

@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly seo = inject(SeoService);

  override updateTitle(routerState: RouterStateSnapshot): void {
    const routeTitle = this.buildTitle(routerState);
    const description = this.extractDeepestDescription(routerState.root);
    this.seo.update({
      title: routeTitle || undefined,
      description,
      canonicalPath: routerState.url,
    });
  }

  private extractDeepestDescription(snapshot: ActivatedRouteSnapshot): string | undefined {
    let cursor: ActivatedRouteSnapshot | null = snapshot;
    let found: string | undefined;
    while (cursor) {
      const desc = cursor.data?.['description'];
      if (typeof desc === 'string' && desc.trim()) {
        found = desc.trim();
      }
      cursor = cursor.firstChild;
    }
    return found;
  }
}
