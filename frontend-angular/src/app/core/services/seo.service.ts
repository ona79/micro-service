import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { APP_SITE_CONFIG } from '../config/site.config';

export interface SeoMetadataOptions {
  readonly title?: string;
  readonly description?: string;
  readonly canonicalPath?: string;
  readonly type?: 'website' | 'article';
}

/**
 * Service centralisé de métadonnées SEO côté client (Title, Meta Description, Open Graph et URL canonique).
 * Note : en architecture SPA servie par Nginx (sans SSR Node), les métadonnées sont mises à jour
 * dynamiquement dans le DOM à chaque navigation et pour les moteurs compatibles JS.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly config = inject(APP_SITE_CONFIG);

  update(options: SeoMetadataOptions): void {
    const fullTitle = options.title
      ? `${options.title} — ${this.config.siteName}`
      : `${this.config.siteName} — ${this.config.siteSubtitle}`;

    const description =
      options.description?.trim() ||
      `${this.config.siteSlogan}. Explorez les sites patrimoniaux, circuits, événements et guides agréés de la Casamance.`;

    this.titleService.setTitle(fullTitle);
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ property: 'og:title', content: fullTitle });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:type', content: options.type ?? 'website' });

    const canonicalUrl = this.buildCanonicalUrl(options.canonicalPath);
    if (canonicalUrl) {
      this.metaService.updateTag({ property: 'og:url', content: canonicalUrl });
      this.upsertCanonicalLink(canonicalUrl);
    }
  }

  private buildCanonicalUrl(path?: string): string | null {
    const cleanPath = (path ?? '/').split('?')[0].split('#')[0] || '/';
    const origin = this.document?.location?.origin;
    if (!origin || origin === 'null') {
      return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    }
    return cleanPath.startsWith('/') ? `${origin}${cleanPath}` : `${origin}/${cleanPath}`;
  }

  private upsertCanonicalLink(href: string): void {
    const head = this.document?.head;
    if (!head) return;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
